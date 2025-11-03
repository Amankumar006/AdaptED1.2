import React, { useState } from 'react';
import { WidgetConfiguration } from '../../../services/api/analyticsAPI';

interface DataTableProps {
  data: {
    headers: string[];
    rows: string[][];
  };
  configuration: WidgetConfiguration;
}

const DataTable: React.FC<DataTableProps> = ({ data, configuration }) => {
  const [sortColumn, setSortColumn] = useState<number | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = configuration.limit || 10;

  const handleSort = (columnIndex: number) => {
    if (sortColumn === columnIndex) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnIndex);
      setSortDirection('asc');
    }
  };

  const sortedRows = React.useMemo(() => {
    if (sortColumn === null) return data.rows;

    return [...data.rows].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      // Try to parse as numbers for proper numeric sorting
      const aNum = parseFloat(aValue.replace(/[^\d.-]/g, ''));
      const bNum = parseFloat(bValue.replace(/[^\d.-]/g, ''));

      let comparison = 0;
      if (!isNaN(aNum) && !isNaN(bNum)) {
        comparison = aNum - bNum;
      } else {
        comparison = aValue.localeCompare(bValue);
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data.rows, sortColumn, sortDirection]);

  const paginatedRows = React.useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return sortedRows.slice(startIndex, endIndex);
  }, [sortedRows, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(sortedRows.length / rowsPerPage);

  const getSortIcon = (columnIndex: number) => {
    if (sortColumn !== columnIndex) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }

    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const getRowStyle = (_rowIndex: number, cellValue: string) => {
    // Highlight risk indicators
    if (data.headers.some(header => header.toLowerCase().includes('risk'))) {
      const riskValue = parseFloat(cellValue.replace(/[^\d.-]/g, ''));
      if (!isNaN(riskValue)) {
        if (riskValue > 0.8) return 'bg-red-50 text-red-900';
        if (riskValue > 0.6) return 'bg-yellow-50 text-yellow-900';
      }
    }

    // Highlight performance indicators
    if (cellValue.includes('%')) {
      const percentage = parseFloat(cellValue.replace('%', ''));
      if (!isNaN(percentage)) {
        if (percentage >= 90) return 'text-green-600 font-medium';
        if (percentage >= 80) return 'text-blue-600';
        if (percentage < 60) return 'text-red-600';
      }
    }

    return '';
  };

  return (
    <div className="w-full">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {data.headers.map((header, index) => (
                <th
                  key={index}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort(index)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{header}</span>
                    {getSortIcon(index)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedRows.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50 transition-colors">
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className={`px-4 py-3 text-sm whitespace-nowrap ${getRowStyle(rowIndex, cell)}`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
          <div className="flex items-center text-sm text-gray-700">
            <span>
              Showing {((currentPage - 1) * rowsPerPage) + 1} to{' '}
              {Math.min(currentPage * rowsPerPage, sortedRows.length)} of{' '}
              {sortedRows.length} results
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 text-sm font-medium rounded-md ${
                      currentPage === pageNum
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;