import { PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { databaseService } from '../services/database.service';
import { 
  User, 
  UserProfile, 
  UserPreferences, 
  CreateUserRequest, 
  UpdateUserRequest,
  UserSearchQuery,
  UserSearchResult
} from '../types/user.types';
import { logger } from '../utils/logger';

export class UserRepository {
  async create(userData: CreateUserRequest): Promise<User> {
    const userId = uuidv4();
    const now = new Date();
    
    // Set default preferences and profile values
    const defaultPreferences: UserPreferences = {
      theme: 'auto',
      notifications: {
        email: true,
        push: true,
        sms: false,
        inApp: true,
        frequency: 'immediate',
        types: {
          assignments: true,
          grades: true,
          announcements: true,
          reminders: true,
          social: false
        }
      },
      privacy: {
        profileVisibility: 'organization',
        showOnlineStatus: true,
        allowDirectMessages: true,
        shareProgressData: true,
        allowAnalytics: true
      },
      accessibility: {
        screenReader: false,
        highContrast: false,
        largeText: false,
        reducedMotion: false,
        keyboardNavigation: false,
        textToSpeech: false,
        closedCaptions: false
      },
      learning: {
        preferredContentTypes: ['TEXT', 'VIDEO'] as any,
        difficultyLevel: 'adaptive',
        pacePreference: 'adaptive',
        studyTimePreference: 'flexible',
        collaborationPreference: 'mixed'
      },
      dashboard: {
        layout: 'grid',
        widgets: [],
        defaultView: 'overview'
      }
    };

    const profile: UserProfile = {
      ...userData.profile,
      timezone: userData.profile.timezone || 'UTC',
      language: userData.profile.language || 'en'
    };

    const preferences = { ...defaultPreferences, ...userData.preferences };

    return await databaseService.transaction(async (client: PoolClient) => {
      // Insert user
      const userQuery = `
        INSERT INTO users (
          id, email, is_active, email_verified, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      
      const userResult = await client.query(userQuery, [
        userId,
        userData.email,
        true,
        false,
        now,
        now
      ]);

      // Insert user profile
      const profileQuery = `
        INSERT INTO user_profiles (
          user_id, first_name, last_name, display_name, avatar, bio, 
          date_of_birth, phone_number, timezone, language, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `;

      await client.query(profileQuery, [
        userId,
        profile.firstName,
        profile.lastName,
        profile.displayName,
        profile.avatar,
        profile.bio,
        profile.dateOfBirth,
        profile.phoneNumber,
        profile.timezone,
        profile.language,
        now,
        now
      ]);

      // Insert user preferences
      const preferencesQuery = `
        INSERT INTO user_preferences (
          user_id, preferences, created_at, updated_at
        ) VALUES ($1, $2, $3, $4)
      `;

      await client.query(preferencesQuery, [
        userId,
        JSON.stringify(preferences),
        now,
        now
      ]);

      // Handle organization membership if provided
      if (userData.organizationId) {
        const membershipQuery = `
          INSERT INTO organization_memberships (
            user_id, organization_id, roles, joined_at, status
          ) VALUES ($1, $2, $3, $4, $5)
        `;

        await client.query(membershipQuery, [
          userId,
          userData.organizationId,
          JSON.stringify(userData.roles || []),
          now,
          'active'
        ]);
      }

      logger.info('User created successfully', { userId, email: userData.email });
      
      const user = await this.findById(userId, client);
      if (!user) {
        throw new Error('Failed to create user');
      }
      return user;
    });
  }

  async findById(id: string, client?: PoolClient): Promise<User | null> {
    const query = `
      SELECT 
        u.*,
        up.first_name, up.last_name, up.display_name, up.avatar, up.bio,
        up.date_of_birth, up.phone_number, up.timezone, up.language,
        upr.preferences,
        COALESCE(
          json_agg(
            json_build_object(
              'organizationId', om.organization_id,
              'roles', om.roles,
              'joinedAt', om.joined_at,
              'status', om.status
            )
          ) FILTER (WHERE om.organization_id IS NOT NULL), 
          '[]'::json
        ) as organizations
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN user_preferences upr ON u.id = upr.user_id
      LEFT JOIN organization_memberships om ON u.id = om.user_id
      WHERE u.id = $1
      GROUP BY u.id, up.user_id, upr.user_id
    `;

    const executor: any = client || databaseService;
    const result = await executor.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToUser(result.rows[0]);
  }

  async findByEmail(email: string): Promise<User | null> {
    const query = `
      SELECT 
        u.*,
        up.first_name, up.last_name, up.display_name, up.avatar, up.bio,
        up.date_of_birth, up.phone_number, up.timezone, up.language,
        upr.preferences,
        COALESCE(
          json_agg(
            json_build_object(
              'organizationId', om.organization_id,
              'roles', om.roles,
              'joinedAt', om.joined_at,
              'status', om.status
            )
          ) FILTER (WHERE om.organization_id IS NOT NULL), 
          '[]'::json
        ) as organizations
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN user_preferences upr ON u.id = upr.user_id
      LEFT JOIN organization_memberships om ON u.id = om.user_id
      WHERE u.email = $1
      GROUP BY u.id, up.user_id, upr.user_id
    `;

    const result = await databaseService.query(query, [email]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToUser(result.rows[0]);
  }

  async update(id: string, updateData: UpdateUserRequest): Promise<User | null> {
    return await databaseService.transaction(async (client: PoolClient) => {
      const now = new Date();

      // Update user table if needed
      if (updateData.isActive !== undefined) {
        const userQuery = `
          UPDATE users 
          SET is_active = $1, updated_at = $2
          WHERE id = $3
        `;
        await client.query(userQuery, [updateData.isActive, now, id]);
      }

      // Update profile if provided
      if (updateData.profile) {
        const profileFields = [];
        const profileValues = [];
        let paramIndex = 1;

        Object.entries(updateData.profile).forEach(([key, value]) => {
          if (value !== undefined) {
            const dbField = this.camelToSnake(key);
            profileFields.push(`${dbField} = $${paramIndex}`);
            profileValues.push(value);
            paramIndex++;
          }
        });

        if (profileFields.length > 0) {
          profileFields.push(`updated_at = $${paramIndex}`);
          profileValues.push(now, id);

          const profileQuery = `
            UPDATE user_profiles 
            SET ${profileFields.join(', ')}
            WHERE user_id = $${paramIndex + 1}
          `;
          await client.query(profileQuery, profileValues);
        }
      }

      // Update preferences if provided
      if (updateData.preferences) {
        // First get current preferences
        const currentPrefsResult = await client.query(
          'SELECT preferences FROM user_preferences WHERE user_id = $1',
          [id]
        );

        let updatedPreferences = updateData.preferences;
        if (currentPrefsResult.rows.length > 0) {
          const currentPrefs = currentPrefsResult.rows[0].preferences;
          updatedPreferences = { ...currentPrefs, ...updateData.preferences };
        }

        const preferencesQuery = `
          UPDATE user_preferences 
          SET preferences = $1, updated_at = $2
          WHERE user_id = $3
        `;
        await client.query(preferencesQuery, [
          JSON.stringify(updatedPreferences),
          now,
          id
        ]);
      }

      logger.info('User updated successfully', { userId: id });
      
      return await this.findById(id, client);
    });
  }

  async delete(id: string): Promise<boolean> {
    return await databaseService.transaction(async (client: PoolClient) => {
      // Delete in reverse order of dependencies
      await client.query('DELETE FROM organization_memberships WHERE user_id = $1', [id]);
      await client.query('DELETE FROM user_preferences WHERE user_id = $1', [id]);
      await client.query('DELETE FROM user_profiles WHERE user_id = $1', [id]);
      
      const result = await client.query('DELETE FROM users WHERE id = $1', [id]);
      
      logger.info('User deleted successfully', { userId: id });
      
      return (result.rowCount || 0) > 0;
    });
  }

  async search(query: UserSearchQuery): Promise<UserSearchResult> {
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    // Build WHERE conditions
    if (query.query) {
      conditions.push(`(
        u.email ILIKE $${paramIndex} OR 
        up.first_name ILIKE $${paramIndex} OR 
        up.last_name ILIKE $${paramIndex} OR
        CONCAT(up.first_name, ' ', up.last_name) ILIKE $${paramIndex}
      )`);
      params.push(`%${query.query}%`);
      paramIndex++;
    }

    if (query.organizationId) {
      conditions.push(`om.organization_id = $${paramIndex}`);
      params.push(query.organizationId);
      paramIndex++;
    }

    if (query.isActive !== undefined) {
      conditions.push(`u.is_active = $${paramIndex}`);
      params.push(query.isActive);
      paramIndex++;
    }

    if (query.emailVerified !== undefined) {
      conditions.push(`u.email_verified = $${paramIndex}`);
      params.push(query.emailVerified);
      paramIndex++;
    }

    if (query.createdAfter) {
      conditions.push(`u.created_at >= $${paramIndex}`);
      params.push(query.createdAfter);
      paramIndex++;
    }

    if (query.createdBefore) {
      conditions.push(`u.created_at <= $${paramIndex}`);
      params.push(query.createdBefore);
      paramIndex++;
    }

    if (query.lastLoginAfter) {
      conditions.push(`u.last_login_at >= $${paramIndex}`);
      params.push(query.lastLoginAfter);
      paramIndex++;
    }

    if (query.lastLoginBefore) {
      conditions.push(`u.last_login_at <= $${paramIndex}`);
      params.push(query.lastLoginBefore);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Build ORDER BY clause
    const sortBy = query.sortBy || 'created_at';
    const sortOrder = query.sortOrder || 'desc';
    const orderBy = `ORDER BY ${this.camelToSnake(sortBy)} ${sortOrder.toUpperCase()}`;

    // Pagination
    const limit = Math.min(query.limit || 20, 100);
    const offset = ((query.page || 1) - 1) * limit;

    // Count query
    const countQuery = `
      SELECT COUNT(DISTINCT u.id) as total
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN organization_memberships om ON u.id = om.user_id
      ${whereClause}
    `;

    const countResult = await databaseService.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Data query
    const dataQuery = `
      SELECT 
        u.*,
        up.first_name, up.last_name, up.display_name, up.avatar, up.bio,
        up.date_of_birth, up.phone_number, up.timezone, up.language,
        upr.preferences,
        COALESCE(
          json_agg(
            json_build_object(
              'organizationId', om.organization_id,
              'roles', om.roles,
              'joinedAt', om.joined_at,
              'status', om.status
            )
          ) FILTER (WHERE om.organization_id IS NOT NULL), 
          '[]'::json
        ) as organizations
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN user_preferences upr ON u.id = upr.user_id
      LEFT JOIN organization_memberships om ON u.id = om.user_id
      ${whereClause}
      GROUP BY u.id, up.user_id, upr.user_id
      ${orderBy}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const dataResult = await databaseService.query(dataQuery, [...params, limit, offset]);

    const users = dataResult.rows.map(row => this.mapRowToUser(row));
    const totalPages = Math.ceil(total / limit);

    return {
      users,
      total,
      page: query.page || 1,
      limit,
      totalPages
    };
  }

  async updateLastLogin(id: string): Promise<void> {
    const query = `
      UPDATE users 
      SET last_login_at = $1, updated_at = $1
      WHERE id = $2
    `;
    
    await databaseService.query(query, [new Date(), id]);
  }

  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      profile: {
        firstName: row.first_name,
        lastName: row.last_name,
        displayName: row.display_name,
        avatar: row.avatar,
        bio: row.bio,
        dateOfBirth: row.date_of_birth,
        phoneNumber: row.phone_number,
        timezone: row.timezone,
        language: row.language
      },
      preferences: row.preferences || {},
      roles: [], // Will be populated by role service
      organizations: row.organizations || [],
      isActive: row.is_active,
      emailVerified: row.email_verified,
      lastLoginAt: row.last_login_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}

export const userRepository = new UserRepository();