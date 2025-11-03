import React, { useState, useEffect } from 'react';
import { Question, QuestionBankFilter, QuestionType, DifficultyLevel, assessmentAPI } from '../../services/api/assessmentAPI';
import { PaginatedResponse } from '../../types';

interface QuestionBankProps {
  onSelectQuestion?: (question: Question) => void;
  onSelectMultiple?: (questions: Question[]) => void;
  selectionMode?: 'single' | 'multiple';
  selectedQuestions?: Question[];
}

const QuestionBank: React.FC<QuestionBankProps> = ({
  onSelectQuestion,
  onSelectMultiple,
  selectionMode = 'single',
  selectedQuestions = []
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<QuestionBankFilter>({
    page: 1,
    limit: 20
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(selectedQuestions.map(q => q.id))
  );

  const questionTypes: { value: QuestionType; label: string }[] = [
    { value: 'multiple_choice', label: 'Multiple Choice' },
    { value: 'essay', label: 'Essay' },
    { value: 'true_false', label: 'True/False' },
    { value: 'fill_in_blank', label: 'Fill in the Blank' },
    { value: 'code_submission', label: 'Code Submission' },
    { value: 'file_upload', label: 'File Upload' },
    { value: 'matching', label: 'Matching' },
    { value: 'ordering', label: 'Ordering' }
  ];

  const difficultyLevels: { value: DifficultyLevel; label: string }[] = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
    { value: 'expert', label: 'Expert' }
  ];

  useEffect(() => {
    loadQuestions();
  }, [filter]);

  const loadQuestions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response: PaginatedResponse<Question> = await assessmentAPI.getQuestions(filter);
      setQuestions(response.data);
      setPagination(response.pagination);
    } catch (err) {
      setError('Failed to load questions');
      console.error('Error loading questions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof QuestionBankFilter, value: any) => {
    setFilter(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filtering
    }));
  };

  const handleSearch = (searchTerm: string) => {
    setFilter(prev => ({
      ...prev,
      search: searchTerm,
      page: 1
    }));
  };

  const handlePageChange = (page: number) => {
    setFilter(prev => ({ ...prev, page }));
  };

  const handleQuestionSelect = (question: Question) => {
    if (selectionMode === 'single') {
      onSelectQuestion?.(question);
    } else {
      const newSelectedIds = new Set(selectedIds);
      if (selectedIds.has(question.id)) {
        newSelectedIds.delete(question.id);
      } else {
        newSelectedIds.add(question.id);
      }
      setSelectedIds(newSelectedIds);
      
      const selectedQuestions = questions.filter(q => newSelectedIds.has(q.id));
      onSelectMultiple?.(selectedQuestions);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === questions.length) {
      setSelectedIds(new Set());
      onSelectMultiple?.([]);
    } else {
      const allIds = new Set(questions.map(q => q.id));
      setSelectedIds(allIds);
      onSelectMultiple?.(questions);
    }
  };

  const getDifficultyColor = (difficulty: DifficultyLevel) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-orange-100 text-orange-800';
      case 'expert': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getQuestionTypeIcon = (type: QuestionType) => {
    switch (type) {
      case 'multiple_choice': return '☑️';
      case 'essay': return '📝';
      case 'true_false': return '✅';
      case 'fill_in_blank': return '📄';
      case 'code_submission': return '💻';
      case 'file_upload': return '📎';
      case 'matching': return '🔗';
      case 'ordering': return '📋';
      default: return '❓';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Question Bank</h2>
          {selectionMode === 'multiple' && (
            <div className="text-sm text-gray-600">
              {selectedIds.size} of {questions.length} selected
            </div>
          )}
        </div>

        {/* Search and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <input
              type="text"
              placeholder="Search questions..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          
          <div>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filter.type || ''}
              onChange={(e) => handleFilterChange('type', e.target.value || undefined)}
            >
              <option value="">All Types</option>
              {questionTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filter.difficulty || ''}
              onChange={(e) => handleFilterChange('difficulty', e.target.value || undefined)}
            >
              <option value="">All Difficulties</option>
              {difficultyLevels.map(level => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
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
        </div>
      </div>

      {/* Content */}
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
            {/* Select All (for multiple selection) */}
            {selectionMode === 'multiple' && questions.length > 0 && (
              <div className="flex items-center mb-4 pb-4 border-b border-gray-200">
                <input
                  type="checkbox"
                  checked={selectedIds.size === questions.length && questions.length > 0}
                  onChange={handleSelectAll}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm font-medium text-gray-700">
                  Select All Questions
                </label>
              </div>
            )}

            {/* Questions List */}
            <div className="space-y-4">
              {questions.map((question) => (
                <div
                  key={question.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedIds.has(question.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleQuestionSelect(question)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        {selectionMode === 'multiple' && (
                          <input
                            type="checkbox"
                            checked={selectedIds.has(question.id)}
                            onChange={() => handleQuestionSelect(question)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        <span className="text-lg mr-2">
                          {getQuestionTypeIcon(question.type)}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(question.difficulty)}`}>
                          {question.difficulty}
                        </span>
                        <span className="ml-2 text-sm font-medium text-gray-600">
                          {question.points} pts
                        </span>
                      </div>
                      
                      <div className="text-gray-900 mb-2 line-clamp-2">
                        {question.content.text}
                      </div>
                      
                      {question.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {question.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-500">
                        Created: {new Date(question.createdAt).toLocaleDateString()}
                      </div>
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
                  {pagination.total} questions
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

            {questions.length === 0 && (
              <div className="text-center py-8">
                <span className="text-4xl mb-4 block">📝</span>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No questions found
                </h3>
                <p className="text-gray-500">
                  Try adjusting your search criteria or create new questions.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default QuestionBank;