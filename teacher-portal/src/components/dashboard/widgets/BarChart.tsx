import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { WidgetConfiguration } from '../../../services/api/analyticsAPI';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface BarChartProps {
  data: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor: string | string[];
      borderColor?: string | string[];
      borderWidth?: number;
    }>;
  };
  configuration: WidgetConfiguration;
}

const BarChart: React.FC<BarChartProps> = ({ data, configuration }) => {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: configuration.showLegend !== false,
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (configuration.format === 'percentage') {
              label += `${(context.parsed.y * 100).toFixed(1)}%`;
            } else {
              label += context.parsed.y.toLocaleString();
            }
            return label;
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: !!configuration.xAxisLabel,
          text: configuration.xAxisLabel || '',
        },
        grid: {
          display: configuration.showGrid !== false,
        },
      },
      y: {
        display: true,
        title: {
          display: !!configuration.yAxisLabel,
          text: configuration.yAxisLabel || '',
        },
        grid: {
          display: configuration.showGrid !== false,
        },
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            if (configuration.format === 'percentage') {
              return `${(value * 100).toFixed(0)}%`;
            }
            return value;
          },
        },
      },
    },
  };

  // Apply custom colors if provided
  const chartData = {
    ...data,
    datasets: data.datasets.map((dataset) => ({
      ...dataset,
      backgroundColor: configuration.colors || dataset.backgroundColor,
      borderColor: configuration.colors || dataset.borderColor,
      borderWidth: dataset.borderWidth || 1,
    })),
  };

  return (
    <div className="h-64 w-full">
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default BarChart;