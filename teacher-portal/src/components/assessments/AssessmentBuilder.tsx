import React, { useState, useEffect } from 'react';
import { Assessment, Question, assessmentAPI } from '../../services/api/assessmentAPI';
import QuestionBank from './QuestionBank';
import QuestionEditor from './QuestionEditor';
import AssessmentPreview from './AssessmentPreview';

interface AssessmentBuilderProps {
  assessmentId?: string;
  onSave?: (assessment: Assessment) => void;
  onCancel?: () => void;
}

type BuilderTab = 'details' | 'questions' | 'settings' | 'preview';

const AssessmentBuilder: React.FC<AssessmentBuilderProps> = ({
  assessmentId,
  onSave,
  onCancel
}) => {
  const [activeTab, setActiveTab] = useState<BuilderTab>('details');
  const [assessment, setAssessment] = useState<Partial<Assessment>>({
    title: '',
    description: '',
    instructions: '',
    questions: [],
    settings: {
      timeLimit: undefined,
      allowRetakes: false,
      maxAttempts: 1,
      shuffleQuestions: false,
      shuffleOptions: false,
      showResults: true,
      showCorrectAnswers: true,
      availableFrom: undefined,
      availableUntil: undefined,
      passingScore: undefined,
      isAdaptive: false
    },
    status: 'draft',
    tags: []
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQuestionBank, setShowQuestionBank] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [showQuestionEditor, setShowQuestionEditor] = useState(false);

  useEffect(() => {
    if (assessmentId) {
      loadAssessment();
    }
  }, [assessmentId]);

  const loadAssessment = async () => {
    if (!assessmentId) return;
    
    setLoading(true);
    try {
      const response = await assessmentAPI.getAssessment(assessmentId);
      setAssessment(response.data);
    } catch (err) {
      setError('Failed to load assessment');
      console.error('Error loading assessment:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    
    try {
      let savedAssessment: Assessment;
      
      if (assessmentId) {
        const response = await assessmentAPI.updateAssessment(assessmentId, assessment);
        savedAssessment = response.data;
      } else {
        const response = await assessmentAPI.createAssessment(assessment as Omit<Assessment, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>);
        savedAssessment = response.data;
      }
      
      setAssessment(savedAssessment);
      onSave?.(savedAssessment);
    } catch (err) {
      setError('Failed to save assessment');
      console.error('Error saving assessment:', err);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!assessment.id) {
      await handleSave();
      return;
    }
    
    setSaving(true);
    try {
      const response = await assessmentAPI.publishAssessment(assessment.id);
      setAssessment(response.data);
      onSave?.(response.data);
    } catch (err) {
      setError('Failed to publish assessment');
      console.error('Error publishing assessment:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddQuestions = (questions: Question[]) => {
    setAssessment(prev => ({
      ...prev,
      questions: [...(prev.questions || []), ...questions]
    }));
    setShowQuestionBank(false);
  };

  const handleRemoveQuestion = (questionId: string) => {
    setAssessment(prev => ({
      ...prev,
      questions: prev.questions?.filter(q => q.id !== questionId) || []
    }));
  };

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question);
    setShowQuestionEditor(true);
  };

  const handleQuestionSaved = (question: Question) => {
    setAssessment(prev => ({
      ...prev,
      questions: prev.questions?.map(q => q.id === question.id ? question : q) || []
    }));
    setShowQuestionEditor(false);
    setEditingQuestion(null);
  };

  const handleCreateNewQuestion = () => {
    setEditingQuestion(null);
    setShowQuestionEditor(true);
  };

  const handleNewQuestionCreated = (question: Question) => {
    setAssessment(prev => ({
      ...prev,
      questions: [...(prev.questions || []), question]
    }));
    setShowQuestionEditor(false);
  };

  const handleMoveQuestion = (fromIndex: number, toIndex: number) => {
    const questions = [...(assessment.questions || [])];
    const [movedQuestion] = questions.splice(fromIndex, 1);
    questions.splice(toIndex, 0, movedQuestion);
    
    setAssessment(prev => ({
      ...prev,
      questions
    }));
  };

  const tabs = [
    { id: 'details', label: 'Details', icon: '📝' },
    { id: 'questions', label: 'Questions', icon: '❓' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
    { id: 'preview', label: 'Preview', icon: '👁️' }
  ];

  const totalPoints = assessment.questions?.reduce((sum, q) => sum + q.points, 0) || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {assessmentId ? 'Edit Assessment' : 'Create Assessment'}
            </h1>
            <p className="text-gray-600 mt-1">
              {assessment.questions?.length || 0} questions • {totalPoints} total points
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
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
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            {assessment.status === 'draft' && (
              <button
                onClick={handlePublish}
                disabled={saving || !assessment.questions?.length}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? 'Publishing...' : 'Publish'}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-red-800">{error}</div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as BuilderTab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'details' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assessment Title *
              </label>
              <input
                type="text"
                value={assessment.title || ''}
                onChange={(e) => setAssessment(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter assessment title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={assessment.description || ''}
                onChange={(e) => setAssessment(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe what this assessment covers"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Instructions for Students
              </label>
              <textarea
                value={assessment.instructions || ''}
                onChange={(e) => setAssessment(prev => ({ ...prev, instructions: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Provide instructions for students taking this assessment"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <input
                type="text"
                value={assessment.tags?.join(', ') || ''}
                onChange={(e) => {
                  const tags = e.target.value.split(',').map(t => t.trim()).filter(t => t);
                  setAssessment(prev => ({ ...prev, tags }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter tags separated by commas"
              />
            </div>
          </div>
        )}

        {activeTab === 'questions' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                Questions ({assessment.questions?.length || 0})
              </h3>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleCreateNewQuestion}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Question
                </button>
                <button
                  onClick={() => setShowQuestionBank(true)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Add from Bank
                </button>
              </div>
            </div>

            {assessment.questions && assessment.questions.length > 0 ? (
              <div className="space-y-4">
                {assessment.questions.map((question, index) => (
                  <div
                    key={question.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <span className="text-sm font-medium text-gray-500 mr-3">
                            Q{index + 1}
                          </span>
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                            {question.type.replace('_', ' ')}
                          </span>
                          <span className="ml-2 text-sm text-gray-600">
                            {question.points} pts
                          </span>
                        </div>
                        <div className="text-gray-900 mb-2">
                          {question.content.text}
                        </div>
                        {question.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {question.tags.map((tag, tagIndex) => (
                              <span
                                key={tagIndex}
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
                          onClick={() => handleEditQuestion(question)}
                          className="p-2 text-gray-400 hover:text-gray-600"
                          title="Edit question"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleRemoveQuestion(question.id)}
                          className="p-2 text-gray-400 hover:text-red-600"
                          title="Remove question"
                        >
                          🗑️
                        </button>
                        <div className="flex flex-col space-y-1">
                          <button
                            onClick={() => handleMoveQuestion(index, index - 1)}
                            disabled={index === 0}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                            title="Move up"
                          >
                            ⬆️
                          </button>
                          <button
                            onClick={() => handleMoveQuestion(index, index + 1)}
                            disabled={index === (assessment.questions?.length || 0) - 1}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                            title="Move down"
                          >
                            ⬇️
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                <span className="text-4xl mb-4 block">❓</span>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No questions added yet
                </h3>
                <p className="text-gray-500 mb-4">
                  Create new questions or add existing ones from your question bank.
                </p>
                <div className="flex items-center justify-center space-x-3">
                  <button
                    onClick={handleCreateNewQuestion}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Create Question
                  </button>
                  <button
                    onClick={() => setShowQuestionBank(true)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Add from Bank
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time Limit (minutes)
                </label>
                <input
                  type="number"
                  value={assessment.settings?.timeLimit || ''}
                  onChange={(e) => setAssessment(prev => ({
                    ...prev,
                    settings: {
                      ...prev.settings!,
                      timeLimit: e.target.value ? parseInt(e.target.value) : undefined
                    }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="No time limit"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Passing Score (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={assessment.settings?.passingScore || ''}
                  onChange={(e) => setAssessment(prev => ({
                    ...prev,
                    settings: {
                      ...prev.settings!,
                      passingScore: e.target.value ? parseInt(e.target.value) : undefined
                    }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="No passing score"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="allowRetakes"
                  checked={assessment.settings?.allowRetakes || false}
                  onChange={(e) => setAssessment(prev => ({
                    ...prev,
                    settings: {
                      ...prev.settings!,
                      allowRetakes: e.target.checked
                    }
                  }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="allowRetakes" className="ml-2 text-sm text-gray-700">
                  Allow retakes
                </label>
              </div>

              {assessment.settings?.allowRetakes && (
                <div className="ml-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Attempts
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={assessment.settings?.maxAttempts || 1}
                    onChange={(e) => setAssessment(prev => ({
                      ...prev,
                      settings: {
                        ...prev.settings!,
                        maxAttempts: parseInt(e.target.value) || 1
                      }
                    }))}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="shuffleQuestions"
                  checked={assessment.settings?.shuffleQuestions || false}
                  onChange={(e) => setAssessment(prev => ({
                    ...prev,
                    settings: {
                      ...prev.settings!,
                      shuffleQuestions: e.target.checked
                    }
                  }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="shuffleQuestions" className="ml-2 text-sm text-gray-700">
                  Shuffle questions
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="shuffleOptions"
                  checked={assessment.settings?.shuffleOptions || false}
                  onChange={(e) => setAssessment(prev => ({
                    ...prev,
                    settings: {
                      ...prev.settings!,
                      shuffleOptions: e.target.checked
                    }
                  }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="shuffleOptions" className="ml-2 text-sm text-gray-700">
                  Shuffle answer options
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="showResults"
                  checked={assessment.settings?.showResults || false}
                  onChange={(e) => setAssessment(prev => ({
                    ...prev,
                    settings: {
                      ...prev.settings!,
                      showResults: e.target.checked
                    }
                  }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="showResults" className="ml-2 text-sm text-gray-700">
                  Show results to students
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="showCorrectAnswers"
                  checked={assessment.settings?.showCorrectAnswers || false}
                  onChange={(e) => setAssessment(prev => ({
                    ...prev,
                    settings: {
                      ...prev.settings!,
                      showCorrectAnswers: e.target.checked
                    }
                  }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="showCorrectAnswers" className="ml-2 text-sm text-gray-700">
                  Show correct answers after submission
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isAdaptive"
                  checked={assessment.settings?.isAdaptive || false}
                  onChange={(e) => setAssessment(prev => ({
                    ...prev,
                    settings: {
                      ...prev.settings!,
                      isAdaptive: e.target.checked
                    }
                  }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isAdaptive" className="ml-2 text-sm text-gray-700">
                  Enable adaptive testing
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Available From
                </label>
                <input
                  type="datetime-local"
                  value={assessment.settings?.availableFrom ? 
                    new Date(assessment.settings.availableFrom).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setAssessment(prev => ({
                    ...prev,
                    settings: {
                      ...prev.settings!,
                      availableFrom: e.target.value ? new Date(e.target.value) : undefined
                    }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Available Until
                </label>
                <input
                  type="datetime-local"
                  value={assessment.settings?.availableUntil ? 
                    new Date(assessment.settings.availableUntil).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setAssessment(prev => ({
                    ...prev,
                    settings: {
                      ...prev.settings!,
                      availableUntil: e.target.value ? new Date(e.target.value) : undefined
                    }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'preview' && (
          <AssessmentPreview assessment={assessment as Assessment} />
        )}
      </div>

      {/* Question Bank Modal */}
      {showQuestionBank && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Add Questions from Bank</h2>
                <button
                  onClick={() => setShowQuestionBank(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <QuestionBank
                selectionMode="multiple"
                onSelectMultiple={handleAddQuestions}
                selectedQuestions={assessment.questions || []}
              />
            </div>
          </div>
        </div>
      )}

      {/* Question Editor Modal */}
      {showQuestionEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingQuestion ? 'Edit Question' : 'Create Question'}
                </h2>
                <button
                  onClick={() => {
                    setShowQuestionEditor(false);
                    setEditingQuestion(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <QuestionEditor
                question={editingQuestion}
                onSave={editingQuestion ? handleQuestionSaved : handleNewQuestionCreated}
                onCancel={() => {
                  setShowQuestionEditor(false);
                  setEditingQuestion(null);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssessmentBuilder;