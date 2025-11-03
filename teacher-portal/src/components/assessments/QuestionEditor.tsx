import React, { useState, useEffect } from 'react';
import { Question, QuestionType, DifficultyLevel, QuestionOption, assessmentAPI } from '../../services/api/assessmentAPI';

interface QuestionEditorProps {
  question?: Question | null;
  onSave: (question: Question) => void;
  onCancel: () => void;
}

const QuestionEditor: React.FC<QuestionEditorProps> = ({
  question,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState<Partial<Question>>({
    type: 'multiple_choice',
    content: {
      text: '',
      instructions: '',
      hints: []
    },
    options: [],
    correctAnswer: null,
    points: 1,
    difficulty: 'intermediate',
    tags: [],
    metadata: {}
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (question) {
      setFormData(question);
    }
  }, [question]);

  const questionTypes: { value: QuestionType; label: string; description: string }[] = [
    { value: 'multiple_choice', label: 'Multiple Choice', description: 'Single or multiple correct answers' },
    { value: 'true_false', label: 'True/False', description: 'Simple true or false question' },
    { value: 'essay', label: 'Essay', description: 'Long-form written response' },
    { value: 'fill_in_blank', label: 'Fill in the Blank', description: 'Complete the missing text' },
    { value: 'code_submission', label: 'Code Submission', description: 'Programming exercise' },
    { value: 'file_upload', label: 'File Upload', description: 'Upload documents or files' },
    { value: 'matching', label: 'Matching', description: 'Match items from two lists' },
    { value: 'ordering', label: 'Ordering', description: 'Arrange items in correct order' }
  ];

  const difficultyLevels: { value: DifficultyLevel; label: string }[] = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
    { value: 'expert', label: 'Expert' }
  ];

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.content?.text?.trim()) {
        throw new Error('Question text is required');
      }

      if (formData.points === undefined || formData.points <= 0) {
        throw new Error('Points must be greater than 0');
      }

      // Type-specific validation
      if (formData.type === 'multiple_choice') {
        if (!formData.options || formData.options.length < 2) {
          throw new Error('Multiple choice questions must have at least 2 options');
        }
        if (!formData.options.some(opt => opt.isCorrect)) {
          throw new Error('At least one option must be marked as correct');
        }
      }

      let savedQuestion: Question;

      if (question?.id) {
        // Update existing question
        const response = await assessmentAPI.updateQuestion(question.id, formData);
        savedQuestion = response.data;
      } else {
        // Create new question
        const response = await assessmentAPI.createQuestion(formData as Omit<Question, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>);
        savedQuestion = response.data;
      }

      onSave(savedQuestion);
    } catch (err: any) {
      setError(err.message || 'Failed to save question');
      console.error('Error saving question:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddOption = () => {
    const newOption: QuestionOption = {
      id: `opt_${Date.now()}`,
      text: '',
      isCorrect: false,
      explanation: ''
    };

    setFormData(prev => ({
      ...prev,
      options: [...(prev.options || []), newOption]
    }));
  };

  const handleUpdateOption = (index: number, updates: Partial<QuestionOption>) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options?.map((opt, i) => 
        i === index ? { ...opt, ...updates } : opt
      ) || []
    }));
  };

  const handleRemoveOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options?.filter((_, i) => i !== index) || []
    }));
  };

  const handleAddHint = () => {
    setFormData(prev => ({
      ...prev,
      content: {
        ...prev.content!,
        hints: [...(prev.content?.hints || []), '']
      }
    }));
  };

  const handleUpdateHint = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      content: {
        ...prev.content!,
        hints: prev.content?.hints?.map((hint, i) => 
          i === index ? value : hint
        ) || []
      }
    }));
  };

  const handleRemoveHint = (index: number) => {
    setFormData(prev => ({
      ...prev,
      content: {
        ...prev.content!,
        hints: prev.content?.hints?.filter((_, i) => i !== index) || []
      }
    }));
  };

  const renderQuestionTypeSpecificFields = () => {
    switch (formData.type) {
      case 'multiple_choice':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-700">Answer Options</h4>
              <button
                type="button"
                onClick={handleAddOption}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add Option
              </button>
            </div>
            
            {formData.options?.map((option, index) => (
              <div key={option.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={option.isCorrect}
                    onChange={(e) => handleUpdateOption(index, { isCorrect: e.target.checked })}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={option.text}
                      onChange={(e) => handleUpdateOption(index, { text: e.target.value })}
                      placeholder={`Option ${index + 1}`}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={option.explanation || ''}
                      onChange={(e) => handleUpdateOption(index, { explanation: e.target.value })}
                      placeholder="Explanation (optional)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(index)}
                    className="mt-1 p-1 text-red-600 hover:text-red-800"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            )) || []}
          </div>
        );

      case 'true_false':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Correct Answer
            </label>
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="trueFalseAnswer"
                  value="true"
                  checked={formData.correctAnswer === true}
                  onChange={() => setFormData(prev => ({ ...prev, correctAnswer: true }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">True</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="trueFalseAnswer"
                  value="false"
                  checked={formData.correctAnswer === false}
                  onChange={() => setFormData(prev => ({ ...prev, correctAnswer: false }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">False</span>
              </label>
            </div>
          </div>
        );

      case 'essay':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Word Limit (optional)
              </label>
              <input
                type="number"
                value={formData.metadata?.wordLimit || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  metadata: {
                    ...prev.metadata,
                    wordLimit: e.target.value ? parseInt(e.target.value) : undefined
                  }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="No limit"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sample Answer (optional)
              </label>
              <textarea
                value={formData.metadata?.sampleAnswer || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  metadata: {
                    ...prev.metadata,
                    sampleAnswer: e.target.value
                  }
                }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Provide a sample answer for reference"
              />
            </div>
          </div>
        );

      case 'fill_in_blank':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Correct Answer(s)
            </label>
            <input
              type="text"
              value={Array.isArray(formData.correctAnswer) ? formData.correctAnswer.join(', ') : formData.correctAnswer || ''}
              onChange={(e) => {
                const answers = e.target.value.split(',').map(a => a.trim()).filter(a => a);
                setFormData(prev => ({ ...prev, correctAnswer: answers }));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter correct answers separated by commas"
            />
            <p className="mt-1 text-xs text-gray-500">
              Use underscores (_____) in the question text to indicate blanks
            </p>
          </div>
        );

      case 'code_submission':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Programming Language
              </label>
              <select
                value={formData.metadata?.language || 'javascript'}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  metadata: {
                    ...prev.metadata,
                    language: e.target.value
                  }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
                <option value="csharp">C#</option>
                <option value="go">Go</option>
                <option value="rust">Rust</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Starter Code (optional)
              </label>
              <textarea
                value={formData.metadata?.starterCode || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  metadata: {
                    ...prev.metadata,
                    starterCode: e.target.value
                  }
                }))}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="// Provide starter code for students"
              />
            </div>
          </div>
        );

      case 'file_upload':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Allowed File Types
              </label>
              <input
                type="text"
                value={formData.metadata?.allowedFileTypes?.join(', ') || ''}
                onChange={(e) => {
                  const types = e.target.value.split(',').map(t => t.trim()).filter(t => t);
                  setFormData(prev => ({
                    ...prev,
                    metadata: {
                      ...prev.metadata,
                      allowedFileTypes: types
                    }
                  }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="pdf, doc, docx, txt"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max File Size (MB)
                </label>
                <input
                  type="number"
                  value={formData.metadata?.maxFileSize || 10}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    metadata: {
                      ...prev.metadata,
                      maxFileSize: parseInt(e.target.value) || 10
                    }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Files
                </label>
                <input
                  type="number"
                  value={formData.metadata?.maxFiles || 1}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    metadata: {
                      ...prev.metadata,
                      maxFiles: parseInt(e.target.value) || 1
                    }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">{error}</div>
        </div>
      )}

      {/* Question Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Question Type *
        </label>
        <select
          value={formData.type}
          onChange={(e) => setFormData(prev => ({ 
            ...prev, 
            type: e.target.value as QuestionType,
            options: e.target.value === 'multiple_choice' ? [] : undefined,
            correctAnswer: null
          }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {questionTypes.map(type => (
            <option key={type.value} value={type.value}>
              {type.label} - {type.description}
            </option>
          ))}
        </select>
      </div>

      {/* Question Text */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Question Text *
        </label>
        <textarea
          value={formData.content?.text || ''}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            content: {
              ...prev.content!,
              text: e.target.value
            }
          }))}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter your question here..."
        />
      </div>

      {/* Instructions */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Instructions (optional)
        </label>
        <textarea
          value={formData.content?.instructions || ''}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            content: {
              ...prev.content!,
              instructions: e.target.value
            }
          }))}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Provide additional instructions for students"
        />
      </div>

      {/* Question Type Specific Fields */}
      {renderQuestionTypeSpecificFields()}

      {/* Hints */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Hints (optional)
          </label>
          <button
            type="button"
            onClick={handleAddHint}
            className="px-3 py-1 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Add Hint
          </button>
        </div>
        
        {formData.content?.hints?.map((hint, index) => (
          <div key={index} className="flex items-center space-x-2 mb-2">
            <input
              type="text"
              value={hint}
              onChange={(e) => handleUpdateHint(index, e.target.value)}
              placeholder={`Hint ${index + 1}`}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => handleRemoveHint(index)}
              className="p-2 text-red-600 hover:text-red-800"
            >
              🗑️
            </button>
          </div>
        )) || []}
      </div>

      {/* Points and Difficulty */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Points *
          </label>
          <input
            type="number"
            min="1"
            value={formData.points || 1}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              points: parseInt(e.target.value) || 1 
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Difficulty Level
          </label>
          <select
            value={formData.difficulty}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              difficulty: e.target.value as DifficultyLevel 
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {difficultyLevels.map(level => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tags
        </label>
        <input
          type="text"
          value={formData.tags?.join(', ') || ''}
          onChange={(e) => {
            const tags = e.target.value.split(',').map(t => t.trim()).filter(t => t);
            setFormData(prev => ({ ...prev, tags }));
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter tags separated by commas"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Question'}
        </button>
      </div>
    </div>
  );
};

export default QuestionEditor;