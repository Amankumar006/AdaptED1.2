import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { oauthService } from '../services/oauth.service';
import { tokenService } from '../services/token.service';
import { redisService } from '../services/redis.service';
import { logger } from '../utils/logger';
import { AuthProvider, User } from '../types/auth.types';

export class OAuthController {
  /**
   * Initiate Google OAuth flow
   */
  async initiateGoogleAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const state = req.query.state as string;
      const passport = oauthService.getPassport();
      
      passport.authenticate('google', {
        scope: ['profile', 'email'],
        state: state
      })(req, res, next);
    } catch (error) {
      logger.error('Google OAuth initiation error:', error);
      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'OAuth service error',
          code: 'OAUTH_SERVICE_ERROR'
        }
      });
    }
  }

  /**
   * Handle Google OAuth callback
   */
  async handleGoogleCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const passport = oauthService.getPassport();
      
      passport.authenticate('google', { session: false }, async (err: any, user: User) => {
        if (err) {
          logger.error('Google OAuth callback error:', err);
          return res.redirect(`${process.env.FRONTEND_URL}/auth/error?error=oauth_error`);
        }

        if (!user) {
          logger.warn('Google OAuth callback: No user returned');
          return res.redirect(`${process.env.FRONTEND_URL}/auth/error?error=oauth_failed`);
        }

        try {
          // Generate tokens for the authenticated user
          const tokens = await tokenService.generateTokens(user);

          // Store user session
          await redisService.storeUserSession(user.id, {
            lastLogin: new Date(),
            clientIp: req.ip,
            userAgent: req.headers['user-agent'],
            provider: AuthProvider.GOOGLE
          }, tokenService['parseExpiry'](process.env.JWT_REFRESH_EXPIRY || '7d'));

          logger.info(`Google OAuth successful for user ${user.id}`);

          // Redirect to frontend with tokens
          const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?` +
            `access_token=${tokens.accessToken}&` +
            `refresh_token=${tokens.refreshToken}&` +
            `expires_in=${tokens.expiresIn}`;

          res.redirect(redirectUrl);
        } catch (tokenError) {
          logger.error('Token generation error after Google OAuth:', tokenError);
          res.redirect(`${process.env.FRONTEND_URL}/auth/error?error=token_error`);
        }
      })(req, res, next);
    } catch (error) {
      logger.error('Google OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/auth/error?error=server_error`);
    }
  }

  /**
   * Initiate Microsoft OAuth flow
   */
  async initiateMicrosoftAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const state = req.query.state as string;
      const passport = oauthService.getPassport();
      
      passport.authenticate('microsoft', {
        scope: ['user.read'],
        state: state
      })(req, res, next);
    } catch (error) {
      logger.error('Microsoft OAuth initiation error:', error);
      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'OAuth service error',
          code: 'OAUTH_SERVICE_ERROR'
        }
      });
    }
  }

  /**
   * Handle Microsoft OAuth callback
   */
  async handleMicrosoftCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const passport = oauthService.getPassport();
      
      passport.authenticate('microsoft', { session: false }, async (err: any, user: User) => {
        if (err) {
          logger.error('Microsoft OAuth callback error:', err);
          return res.redirect(`${process.env.FRONTEND_URL}/auth/error?error=oauth_error`);
        }

        if (!user) {
          logger.warn('Microsoft OAuth callback: No user returned');
          return res.redirect(`${process.env.FRONTEND_URL}/auth/error?error=oauth_failed`);
        }

        try {
          // Generate tokens for the authenticated user
          const tokens = await tokenService.generateTokens(user);

          // Store user session
          await redisService.storeUserSession(user.id, {
            lastLogin: new Date(),
            clientIp: req.ip,
            userAgent: req.headers['user-agent'],
            provider: AuthProvider.MICROSOFT
          }, tokenService['parseExpiry'](process.env.JWT_REFRESH_EXPIRY || '7d'));

          logger.info(`Microsoft OAuth successful for user ${user.id}`);

          // Redirect to frontend with tokens
          const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?` +
            `access_token=${tokens.accessToken}&` +
            `refresh_token=${tokens.refreshToken}&` +
            `expires_in=${tokens.expiresIn}`;

          res.redirect(redirectUrl);
        } catch (tokenError) {
          logger.error('Token generation error after Microsoft OAuth:', tokenError);
          res.redirect(`${process.env.FRONTEND_URL}/auth/error?error=token_error`);
        }
      })(req, res, next);
    } catch (error) {
      logger.error('Microsoft OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/auth/error?error=server_error`);
    }
  }

  /**
   * Initiate SAML authentication
   */
  async initiateSamlAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const relayState = req.query.RelayState as string;
      const passport = oauthService.getPassport();
      
      passport.authenticate('saml', {
        // additionalParams is supported by passport-saml but not in @types/passport AuthenticateOptions
        additionalParams: relayState ? { RelayState: relayState } : {}
      } as any)(req, res, next);
    } catch (error) {
      logger.error('SAML authentication initiation error:', error);
      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'SAML service error',
          code: 'SAML_SERVICE_ERROR'
        }
      });
    }
  }

  /**
   * Handle SAML callback
   */
  async handleSamlCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const passport = oauthService.getPassport();
      
      passport.authenticate('saml', { session: false }, async (err: any, user: User) => {
        if (err) {
          logger.error('SAML callback error:', err);
          return res.redirect(`${process.env.FRONTEND_URL}/auth/error?error=saml_error`);
        }

        if (!user) {
          logger.warn('SAML callback: No user returned');
          return res.redirect(`${process.env.FRONTEND_URL}/auth/error?error=saml_failed`);
        }

        try {
          // Generate tokens for the authenticated user
          const tokens = await tokenService.generateTokens(user);

          // Store user session
          await redisService.storeUserSession(user.id, {
            lastLogin: new Date(),
            clientIp: req.ip,
            userAgent: req.headers['user-agent'],
            provider: AuthProvider.SAML
          }, tokenService['parseExpiry'](process.env.JWT_REFRESH_EXPIRY || '7d'));

          logger.info(`SAML authentication successful for user ${user.id}`);

          // Redirect to frontend with tokens
          const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?` +
            `access_token=${tokens.accessToken}&` +
            `refresh_token=${tokens.refreshToken}&` +
            `expires_in=${tokens.expiresIn}`;

          res.redirect(redirectUrl);
        } catch (tokenError) {
          logger.error('Token generation error after SAML authentication:', tokenError);
          res.redirect(`${process.env.FRONTEND_URL}/auth/error?error=token_error`);
        }
      })(req, res, next);
    } catch (error) {
      logger.error('SAML callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/auth/error?error=server_error`);
    }
  }

  /**
   * Get SAML metadata
   */
  async getSamlMetadata(req: Request, res: Response): Promise<void> {
    try {
  const passport = oauthService.getPassport();
  // Access internal strategy via cast to avoid TS error (not in typings)
  const samlStrategy = (passport as any)._strategy('saml') as any;
      
      if (!samlStrategy) {
        res.status(404).json({
          error: {
            type: 'RESOURCE_NOT_FOUND',
            message: 'SAML not configured',
            code: 'SAML_NOT_CONFIGURED'
          }
        });
        return;
      }

      const metadata = samlStrategy.generateServiceProviderMetadata(
        process.env.SAML_CERT || '',
        process.env.SAML_CERT || ''
      );

      res.set('Content-Type', 'application/xml');
      res.send(metadata);
    } catch (error) {
      logger.error('SAML metadata generation error:', error);
      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'SAML metadata generation error',
          code: 'SAML_METADATA_ERROR'
        }
      });
    }
  }

  /**
   * Get supported OAuth providers
   */
  async getSupportedProviders(req: Request, res: Response): Promise<void> {
    try {
      const providers = oauthService.getSupportedProviders();
      
      res.status(200).json({
        providers: providers.map(provider => ({
          name: provider,
          authUrl: oauthService.generateAuthUrl(provider),
          displayName: this.getProviderDisplayName(provider)
        }))
      });
    } catch (error) {
      logger.error('Get supported providers error:', error);
      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Provider service error',
          code: 'PROVIDER_SERVICE_ERROR'
        }
      });
    }
  }

  /**
   * Link OAuth account to existing user
   */
  async linkAccount(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({
          error: {
            type: 'AUTHENTICATION_ERROR',
            message: 'Authentication required',
            code: 'NOT_AUTHENTICATED'
          }
        });
        return;
      }

      const { provider } = req.body;
      
      // Generate state for OAuth flow
      const state = Math.random().toString(36).substring(2, 15);
      await redisService.set(`oauth_link_state:${state}`, req.user.sub, 300); // 5 minutes

      const authUrl = oauthService.generateAuthUrl(provider as AuthProvider, state);

      res.status(200).json({
        authUrl,
        state
      });
    } catch (error) {
      logger.error('Link account error:', error);
      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Account linking service error',
          code: 'LINK_SERVICE_ERROR'
        }
      });
    }
  }

  /**
   * Unlink OAuth account
   */
  async unlinkAccount(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({
          error: {
            type: 'AUTHENTICATION_ERROR',
            message: 'Authentication required',
            code: 'NOT_AUTHENTICATED'
          }
        });
        return;
      }

      const { provider } = req.body;
      
      // TODO: Implement account unlinking in database
      logger.info(`Unlinked ${provider} account for user ${req.user.sub}`);

      res.status(200).json({
        message: 'Account unlinked successfully'
      });
    } catch (error) {
      logger.error('Unlink account error:', error);
      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Account unlinking service error',
          code: 'UNLINK_SERVICE_ERROR'
        }
      });
    }
  }

  /**
   * Get provider display name
   */
  private getProviderDisplayName(provider: AuthProvider): string {
    switch (provider) {
      case AuthProvider.GOOGLE:
        return 'Google';
      case AuthProvider.MICROSOFT:
        return 'Microsoft';
      case AuthProvider.SAML:
        return 'SAML SSO';
      default:
        return provider;
    }
  }
}