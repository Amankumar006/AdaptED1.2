import apiClient from './client';
import { ApiResponse } from '../../types';

export interface DashboardWidget {
  id: string;
  type: 'metric_card' | 'line_chart' | 'bar_chart' | 'pie_chart' | 'scatter_plot' | 'heatmap' | 'table' | 'gauge';
  title: string;
  data: any;
  configuration: WidgetConfiguration;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface WidgetConfiguration {
  colors?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
  xAxisLabel?: string;
  yAxisLabel?: string;
  aggregation?: 'sum' | 'avg' | 'count' | 'max' | 'min';
  timeGranularity?: 'hour' | 'day' | 'week' | 'month';
  limit?: number;
  threshold?: number;
  format?: 'number' | 'percentage' | 'duration' | 'currency';
}

export interface DashboardData {
  level: 'micro' | 'meso' | 'macro';
  entityId: string;
  timeframe: {
    start: Date;
    end: Date;
    granularity: 'hour' | 'day' | 'week' | 'month';
  };
  widgets: DashboardWidget[];
  metadata: {
    lastUpdated: Date;
    dataPoints: number;
    refreshRate: number;
  };
}

export interface TimeSeriesData {
  timestamp: Date;
  value: number;
  label?: string;
}

export interface MetricData {
  label: string;
  value: number;
  format: 'number' | 'percentage' | 'duration' | 'currency';
  trend?: 'up' | 'down' | 'stable';
  changePercent?: number;
}

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  action: () => void;
  category: 'content' | 'assessment' | 'analytics' | 'communication';
}

class AnalyticsAPI {
  private baseURL = import.meta.env.VITE_ANALYTICS_SERVICE_URL || 'http://localhost:3003';

  async getMicroLevelDashboard(
    userId: string,
    timeframe: { start: Date; end: Date; granularity?: string }
  ): Promise<ApiResponse<DashboardData>> {
    const params = new URLSearchParams({
      start: timeframe.start.toISOString(),
      end: timeframe.end.toISOString(),
      granularity: timeframe.granularity || 'day',
    });

    const response = await apiClient.get(`${this.baseURL}/api/v1/dashboards/micro/${userId}?${params}`);
    return response.data;
  }

  async getMesoLevelDashboard(
    entityId: string,
    timeframe: { start: Date; end: Date; granularity?: string }
  ): Promise<ApiResponse<DashboardData>> {
    const params = new URLSearchParams({
      start: timeframe.start.toISOString(),
      end: timeframe.end.toISOString(),
      granularity: timeframe.granularity || 'day',
    });

    const response = await apiClient.get(`${this.baseURL}/api/v1/dashboards/meso/${entityId}?${params}`);
    return response.data;
  }

  async getMacroLevelDashboard(
    organizationId: string,
    timeframe: { start: Date; end: Date; granularity?: string }
  ): Promise<ApiResponse<DashboardData>> {
    const params = new URLSearchParams({
      start: timeframe.start.toISOString(),
      end: timeframe.end.toISOString(),
      granularity: timeframe.granularity || 'day',
    });

    const response = await apiClient.get(`${this.baseURL}/api/v1/dashboards/macro/${organizationId}?${params}`);
    return response.data;
  }

  async getRecommendations(userId: string, limit: number = 10): Promise<ApiResponse<any[]>> {
    const response = await apiClient.get(`${this.baseURL}/api/v1/recommendations/${userId}?limit=${limit}`);
    return response.data;
  }

  async getPredictions(userId: string, modelType?: string): Promise<ApiResponse<any[]>> {
    const params = modelType ? `?modelType=${modelType}` : '';
    const response = await apiClient.get(`${this.baseURL}/api/v1/predictions/${userId}${params}`);
    return response.data;
  }

