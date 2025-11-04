import { Pool, QueryResult } from 'pg';
import { User } from '../types/auth.types';
import { logger } from '../utils/logger';

class DatabaseService {
  private pool: Pool;
  private static instance: DatabaseService;

  private constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'educational_platform',
      user: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres_password',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err) => {
      logger.error('Unexpected error on idle client', err);
    });

    logger.info('Database pool initialized', {
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
    });
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Find user by email
   */
  async findUserByEmail(email: string): Promise<User | null> {
    try {
      const query = `
        SELECT 
          u.id,
          u.email,
          u.password_hash as "passwordHash",
          u.first_name as "firstName",
          u.last_name as "lastName",
          u.avatar,
          u.timezone,
          u.language,
          u.preferences,
          u.mfa_enabled as "mfaEnabled",
          u.mfa_secret as "mfaSecret",
          u.backup_codes as "backupCodes",
          u.email_verified as "emailVerified",
          u.email_verified_at as "emailVerifiedAt",
          u.last_login as "lastLogin",
          u.login_attempts as "loginAttempts",
          u.locked_until as "lockedUntil",
          u.created_at as "createdAt",
          u.updated_at as "updatedAt"
        FROM users u
        WHERE u.email = $1
        LIMIT 1
      `;

      const result: QueryResult = await this.pool.query(query, [email]);

      if (result.rows.length === 0) {
        return null;
      }

      const userRow = result.rows[0];

      // Fetch user roles
      const rolesQuery = `
        SELECT 
          r.id,
          r.name,
          r.description,
          r.hierarchy
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = $1
      `;

      const rolesResult = await this.pool.query(rolesQuery, [userRow.id]);

      // Fetch user organizations
      const orgsQuery = `
        SELECT 
          uo.organization_id as "organizationId",
          uo.joined_at as "joinedAt"
        FROM user_organizations uo
        WHERE uo.user_id = $1
      `;

      const orgsResult = await this.pool.query(orgsQuery, [userRow.id]);

      // Build user object
      const user: User = {
        id: userRow.id,
        email: userRow.email,
        passwordHash: userRow.passwordHash,
        roles: rolesResult.rows.map(role => ({
          id: role.id,
          name: role.name,
          description: role.description,
          permissions: [], // Will be populated if needed
          hierarchy: role.hierarchy
        })),
        organizations: orgsResult.rows.map(org => ({
          organizationId: org.organizationId,
          roles: [], // Can be expanded if needed
          joinedAt: org.joinedAt
        })),
        profile: {
          firstName: userRow.firstName || '',
          lastName: userRow.lastName || '',
          avatar: userRow.avatar,
          timezone: userRow.timezone || 'UTC',
          language: userRow.language || 'en',
          preferences: userRow.preferences || {}
        },
        mfaEnabled: userRow.mfaEnabled || false,
        mfaSecret: userRow.mfaSecret,
        backupCodes: userRow.backupCodes,
        createdAt: userRow.createdAt,
        updatedAt: userRow.updatedAt
      };

      return user;
    } catch (error) {
      logger.error('Error finding user by email', { error, email });
      throw error;
    }
  }

  /**
   * Find user by ID
   */
  async findUserById(userId: string): Promise<User | null> {
    try {
      const query = `
        SELECT 
          u.id,
          u.email,
          u.password_hash as "passwordHash",
          u.first_name as "firstName",
          u.last_name as "lastName",
          u.avatar,
          u.timezone,
          u.language,
          u.preferences,
          u.mfa_enabled as "mfaEnabled",
          u.mfa_secret as "mfaSecret",
          u.backup_codes as "backupCodes",
          u.email_verified as "emailVerified",
          u.email_verified_at as "emailVerifiedAt",
          u.last_login as "lastLogin",
          u.login_attempts as "loginAttempts",
          u.locked_until as "lockedUntil",
          u.created_at as "createdAt",
          u.updated_at as "updatedAt"
        FROM users u
        WHERE u.id = $1
        LIMIT 1
      `;

      const result: QueryResult = await this.pool.query(query, [userId]);

      if (result.rows.length === 0) {
        return null;
      }

      const userRow = result.rows[0];

      // Fetch user roles
      const rolesQuery = `
        SELECT 
          r.id,
          r.name,
          r.description,
          r.hierarchy
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = $1
      `;

      const rolesResult = await this.pool.query(rolesQuery, [userRow.id]);

      // Fetch user organizations
      const orgsQuery = `
        SELECT 
          uo.organization_id as "organizationId",
          uo.joined_at as "joinedAt"
        FROM user_organizations uo
        WHERE uo.user_id = $1
      `;

      const orgsResult = await this.pool.query(orgsQuery, [userRow.id]);

      const user: User = {
        id: userRow.id,
        email: userRow.email,
        passwordHash: userRow.passwordHash,
        roles: rolesResult.rows.map(role => ({
          id: role.id,
          name: role.name,
          description: role.description,
          permissions: [],
          hierarchy: role.hierarchy
        })),
        organizations: orgsResult.rows.map(org => ({
          organizationId: org.organizationId,
          roles: [],
          joinedAt: org.joinedAt
        })),
        profile: {
          firstName: userRow.firstName || '',
          lastName: userRow.lastName || '',
          avatar: userRow.avatar,
          timezone: userRow.timezone || 'UTC',
          language: userRow.language || 'en',
          preferences: userRow.preferences || {}
        },
        mfaEnabled: userRow.mfaEnabled || false,
        mfaSecret: userRow.mfaSecret,
        backupCodes: userRow.backupCodes,
        createdAt: userRow.createdAt,
        updatedAt: userRow.updatedAt
      };

      return user;
    } catch (error) {
      logger.error('Error finding user by ID', { error, userId });
      throw error;
    }
  }

  /**
   * Update user's last login timestamp
   */
  async updateLastLogin(userId: string): Promise<void> {
    try {
      const query = `
        UPDATE users
        SET last_login = NOW(),
            login_attempts = 0,
            updated_at = NOW()
        WHERE id = $1
      `;

      await this.pool.query(query, [userId]);
    } catch (error) {
      logger.error('Error updating last login', { error, userId });
      throw error;
    }
  }

  /**
   * Increment login attempts
   */
  async incrementLoginAttempts(email: string): Promise<number> {
    try {
      const query = `
        UPDATE users
        SET login_attempts = login_attempts + 1,
            updated_at = NOW()
        WHERE email = $1
        RETURNING login_attempts
      `;

      const result = await this.pool.query(query, [email]);
      return result.rows[0]?.login_attempts || 0;
    } catch (error) {
      logger.error('Error incrementing login attempts', { error, email });
      throw error;
    }
  }

  /**
   * Lock user account
   */
  async lockAccount(email: string, lockDuration: number): Promise<void> {
    try {
      const query = `
        UPDATE users
        SET locked_until = NOW() + INTERVAL '1 millisecond' * $1,
            updated_at = NOW()
        WHERE email = $2
      `;

      await this.pool.query(query, [lockDuration, email]);
    } catch (error) {
      logger.error('Error locking account', { error, email });
      throw error;
    }
  }

  /**
   * Reset login attempts
   */
  async resetLoginAttempts(userId: string): Promise<void> {
    try {
      const query = `
        UPDATE users
        SET login_attempts = 0,
            locked_until = NULL,
            updated_at = NOW()
        WHERE id = $1
      `;

      await this.pool.query(query, [userId]);
    } catch (error) {
      logger.error('Error resetting login attempts', { error, userId });
      throw error;
    }
  }

  /**
   * Create a new user
   */
  async createUser(userData: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    role?: string;
  }): Promise<User> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Insert user
      const insertUserQuery = `
        INSERT INTO users (
          email, 
          password_hash, 
          first_name, 
          last_name,
          email_verified,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING id, email, first_name as "firstName", last_name as "lastName", created_at as "createdAt"
      `;

      const userResult = await client.query(insertUserQuery, [
        userData.email,
        userData.passwordHash,
        userData.firstName,
        userData.lastName,
        false // email not verified by default
      ]);

      const newUser = userResult.rows[0];

      // Assign default role (student) and organization
      const roleId = userData.role === 'teacher' 
        ? '00000000-0000-0000-0000-000000000003' // teacher
        : '00000000-0000-0000-0000-000000000004'; // student (default)
      
      const organizationId = '00000000-0000-0000-0000-000000000001'; // Default Organization

      // Insert user role
      const insertRoleQuery = `
        INSERT INTO user_roles (user_id, role_id, organization_id, assigned_at)
        VALUES ($1, $2, $3, NOW())
      `;

      await client.query(insertRoleQuery, [newUser.id, roleId, organizationId]);

      // Insert user organization
      const insertOrgQuery = `
        INSERT INTO user_organizations (user_id, organization_id, joined_at)
        VALUES ($1, $2, NOW())
      `;

      await client.query(insertOrgQuery, [newUser.id, organizationId]);

      await client.query('COMMIT');

      logger.info('User created successfully', { 
        userId: newUser.id, 
        email: userData.email,
        role: userData.role || 'student'
      });

      // Return the complete user object
      return await this.findUserById(newUser.id) as User;
    } catch (error: any) {
      await client.query('ROLLBACK');
      
      // Check for duplicate email
      if (error.code === '23505' && error.constraint === 'users_email_key') {
        const duplicateError = new Error('Email already exists');
        (duplicateError as any).code = 'DUPLICATE_EMAIL';
        throw duplicateError;
      }
      
      logger.error('Error creating user', { error, email: userData.email });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Execute a raw query (for debugging/admin purposes)
   */
  async query(text: string, params?: any[]): Promise<QueryResult> {
    return await this.pool.query(text, params);
  }

  /**
   * Close database connection pool
   */
  async close(): Promise<void> {
    await this.pool.end();
    logger.info('Database connection pool closed');
  }
}

export const databaseService = DatabaseService.getInstance();
export default databaseService;
