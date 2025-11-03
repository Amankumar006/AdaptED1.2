import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as MicrosoftStrategy } from 'passport-microsoft';
import { Strategy as SamlStrategy } from 'passport-saml';
import { config } from '../config/config';
import { logger } from '../utils/logger';
import { 
  OAuthProfile, 
  AuthProvider, 
  SAMLConfig,
  User 
} from '../types/auth.types';

class OAuthService {
  constructor() {
    this.initializeStrategies();
  }

  private initializeStrategies(): void {
    // Google OAuth Strategy
    if (config.oauth.google.clientId && config.oauth.google.clientSecret) {
      passport.use(new GoogleStrategy({
        clientID: config.oauth.google.clientId,
        clientSecret: config.oauth.google.clientSecret,
        callbackURL: config.oauth.google.callbackUrl,
        scope: ['profile', 'email']
      }, this.handleGoogleAuth.bind(this)));
    }

    // Microsoft OAuth Strategy
    if (config.oauth.microsoft.clientId && config.oauth.microsoft.clientSecret) {
      passport.use(new MicrosoftStrategy({
        clientID: config.oauth.microsoft.clientId,
        clientSecret: config.oauth.microsoft.clientSecret,
        callbackURL: config.oauth.microsoft.callbackUrl,
        scope: ['user.read']
      }, this.handleMicrosoftAuth.bind(this)));
    }

    // SAML Strategy
    if (config.saml.entryPoint && config.saml.cert) {
      // Cast strategy instance to passport.Strategy to satisfy typings
      const saml = new SamlStrategy({
        entryPoint: config.saml.entryPoint,
        issuer: config.saml.issuer,
        cert: config.saml.cert,
        callbackUrl: config.saml.callbackUrl,
        authnRequestBinding: 'HTTP-POST',
        identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress'
      }, this.handleSamlAuth.bind(this)) as unknown as import('passport').Strategy;

      passport.use(saml);
    }

    // Passport serialization
    passport.serializeUser((user: any, done) => {
      done(null, user.id);
    });

    passport.deserializeUser(async (id: string, done) => {
      try {
        // TODO: Implement user lookup from database
        const user = await this.findUserById(id);
        done(null, user);
      } catch (error) {
        done(error, null);
      }
    });
  }

  /**
   * Handle Google OAuth authentication
   */
  private async handleGoogleAuth(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: any
  ): Promise<void> {
    try {
      const oauthProfile: OAuthProfile = {
        id: profile.id,
        email: profile.emails[0].value,
        firstName: profile.name.givenName,
        lastName: profile.name.familyName,
        avatar: profile.photos[0]?.value,
        provider: AuthProvider.GOOGLE
      };

      const user = await this.findOrCreateOAuthUser(oauthProfile);
      
      logger.info(`Google OAuth authentication successful for user ${user.id}`);
      done(null, user);
    } catch (error) {
      logger.error('Google OAuth authentication error:', error);
      done(error, null);
    }
  }

  /**
   * Handle Microsoft OAuth authentication
   */
  private async handleMicrosoftAuth(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: any
  ): Promise<void> {
    try {
      const oauthProfile: OAuthProfile = {
        id: profile.id,
        email: profile.emails[0].value,
        firstName: profile.name.givenName,
        lastName: profile.name.familyName,
        avatar: profile.photos[0]?.value,
        provider: AuthProvider.MICROSOFT
      };

      const user = await this.findOrCreateOAuthUser(oauthProfile);
      
      logger.info(`Microsoft OAuth authentication successful for user ${user.id}`);
      done(null, user);
    } catch (error) {
      logger.error('Microsoft OAuth authentication error:', error);
      done(error, null);
    }
  }

  /**
   * Handle SAML authentication
   */
  private async handleSamlAuth(profile: any, done: any): Promise<void> {
    try {
      const oauthProfile: OAuthProfile = {
        id: profile.nameID,
        email: profile.email || profile.nameID,
        firstName: profile.firstName || profile.givenName || '',
        lastName: profile.lastName || profile.surname || '',
        provider: AuthProvider.SAML
      };

      const user = await this.findOrCreateOAuthUser(oauthProfile);
      
      logger.info(`SAML authentication successful for user ${user.id}`);
      done(null, user);
    } catch (error) {
      logger.error('SAML authentication error:', error);
      done(error, null);
    }
  }

  /**
   * Find or create user from OAuth profile
   */
  private async findOrCreateOAuthUser(profile: OAuthProfile): Promise<User> {
    try {
      // First, try to find existing user by OAuth provider ID
      let user = await this.findUserByOAuthProvider(profile.provider, profile.id);
      
      if (user) {
        // Update user profile if needed
        await this.updateUserFromOAuthProfile(user, profile);
        return user;
      }

      // Try to find user by email
      user = await this.findUserByEmail(profile.email);
      
      if (user) {
        // Link OAuth account to existing user
        await this.linkOAuthAccount(user, profile);
        return user;
      }

      // Create new user
      user = await this.createUserFromOAuthProfile(profile);
      return user;
    } catch (error) {
      logger.error('Error finding or creating OAuth user:', error);
      throw error;
    }
  }