  // Mock data for development when analytics service is not available
  async getMockDashboardData(): Promise<DashboardData> {
    return {
      level: 'meso',
      entityId: 'teacher-123',
      timeframe: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(),
        granularity: 'day',
      },
      widgets: [
        {
          id: 'class-overview',
          type: 'metric_card',
          title: 'Class Overview',
          data: {
            metrics: [
              { label: 'Total Students', value: 28, format: 'number' },
              { label: 'Active Students', value: 25, format: 'number' },
              { label: 'Avg Engagement', value: 0.78, format: 'percentage' },
              { label: 'Avg Performance', value: 0.85, format: 'percentage' },
            ],
          },
          configuration: {},
          position: { x: 0, y: 0, width: 12, height: 4 },
        },
        {
          id: 'engagement-trends',
          type: 'line_chart',
          title: 'Student Engagement Over Time',
          data: {
            labels: Array.from({ length: 30 }, (_, i) => {
              const date = new Date();
              date.setDate(date.getDate() - (29 - i));
              return date.toLocaleDateString();
            }),
            datasets: [
              {
                label: 'Engagement Score',
                data: Array.from({ length: 30 }, () => Math.random() * 0.3 + 0.6),
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
              },
            ],
          },
          configuration: {
            showGrid: true,
            xAxisLabel: 'Date',
            yAxisLabel: 'Engagement Score',
          },
          position: { x: 0, y: 4, width: 8, height: 6 },
        },
        {
          id: 'performance-distribution',
          type: 'bar_chart',
          title: 'Performance Distribution',
          data: {
            labels: ['90-100%', '80-89%', '70-79%', '60-69%', '50-59%'],
            datasets: [
              {
                label: 'Number of Students',
                data: [8, 12, 6, 2, 0],
                backgroundColor: [
                  'rgba(34, 197, 94, 0.8)',
                  'rgba(59, 130, 246, 0.8)',
                  'rgba(251, 191, 36, 0.8)',
                  'rgba(239, 68, 68, 0.8)',
                  'rgba(156, 163, 175, 0.8)',
                ],
              },
            ],
          },
          configuration: {
            xAxisLabel: 'Performance Range',
            yAxisLabel: 'Number of Students',
          },
          position: { x: 8, y: 4, width: 4, height: 6 },
        },
        {
          id: 'content-effectiveness',
          type: 'table',
          title: 'Content Effectiveness',
          data: {
            headers: ['Content', 'Views', 'Completion Rate', 'Avg Score', 'Engagement'],
            rows: [
              ['Introduction to Algebra', '45', '89%', '85%', '78%'],
              ['Quadratic Equations', '38', '76%', '82%', '71%'],
              ['Linear Functions', '42', '91%', '88%', '83%'],
              ['Polynomials', '35', '68%', '79%', '65%'],
            ],
          },
          configuration: {},
          position: { x: 0, y: 10, width: 8, height: 6 },
        },
        {
          id: 'at-risk-students',
          type: 'table',
          title: 'Students at Risk',
          data: {
            headers: ['Student', 'Risk Score', 'Last Activity', 'Action Needed'],
            rows: [
              ['John Doe', '0.85', '3 days ago', 'Contact student'],
              ['Jane Smith', '0.72', '1 day ago', 'Monitor progress'],
              ['Mike Johnson', '0.68', '2 days ago', 'Provide support'],
            ],
          },
          configuration: {},
          position: { x: 8, y: 10, width: 4, height: 6 },
        },
      ],
      metadata: {
        lastUpdated: new Date(),
        dataPoints: 150,
        refreshRate: 300,
      },
    };
  }

  async getQuickActions(): Promise<QuickAction[]> {
    return [
      {
        id: 'create-lesson',
        title: 'Create New Lesson',
        description: 'Start building a new lesson with AI assistance',
        icon: '📚',
        action: () => console.log('Navigate to lesson builder'),
        category: 'content',
      },
      {
        id: 'create-assessment',
        title: 'Create Assessment',
        description: 'Design a new quiz or assignment',
        icon: '📝',
        action: () => console.log('Navigate to assessment builder'),
        category: 'assessment',
      },
      {
        id: 'view-analytics',
        title: 'View Detailed Analytics',
        description: 'Check comprehensive student progress and performance',
        icon: '📊',
        action: () => console.log('Navigate to analytics page'),
        category: 'analytics',
      },
      {
        id: 'send-announcement',
        title: 'Send Announcement',
        description: 'Communicate with students and parents',
        icon: '📢',
        action: () => console.log('Open announcement modal'),
        category: 'communication',
      },
      {
        id: 'grade-submissions',
        title: 'Grade Submissions',
        description: 'Review and grade pending assignments',
        icon: '✅',
        action: () => console.log('Navigate to grading queue'),
        category: 'assessment',
      },
      {
        id: 'schedule-meeting',
        title: 'Schedule Meeting',
        description: 'Set up parent-teacher conferences or student meetings',
        icon: '📅',
        action: () => console.log('Open scheduling modal'),
        category: 'communication',
      },
    ];
  }
}

export const analyticsAPI = new AnalyticsAPI();
export default analyticsAPI;