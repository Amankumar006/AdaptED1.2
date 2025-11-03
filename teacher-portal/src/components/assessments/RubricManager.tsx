import React, { useState, useEffect } from 'react';
import { Rubric, RubricCriterion, RubricLevel, assessmentAPI } from '../../services/api/assessmentAPI';
import { PaginatedResponse } from '../../types';

interface RubricManagerProps {
  onSelectRubric?: (rubric: Rubric) => void;
  selectedRubric?: Rubric | null;
}

const RubricManager: React.FC<RubricManagerProps> = ({
  onSelectRubric,
  selectedRubric
}) => {
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingRubric, setEditingRubric] = useState<Rubric | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  useEffect(() => {
    loadRubrics();
  }, [searchTerm, pagination.page]);

  const loadRubrics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response: PaginatedResponse<Rubric> = await assessmentAPI.getRubrics({
        search: searchTerm || undefined,
        page: pagination.page,
        limit: pagination.limit
      });
      setRubrics(response.data);
      setPagination(response.pagination);
    } catch (err) {
      setError('Failed to load rubrics');
      console.error('Error loading rubrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRubric = () => {
    setEditingRubric(null);
    setShowEditor(true);
  };

  const handleEditRubric = (rubric: Rubric) => {
    setEditingRubric(rubric);
    setShowEditor(true);
  };

  const handleDeleteRubric = async (rubricId: string) => {
    if (!confirm('Are you sure you want to delete this rubric?')) return;
    
    try {
      await assessmentAPI.deleteRubric(rubricId);
      loadRubrics();
    } catch (err) {
      setError('Failed to delete rubric');
      console.error('Error deleting rubric:', err);
    }
  };

  const handleRubricSaved = () => {
    setShowEditor(false);
    setEditingRubric(null);
    loadRubrics();
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Rubric Manager</h2>
          <button
            onClick={handleCreateRubric}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Create Rubric
          </button>
        </div>

        {/* Search */}
        <div>
          <input
            type="text"
            placeholder="Search rubrics..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
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
            {/* Rubrics List */}
            <div className="space-y-4">
              {rubrics.map((rubric) => (
                <div
                  key={rubric.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedRubric?.id === rubric.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => onSelectRubric?.(rubric)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {rubric.name}
                      </h3>
                      <p className="text-gray-600 mb-3">
                        {rubric.description}
                      </p>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>{rubric.criteria.length} criteria</span>
                        <span>{rubric.totalPoints} total points</span>
                        <span>Created: {new Date(rubric.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditRubric(rubric);
                        }}
                        className="p-2 text-gray-400 hover:text-gray-600"
                        title="Edit rubric"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRubric(rubric.id);
                        }}
                        className="p-2 text-gray-400 hover:text-red-600"
                        title="Delete rubric"
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
                  {pagination.total} rubrics
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  
                  <span className="px-3 py-1 text-sm text-gray-700">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page === pagination.totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {rubrics.length === 0 && (
              <div className="text-center py-8">
                <span className="text-4xl mb-4 block">📋</span>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No rubrics found
                </h3>
                <p className="text-gray-500 mb-4">
                  Create your first rubric to get started with structured assessment.
                </p>
                <button
                  onClick={handleCreateRubric}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Rubric
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Rubric Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <RubricEditor
              rubric={editingRubric}
              onSave={handleRubricSaved}
              onCancel={() => {
                setShowEditor(false);
                setEditingRubric(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Rubric Editor Component
interface RubricEditorProps {
  rubric?: Rubric | null;
  onSave: (rubric: Rubric) => void;
  onCancel: () => void;
}

const RubricEditor: React.FC<RubricEditorProps> = ({
  rubric,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState<Partial<Rubric>>({
    name: '',
    description: '',
    criteria: [],
    totalPoints: 0
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (rubric) {
      setFormData(rubric);
    } else {
      // Initialize with default criterion
      setFormData({
        name: '',
        description: '',
        criteria: [createDefaultCriterion()],
        totalPoints: 0
      });
    }
  }, [rubric]);

  useEffect(() => {
    // Calculate total points whenever criteria change
    const totalPoints = formData.criteria?.reduce((sum, criterion) => {
      const maxPoints = Math.max(...criterion.levels.map(level => level.points));
      return sum + maxPoints;
    }, 0) || 0;
    
    setFormData(prev => ({ ...prev, totalPoints }));
  }, [formData.criteria]);

  const createDefaultCriterion = (): RubricCriterion => ({
    id: `criterion_${Date.now()}`,
    name: '',
    description: '',
    levels: [
      { id: `level_${Date.now()}_1`, name: 'Excellent', description: '', points: 4 },
      { id: `level_${Date.now()}_2`, name: 'Good', description: '', points: 3 },
      { id: `level_${Date.now()}_3`, name: 'Satisfactory', description: '', points: 2 },
      { id: `level_${Date.now()}_4`, name: 'Needs Improvement', description: '', points: 1 }
    ]
  });

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.name?.trim()) {
        throw new Error('Rubric name is required');
      }

      if (!formData.criteria || formData.criteria.length === 0) {
        throw new Error('At least one criterion is required');
      }

      // Validate criteria
      for (const criterion of formData.criteria) {
        if (!criterion.name?.trim()) {
          throw new Error('All criteria must have names');
        }
        if (!criterion.levels || criterion.levels.length === 0) {
          throw new Error('All criteria must have at least one level');
        }
      }

      let savedRubric: Rubric;

      if (rubric?.id) {
        // Update existing rubric
        const response = await assessmentAPI.updateRubric(rubric.id, formData);
        savedRubric = response.data;
      } else {
        // Create new rubric
        const response = await assessmentAPI.createRubric(formData as Omit<Rubric, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>);
        savedRubric = response.data;
      }

      onSave(savedRubric);
    } catch (err: any) {
      setError(err.message || 'Failed to save rubric');
      console.error('Error saving rubric:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddCriterion = () => {
    setFormData(prev => ({
      ...prev,
      criteria: [...(prev.criteria || []), createDefaultCriterion()]
    }));
  };

  const handleUpdateCriterion = (index: number, updates: Partial<RubricCriterion>) => {
    setFormData(prev => ({
      ...prev,
      criteria: prev.criteria?.map((criterion, i) => 
        i === index ? { ...criterion, ...updates } : criterion
      ) || []
    }));
  };

  const handleRemoveCriterion = (index: number) => {
    setFormData(prev => ({
      ...prev,
      criteria: prev.criteria?.filter((_, i) => i !== index) || []
    }));
  };

  const handleAddLevel = (criterionIndex: number) => {
    const newLevel: RubricLevel = {
      id: `level_${Date.now()}`,
      name: '',
      description: '',
      points: 0
    };

    setFormData(prev => ({
      ...prev,
      criteria: prev.criteria?.map((criterion, i) => 
        i === criterionIndex 
          ? { ...criterion, levels: [...criterion.levels, newLevel] }
          : criterion
      ) || []
    }));
  };

  const handleUpdateLevel = (criterionIndex: number, levelIndex: number, updates: Partial<RubricLevel>) => {
    setFormData(prev => ({
      ...prev,
      criteria: prev.criteria?.map((criterion, i) => 
        i === criterionIndex 
          ? {
              ...criterion,
              levels: criterion.levels.map((level, j) => 
                j === levelIndex ? { ...level, ...updates } : level
              )
            }
          : criterion
      ) || []
    }));
  };

  const handleRemoveLevel = (criterionIndex: number, levelIndex: number) => {
    setFormData(prev => ({
      ...prev,
      criteria: prev.criteria?.map((criterion, i) => 
        i === criterionIndex 
          ? {
              ...criterion,
              levels: criterion.levels.filter((_, j) => j !== levelIndex)
            }
          : criterion
      ) || []
    }));
  };

  return (
    <div>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {rubric ? 'Edit Rubric' : 'Create Rubric'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="text-red-800">{error}</div>
          </div>
        )}

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rubric Name *
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter rubric name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe what this rubric assesses"
              />
            </div>
          </div>

          {/* Criteria */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Criteria ({formData.criteria?.length || 0})
              </h3>
              <button
                onClick={handleAddCriterion}
                className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add Criterion
              </button>
            </div>

            <div className="space-y-6">
              {formData.criteria?.map((criterion, criterionIndex) => (
                <div key={criterion.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 space-y-3">
                      <input
                        type="text"
                        value={criterion.name}
                        onChange={(e) => handleUpdateCriterion(criterionIndex, { name: e.target.value })}
                        placeholder="Criterion name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <textarea
                        value={criterion.description}
                        onChange={(e) => handleUpdateCriterion(criterionIndex, { description: e.target.value })}
                        placeholder="Criterion description"
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      onClick={() => handleRemoveCriterion(criterionIndex)}
                      className="ml-4 p-2 text-red-600 hover:text-red-800"
                      title="Remove criterion"
                    >
                      🗑️
                    </button>
                  </div>

                  {/* Levels */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-700">
                        Performance Levels ({criterion.levels.length})
                      </h4>
                      <button
                        onClick={() => handleAddLevel(criterionIndex)}
                        className="px-2 py-1 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700"
                      >
                        Add Level
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {criterion.levels.map((level, levelIndex) => (
                        <div key={level.id} className="border border-gray-100 rounded p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="text"
                                  value={level.name}
                                  onChange={(e) => handleUpdateLevel(criterionIndex, levelIndex, { name: e.target.value })}
                                  placeholder="Level name"
                                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                <input
                                  type="number"
                                  value={level.points}
                                  onChange={(e) => handleUpdateLevel(criterionIndex, levelIndex, { points: parseInt(e.target.value) || 0 })}
                                  placeholder="Points"
                                  className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                              <textarea
                                value={level.description}
                                onChange={(e) => handleUpdateLevel(criterionIndex, levelIndex, { description: e.target.value })}
                                placeholder="Level description"
                                rows={2}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                            <button
                              onClick={() => handleRemoveLevel(criterionIndex, levelIndex)}
                              className="ml-2 p-1 text-red-600 hover:text-red-800"
                              title="Remove level"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )) || []}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Rubric Summary</h4>
            <div className="text-sm text-gray-600">
              <p>Total Criteria: {formData.criteria?.length || 0}</p>
              <p>Maximum Points: {formData.totalPoints}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-gray-200">
        <div className="flex items-center justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Rubric'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RubricManager;