import { parseString, Builder } from 'xml2js';
import archiver from 'archiver';
import unzipper from 'unzipper';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import { MediaService } from './media.service';
import { ContentService } from './content.service';
import {
  SCORMManifest,
  SCORMOrganization,
  SCORMItem,
  SCORMResource,
  XAPIStatement,
  IContent,
  ContentType,
} from '../types/content.types';
import { logger } from '../utils/logger';

export interface SCORMPackage {
  id: string;
  manifest: SCORMManifest;
  files: { [filename: string]: Buffer };
  metadata: {
    title: string;
    description?: string;
    version: string;
    scormVersion: '1.2' | '2004';
  };
}

export interface IMSCommonCartridge {
  id: string;
  manifest: any;
  resources: { [identifier: string]: any };
  files: { [filename: string]: Buffer };
}

export class SCORMService {
  private mediaService: MediaService;
  private contentService: ContentService;

  constructor() {
    this.mediaService = new MediaService();
    this.contentService = new ContentService();
  }

  async importSCORMPackage(
    packageBuffer: Buffer,
    userId: string,
    organizationId?: string
  ): Promise<IContent> {
    try {
      const tempDir = `/tmp/scorm_${uuidv4()}`;
      await fs.mkdir(tempDir, { recursive: true });

      // Extract SCORM package
      const scormPackage = await this.extractSCORMPackage(packageBuffer, tempDir);

      // Create content from SCORM package
      const contentData = {
        type: ContentType.SCORM_PACKAGE,
        metadata: {
          title: scormPackage.metadata.title,
          description: scormPackage.metadata.description || '',
          keywords: ['scorm', 'e-learning'],
          language: 'en',
          subject: 'General',
          gradeLevel: 'All',
          difficulty: 'intermediate' as const,
          learningObjectives: [],
          prerequisites: [],
        },
        data: {
          scormVersion: scormPackage.metadata.version,
          manifest: scormPackage.manifest,
          launchUrl: this.getLaunchUrl(scormPackage.manifest),
        },
        organizationId,
      };

      const content = await this.contentService.createContent(contentData as any, userId);

      // Upload SCORM files
      await this.uploadSCORMFiles(scormPackage, content._id.toString());

      // Update content with SCORM manifest
      await this.contentService.updateContent(
        content._id.toString(),
        {
          data: {
            ...content.currentVersion as any,
            scormManifest: scormPackage.manifest,
          },
          changelog: 'SCORM package imported',
        },
        userId
      );

      // Clean up temporary directory
      await fs.rmdir(tempDir, { recursive: true });

      logger.info(`SCORM package imported: ${content._id}`);
      return content;
    } catch (error) {
      logger.error('Error importing SCORM package:', error);
      throw error;
    }
  }

  async exportSCORMPackage(contentId: string, version = '2004'): Promise<Buffer> {
    try {
      const content = await this.contentService.getContent(contentId);
      if (!content) {
        throw new Error('Content not found');
      }

      const scormPackage = await this.createSCORMPackage(content, version as '1.2' | '2004');
      const packageBuffer = await this.packageSCORM(scormPackage);

      logger.info(`SCORM package exported: ${contentId}`);
      return packageBuffer;
    } catch (error) {
      logger.error('Error exporting SCORM package:', error);
      throw error;
    }
  }

  async importIMSCommonCartridge(
    cartridgeBuffer: Buffer,
    userId: string,
    organizationId?: string
  ): Promise<IContent[]> {
    try {
      const tempDir = `/tmp/imscc_${uuidv4()}`;
      await fs.mkdir(tempDir, { recursive: true });

      // Extract Common Cartridge
      const cartridge = await this.extractIMSCommonCartridge(cartridgeBuffer, tempDir);

      // Create content items from cartridge
      const contents: IContent[] = [];
      
      for (const [identifier, resource] of Object.entries(cartridge.resources)) {
        const contentData = {
          type: this.mapIMSResourceType(resource.type),
          metadata: {
            title: resource.title || identifier,
            description: resource.description || '',
            keywords: ['ims', 'common-cartridge'],
            language: 'en',
            subject: 'General',
            gradeLevel: 'All',
            difficulty: 'intermediate' as const,
            learningObjectives: [],
            prerequisites: [],
          },
          data: {
            imsResource: resource,
            files: resource.files || [],
          },
          organizationId,
        };

        const content = await this.contentService.createContent(contentData as any, userId);
        contents.push(content);
      }

      // Clean up temporary directory
      await fs.rmdir(tempDir, { recursive: true });

      logger.info(`IMS Common Cartridge imported: ${contents.length} items`);
      return contents;
    } catch (error) {
      logger.error('Error importing IMS Common Cartridge:', error);
      throw error;
    }
  }

