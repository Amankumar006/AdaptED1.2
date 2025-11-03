import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticateToken, optionalAuth } from '../middleware/auth.middleware';
import { 
  validateLogin, 
  validateRefreshToken, 
  validateLogout 
} from '../middleware/validation.middleware';
import { 
  authMetricsMiddleware, 
  tokenMetricsMiddleware 
} from '../middleware/monitoring.middleware';

const router = Router();
const authController = new AuthController();

/**
 * @route POST /auth/login
 * @desc User login with email and password
 * @access Public
 */
router.post('/login', 
  authMetricsMiddleware('login'),
  validateLogin, 
  authController.login.bind(authController)
);

/**
 * @route POST /auth/refresh
 * @desc Refresh access token using refresh token
 * @access Public
 */
router.post('/refresh', 
  tokenMetricsMiddleware('refresh'),
  validateRefreshToken, 
  authController.refreshToken.bind(authController)
);

/**
 * @route POST /auth/logout
 * @desc User logout (revoke tokens)
 * @access Private
 */
router.post('/logout', 
  authenticateToken, 
  tokenMetricsMiddleware('revoke'),
  validateLogout, 
  authController.logout.bind(authController)
);

/**
 * @route GET /auth/validate
 * @desc Validate access token
 * @access Public
 */
router.get('/validate', 
  tokenMetricsMiddleware('validate'),
  authController.validateToken.bind(authController)
);

/**
 * @route GET /auth/profile
 * @desc Get current user profile
 * @access Private
 */
router.get('/profile', authenticateToken, authController.getProfile.bind(authController));

/**
 * @route GET /auth/health
 * @desc Health check endpoint
 * @access Public
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'auth-service'
  });
});

export { router as authRoutes };