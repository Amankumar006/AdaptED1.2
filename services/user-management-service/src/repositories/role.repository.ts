import { PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { databaseService } from '../services/database.service';
import { 
  Role, 
  Permission, 
  CreateRoleRequest, 
  UpdateRoleRequest,
  RoleHierarchy,
  BulkRoleAssignmentRequest
} from '../types/user.types';
import { logger } from '../utils/logger';

export class RoleRepository {
  async create(roleData: CreateRoleRequest): Promise<Role> {
    const roleId = uuidv4();
    const now = new Date();

    return await databaseService.transaction(async (client: PoolClient) => {
      // Insert role
      const roleQuery = `
        INSERT INTO roles (
          id, name, display_name, description, hierarchy, 
          organization_id, parent_role_id, is_system_role, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;
      
      const roleResult = await client.query(roleQuery, [
        roleId,
        roleData.name,
        roleData.displayName,
        roleData.description,
        roleData.hierarchy,
        roleData.organizationId,
        roleData.parentRoleId,
        false, // is_system_role
        now,
        now
      ]);

      // Assign permissions to role
      if (roleData.permissions.length > 0) {
        const permissionQuery = `
          INSERT INTO role_permissions (role_id, permission_id)
          VALUES ${roleData.permissions.map((_, index) => `($1, $${index + 2})`).join(', ')}
        `;
        
        await client.query(permissionQuery, [roleId, ...roleData.permissions]);
      }

      logger.info('Role created successfully', { roleId, name: roleData.name });
      
      const role = await this.findById(roleId, client);
      if (!role) {
        throw new Error('Failed to create role');
      }
      return role;
    });
  }

  async findById(id: string, client?: PoolClient): Promise<Role | null> {
    const query = `
      SELECT 
        r.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', p.id,
              'name', p.name,
              'displayName', p.display_name,
              'description', p.description,
              'resource', p.resource,
              'action', p.action,
              'conditions', p.conditions,
              'scope', p.scope
            )
          ) FILTER (WHERE p.id IS NOT NULL), 
          '[]'::json
        ) as permissions
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      WHERE r.id = $1
      GROUP BY r.id
    `;

    const executor: any = client || databaseService;
    const result = await executor.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToRole(result.rows[0]);
  }

  async findByName(name: string, organizationId?: string): Promise<Role | null> {
    const query = `
      SELECT 
        r.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', p.id,
              'name', p.name,
              'displayName', p.display_name,
              'description', p.description,
              'resource', p.resource,
              'action', p.action,
              'conditions', p.conditions,
              'scope', p.scope
            )
          ) FILTER (WHERE p.id IS NOT NULL), 
          '[]'::json
        ) as permissions
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      WHERE r.name = $1 AND (r.organization_id = $2 OR r.organization_id IS NULL)
      GROUP BY r.id
      ORDER BY r.organization_id NULLS LAST
      LIMIT 1
    `;

    const result = await databaseService.query(query, [name, organizationId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToRole(result.rows[0]);
  }

  async findAll(organizationId?: string): Promise<Role[]> {
    const query = `
      SELECT 
        r.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', p.id,
              'name', p.name,
              'displayName', p.display_name,
              'description', p.description,
              'resource', p.resource,
              'action', p.action,
              'conditions', p.conditions,
              'scope', p.scope
            )
          ) FILTER (WHERE p.id IS NOT NULL), 
          '[]'::json
        ) as permissions
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      WHERE r.organization_id = $1 OR r.organization_id IS NULL
      GROUP BY r.id
      ORDER BY r.hierarchy ASC, r.name ASC
    `;

    const result = await databaseService.query(query, [organizationId]);
    return result.rows.map(row => this.mapRowToRole(row));
  }

  async update(id: string, updateData: UpdateRoleRequest): Promise<Role | null> {
    return await databaseService.transaction(async (client: PoolClient) => {
      const now = new Date();
      const fields = [];
      const values = [];
      let paramIndex = 1;

      // Build update fields
      Object.entries(updateData).forEach(([key, value]) => {
        if (value !== undefined && key !== 'permissions') {
          const dbField = this.camelToSnake(key);
          fields.push(`${dbField} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      });

      if (fields.length > 0) {
        fields.push(`updated_at = $${paramIndex}`);
        values.push(now, id);

        const roleQuery = `
          UPDATE roles 
          SET ${fields.join(', ')}
          WHERE id = $${paramIndex + 1}
        `;
        await client.query(roleQuery, values);
      }

      // Update permissions if provided
      if (updateData.permissions) {
        // Remove existing permissions
        await client.query('DELETE FROM role_permissions WHERE role_id = $1', [id]);

        // Add new permissions
        if (updateData.permissions.length > 0) {
          const permissionQuery = `
            INSERT INTO role_permissions (role_id, permission_id)
            VALUES ${updateData.permissions.map((_, index) => `($1, $${index + 2})`).join(', ')}
          `;
          
          await client.query(permissionQuery, [id, ...updateData.permissions]);
        }
      }

      logger.info('Role updated successfully', { roleId: id });
      
      return await this.findById(id, client);
    });
  }

  async delete(id: string): Promise<boolean> {
    return await databaseService.transaction(async (client: PoolClient) => {
      // Check if role is being used
      const usageCheck = await client.query(`
        SELECT COUNT(*) as count FROM (
          SELECT user_id FROM organization_memberships 
          WHERE roles::jsonb ? $1
          UNION
          SELECT user_id FROM user_roles WHERE role_id = $1
        ) as usage
      `, [id]);

      if (parseInt(usageCheck.rows[0].count) > 0) {
        throw new Error('Cannot delete role that is currently assigned to users');
      }

      // Delete role permissions
      await client.query('DELETE FROM role_permissions WHERE role_id = $1', [id]);
      
      // Delete role
      const result = await client.query('DELETE FROM roles WHERE id = $1', [id]);
      
      logger.info('Role deleted successfully', { roleId: id });
      
      return (result.rowCount || 0) > 0;
    });
  }

  async getHierarchy(organizationId?: string): Promise<RoleHierarchy[]> {
    const roles = await this.findAll(organizationId);
    const roleMap = new Map<string, Role>();
    const hierarchyMap = new Map<string, RoleHierarchy>();

    // Create role map
    roles.forEach(role => {
      roleMap.set(role.id, role);
      hierarchyMap.set(role.id, {
        role,
        children: [],
        level: 0
      });
    });

    // Build hierarchy
    const rootRoles: RoleHierarchy[] = [];

    roles.forEach(role => {
      const hierarchy = hierarchyMap.get(role.id)!;
      
      if (role.parentRoleId && hierarchyMap.has(role.parentRoleId)) {
        const parent = hierarchyMap.get(role.parentRoleId)!;
        parent.children.push(hierarchy);
        hierarchy.level = parent.level + 1;
      } else {
        rootRoles.push(hierarchy);
      }
    });

    return rootRoles.sort((a, b) => a.role.hierarchy - b.role.hierarchy);
  }

  async assignRolesToUser(userId: string, roleIds: string[], organizationId?: string): Promise<void> {
    return await databaseService.transaction(async (client: PoolClient) => {
      if (organizationId) {
        // Update organization membership roles
        const currentMembership = await client.query(
          'SELECT roles FROM organization_memberships WHERE user_id = $1 AND organization_id = $2',
          [userId, organizationId]
        );

        if (currentMembership.rows.length > 0) {
          const currentRoles = currentMembership.rows[0].roles || [];
          const updatedRoles = [...new Set([...currentRoles, ...roleIds])];
          
          await client.query(
            'UPDATE organization_memberships SET roles = $1 WHERE user_id = $2 AND organization_id = $3',
            [JSON.stringify(updatedRoles), userId, organizationId]
          );
        }
      } else {
        // Insert into user_roles table for global roles
        const insertQuery = `
          INSERT INTO user_roles (user_id, role_id, assigned_at)
          VALUES ${roleIds.map((_, index) => `($1, $${index + 2}, $${roleIds.length + 2})`).join(', ')}
          ON CONFLICT (user_id, role_id) DO NOTHING
        `;
        
        await client.query(insertQuery, [userId, ...roleIds, new Date()]);
      }

      logger.info('Roles assigned to user', { userId, roleIds, organizationId });
    });
  }

  async removeRolesFromUser(userId: string, roleIds: string[], organizationId?: string): Promise<void> {
    return await databaseService.transaction(async (client: PoolClient) => {
      if (organizationId) {
        // Update organization membership roles
        const currentMembership = await client.query(
          'SELECT roles FROM organization_memberships WHERE user_id = $1 AND organization_id = $2',
          [userId, organizationId]
        );

        if (currentMembership.rows.length > 0) {
          const currentRoles = currentMembership.rows[0].roles || [];
          const updatedRoles = currentRoles.filter((roleId: string) => !roleIds.includes(roleId));
          
          await client.query(
            'UPDATE organization_memberships SET roles = $1 WHERE user_id = $2 AND organization_id = $3',
            [JSON.stringify(updatedRoles), userId, organizationId]
          );
        }
      } else {
        // Remove from user_roles table
        await client.query(
          'DELETE FROM user_roles WHERE user_id = $1 AND role_id = ANY($2)',
          [userId, roleIds]
        );
      }

      logger.info('Roles removed from user', { userId, roleIds, organizationId });
    });
  }

  async bulkAssignRoles(request: BulkRoleAssignmentRequest): Promise<void> {
    return await databaseService.transaction(async (client: PoolClient) => {
      for (const userId of request.userIds) {
        switch (request.action) {
          case 'add':
            await this.assignRolesToUser(userId, request.roleIds, request.organizationId);
            break;
          case 'remove':
            await this.removeRolesFromUser(userId, request.roleIds, request.organizationId);
            break;
          case 'replace':
            // First remove all current roles, then add new ones
            if (request.organizationId) {
              await client.query(
                'UPDATE organization_memberships SET roles = $1 WHERE user_id = $2 AND organization_id = $3',
                [JSON.stringify(request.roleIds), userId, request.organizationId]
              );
            } else {
              await client.query('DELETE FROM user_roles WHERE user_id = $1', [userId]);
              if (request.roleIds.length > 0) {
                await this.assignRolesToUser(userId, request.roleIds);
              }
            }
            break;
        }
      }

      logger.info('Bulk role assignment completed', {
        userCount: request.userIds.length,
        roleCount: request.roleIds.length,
        action: request.action,
        organizationId: request.organizationId
      });
    });
  }

  async getUserRoles(userId: string, organizationId?: string): Promise<Role[]> {
    let query: string;
    let params: any[];

    if (organizationId) {
      // Get roles from organization membership
      query = `
        SELECT 
          r.*,
          COALESCE(
            json_agg(
              json_build_object(
                'id', p.id,
                'name', p.name,
                'displayName', p.display_name,
                'description', p.description,
                'resource', p.resource,
                'action', p.action,
                'conditions', p.conditions,
                'scope', p.scope
              )
            ) FILTER (WHERE p.id IS NOT NULL), 
            '[]'::json
          ) as permissions
        FROM roles r
        LEFT JOIN role_permissions rp ON r.id = rp.role_id
        LEFT JOIN permissions p ON rp.permission_id = p.id
        WHERE r.id = ANY(
          SELECT jsonb_array_elements_text(roles::jsonb)
          FROM organization_memberships 
          WHERE user_id = $1 AND organization_id = $2
        )
        GROUP BY r.id
        ORDER BY r.hierarchy ASC
      `;
      params = [userId, organizationId];
    } else {
      // Get global roles
      query = `
        SELECT 
          r.*,
          COALESCE(
            json_agg(
              json_build_object(
                'id', p.id,
                'name', p.name,
                'displayName', p.display_name,
                'description', p.description,
                'resource', p.resource,
                'action', p.action,
                'conditions', p.conditions,
                'scope', p.scope
              )
            ) FILTER (WHERE p.id IS NOT NULL), 
            '[]'::json
          ) as permissions
        FROM roles r
        LEFT JOIN role_permissions rp ON r.id = rp.role_id
        LEFT JOIN permissions p ON rp.permission_id = p.id
        INNER JOIN user_roles ur ON r.id = ur.role_id
        WHERE ur.user_id = $1
        GROUP BY r.id
        ORDER BY r.hierarchy ASC
      `;
      params = [userId];
    }

    const result = await databaseService.query(query, params);
    return result.rows.map(row => this.mapRowToRole(row));
  }

  private mapRowToRole(row: any): Role {
    return {
      id: row.id,
      name: row.name,
      displayName: row.display_name,
      description: row.description,
      permissions: row.permissions || [],
      hierarchy: row.hierarchy,
      organizationId: row.organization_id,
      isSystemRole: row.is_system_role,
      parentRoleId: row.parent_role_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}

export const roleRepository = new RoleRepository();