import React from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { WidgetConfiguration } from '../../../services/api/analyticsAPI';

ChartJS.register(ArcElement, Tooltip, Legend);

interface PieChartProps {
  data: {
    series: Array<{
      name: string;
      value: number;
    }>;
  };
  configuration: WidgetConfiguration;
}

const PieChart: React.FC<PieChartProps> = ({ data, configuration }) => {
  const defaultColors = [
    '#3B82F6', // blue-500
    '#10B981', // emerald-500
    '#F59E0B', // amber-500
    '#EF4444', // red-500
    '#8B5CF6', // violet-500
    '#06B6D4', // cyan-500
    '#84CC16', // lime-500
    '#F97316', // orange-500
  ];

  const chartData = {
    labels: data.series.map(item => item.name),
    datasets: [
      {
        data: data.series.map(item => item.value),
        backgroundColor: configuration.colors || defaultColors.slice(0, data.series.length),
        borderColor: configuration.colors?.map(color => color) || defaultColors.slice(0, data.series.length),
        borderWidth: 1,
        hoverBorderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: configuration.showLegend !== false,
        position: 'right' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
  };

  return (
    <div className="h-64 w-full flex items-center justify-center">
      <Pie data={chartData} options={options} />
    </div>
  );
};

export default PieChart;