  /**
   * Find user by OAuth provider
   */
  private async findUserByOAuthProvider(provider: AuthProvider, providerId: string): Promise<User | null> {
    // TODO: Implement database lookup
    // This is a mock implementation
    return null;
  }

  /**
   * Find user by email
   */
  private async findUserByEmail(email: string): Promise<User | null> {
    // TODO: Implement database lookup
    // This is a mock implementation
    if (email === 'test@example.com') {
      return {
        id: '1',
        email: 'test@example.com',
        roles: [
          {
            id: '1',
            name: 'student',
            permissions: [],
            hierarchy: 1
          }
        ],
        organizations: [
          {
            organizationId: 'org1',
            roles: ['student'],
            joinedAt: new Date()
          }
        ],
        profile: {
          firstName: 'Test',
          lastName: 'User',
          timezone: 'UTC',
          language: 'en',
          preferences: {}
        },
        mfaEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
    return null;
  }

  /**
   * Find user by ID
   */
  private async findUserById(id: string): Promise<User | null> {
    // TODO: Implement database lookup
    // This is a mock implementation
    if (id === '1') {
      return {
        id: '1',
        email: 'test@example.com',
        roles: [
          {
            id: '1',
            name: 'student',
            permissions: [],
            hierarchy: 1
          }
        ],
        organizations: [
          {
            organizationId: 'org1',
            roles: ['student'],
            joinedAt: new Date()
          }
        ],
        profile: {
          firstName: 'Test',
          lastName: 'User',
          timezone: 'UTC',
          language: 'en',
          preferences: {}
        },
        mfaEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
    return null;
  }

  /**
   * Update user profile from OAuth data
   */
  private async updateUserFromOAuthProfile(user: User, profile: OAuthProfile): Promise<void> {
    // TODO: Implement database update
    logger.info(`Updated user ${user.id} profile from ${profile.provider} OAuth`);
  }

  /**
   * Link OAuth account to existing user
   */
  private async linkOAuthAccount(user: User, profile: OAuthProfile): Promise<void> {
    // TODO: Implement database update to link OAuth account
    logger.info(`Linked ${profile.provider} OAuth account to user ${user.id}`);
  }

  /**
   * Create new user from OAuth profile
   */
  private async createUserFromOAuthProfile(profile: OAuthProfile): Promise<User> {
    // TODO: Implement database creation
    const newUser: User = {
      id: Math.random().toString(36).substring(2, 15),
      email: profile.email,
      roles: [
        {
          id: '1',
          name: 'student',
          permissions: [],
          hierarchy: 1
        }
      ],
      organizations: [
        {
          organizationId: 'org1',
          roles: ['student'],
          joinedAt: new Date()
        }
      ],
      profile: {
        firstName: profile.firstName,
        lastName: profile.lastName,
        avatar: profile.avatar,
        timezone: 'UTC',
        language: 'en',
        preferences: {}
      },
      mfaEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    logger.info(`Created new user ${newUser.id} from ${profile.provider} OAuth`);
    return newUser;
  }

  /**
   * Generate OAuth authorization URL
   */
  generateAuthUrl(provider: AuthProvider, state?: string): string {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
    
    switch (provider) {
      case AuthProvider.GOOGLE:
        return `${baseUrl}/auth/google${state ? `?state=${state}` : ''}`;
      case AuthProvider.MICROSOFT:
        return `${baseUrl}/auth/microsoft${state ? `?state=${state}` : ''}`;
      case AuthProvider.SAML:
        return `${baseUrl}/auth/saml${state ? `?RelayState=${state}` : ''}`;
      default:
        throw new Error(`Unsupported OAuth provider: ${provider}`);
    }
  }

  /**
   * Validate OAuth state parameter
   */
  validateState(receivedState: string, expectedState: string): boolean {
    return receivedState === expectedState;
  }

  /**
   * Get supported OAuth providers
   */
  getSupportedProviders(): AuthProvider[] {
    const providers: AuthProvider[] = [];
    
    if (config.oauth.google.clientId) {
      providers.push(AuthProvider.GOOGLE);
    }
    
    if (config.oauth.microsoft.clientId) {
      providers.push(AuthProvider.MICROSOFT);
    }
    
    if (config.saml.entryPoint) {
      providers.push(AuthProvider.SAML);
    }
    
    return providers;
  }

  /**
   * Configure SAML for specific organization
   */
  configureSamlForOrganization(organizationId: string, samlConfig: SAMLConfig): void {
    // TODO: Implement dynamic SAML configuration per organization
    logger.info(`Configured SAML for organization ${organizationId}`);
  }

  /**
   * Get passport instance
   */
  getPassport(): typeof passport {
    return passport;
  }
}

export const oauthService = new OAuthService();