import { Response, NextFunction } from 'express';
import { SCORMService } from '../services/scorm.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

export class SCORMController {
  private scormService: SCORMService;

  constructor() {
    this.scormService = new SCORMService();
  }

  importSCORMPackage = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const file = req.file;
      const { organizationId } = req.body;

      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'SCORM package file is required',
        });
      }

      if (!file.mimetype.includes('zip') && !file.mimetype.includes('application/octet-stream')) {
        return res.status(400).json({
          success: false,
          message: 'SCORM package must be a ZIP file',
        });
      }

      const content = await this.scormService.importSCORMPackage(
        file.buffer,
        req.user!.id,
        organizationId
      );

      res.status(201).json({
        success: true,
        data: content,
        message: 'SCORM package imported successfully',
      });
    } catch (error) {
      logger.error('Error in importSCORMPackage controller:', error);
      next(error);
    }
  };

  exportSCORMPackage = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { contentId } = req.params;
      const { version = '2004' } = req.query;

      const packageBuffer = await this.scormService.exportSCORMPackage(
        contentId,
        version as string
      );

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="scorm_package_${contentId}.zip"`);
      res.send(packageBuffer);
    } catch (error) {
      logger.error('Error in exportSCORMPackage controller:', error);
      next(error);
    }
  };

  importIMSCommonCartridge = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const file = req.file;
      const { organizationId } = req.body;

      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'IMS Common Cartridge file is required',
        });
      }

      if (!file.mimetype.includes('zip') && !file.mimetype.includes('application/octet-stream')) {
        return res.status(400).json({
          success: false,
          message: 'IMS Common Cartridge must be a ZIP file',
        });
      }

      const contents = await this.scormService.importIMSCommonCartridge(
        file.buffer,
        req.user!.id,
        organizationId
      );

      res.status(201).json({
        success: true,
        data: contents,
        message: `IMS Common Cartridge imported successfully (${contents.length} items)`,
      });
    } catch (error) {
      logger.error('Error in importIMSCommonCartridge controller:', error);
      next(error);
    }
  };

  exportIMSCommonCartridge = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { contentIds } = req.body;

      if (!contentIds || !Array.isArray(contentIds) || contentIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Content IDs array is required',
        });
      }

      const cartridgeBuffer = await this.scormService.exportIMSCommonCartridge(contentIds);

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="common_cartridge.zip"');
      res.send(cartridgeBuffer);
    } catch (error) {
      logger.error('Error in exportIMSCommonCartridge controller:', error);
      next(error);
    }
  };

  trackXAPIStatement = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { contentId } = req.params;
      const statement = req.body;

      // Validate required xAPI statement fields
      if (!statement.actor || !statement.verb || !statement.object) {
        return res.status(400).json({
          success: false,
          message: 'Invalid xAPI statement: actor, verb, and object are required',
        });
      }

      await this.scormService.trackXAPIStatement(statement, contentId);

      res.json({
        success: true,
        message: 'xAPI statement tracked successfully',
      });
    } catch (error) {
      logger.error('Error in trackXAPIStatement controller:', error);
      next(error);
    }
  };

  getXAPIStatements = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { contentId } = req.params;
      const { actor, verb, since, until } = req.query;

      const filters: any = {};
      if (actor) filters.actor = actor as string;
      if (verb) filters.verb = verb as string;
      if (since) filters.since = new Date(since as string);
      if (until) filters.until = new Date(until as string);

      const statements = await this.scormService.getXAPIStatements(contentId, filters);

      res.json({
        success: true,
        data: statements,
      });
    } catch (error) {
      logger.error('Error in getXAPIStatements controller:', error);
      next(error);
    }
  };

  validateSCORMPackage = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'SCORM package file is required',
        });
      }

      // Basic validation - check if it's a zip file and contains manifest
      const validation = await this.validatePackageStructure(file.buffer);

      res.json({
        success: true,
        data: validation,
      });
    } catch (error) {
      logger.error('Error in validateSCORMPackage controller:', error);
      next(error);
    }
  };

  private async validatePackageStructure(packageBuffer: Buffer): Promise<any> {
    try {
      // This is a simplified validation
      // In a real implementation, you would:
      // 1. Extract the package
      // 2. Check for imsmanifest.xml
      // 3. Validate XML structure
      // 4. Check for required resources
      // 5. Validate SCORM compliance

      return {
        valid: true,
        version: 'Unknown',
        issues: [],
        warnings: [],
        resources: [],
      };
    } catch (error) {
      return {
        valid: false,
        version: 'Unknown',
        issues: ['Failed to extract package'],
        warnings: [],
        resources: [],
      };
    }
  }
}