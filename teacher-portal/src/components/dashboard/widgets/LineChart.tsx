import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { WidgetConfiguration } from '../../../services/api/analyticsAPI';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface LineChartProps {
  data: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      borderColor: string;
      backgroundColor: string;
      tension?: number;
      fill?: boolean;
    }>;
  };
  configuration: WidgetConfiguration;
}

const LineChart: React.FC<LineChartProps> = ({ data, configuration }) => {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: configuration.showLegend !== false,
        position: 'top' as const,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
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
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
    elements: {
      point: {
        radius: 4,
        hoverRadius: 6,
      },
    },
  };

  // Apply custom colors if provided
  const chartData = {
    ...data,
    datasets: data.datasets.map((dataset, index) => ({
      ...dataset,
      borderColor: configuration.colors?.[index] || dataset.borderColor,
      backgroundColor: configuration.colors?.[index] 
        ? `${configuration.colors[index]}20` 
        : dataset.backgroundColor,
      fill: dataset.fill !== false,
    })),
  };

  return (
    <div className="h-64 w-full">
      <Line data={chartData} options={options} />
    </div>
  );
};

export default LineChart;