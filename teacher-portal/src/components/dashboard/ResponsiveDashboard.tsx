import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import DashboardWidget from './DashboardWidget';
import QuickActionsPanel from './QuickActionsPanel';
import { DashboardData, DashboardWidget as WidgetType, QuickAction } from '../../services/api/analyticsAPI';
import { analyticsAPI } from '../../services/api/analyticsAPI';
import './Dashboard.css';

interface ResponsiveDashboardProps {
  userId?: string;
  entityId?: string;
  organizationId?: string;
  level: 'micro' | 'meso' | 'macro';
  className?: string;
}

const ResponsiveDashboard: React.FC<ResponsiveDashboardProps> = ({
  userId,
  entityId,
  organizationId,
  level,
  className = '',
}) => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [widgets, setWidgets] = useState<WidgetType[]>([]);
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [timeframe, setTimeframe] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    end: new Date(),
    granularity: 'day',
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadDashboardData();
    loadQuickActions();
  }, [level, userId, entityId, organizationId, timeframe]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      let data: DashboardData;

      // Try to load from analytics service, fallback to mock data
      try {
        if (level === 'micro' && userId) {
          const response = await analyticsAPI.getMicroLevelDashboard(userId, timeframe);
          data = response.data;
        } else if (level === 'meso' && entityId) {
          const response = await analyticsAPI.getMesoLevelDashboard(entityId, timeframe);
          data = response.data;
        } else if (level === 'macro' && organizationId) {
          const response = await analyticsAPI.getMacroLevelDashboard(organizationId, timeframe);
          data = response.data;
        } else {
          throw new Error('Invalid parameters');
        }
      } catch (apiError) {
        console.warn('Analytics service unavailable, using mock data:', apiError);
        data = await analyticsAPI.getMockDashboardData();
      }

      setDashboardData(data);
      setWidgets(data.widgets);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadQuickActions = async () => {
    try {
      const actions = await analyticsAPI.getQuickActions();
      setQuickActions(actions);
    } catch (err) {
      console.error('Failed to load quick actions:', err);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setWidgets((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleRemoveWidget = (widgetId: string) => {
    setWidgets(prev => prev.filter(widget => widget.id !== widgetId));
  };

  const handleEditWidget = (widgetId: string) => {
    console.log('Edit widget:', widgetId);
    // TODO: Implement widget editing modal
  };

  const handleTimeframeChange = (newTimeframe: typeof timeframe) => {
    setTimeframe(newTimeframe);
  };

  const handleRefresh = () => {
    loadDashboardData();
  };

  const getGridColumns = () => {
    // Responsive grid columns based on screen size
    return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
  };

  if (isLoading) {
    return (
      <div className={`${className} animate-pulse`}>
        <div className="mb-6">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-lg h-64"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className} text-center py-12`}>
        <div className="text-red-500 mb-4">
          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold">Error Loading Dashboard</h3>
          <p className="text-gray-600 mt-2">{error}</p>
        </div>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Dashboard Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="mt-1 text-sm text-gray-600">
              {dashboardData?.metadata.lastUpdated && (
                <>Last updated: {new Date(dashboardData.metadata.lastUpdated).toLocaleString()}</>
              )}
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center space-x-3">
            {/* Timeframe Selector */}
            <select
              value={`${timeframe.granularity}`}
              onChange={(e) => handleTimeframeChange({ ...timeframe, granularity: e.target.value as any })}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
            </select>

            {/* Customize Button */}
            <button
              onClick={() => setIsCustomizing(!isCustomizing)}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                isCustomizing
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {isCustomizing ? 'Done' : 'Customize'}
            </button>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Refresh data"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <div className="mb-6">
        <QuickActionsPanel
          actions={quickActions}
          isCustomizable={isCustomizing}
          onCustomize={setQuickActions}
        />
      </div>

      {/* Widgets Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={widgets.map(w => w.id)} strategy={rectSortingStrategy}>
          <div className={`grid ${getGridColumns()} gap-6`}>
            {widgets.map((widget) => (
              <div
                key={widget.id}
                className="col-span-1"
                style={{
                  gridColumn: `span ${Math.min(widget.position.width / 3, 4)}`,
                }}
              >
                <DashboardWidget
                  widget={widget}
                  onRemove={isCustomizing ? handleRemoveWidget : undefined}
                  onEdit={isCustomizing ? handleEditWidget : undefined}
                />
              </div>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Empty State */}
      {widgets.length === 0 && (
        <div className="text-center py-12">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Widgets Available</h3>
          <p className="text-gray-600">
            {isCustomizing
              ? 'Add widgets to customize your dashboard'
              : 'Your dashboard is empty. Contact your administrator to add widgets.'}
          </p>
        </div>
      )}

      {/* Dashboard Info */}
      {dashboardData && (
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Displaying {dashboardData.metadata.dataPoints} data points • 
            Refreshes every {Math.floor(dashboardData.metadata.refreshRate / 60)} minutes
          </p>
        </div>
      )}
    </div>
  );
};

export default ResponsiveDashboard;