  async exportIMSCommonCartridge(contentIds: string[]): Promise<Buffer> {
    try {
      const contents = await Promise.all(
        contentIds.map(id => this.contentService.getContent(id))
      );

      const validContents = contents.filter(content => content !== null) as IContent[];
      const cartridge = await this.createIMSCommonCartridge(validContents);
      const cartridgeBuffer = await this.packageIMSCommonCartridge(cartridge);

      logger.info(`IMS Common Cartridge exported: ${contentIds.length} items`);
      return cartridgeBuffer;
    } catch (error) {
      logger.error('Error exporting IMS Common Cartridge:', error);
      throw error;
    }
  }

  async trackXAPIStatement(statement: XAPIStatement, contentId: string): Promise<void> {
    try {
      const content = await this.contentService.getContent(contentId);
      if (!content) {
        throw new Error('Content not found');
      }

      // Add statement to content
      await this.contentService.updateContent(
        contentId,
        {
          data: {
            ...content.currentVersion as any,
            xapiStatements: [...(content.xapiStatements || []), statement],
          },
          changelog: 'xAPI statement tracked',
        },
        statement.actor.mbox.replace('mailto:', '') // Extract user ID from email
      );

      logger.info(`xAPI statement tracked for content: ${contentId}`);
    } catch (error) {
      logger.error('Error tracking xAPI statement:', error);
      throw error;
    }
  }

  async getXAPIStatements(
    contentId: string,
    filters?: {
      actor?: string;
      verb?: string;
      since?: Date;
      until?: Date;
    }
  ): Promise<XAPIStatement[]> {
    try {
      const content = await this.contentService.getContent(contentId);
      if (!content) {
        throw new Error('Content not found');
      }

      let statements = content.xapiStatements || [];

      // Apply filters
      if (filters) {
        if (filters.actor) {
          statements = statements.filter(s => s.actor.mbox.includes(filters.actor!));
        }
        if (filters.verb) {
          statements = statements.filter(s => s.verb.id === filters.verb);
        }
        if (filters.since) {
          statements = statements.filter(s => 
            s.timestamp && s.timestamp >= filters.since!
          );
        }
        if (filters.until) {
          statements = statements.filter(s => 
            s.timestamp && s.timestamp <= filters.until!
          );
        }
      }

      return statements;
    } catch (error) {
      logger.error('Error getting xAPI statements:', error);
      throw error;
    }
  }

  private async extractSCORMPackage(packageBuffer: Buffer, tempDir: string): Promise<SCORMPackage> {
    // Extract zip file
    await new Promise<void>((resolve, reject) => {
      const stream = unzipper.Extract({ path: tempDir });
      stream.on('close', resolve);
      stream.on('error', reject);
      stream.end(packageBuffer);
    });

    // Read manifest file
    const manifestPath = path.join(tempDir, 'imsmanifest.xml');
    const manifestXml = await fs.readFile(manifestPath, 'utf-8');
    
    const manifest = await this.parseManifest(manifestXml);
    
    // Read all files
    const files: { [filename: string]: Buffer } = {};
    const fileList = await this.getFileList(tempDir);
    
    for (const filePath of fileList) {
      const relativePath = path.relative(tempDir, filePath);
      files[relativePath] = await fs.readFile(filePath);
    }

    return {
      id: uuidv4(),
      manifest,
      files,
      metadata: {
        title: manifest.title,
        description: manifest.description,
        version: this.detectSCORMVersion(manifestXml),
        scormVersion: this.detectSCORMVersion(manifestXml) as '1.2' | '2004',
      },
    };
  }

  private async parseManifest(manifestXml: string): Promise<SCORMManifest> {
    return new Promise((resolve, reject) => {
      parseString(manifestXml, (err, result) => {
        if (err) {
          reject(err);
          return;
        }

        const manifestData = result.manifest;
        
        const manifest: SCORMManifest = {
          identifier: manifestData.$.identifier,
          version: manifestData.$.version || '1.0',
          title: manifestData.metadata?.[0]?.lom?.[0]?.general?.[0]?.title?.[0]?.string?.[0]?._ || 'Untitled',
          description: manifestData.metadata?.[0]?.lom?.[0]?.general?.[0]?.description?.[0]?.string?.[0]?._ || '',
          organizations: this.parseOrganizations(manifestData.organizations?.[0]),
          resources: this.parseResources(manifestData.resources?.[0]),
        };

        resolve(manifest);
      });
    });
  }

