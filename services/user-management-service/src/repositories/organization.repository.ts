import { PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { databaseService } from '../services/database.service';
import { 
  Organization, 
  OrganizationSettings,
  CreateOrganizationRequest, 
  UpdateOrganizationRequest,
  OrganizationHierarchy,
  OrganizationType
} from '../types/user.types';
import { logger } from '../utils/logger';

export class OrganizationRepository {
  async create(orgData: CreateOrganizationRequest): Promise<Organization> {
    const orgId = uuidv4();
    const now = new Date();

    // Default organization settings
    const defaultSettings: OrganizationSettings = {
      branding: {
        primaryColor: '#007bff',
        secondaryColor: '#6c757d'
      },
      features: {
        enableGamification: true,
        enableAI: true,
        enableCollaboration: true,
        enableAnalytics: true
      },
      policies: {
        passwordPolicy: {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: false,
          maxAge: 90,
          preventReuse: 5
        },
        dataRetention: {
          userDataRetention: 2555, // 7 years
          logRetention: 365, // 1 year
          backupRetention: 1095, // 3 years
          automaticDeletion: false
        },
        privacySettings: {
          allowDataSharing: false,
          requireConsentForAnalytics: true,
          enableRightToErasure: true,
          dataProcessingBasis: 'consent'
        }
      },
      integrations: {
        ssoEnabled: false,
        lmsIntegrations: [],
        thirdPartyTools: []
      }
    };

    const settings = { ...defaultSettings, ...orgData.settings };

    const query = `
      INSERT INTO organizations (
        id, name, display_name, description, type, settings,
        parent_organization_id, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    
    const result = await databaseService.query(query, [
      orgId,
      orgData.name,
      orgData.displayName,
      orgData.description,
      orgData.type,
      JSON.stringify(settings),
      orgData.parentOrganizationId,
      true,
      now,
      now
    ]);

    logger.info('Organization created successfully', { 
      organizationId: orgId, 
      name: orgData.name 
    });
    
    return this.mapRowToOrganization(result.rows[0]);
  }

  async findById(id: string): Promise<Organization | null> {
    const query = `
      SELECT * FROM organizations WHERE id = $1
    `;

    const result = await databaseService.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToOrganization(result.rows[0]);
  }

  async findByName(name: string): Promise<Organization | null> {
    const query = `
      SELECT * FROM organizations WHERE name = $1
    `;

    const result = await databaseService.query(query, [name]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToOrganization(result.rows[0]);
  }

  async findAll(parentId?: string): Promise<Organization[]> {
    let query: string;
    let params: any[];

    if (parentId) {
      query = `
        SELECT * FROM organizations 
        WHERE parent_organization_id = $1
        ORDER BY display_name ASC
      `;
      params = [parentId];
    } else {
      query = `
        SELECT * FROM organizations 
        WHERE parent_organization_id IS NULL
        ORDER BY display_name ASC
      `;
      params = [];
    }

    const result = await databaseService.query(query, params);
    return result.rows.map(row => this.mapRowToOrganization(row));
  }

  async findChildren(parentId: string): Promise<Organization[]> {
    const query = `
      WITH RECURSIVE org_tree AS (
        SELECT * FROM organizations WHERE id = $1
        UNION ALL
        SELECT o.* FROM organizations o
        INNER JOIN org_tree ot ON o.parent_organization_id = ot.id
      )
      SELECT * FROM org_tree WHERE id != $1
      ORDER BY display_name ASC
    `;

    const result = await databaseService.query(query, [parentId]);
    return result.rows.map(row => this.mapRowToOrganization(row));
  }

  async update(id: string, updateData: UpdateOrganizationRequest): Promise<Organization | null> {
    const now = new Date();
    const fields = [];
    const values = [];
    let paramIndex = 1;

    // Build update fields
    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined) {
        if (key === 'settings') {
          // Merge with existing settings
          fields.push(`settings = settings::jsonb || $${paramIndex}::jsonb`);
          values.push(JSON.stringify(value));
        } else {
          const dbField = this.camelToSnake(key);
          fields.push(`${dbField} = $${paramIndex}`);
          values.push(value);
        }
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return await this.findById(id);
    }

    fields.push(`updated_at = $${paramIndex}`);
    values.push(now, id);

    const query = `
      UPDATE organizations 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await databaseService.query(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    logger.info('Organization updated successfully', { organizationId: id });
    
    return this.mapRowToOrganization(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    return await databaseService.transaction(async (client: PoolClient) => {
      // Check if organization has children
      const childrenCheck = await client.query(
        'SELECT COUNT(*) as count FROM organizations WHERE parent_organization_id = $1',
        [id]
      );

      if (parseInt(childrenCheck.rows[0].count) > 0) {
        throw new Error('Cannot delete organization that has child organizations');
      }

      // Check if organization has members
      const membersCheck = await client.query(
        'SELECT COUNT(*) as count FROM organization_memberships WHERE organization_id = $1',
        [id]
      );

      if (parseInt(membersCheck.rows[0].count) > 0) {
        throw new Error('Cannot delete organization that has members');
      }

      // Delete organization
      const result = await client.query('DELETE FROM organizations WHERE id = $1', [id]);
      
      logger.info('Organization deleted successfully', { organizationId: id });
      
      return (result.rowCount || 0) > 0;
    });
  }

  async getHierarchy(rootId?: string): Promise<OrganizationHierarchy[]> {
    let query: string;
    let params: any[];

    if (rootId) {
      query = `
        WITH RECURSIVE org_tree AS (
          SELECT *, 0 as level FROM organizations WHERE id = $1
          UNION ALL
          SELECT o.*, ot.level + 1 FROM organizations o
          INNER JOIN org_tree ot ON o.parent_organization_id = ot.id
        )
        SELECT * FROM org_tree ORDER BY level, display_name
      `;
      params = [rootId];
    } else {
      query = `
        WITH RECURSIVE org_tree AS (
          SELECT *, 0 as level FROM organizations WHERE parent_organization_id IS NULL
          UNION ALL
          SELECT o.*, ot.level + 1 FROM organizations o
          INNER JOIN org_tree ot ON o.parent_organization_id = ot.id
        )
        SELECT * FROM org_tree ORDER BY level, display_name
      `;
      params = [];
    }

    const result = await databaseService.query(query, params);
    const organizations = result.rows.map(row => ({
      ...this.mapRowToOrganization(row),
      level: row.level
    }));

    return this.buildHierarchy(organizations);
  }

  async addMember(organizationId: string, userId: string, roles: string[] = []): Promise<void> {
    const now = new Date();
    
    const query = `
      INSERT INTO organization_memberships (
        user_id, organization_id, roles, joined_at, status
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, organization_id) 
      DO UPDATE SET 
        roles = $3,
        status = $5
    `;

    await databaseService.query(query, [
      userId,
      organizationId,
      JSON.stringify(roles),
      now,
      'active'
    ]);

    logger.info('Member added to organization', { organizationId, userId, roles });
  }

  async removeMember(organizationId: string, userId: string): Promise<void> {
    const query = `
      DELETE FROM organization_memberships 
      WHERE user_id = $1 AND organization_id = $2
    `;

    await databaseService.query(query, [userId, organizationId]);

    logger.info('Member removed from organization', { organizationId, userId });
  }

  async updateMemberRoles(organizationId: string, userId: string, roles: string[]): Promise<void> {
    const query = `
      UPDATE organization_memberships 
      SET roles = $1
      WHERE user_id = $2 AND organization_id = $3
    `;

    await databaseService.query(query, [JSON.stringify(roles), userId, organizationId]);

    logger.info('Member roles updated', { organizationId, userId, roles });
  }

  async getMembers(organizationId: string): Promise<any[]> {
    const query = `
      SELECT 
        u.id, u.email, u.is_active, u.email_verified,
        up.first_name, up.last_name, up.display_name, up.avatar,
        om.roles, om.joined_at, om.status
      FROM organization_memberships om
      INNER JOIN users u ON om.user_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE om.organization_id = $1
      ORDER BY up.first_name, up.last_name
    `;

    const result = await databaseService.query(query, [organizationId]);
    
    return result.rows.map(row => ({
      id: row.id,
      email: row.email,
      isActive: row.is_active,
      emailVerified: row.email_verified,
      profile: {
        firstName: row.first_name,
        lastName: row.last_name,
        displayName: row.display_name,
        avatar: row.avatar
      },
      membership: {
        roles: row.roles || [],
        joinedAt: row.joined_at,
        status: row.status
      }
    }));
  }

  async getUserOrganizations(userId: string): Promise<Organization[]> {
    const query = `
      SELECT o.* FROM organizations o
      INNER JOIN organization_memberships om ON o.id = om.organization_id
      WHERE om.user_id = $1 AND om.status = 'active'
      ORDER BY o.display_name
    `;

    const result = await databaseService.query(query, [userId]);
    return result.rows.map(row => this.mapRowToOrganization(row));
  }

  private buildHierarchy(organizations: any[]): OrganizationHierarchy[] {
    const orgMap = new Map<string, OrganizationHierarchy>();
    const rootOrgs: OrganizationHierarchy[] = [];

    // Create hierarchy objects
    organizations.forEach(org => {
      orgMap.set(org.id, {
        organization: org,
        children: [],
        level: org.level
      });
    });

    // Build parent-child relationships
    organizations.forEach(org => {
      const hierarchy = orgMap.get(org.id)!;
      
      if (org.parentOrganizationId && orgMap.has(org.parentOrganizationId)) {
        const parent = orgMap.get(org.parentOrganizationId)!;
        parent.children.push(hierarchy);
      } else {
        rootOrgs.push(hierarchy);
      }
    });

    return rootOrgs;
  }

  private mapRowToOrganization(row: any): Organization {
    return {
      id: row.id,
      name: row.name,
      displayName: row.display_name,
      description: row.description,
      type: row.type as OrganizationType,
      settings: row.settings || {},
      parentOrganizationId: row.parent_organization_id,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}

export const organizationRepository = new OrganizationRepository();