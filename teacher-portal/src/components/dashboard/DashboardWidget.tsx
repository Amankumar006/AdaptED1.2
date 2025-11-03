import React from 'react';
import { DashboardWidget as WidgetType } from '../../services/api/analyticsAPI';
import MetricCard from './widgets/MetricCard';
import LineChart from './widgets/LineChart';
import BarChart from './widgets/BarChart';
import PieChart from './widgets/PieChart';
import DataTable from './widgets/DataTable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface DashboardWidgetProps {
  widget: WidgetType;
  isDragging?: boolean;
  onRemove?: (widgetId: string) => void;
  onEdit?: (widgetId: string) => void;
}

const DashboardWidget: React.FC<DashboardWidgetProps> = ({
  widget,
  isDragging = false,
  onRemove,
  onEdit,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: sortableIsDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: sortableIsDragging ? 0.5 : 1,
  };

  const renderWidget = () => {
    switch (widget.type) {
      case 'metric_card':
        return <MetricCard data={widget.data} configuration={widget.configuration} />;
      case 'line_chart':
        return <LineChart data={widget.data} configuration={widget.configuration} />;
      case 'bar_chart':
        return <BarChart data={widget.data} configuration={widget.configuration} />;
      case 'pie_chart':
        return <PieChart data={widget.data} configuration={widget.configuration} />;
      case 'table':
        return <DataTable data={widget.data} configuration={widget.configuration} />;
      default:
        return (
          <div className="flex items-center justify-center h-32 text-gray-500">
            Unsupported widget type: {widget.type}
          </div>
        );
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden ${
        isDragging || sortableIsDragging ? 'shadow-lg ring-2 ring-blue-500' : ''
      }`}
      {...attributes}
    >
      {/* Widget Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900 truncate">{widget.title}</h3>
        <div className="flex items-center space-x-2">
          {onEdit && (
            <button
              onClick={() => onEdit(widget.id)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="Edit widget"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
          <button
            {...listeners}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors cursor-grab active:cursor-grabbing"
            title="Drag to reorder"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
          </button>
          {onRemove && (
            <button
              onClick={() => onRemove(widget.id)}
              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
              title="Remove widget"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Widget Content */}
      <div className="p-4">
        {renderWidget()}
      </div>
    </div>
  );
};

export default DashboardWidget;