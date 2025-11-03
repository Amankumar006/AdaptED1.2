import React, { useState, useEffect } from 'react';
import { Assessment, Question, assessmentAPI, AssessmentFilter } from '../../services/api/assessmentAPI';
import { PaginatedResponse } from '../../types';
import AssessmentBuilder from '../../components/assessments/AssessmentBuilder';
import QuestionBank from '../../components/assessments/QuestionBank';
import RubricManager from '../../components/assessments/RubricManager';
import BulkOperations from '../../components/assessments/BulkOperations';

type ViewMode = 'list' | 'create' | 'edit' | 'questions' | 'rubrics' | 'bulk';

const AssessmentsPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null);
  const [selectedAssessments] = useState<Assessment[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([]);
  const [filter, setFilter] = useState<AssessmentFilter>({
    page: 1,
    limit: 10
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  useEffect(() => {
    if (viewMode === 'list') {
      loadAssessments();
    }
  }, [viewMode, filter]);

  const loadAssessments = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response: PaginatedResponse<Assessment> = await assessmentAPI.getAssessments(filter);
      setAssessments(response.data);
      setPagination(response.pagination);
    } catch (err) {
      setError('Failed to load assessments');
      console.error('Error loading assessments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssessment = () => {
    setEditingAssessment(null);
    setViewMode('create');
  };

  const handleEditAssessment = (assessment: Assessment) => {
    setEditingAssessment(assessment);
    setViewMode('edit');
  };

  const handleDeleteAssessment = async (assessmentId: string) => {
    if (!confirm('Are you sure you want to delete this assessment?')) return;
    
    try {
      await assessmentAPI.deleteAssessment(assessmentId);
      loadAssessments();
    } catch (err) {
      setError('Failed to delete assessment');
      console.error('Error deleting assessment:', err);
    }
  };

  const handleDuplicateAssessment = async (assessment: Assessment) => {
    try {
      await assessmentAPI.duplicateAssessment(assessment.id, `${assessment.title} (Copy)`);
      loadAssessments();
    } catch (err) {
      setError('Failed to duplicate assessment');
      console.error('Error duplicating assessment:', err);
    }
  };

  const handlePublishAssessment = async (assessmentId: string) => {
    try {
      await assessmentAPI.publishAssessment(assessmentId);
      loadAssessments();
    } catch (err) {
      setError('Failed to publish assessment');
      console.error('Error publishing assessment:', err);
    }
  };

  const handleAssessmentSaved = () => {
    setViewMode('list');
    setEditingAssessment(null);
    loadAssessments();
  };

  const handleSearch = (searchTerm: string) => {
    setFilter(prev => ({
      ...prev,
      search: searchTerm,
      page: 1
    }));
  };

  const handleFilterChange = (key: keyof AssessmentFilter, value: any) => {
    setFilter(prev => ({
      ...prev,
      [key]: value,
      page: 1
    }));
  };

  const handlePageChange = (page: number) => {
    setFilter(prev => ({ ...prev, page }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'published': return 'bg-green-100 text-green-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderListView = () => (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Assessments</h1>
            <p className="mt-1 text-sm text-gray-600">
              Create and manage quizzes, tests, and assignments.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setViewMode('questions')}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Question Bank
            </button>
            <button
              onClick={() => setViewMode('rubrics')}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Rubrics
            </button>
            <button
              onClick={() => setViewMode('bulk')}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Bulk Operations
            </button>
            <button
              onClick={handleCreateAssessment}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Create Assessment
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <input
                type="text"
                placeholder="Search assessments..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            
            <div>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filter.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div>
              <input
                type="text"
                placeholder="Filter by tags..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => {
                  const tags = e.target.value.split(',').map(t => t.trim()).filter(t => t);
                  handleFilterChange('tags', tags.length > 0 ? tags : undefined);
                }}
              />
            </div>

            <div>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filter.createdBy || ''}
                onChange={(e) => handleFilterChange('createdBy', e.target.value || undefined)}
              >
                <option value="">All Authors</option>
                <option value="me">My Assessments</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <div className="text-red-800">{error}</div>
            </div>
          )}

          {!loading && !error && (
            <>
              {/* Assessments List */}
              <div className="space-y-4">
                {assessments.map((assessment) => (
                  <div
                    key={assessment.id}
                    className="border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <h3 className="text-lg font-medium text-gray-900 mr-3">
                            {assessment.title}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(assessment.status)}`}>
                            {assessment.status}
                          </span>
                        </div>
                        
                        <p className="text-gray-600 mb-3">
                          {assessment.description}
                        </p>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                          <span>{assessment.questions?.length || 0} questions</span>
                          <span>{assessment.questions?.reduce((sum, q) => sum + q.points, 0) || 0} total points</span>
                          <span>Created: {new Date(assessment.createdAt).toLocaleDateString()}</span>
                        </div>
                        
                        {assessment.tags && assessment.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {assessment.tags.map((tag, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => handleEditAssessment(assessment)}
                          className="p-2 text-gray-400 hover:text-gray-600"
                          title="Edit assessment"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDuplicateAssessment(assessment)}
                          className="p-2 text-gray-400 hover:text-gray-600"
                          title="Duplicate assessment"
                        >
                          📋
                        </button>
                        {assessment.status === 'draft' && (
                          <button
                            onClick={() => handlePublishAssessment(assessment.id)}
                            className="p-2 text-gray-400 hover:text-green-600"
                            title="Publish assessment"
                          >
                            🚀
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteAssessment(assessment.id)}
                          className="p-2 text-gray-400 hover:text-red-600"
                          title="Delete assessment"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-700">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                    {pagination.total} assessments
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      const page = i + 1;
                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`px-3 py-1 border rounded-md text-sm ${
                            page === pagination.page
                              ? 'border-blue-500 bg-blue-50 text-blue-600'
                              : 'border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.totalPages}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}

              {assessments.length === 0 && (
                <div className="text-center py-12">
                  <span className="text-6xl mb-4 block">📝</span>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No assessments found
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Create your first assessment to get started.
                  </p>
                  <button
                    onClick={handleCreateAssessment}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Create Assessment
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );

  const renderCreateEditView = () => (
    <AssessmentBuilder
      assessmentId={editingAssessment?.id}
      onSave={handleAssessmentSaved}
      onCancel={() => setViewMode('list')}
    />
  );

  const renderQuestionBankView = () => (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Question Bank</h2>
          <button
            onClick={() => setViewMode('list')}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Back to Assessments
          </button>
        </div>
      </div>
      <QuestionBank
        selectionMode="multiple"
        onSelectMultiple={setSelectedQuestions}
        selectedQuestions={selectedQuestions}
      />
    </div>
  );

  const renderRubricsView = () => (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Rubric Manager</h2>
          <button
            onClick={() => setViewMode('list')}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Back to Assessments
          </button>
        </div>
      </div>
      <RubricManager />
    </div>
  );

  const renderBulkOperationsView = () => (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Bulk Operations</h2>
          <button
            onClick={() => setViewMode('list')}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Back to Assessments
          </button>
        </div>
      </div>
      <BulkOperations
        selectedQuestions={selectedQuestions}
        selectedAssessments={selectedAssessments}
        onImportComplete={() => {
          // Refresh data after import
          if (viewMode === 'list') {
            loadAssessments();
          }
        }}
      />
    </div>
  );

  // Render based on current view mode
  switch (viewMode) {
    case 'create':
    case 'edit':
      return renderCreateEditView();
    case 'questions':
      return renderQuestionBankView();
    case 'rubrics':
      return renderRubricsView();
    case 'bulk':
      return renderBulkOperationsView();
    default:
      return renderListView();
  }
};

export default AssessmentsPage;