import * as fs from 'fs/promises';
import * as path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import * as XLSX from 'xlsx';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as cron from 'node-cron';
import { 
  AnalyticsReport, 
  ReportType, 
  ReportFilters, 
  ReportSchedule,
  DataExport, 
  ExportFormat, 
  ExportStatus,
  AnalyticsLevel,
  Visualization,
  VisualizationType 
} from '../types/analytics.types';
import { databaseService } from './database.service';
import { redisService } from './redis.service';
import { dashboardService } from './dashboard.service';
import { logger } from '../utils/logger';
import config from '../config/config';

interface ReportData {
  headers: string[];
  rows: any[][];
  metadata: {
    generatedAt: Date;
    filters: ReportFilters;
    totalRecords: number;
    executionTime: number;
  };
}

interface ScheduledReportJob {
  reportId: string;
  schedule: string;
  task: cron.ScheduledTask;
}

class ReportingService {
  private scheduledJobs = new Map<string, ScheduledReportJob>();
  private exportQueue = new Map<string, DataExport>();

  constructor() {
    this.initializeScheduledReports();
  }

  async createReport(
    name: string,
    description: string,
    type: ReportType,
    level: AnalyticsLevel,
    filters: ReportFilters,
    visualizations: Visualization[],
    createdBy: string,
    schedule?: ReportSchedule,
    recipients: string[] = []
  ): Promise<AnalyticsReport> {
    try {
      const report: AnalyticsReport = {
        id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        description,
        type,
        level,
        filters,
        visualizations,
        schedule,
        recipients,
        createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Save to database
      await databaseService.query(`
        INSERT INTO analytics_reports (
          id, name, description, type, level, filters, visualizations, 
          schedule, recipients, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        report.id,
        report.name,
        report.description,
        report.type,
        report.level,
        JSON.stringify(report.filters),
        JSON.stringify(report.visualizations),
        JSON.stringify(report.schedule),
        report.recipients,
        report.createdBy,
        report.createdAt,
        report.updatedAt,
      ]);

      // Schedule if needed
      if (schedule && schedule.isActive) {
        await this.scheduleReport(report);
      }

      logger.info('Report created successfully', { 
        reportId: report.id, 
        name: report.name, 
        type: report.type 
      });

      return report;

    } catch (error) {
      logger.error('Failed to create report', { error, name, type });
      throw error;
    }
  }

  async generateReport(reportId: string): Promise<ReportData> {
    const startTime = Date.now();

    try {
      // Get report configuration
      const reportResult = await databaseService.query(`
        SELECT * FROM analytics_reports WHERE id = $1
      `, [reportId]);

      if (reportResult.rows.length === 0) {
        throw new Error(`Report not found: ${reportId}`);
      }

      const report: AnalyticsReport = {
        id: reportResult.rows[0].id,
        name: reportResult.rows[0].name,
        description: reportResult.rows[0].description,
        type: reportResult.rows[0].type as ReportType,
        level: reportResult.rows[0].level as AnalyticsLevel,
        filters: reportResult.rows[0].filters,
        visualizations: reportResult.rows[0].visualizations,
        schedule: reportResult.rows[0].schedule,
        recipients: reportResult.rows[0].recipients,
        createdBy: reportResult.rows[0].created_by,
        createdAt: reportResult.rows[0].created_at,
        updatedAt: reportResult.rows[0].updated_at,
        lastGenerated: reportResult.rows[0].last_generated,
      };

      // Generate report data based on type
      const reportData = await this.generateReportByType(report);

      // Update last generated timestamp
      await databaseService.query(`
        UPDATE analytics_reports SET last_generated = NOW() WHERE id = $1
      `, [reportId]);

      const executionTime = Date.now() - startTime;

      logger.info('Report generated successfully', { 
        reportId, 
        recordCount: reportData.rows.length,
        executionTime 
      });

      return {
        ...reportData,
        metadata: {
          ...reportData.metadata,
          executionTime,
        },
      };

    } catch (error) {
      logger.error('Failed to generate report', { error, reportId });
      throw error;
    }
  }

  private async generateReportByType(report: AnalyticsReport): Promise<ReportData> {
    switch (report.type) {
      case ReportType.PERFORMANCE:
        return await this.generatePerformanceReport(report);
      case ReportType.ENGAGEMENT:
        return await this.generateEngagementReport(report);
      case ReportType.PROGRESS:
        return await this.generateProgressReport(report);
      case ReportType.COMPARISON:
        return await this.generateComparisonReport(report);
      case ReportType.TREND:
        return await this.generateTrendReport(report);
      case ReportType.CUSTOM:
        return await this.generateCustomReport(report);
      default:
        throw new Error(`Unsupported report type: ${report.type}`);
    }
  }

  private async generatePerformanceReport(report: AnalyticsReport): Promise<ReportData> {
    const { filters } = report;
    
    let query = `
      SELECT 
        u.id as user_id,
        u.email as user_email,
        lm.mastery_level,
        lm.completion_rate,
        lm.time_spent,
        AVG(CASE WHEN le.event_type = 'assessment_submit' 
            THEN CAST(le.event_data->>'score' AS FLOAT) END) as avg_assessment_score,
        COUNT(CASE WHEN le.event_type = 'assessment_submit' THEN 1 END) as total_assessments,
        COUNT(CASE WHEN le.event_type = 'content_complete' THEN 1 END) as completed_content
      FROM learning_metrics lm
      JOIN users u ON lm.user_id = u.id
      LEFT JOIN learning_events le ON lm.user_id = le.user_id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    // Apply filters
    if (filters.dateRange) {
      query += ` AND le.timestamp >= $${paramIndex} AND le.timestamp <= $${paramIndex + 1}`;
      params.push(filters.dateRange.start, filters.dateRange.end);
      paramIndex += 2;
    }

    if (filters.userIds && filters.userIds.length > 0) {
      query += ` AND u.id = ANY($${paramIndex})`;
      params.push(filters.userIds);
      paramIndex++;
    }

    if (filters.organizationIds && filters.organizationIds.length > 0) {
      query += ` AND u.organization_id = ANY($${paramIndex})`;
      params.push(filters.organizationIds);
      paramIndex++;
    }

    query += `
      GROUP BY u.id, u.email, lm.mastery_level, lm.completion_rate, lm.time_spent
      ORDER BY lm.mastery_level DESC
      LIMIT $${paramIndex}
    `;
    params.push(config.export.maxRecords);

    const result = await databaseService.query(query, params);

    const headers = [
      'User ID',
      'Email',
      'Mastery Level',
      'Completion Rate',
      'Time Spent (hours)',
      'Avg Assessment Score',
      'Total Assessments',
      'Completed Content',
    ];

    const rows = result.rows.map(row => [
      row.user_id,
      row.user_email,
      (parseFloat(row.mastery_level) * 100).toFixed(1) + '%',
      (parseFloat(row.completion_rate) * 100).toFixed(1) + '%',
      (parseInt(row.time_spent) / 3600).toFixed(1),
      row.avg_assessment_score ? (parseFloat(row.avg_assessment_score) * 100).toFixed(1) + '%' : 'N/A',
      row.total_assessments || 0,
      row.completed_content || 0,
    ]);

    return {
      headers,
      rows,
      metadata: {
        generatedAt: new Date(),
        filters,
        totalRecords: rows.length,
        executionTime: 0, // Will be set by caller
      },
    };
  }

  private async generateEngagementReport(report: AnalyticsReport): Promise<ReportData> {
    const { filters } = report;
    
    let query = `
      SELECT 
        u.id as user_id,
        u.email as user_email,
        lm.engagement_score,
        lm.collaboration_score,
        lm.ai_interaction_score,
        COUNT(DISTINCT le.session_id) as total_sessions,
        COUNT(le.id) as total_events,
        AVG(EXTRACT(EPOCH FROM (le.timestamp - LAG(le.timestamp) OVER (PARTITION BY le.session_id ORDER BY le.timestamp)))) as avg_session_duration
      FROM learning_metrics lm
      JOIN users u ON lm.user_id = u.id
      LEFT JOIN learning_events le ON lm.user_id = le.user_id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    // Apply filters (similar to performance report)
    if (filters.dateRange) {
      query += ` AND le.timestamp >= $${paramIndex} AND le.timestamp <= $${paramIndex + 1}`;
      params.push(filters.dateRange.start, filters.dateRange.end);
      paramIndex += 2;
    }

    query += `
      GROUP BY u.id, u.email, lm.engagement_score, lm.collaboration_score, lm.ai_interaction_score
      ORDER BY lm.engagement_score DESC
      LIMIT $${paramIndex}
    `;
    params.push(config.export.maxRecords);

    const result = await databaseService.query(query, params);

    const headers = [
      'User ID',
      'Email',
      'Engagement Score',
      'Collaboration Score',
      'AI Interaction Score',
      'Total Sessions',
      'Total Events',
      'Avg Session Duration (min)',
    ];

    const rows = result.rows.map(row => [
      row.user_id,
      row.user_email,
      (parseFloat(row.engagement_score) * 100).toFixed(1) + '%',
      (parseFloat(row.collaboration_score) * 100).toFixed(1) + '%',
      (parseFloat(row.ai_interaction_score) * 100).toFixed(1) + '%',
      row.total_sessions || 0,
      row.total_events || 0,
      row.avg_session_duration ? (parseFloat(row.avg_session_duration) / 60).toFixed(1) : 'N/A',
    ]);

    return {
      headers,
      rows,
      metadata: {
        generatedAt: new Date(),
        filters,
        totalRecords: rows.length,
        executionTime: 0,
      },
    };
  }

  private async generateProgressReport(report: AnalyticsReport): Promise<ReportData> {
    // Similar implementation for progress tracking
    const headers = ['User ID', 'Email', 'Progress', 'Last Activity'];
    const rows: any[][] = []; // Would be populated with actual data

    return {
      headers,
      rows,
      metadata: {
        generatedAt: new Date(),
        filters: report.filters,
        totalRecords: rows.length,
        executionTime: 0,
      },
    };
  }

  private async generateComparisonReport(report: AnalyticsReport): Promise<ReportData> {
    // Implementation for comparison reports
    const headers = ['Entity', 'Metric 1', 'Metric 2', 'Difference'];
    const rows: any[][] = [];

    return {
      headers,
      rows,
      metadata: {
        generatedAt: new Date(),
        filters: report.filters,
        totalRecords: rows.length,
        executionTime: 0,
      },
    };
  }

  private async generateTrendReport(report: AnalyticsReport): Promise<ReportData> {
    // Implementation for trend analysis
    const headers = ['Date', 'Metric', 'Value', 'Change'];
    const rows: any[][] = [];

    return {
      headers,
      rows,
      metadata: {
        generatedAt: new Date(),
        filters: report.filters,
        totalRecords: rows.length,
        executionTime: 0,
      },
    };
  }

  private async generateCustomReport(report: AnalyticsReport): Promise<ReportData> {
    // Implementation for custom reports based on visualizations
    const headers = ['Custom Field 1', 'Custom Field 2'];
    const rows: any[][] = [];

    return {
      headers,
      rows,
      metadata: {
        generatedAt: new Date(),
        filters: report.filters,
        totalRecords: rows.length,
        executionTime: 0,
      },
    };
  }

  async exportData(
    name: string,
    format: ExportFormat,
    filters: ReportFilters,
    createdBy: string
  ): Promise<DataExport> {
    try {
      const dataExport: DataExport = {
        id: `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        format,
        filters,
        status: ExportStatus.PENDING,
        createdBy,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      };

      // Save to database
      await databaseService.query(`
        INSERT INTO data_exports (
          id, name, format, filters, status, created_by, created_at, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        dataExport.id,
        dataExport.name,
        dataExport.format,
        JSON.stringify(dataExport.filters),
        dataExport.status,
        dataExport.createdBy,
        dataExport.createdAt,
        dataExport.expiresAt,
      ]);

      // Add to processing queue
      this.exportQueue.set(dataExport.id, dataExport);
      
      // Process export asynchronously
      this.processExport(dataExport.id);

      logger.info('Data export initiated', { 
        exportId: dataExport.id, 
        format, 
        createdBy 
      });

      return dataExport;

    } catch (error) {
      logger.error('Failed to initiate data export', { error, name, format });
      throw error;
    }
  }

  private async processExport(exportId: string): Promise<void> {
    try {
      const dataExport = this.exportQueue.get(exportId);
      if (!dataExport) {
        throw new Error(`Export not found: ${exportId}`);
      }

      // Update status to processing
      dataExport.status = ExportStatus.PROCESSING;
      await this.updateExportStatus(exportId, ExportStatus.PROCESSING);

      // Generate data
      const data = await this.generateExportData(dataExport.filters);
      
      // Create file based on format
      const filePath = await this.createExportFile(dataExport, data);
      
      // Get file stats
      const stats = await fs.stat(filePath);
      
      // Update export record
      dataExport.status = ExportStatus.COMPLETED;
      dataExport.fileUrl = filePath;
      dataExport.recordCount = data.rows.length;
      dataExport.fileSize = stats.size;
      dataExport.completedAt = new Date();

      await this.updateExportRecord(dataExport);

      // Remove from queue
      this.exportQueue.delete(exportId);

      logger.info('Data export completed', { 
        exportId, 
        recordCount: data.rows.length,
        fileSize: stats.size 
      });

    } catch (error) {
      logger.error('Export processing failed', { error, exportId });
      
      // Update status to failed
      await this.updateExportStatus(exportId, ExportStatus.FAILED);
      this.exportQueue.delete(exportId);
    }
  }

  private async generateExportData(filters: ReportFilters): Promise<ReportData> {
    // Generate comprehensive export data based on filters
    let query = `
      SELECT 
        u.id as user_id,
        u.email,
        u.created_at as user_created_at,
        lm.*,
        COUNT(le.id) as total_events,
        COUNT(DISTINCT le.session_id) as total_sessions
      FROM users u
      LEFT JOIN learning_metrics lm ON u.id = lm.user_id
      LEFT JOIN learning_events le ON u.id = le.user_id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    // Apply filters
    if (filters.dateRange) {
      query += ` AND le.timestamp >= $${paramIndex} AND le.timestamp <= $${paramIndex + 1}`;
      params.push(filters.dateRange.start, filters.dateRange.end);
      paramIndex += 2;
    }

    if (filters.userIds && filters.userIds.length > 0) {
      query += ` AND u.id = ANY($${paramIndex})`;
      params.push(filters.userIds);
      paramIndex++;
    }

    query += `
      GROUP BY u.id, u.email, u.created_at, lm.id, lm.user_id, lm.time_spent, 
               lm.completion_rate, lm.engagement_score, lm.mastery_level,
               lm.struggling_indicators, lm.learning_velocity, lm.retention_score,
               lm.collaboration_score, lm.ai_interaction_score, lm.last_updated, lm.created_at
      ORDER BY u.created_at DESC
      LIMIT $${paramIndex}
    `;
    params.push(config.export.maxRecords);

    const result = await databaseService.query(query, params);

    const headers = [
      'User ID',
      'Email',
      'User Created At',
      'Time Spent (hours)',
      'Completion Rate',
      'Engagement Score',
      'Mastery Level',
      'Learning Velocity',
      'Retention Score',
      'Collaboration Score',
      'AI Interaction Score',
      'Struggling Indicators',
      'Total Events',
      'Total Sessions',
      'Last Updated',
    ];

    const rows = result.rows.map(row => [
      row.user_id,
      row.email,
      row.user_created_at?.toISOString() || '',
      row.time_spent ? (parseInt(row.time_spent) / 3600).toFixed(2) : '0',
      row.completion_rate ? (parseFloat(row.completion_rate) * 100).toFixed(2) + '%' : '0%',
      row.engagement_score ? (parseFloat(row.engagement_score) * 100).toFixed(2) + '%' : '0%',
      row.mastery_level ? (parseFloat(row.mastery_level) * 100).toFixed(2) + '%' : '0%',
      row.learning_velocity ? parseFloat(row.learning_velocity).toFixed(4) : '0',
      row.retention_score ? (parseFloat(row.retention_score) * 100).toFixed(2) + '%' : '0%',
      row.collaboration_score ? (parseFloat(row.collaboration_score) * 100).toFixed(2) + '%' : '0%',
      row.ai_interaction_score ? (parseFloat(row.ai_interaction_score) * 100).toFixed(2) + '%' : '0%',
      row.struggling_indicators ? row.struggling_indicators.join(', ') : '',
      row.total_events || 0,
      row.total_sessions || 0,
      row.last_updated?.toISOString() || '',
    ]);

    return {
      headers,
      rows,
      metadata: {
        generatedAt: new Date(),
        filters,
        totalRecords: rows.length,
        executionTime: 0,
      },
    };
  }

  private async createExportFile(dataExport: DataExport, data: ReportData): Promise<string> {
    const exportDir = path.join(process.cwd(), 'exports');
    await fs.mkdir(exportDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${dataExport.name.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}`;
    
    switch (dataExport.format) {
      case ExportFormat.CSV:
        return await this.createCSVFile(exportDir, filename, data);
      case ExportFormat.XLSX:
        return await this.createXLSXFile(exportDir, filename, data);
      case ExportFormat.JSON:
        return await this.createJSONFile(exportDir, filename, data);
      case ExportFormat.PDF:
        return await this.createPDFFile(exportDir, filename, data);
      default:
        throw new Error(`Unsupported export format: ${dataExport.format}`);
    }
  }

  private async createCSVFile(exportDir: string, filename: string, data: ReportData): Promise<string> {
    const filePath = path.join(exportDir, `${filename}.csv`);
    
    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: data.headers.map((header, index) => ({ id: index.toString(), title: header })),
    });

    const records = data.rows.map(row => {
      const record: any = {};
      row.forEach((value, index) => {
        record[index.toString()] = value;
      });
      return record;
    });

    await csvWriter.writeRecords(records);
    return filePath;
  }

  private async createXLSXFile(exportDir: string, filename: string, data: ReportData): Promise<string> {
    const filePath = path.join(exportDir, `${filename}.xlsx`);
    
    const workbook = XLSX.utils.book_new();
    const worksheetData = [data.headers, ...data.rows];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    XLSX.writeFile(workbook, filePath);
    
    return filePath;
  }

  private async createJSONFile(exportDir: string, filename: string, data: ReportData): Promise<string> {
    const filePath = path.join(exportDir, `${filename}.json`);
    
    const jsonData = {
      metadata: data.metadata,
      headers: data.headers,
      data: data.rows.map(row => {
        const record: any = {};
        data.headers.forEach((header, index) => {
          record[header] = row[index];
        });
        return record;
      }),
    };

    await fs.writeFile(filePath, JSON.stringify(jsonData, null, 2));
    return filePath;
  }

  private async createPDFFile(exportDir: string, filename: string, data: ReportData): Promise<string> {
    const filePath = path.join(exportDir, `${filename}.pdf`);
    
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    let page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    
    let yPosition = height - 50;
    const lineHeight = 12;
    const margin = 50;
    
    // Title
    page.drawText(`Export: ${filename}`, {
      x: margin,
      y: yPosition,
      size: 16,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    
    yPosition -= 30;
    
    // Metadata
    page.drawText(`Generated: ${data.metadata.generatedAt.toISOString()}`, {
      x: margin,
      y: yPosition,
      size: 10,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
    
    yPosition -= 20;
    page.drawText(`Total Records: ${data.metadata.totalRecords}`, {
      x: margin,
      y: yPosition,
      size: 10,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
    
    yPosition -= 30;
    
    // Headers
    const headerText = data.headers.join(' | ');
    page.drawText(headerText, {
      x: margin,
      y: yPosition,
      size: 8,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    
    yPosition -= lineHeight + 5;
    
    // Data rows (limited for PDF)
    const maxRows = Math.min(data.rows.length, 50); // Limit for PDF readability
    
    for (let i = 0; i < maxRows; i++) {
      if (yPosition < margin) {
        page = pdfDoc.addPage();
        yPosition = height - 50;
      }
      
      const rowText = data.rows[i].join(' | ');
      page.drawText(rowText, {
        x: margin,
        y: yPosition,
        size: 7,
        font,
        color: rgb(0, 0, 0),
      });
      
      yPosition -= lineHeight;
    }
    
    if (data.rows.length > maxRows) {
      yPosition -= 10;
      page.drawText(`... and ${data.rows.length - maxRows} more records`, {
        x: margin,
        y: yPosition,
        size: 8,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
    }
    
    const pdfBytes = await pdfDoc.save();
    await fs.writeFile(filePath, pdfBytes);
    
    return filePath;
  }

  private async updateExportStatus(exportId: string, status: ExportStatus): Promise<void> {
    await databaseService.query(`
      UPDATE data_exports SET status = $1 WHERE id = $2
    `, [status, exportId]);
  }

  private async updateExportRecord(dataExport: DataExport): Promise<void> {
    await databaseService.query(`
      UPDATE data_exports 
      SET status = $1, file_url = $2, record_count = $3, file_size = $4, completed_at = $5
      WHERE id = $6
    `, [
      dataExport.status,
      dataExport.fileUrl,
      dataExport.recordCount,
      dataExport.fileSize,
      dataExport.completedAt,
      dataExport.id,
    ]);
  }

  async scheduleReport(report: AnalyticsReport): Promise<void> {
    if (!report.schedule || !report.schedule.isActive) {
      return;
    }

    try {
      // Create cron expression
      const cronExpression = this.createCronExpression(report.schedule);
      
      // Schedule the task
      const task = cron.schedule(cronExpression, async () => {
        try {
          logger.info('Executing scheduled report', { reportId: report.id });
          
          const reportData = await this.generateReport(report.id);
          
          // Send to recipients (would integrate with notification service)
          await this.sendReportToRecipients(report, reportData);
          
        } catch (error) {
          logger.error('Scheduled report execution failed', { 
            error, 
            reportId: report.id 
          });
        }
      }, {
        scheduled: false,
        timezone: report.schedule.timezone,
      });

      // Store the scheduled job
      this.scheduledJobs.set(report.id, {
        reportId: report.id,
        schedule: cronExpression,
        task,
      });

      // Start the task
      task.start();

      logger.info('Report scheduled successfully', { 
        reportId: report.id, 
        schedule: cronExpression 
      });

    } catch (error) {
      logger.error('Failed to schedule report', { error, reportId: report.id });
      throw error;
    }
  }

  private createCronExpression(schedule: ReportSchedule): string {
    const [hour, minute] = schedule.time.split(':').map(Number);
    
    switch (schedule.frequency) {
      case 'daily':
        return `${minute} ${hour} * * *`;
      case 'weekly':
        return `${minute} ${hour} * * 1`; // Monday
      case 'monthly':
        return `${minute} ${hour} 1 * *`; // First day of month
      case 'quarterly':
        return `${minute} ${hour} 1 1,4,7,10 *`; // First day of quarter
      default:
        throw new Error(`Unsupported frequency: ${schedule.frequency}`);
    }
  }

  private async sendReportToRecipients(report: AnalyticsReport, reportData: ReportData): Promise<void> {
    // This would integrate with the notification service
    // For now, we'll just log the action
    logger.info('Sending report to recipients', {
      reportId: report.id,
      recipients: report.recipients,
      recordCount: reportData.rows.length,
    });
  }

  async unscheduleReport(reportId: string): Promise<void> {
    const job = this.scheduledJobs.get(reportId);
    if (job) {
      job.task.stop();
      this.scheduledJobs.delete(reportId);
      logger.info('Report unscheduled', { reportId });
    }
  }

  async getExportStatus(exportId: string): Promise<DataExport | null> {
    try {
      const result = await databaseService.query(`
        SELECT * FROM data_exports WHERE id = $1
      `, [exportId]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        format: row.format as ExportFormat,
        filters: row.filters,
        status: row.status as ExportStatus,
        fileUrl: row.file_url,
        recordCount: row.record_count,
        fileSize: row.file_size,
        createdBy: row.created_by,
        createdAt: row.created_at,
        completedAt: row.completed_at,
        expiresAt: row.expires_at,
      };

    } catch (error) {
      logger.error('Failed to get export status', { error, exportId });
      return null;
    }
  }

  async listReports(createdBy?: string, limit = 50): Promise<AnalyticsReport[]> {
    try {
      let query = `
        SELECT * FROM analytics_reports 
        WHERE 1=1
      `;
      const params: any[] = [];

      if (createdBy) {
        query += ` AND created_by = $1`;
        params.push(createdBy);
      }

      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      const result = await databaseService.query(query, params);

      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        type: row.type as ReportType,
        level: row.level as AnalyticsLevel,
        filters: row.filters,
        visualizations: row.visualizations,
        schedule: row.schedule,
        recipients: row.recipients,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastGenerated: row.last_generated,
      }));

    } catch (error) {
      logger.error('Failed to list reports', { error });
      throw error;
    }
  }

  async deleteReport(reportId: string): Promise<void> {
    try {
      // Unschedule if scheduled
      await this.unscheduleReport(reportId);

      // Delete from database
      await databaseService.query(`
        DELETE FROM analytics_reports WHERE id = $1
      `, [reportId]);

      logger.info('Report deleted', { reportId });

    } catch (error) {
      logger.error('Failed to delete report', { error, reportId });
      throw error;
    }
  }

  private async initializeScheduledReports(): Promise<void> {
    try {
      // Load existing scheduled reports from database
      const result = await databaseService.query(`
        SELECT * FROM analytics_reports 
        WHERE schedule IS NOT NULL 
        AND schedule->>'isActive' = 'true'
      `);

      for (const row of result.rows) {
        const report: AnalyticsReport = {
          id: row.id,
          name: row.name,
          description: row.description,
          type: row.type as ReportType,
          level: row.level as AnalyticsLevel,
          filters: row.filters,
          visualizations: row.visualizations,
          schedule: row.schedule,
          recipients: row.recipients,
          createdBy: row.created_by,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          lastGenerated: row.last_generated,
        };

        await this.scheduleReport(report);
      }

      logger.info('Scheduled reports initialized', { 
        count: this.scheduledJobs.size 
      });

    } catch (error) {
      logger.error('Failed to initialize scheduled reports', error);
    }
  }

  async cleanup(): Promise<void> {
    try {
      // Clean up expired exports
      const expiredExports = await databaseService.query(`
        SELECT id, file_url FROM data_exports 
        WHERE expires_at < NOW() AND status = 'completed'
      `);

      for (const exportRecord of expiredExports.rows) {
        // Delete file
        if (exportRecord.file_url) {
          try {
            await fs.unlink(exportRecord.file_url);
          } catch (error) {
            logger.warn('Failed to delete export file', { 
              error, 
              fileUrl: exportRecord.file_url 
            });
          }
        }

        // Update status
        await databaseService.query(`
          UPDATE data_exports SET status = 'expired' WHERE id = $1
        `, [exportRecord.id]);
      }

      logger.info('Export cleanup completed', { 
        cleanedCount: expiredExports.rows.length 
      });

    } catch (error) {
      logger.error('Export cleanup failed', error);
    }
  }

  async shutdown(): Promise<void> {
    // Stop all scheduled jobs
    for (const [reportId, job] of this.scheduledJobs) {
      job.task.stop();
    }
    this.scheduledJobs.clear();

    logger.info('Reporting service shut down');
  }
}

export const reportingService = new ReportingService();
export default reportingService;