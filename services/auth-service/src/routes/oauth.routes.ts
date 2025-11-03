import { Router } from 'express';
import { body } from 'express-validator';
import { OAuthController } from '../controllers/oauth.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { oauthService } from '../services/oauth.service';

const router = Router();
const oauthController = new OAuthController();

// Initialize passport middleware
router.use(oauthService.getPassport().initialize());

/**
 * @route GET /oauth/providers
 * @desc Get supported OAuth providers
 * @access Public
 */
router.get('/providers', oauthController.getSupportedProviders.bind(oauthController));

/**
 * Google OAuth Routes
 */

/**
 * @route GET /oauth/google
 * @desc Initiate Google OAuth flow
 * @access Public
 */
router.get('/google', oauthController.initiateGoogleAuth.bind(oauthController));

/**
 * @route GET /oauth/google/callback
 * @desc Handle Google OAuth callback
 * @access Public
 */
router.get('/google/callback', oauthController.handleGoogleCallback.bind(oauthController));

/**
 * Microsoft OAuth Routes
 */

/**
 * @route GET /oauth/microsoft
 * @desc Initiate Microsoft OAuth flow
 * @access Public
 */
router.get('/microsoft', oauthController.initiateMicrosoftAuth.bind(oauthController));

/**
 * @route GET /oauth/microsoft/callback
 * @desc Handle Microsoft OAuth callback
 * @access Public
 */
router.get('/microsoft/callback', oauthController.handleMicrosoftCallback.bind(oauthController));

/**
 * SAML Routes
 */

/**
 * @route GET /oauth/saml
 * @desc Initiate SAML authentication
 * @access Public
 */
router.get('/saml', oauthController.initiateSamlAuth.bind(oauthController));

/**
 * @route POST /oauth/saml/callback
 * @desc Handle SAML callback
 * @access Public
 */
router.post('/saml/callback', oauthController.handleSamlCallback.bind(oauthController));

/**
 * @route GET /oauth/saml/metadata
 * @desc Get SAML metadata
 * @access Public
 */
router.get('/saml/metadata', oauthController.getSamlMetadata.bind(oauthController));

/**
 * Account Linking Routes
 */

/**
 * @route POST /oauth/link
 * @desc Link OAuth account to existing user
 * @access Private
 */
router.post('/link', 
  authenticateToken,
  [
    body('provider')
      .isIn(['google', 'microsoft', 'saml'])
      .withMessage('Provider must be one of: google, microsoft, saml')
  ],
  oauthController.linkAccount.bind(oauthController)
);

/**
 * @route POST /oauth/unlink
 * @desc Unlink OAuth account from user
 * @access Private
 */
router.post('/unlink',
  authenticateToken,
  [
    body('provider')
      .isIn(['google', 'microsoft', 'saml'])
      .withMessage('Provider must be one of: google, microsoft, saml')
  ],
  oauthController.unlinkAccount.bind(oauthController)
);

export { router as oauthRoutes };