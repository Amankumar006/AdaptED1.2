import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Student, StudentFilters } from '../../types';
import { studentsAPI } from '../../services/api/studentsAPI';

const StudentList: React.FC = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<StudentFilters>({});
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadStudents();
  }, [filters]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      // For now, use mock data
      const mockStudents = await studentsAPI.getMockStudents();
      setStudents(mockStudents);
    } catch (error) {
      console.error('Failed to load students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setFilters({ ...filters, search: term });
  };

  const handleFilterChange = (key: keyof StudentFilters, value: any) => {
    setFilters({ ...filters, [key]: value });
  };

  const getRiskLevelColor = (riskScore?: number) => {
    if (!riskScore) return 'bg-green-100 text-green-800';
    if (riskScore < 0.3) return 'bg-green-100 text-green-800';
    if (riskScore < 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getRiskLevelText = (riskScore?: number) => {
    if (!riskScore) return 'Low';
    if (riskScore < 0.3) return 'Low';
    if (riskScore < 0.6) return 'Medium';
    return 'High';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Students
            </label>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={filters.status || ''}
              onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Risk Level
            </label>
            <select
              value={filters.riskLevel || ''}
              onChange={(e) => handleFilterChange('riskLevel', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Risk Levels</option>
              <option value="low">Low Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="high">High Risk</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sort By
            </label>
            <select
              value={filters.sortBy || 'name'}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="name">Name</option>
              <option value="lastActivity">Last Activity</option>
              <option value="progress">Progress</option>
              <option value="riskScore">Risk Score</option>
            </select>
          </div>
        </div>
      </div>

      {/* Student Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {students.map((student) => (
          <div
            key={student.id}
            className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate(`/students/students/${student.id}`)}
          >
            <div className="flex items-center space-x-4 mb-4">
              <div className="flex-shrink-0">
                {student.avatar ? (
                  <img
                    src={student.avatar}
                    alt={`${student.firstName} ${student.lastName}`}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <span className="text-purple-600 font-medium text-lg">
                      {student.firstName[0]}{student.lastName[0]}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-medium text-gray-900 truncate">
                  {student.firstName} {student.lastName}
                </h3>
                <p className="text-sm text-gray-500 truncate">{student.email}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Status:</span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(student.status)}`}>
                  {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Risk Level:</span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRiskLevelColor(student.riskScore)}`}>
                  {getRiskLevelText(student.riskScore)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Progress:</span>
                <div className="flex items-center space-x-2">
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{ width: `${student.progressSummary.overallProgress * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {Math.round(student.progressSummary.overallProgress * 100)}%
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Avg Score:</span>
                <span className="text-sm font-medium text-gray-900">
                  {Math.round(student.progressSummary.averageScore * 100)}%
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Last Activity:</span>
                <span className="text-sm text-gray-900">
                  {new Date(student.lastActivity).toLocaleDateString()}
                </span>
              </div>

              {student.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {student.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                  {student.tags.length > 2 && (
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                      +{student.tags.length - 2} more
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">
                  {student.progressSummary.completedLessons}/{student.progressSummary.totalLessons} lessons
                </span>
                <span className="text-gray-500">
                  {student.progressSummary.streakDays} day streak
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {students.length === 0 && (
        <div className="text-center py-12">
          <span className="text-6xl mb-4 block">👥</span>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
          <p className="text-gray-500">
            {searchTerm || Object.keys(filters).length > 0
              ? 'Try adjusting your search or filters.'
              : 'Students will appear here once they are enrolled in your classes.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default StudentList;