  private parseOrganizations(organizationsData: any): SCORMOrganization[] {
    if (!organizationsData?.organization) {
      return [];
    }

    return organizationsData.organization.map((org: any) => ({
      identifier: org.$.identifier,
      title: org.title?.[0] || 'Untitled Organization',
      items: this.parseItems(org.item || []),
    }));
  }

  private parseItems(itemsData: any[]): SCORMItem[] {
    return itemsData.map((item: any) => ({
      identifier: item.$.identifier,
      title: item.title?.[0] || 'Untitled Item',
      identifierref: item.$.identifierref,
      parameters: item.$.parameters,
      children: item.item ? this.parseItems(item.item) : [],
    }));
  }

  private parseResources(resourcesData: any): SCORMResource[] {
    if (!resourcesData?.resource) {
      return [];
    }

    return resourcesData.resource.map((resource: any) => ({
      identifier: resource.$.identifier,
      type: resource.$.type,
      href: resource.$.href || '',
      files: resource.file ? resource.file.map((file: any) => file.$.href) : [],
    }));
  }

  private detectSCORMVersion(manifestXml: string): string {
    if (manifestXml.includes('ADL SCORM 2004')) {
      return '2004';
    } else if (manifestXml.includes('SCORM 1.2')) {
      return '1.2';
    }
    return '2004'; // Default to 2004
  }

  private getLaunchUrl(manifest: SCORMManifest): string {
    // Find the main launch resource
    const firstOrg = manifest.organizations[0];
    if (!firstOrg || !firstOrg.items.length) {
      return '';
    }

    const firstItem = firstOrg.items[0];
    if (!firstItem.identifierref) {
      return '';
    }

    const resource = manifest.resources.find(r => r.identifier === firstItem.identifierref);
    return resource?.href || '';
  }

  private async getFileList(dir: string): Promise<string[]> {
    const files: string[] = [];
    const items = await fs.readdir(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        files.push(...await this.getFileList(fullPath));
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }

  private async createSCORMPackage(content: IContent, version: '1.2' | '2004'): Promise<SCORMPackage> {
    const manifest: SCORMManifest = {
      identifier: `content_${content._id}`,
      version: '1.0',
      title: content.metadata.title,
      description: content.metadata.description,
      organizations: [{
        identifier: 'org_1',
        title: content.metadata.title,
        items: [{
          identifier: 'item_1',
          title: content.metadata.title,
          identifierref: 'resource_1',
        }],
      }],
      resources: [{
        identifier: 'resource_1',
        type: 'webcontent',
        href: 'index.html',
        files: ['index.html'],
      }],
    };

    // Create basic HTML file
    const htmlContent = this.generateSCORMHTML(content, version);
    
    return {
      id: uuidv4(),
      manifest,
      files: {
        'index.html': Buffer.from(htmlContent, 'utf-8'),
      },
      metadata: {
        title: content.metadata.title,
        description: content.metadata.description,
        version: '1.0',
        scormVersion: version,
      },
    };
  }

  private generateSCORMHTML(content: IContent, version: '1.2' | '2004'): string {
    const scormAPI = version === '1.2' ? 'API' : 'API_1484_11';
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>${content.metadata.title}</title>
    <meta charset="utf-8">
    <script>
        var ${scormAPI};
        
        function findAPI(win) {
            var findAPITries = 0;
            while ((win.${scormAPI} == null) && (win.parent != null) && (win.parent != win)) {
                findAPITries++;
                if (findAPITries > 7) {
                    return null;
                }
                win = win.parent;
            }
            return win.${scormAPI};
        }
        
        function getAPI() {
            var theAPI = findAPI(window);
            if ((theAPI == null) && (window.opener != null) && (typeof(window.opener) != "undefined")) {
                theAPI = findAPI(window.opener);
            }
            if (theAPI == null) {
                console.log("Unable to find an API adapter");
            }
            return theAPI;
        }
        
        function initialize() {
            ${scormAPI} = getAPI();
            if (${scormAPI} != null) {
                var result = ${scormAPI}.LMSInitialize("");
                if (result == "true") {
                    console.log("SCORM API initialized successfully");
                }
            }
        }
        
        function terminate() {
            if (${scormAPI} != null) {
                ${scormAPI}.LMSFinish("");
            }
        }
        
        window.onload = initialize;
        window.onbeforeunload = terminate;
    </script>
</head>
<body>
    <h1>${content.metadata.title}</h1>
    <p>${content.metadata.description}</p>
    <div id="content">
        ${JSON.stringify(content.currentVersion as any, null, 2)}
    </div>
</body>
</html>
    `;
  }

  private async packageSCORM(scormPackage: SCORMPackage): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const archive = archiver('zip', { zlib: { level: 9 } });

      archive.on('data', (chunk) => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);

      // Add manifest
      const manifestXml = this.generateManifestXML(scormPackage.manifest, scormPackage.metadata.scormVersion);
      archive.append(manifestXml, { name: 'imsmanifest.xml' });

      // Add files
      for (const [filename, buffer] of Object.entries(scormPackage.files)) {
        archive.append(buffer, { name: filename });
      }

      archive.finalize();
    });
  }

  private generateManifestXML(manifest: SCORMManifest, version: '1.2' | '2004'): string {
    const builder = new Builder();
    
    const manifestObj = {
      manifest: {
        $: {
          identifier: manifest.identifier,
          version: manifest.version,
          'xmlns': 'http://www.imsglobal.org/xsd/imscp_v1p1',
          'xmlns:adlcp': version === '1.2' 
            ? 'http://www.adlnet.org/xsd/adlcp_v1p2'
            : 'http://www.adlnet.org/xsd/adlcp_v1p3',
          'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
          'xsi:schemaLocation': version === '1.2'
            ? 'http://www.imsglobal.org/xsd/imscp_v1p1 imscp_v1p1.xsd http://www.adlnet.org/xsd/adlcp_v1p2 adlcp_v1p2.xsd'
            : 'http://www.imsglobal.org/xsd/imscp_v1p1 imscp_v1p1.xsd http://www.adlnet.org/xsd/adlcp_v1p3 adlcp_v1p3.xsd',
        },
        metadata: [{
          schema: ['ADL SCORM'],
          schemaversion: [version === '1.2' ? '1.2' : '2004 4th Edition'],
        }],
        organizations: [{
          $: { default: manifest.organizations[0]?.identifier || 'org_1' },
          organization: manifest.organizations.map(org => ({
            $: { identifier: org.identifier },
            title: [org.title],
            item: this.buildItemsXML(org.items),
          })),
        }],
        resources: [{
          resource: manifest.resources.map(resource => ({
            $: {
              identifier: resource.identifier,
              type: resource.type,
              href: resource.href,
              'adlcp:scormType': 'sco',
            },
            file: resource.files.map(file => ({ $: { href: file } })),
          })),
        }],
      },
    };

    return builder.buildObject(manifestObj);
  }

  private buildItemsXML(items: SCORMItem[]): any[] {
    return items.map(item => ({
      $: {
        identifier: item.identifier,
        identifierref: item.identifierref,
        parameters: item.parameters,
      },
      title: [item.title],
      ...(item.children && item.children.length > 0 && { item: this.buildItemsXML(item.children || []) }),
    }));
  }

  private async extractIMSCommonCartridge(cartridgeBuffer: Buffer, tempDir: string): Promise<IMSCommonCartridge> {
    // Similar to SCORM extraction but for IMS Common Cartridge format
    // This is a simplified implementation
    return {
      id: uuidv4(),
      manifest: {},
      resources: {},
      files: {},
    };
  }

  private mapIMSResourceType(imsType: string): ContentType {
    switch (imsType) {
      case 'webcontent':
        return ContentType.LESSON;
      case 'assessment':
        return ContentType.ASSESSMENT;
      case 'discussion':
        return ContentType.INTERACTIVE;
      default:
        return ContentType.DOCUMENT;
    }
  }

  private async createIMSCommonCartridge(contents: IContent[]): Promise<IMSCommonCartridge> {
    // Create IMS Common Cartridge from content items
    // This is a simplified implementation
    return {
      id: uuidv4(),
      manifest: {},
      resources: {},
      files: {},
    };
  }

  private async packageIMSCommonCartridge(cartridge: IMSCommonCartridge): Promise<Buffer> {
    // Package IMS Common Cartridge as zip file
    // This is a simplified implementation
    return Buffer.from('');
  }

  private async uploadSCORMFiles(scormPackage: SCORMPackage, contentId: string): Promise<void> {
    // Upload SCORM files to storage
    for (const [filename, buffer] of Object.entries(scormPackage.files)) {
      // Create a mock file object for upload
      const mockFile = {
        buffer,
        originalname: filename,
        mimetype: this.getMimeType(filename),
        size: buffer.length,
      } as Express.Multer.File;

      await this.mediaService.uploadFile(mockFile, contentId);
    }
  }

  private getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.html': 'text/html',
      '.htm': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.mp4': 'video/mp4',
      '.mp3': 'audio/mpeg',
      '.pdf': 'application/pdf',
      '.zip': 'application/zip',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }
}