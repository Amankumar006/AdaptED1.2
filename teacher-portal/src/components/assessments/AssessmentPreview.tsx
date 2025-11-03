import React, { useState } from 'react';
import { Assessment, Question } from '../../services/api/assessmentAPI';

interface AssessmentPreviewProps {
  assessment: Assessment;
}

const AssessmentPreview: React.FC<AssessmentPreviewProps> = ({ assessment }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [showResults, setShowResults] = useState(false);

  const currentQuestion = assessment.questions?.[currentQuestionIndex];
  const totalQuestions = assessment.questions?.length || 0;
  const totalPoints = assessment.questions?.reduce((sum, q) => sum + q.points, 0) || 0;

  const handleResponse = (questionId: string, answer: any) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = () => {
    setShowResults(true);
  };

  const renderQuestionContent = (question: Question) => {
    const response = responses[question.id];

    switch (question.type) {
      case 'multiple_choice':
        return (
          <div className="space-y-3">
            {question.options?.map((option) => (
              <label key={option.id} className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Array.isArray(response) ? response.includes(option.id) : response === option.id}
                  onChange={(e) => {
                    if (e.target.checked) {
                      // For preview, allow multiple selections
                      const newResponse = Array.isArray(response) 
                        ? [...response, option.id]
                        : [option.id];
                      handleResponse(question.id, newResponse);
                    } else {
                      const newResponse = Array.isArray(response) 
                        ? response.filter((id: string) => id !== option.id)
                        : null;
                      handleResponse(question.id, newResponse);
                    }
                  }}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div className="flex-1">
                  <div className="text-gray-900">{option.text}</div>
                  {option.explanation && showResults && (
                    <div className={`mt-1 text-sm ${option.isCorrect ? 'text-green-600' : 'text-gray-600'}`}>
                      {option.explanation}
                    </div>
                  )}
                </div>
                {showResults && (
                  <div className="mt-1">
                    {option.isCorrect ? (
                      <span className="text-green-600">✓</span>
                    ) : (
                      <span className="text-red-600">✗</span>
                    )}
                  </div>
                )}
              </label>
            ))}
          </div>
        );

      case 'true_false':
        return (
          <div className="space-y-3">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name={`question_${question.id}`}
                value="true"
                checked={response === true}
                onChange={() => handleResponse(question.id, true)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="text-gray-900">True</span>
              {showResults && response === true && (
                <span className={question.correctAnswer === true ? 'text-green-600' : 'text-red-600'}>
                  {question.correctAnswer === true ? '✓' : '✗'}
                </span>
              )}
            </label>
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name={`question_${question.id}`}
                value="false"
                checked={response === false}
                onChange={() => handleResponse(question.id, false)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="text-gray-900">False</span>
              {showResults && response === false && (
                <span className={question.correctAnswer === false ? 'text-green-600' : 'text-red-600'}>
                  {question.correctAnswer === false ? '✓' : '✗'}
                </span>
              )}
            </label>
          </div>
        );

      case 'essay':
        return (
          <div>
            <textarea
              value={response || ''}
              onChange={(e) => handleResponse(question.id, e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your essay response here..."
            />
            {question.metadata?.wordLimit && (
              <div className="mt-2 text-sm text-gray-500">
                Word limit: {question.metadata.wordLimit} words
              </div>
            )}
            {question.metadata?.sampleAnswer && showResults && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <h5 className="text-sm font-medium text-blue-900 mb-2">Sample Answer:</h5>
                <div className="text-sm text-blue-800">{question.metadata.sampleAnswer}</div>
              </div>
            )}
          </div>
        );

      case 'fill_in_blank':
        return (
          <div>
            <input
              type="text"
              value={response || ''}
              onChange={(e) => handleResponse(question.id, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your answer..."
            />
            {showResults && (
              <div className="mt-2 text-sm">
                <span className="text-gray-600">Correct answers: </span>
                <span className="text-green-600">
                  {Array.isArray(question.correctAnswer) 
                    ? question.correctAnswer.join(', ')
                    : question.correctAnswer}
                </span>
              </div>
            )}
          </div>
        );

      case 'code_submission':
        return (
          <div>
            <div className="mb-3">
              <span className="text-sm font-medium text-gray-700">
                Language: {question.metadata?.language || 'JavaScript'}
              </span>
            </div>
            {question.metadata?.starterCode && (
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Starter Code:
                </label>
                <pre className="bg-gray-100 p-3 rounded-md text-sm font-mono overflow-x-auto">
                  {question.metadata.starterCode}
                </pre>
              </div>
            )}
            <textarea
              value={response || question.metadata?.starterCode || ''}
              onChange={(e) => handleResponse(question.id, e.target.value)}
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder="Write your code here..."
            />
          </div>
        );

      case 'file_upload':
        return (
          <div>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <div className="text-gray-500 mb-2">📎</div>
              <div className="text-sm text-gray-600 mb-2">
                Drag and drop files here, or click to browse
              </div>
              <input
                type="file"
                multiple={question.metadata?.maxFiles > 1}
                accept={question.metadata?.allowedFileTypes?.map((type: string) => `.${type}`).join(',')}
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  handleResponse(question.id, files);
                }}
              />
              <button
                type="button"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                onClick={() => {
                  const input = document.querySelector(`input[type="file"]`) as HTMLInputElement;
                  input?.click();
                }}
              >
                Choose Files
              </button>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Allowed types: {question.metadata?.allowedFileTypes?.join(', ') || 'Any'}
              {question.metadata?.maxFileSize && ` • Max size: ${question.metadata.maxFileSize}MB`}
              {question.metadata?.maxFiles && ` • Max files: ${question.metadata.maxFiles}`}
            </div>
          </div>
        );

      default:
        return (
          <div className="text-gray-500 italic">
            Question type "{question.type}" preview not implemented
          </div>
        );
    }
  };

  if (!assessment.questions || assessment.questions.length === 0) {
    return (
      <div className="text-center py-8">
        <span className="text-4xl mb-4 block">📝</span>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No questions to preview
        </h3>
        <p className="text-gray-500">
          Add questions to see the assessment preview.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Assessment Header */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h1 className="text-2xl font-bold text-blue-900 mb-2">
          {assessment.title}
        </h1>
        {assessment.description && (
          <p className="text-blue-800 mb-4">
            {assessment.description}
          </p>
        )}
        {assessment.instructions && (
          <div className="bg-white border border-blue-200 rounded-md p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Instructions:</h3>
            <p className="text-blue-800 text-sm whitespace-pre-wrap">
              {assessment.instructions}
            </p>
          </div>
        )}
        
        <div className="mt-4 flex items-center justify-between text-sm text-blue-700">
          <div className="flex items-center space-x-4">
            <span>{totalQuestions} questions</span>
            <span>{totalPoints} total points</span>
            {assessment.settings?.timeLimit && (
              <span>Time limit: {assessment.settings.timeLimit} minutes</span>
            )}
          </div>
          {assessment.settings?.passingScore && (
            <span>Passing score: {assessment.settings.passingScore}%</span>
          )}
        </div>
      </div>

      {!showResults ? (
        <>
          {/* Question Navigation */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">
                Question {currentQuestionIndex + 1} of {totalQuestions}
              </h2>
              <div className="text-sm text-gray-600">
                {currentQuestion?.points} point{currentQuestion?.points !== 1 ? 's' : ''}
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
              ></div>
            </div>

            {/* Question Navigation Dots */}
            <div className="flex items-center justify-center space-x-2">
              {assessment.questions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`w-8 h-8 rounded-full text-xs font-medium ${
                    index === currentQuestionIndex
                      ? 'bg-blue-600 text-white'
                      : responses[assessment.questions[index].id]
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Current Question */}
          {currentQuestion && (
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
              <div className="mb-4">
                <div className="flex items-center mb-2">
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded mr-3">
                    {currentQuestion.type.replace('_', ' ')}
                  </span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded">
                    {currentQuestion.difficulty}
                  </span>
                </div>
                
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  {currentQuestion.content.text}
                </h3>
                
                {currentQuestion.content.instructions && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                    <p className="text-yellow-800 text-sm">
                      {currentQuestion.content.instructions}
                    </p>
                  </div>
                )}
              </div>

              {renderQuestionContent(currentQuestion)}

              {/* Hints */}
              {currentQuestion.content.hints && currentQuestion.content.hints.length > 0 && (
                <div className="mt-4">
                  <details className="group">
                    <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-800">
                      💡 Show hints ({currentQuestion.content.hints.length})
                    </summary>
                    <div className="mt-2 space-y-2">
                      {currentQuestion.content.hints.map((hint, index) => (
                        <div key={index} className="bg-blue-50 border border-blue-200 rounded-md p-3">
                          <p className="text-blue-800 text-sm">
                            <strong>Hint {index + 1}:</strong> {hint}
                          </p>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              )}

              {/* Tags */}
              {currentQuestion.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1">
                  {currentQuestion.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <div className="text-sm text-gray-600">
              {Object.keys(responses).length} of {totalQuestions} answered
            </div>

            {currentQuestionIndex === totalQuestions - 1 ? (
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Submit Assessment
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Next
              </button>
            )}
          </div>
        </>
      ) : (
        /* Results View */
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Assessment Preview Complete
            </h2>
            <p className="text-gray-600">
              This is how the assessment would appear to students.
            </p>
          </div>

          <div className="space-y-6">
            {assessment.questions.map((question, index) => (
              <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <h4 className="text-lg font-medium text-gray-900">
                    Question {index + 1}
                  </h4>
                  <span className="text-sm text-gray-600">
                    {question.points} pts
                  </span>
                </div>
                
                <p className="text-gray-800 mb-4">{question.content.text}</p>
                
                <div className="bg-gray-50 rounded-md p-3">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Your Response:</h5>
                  <div className="text-sm text-gray-600">
                    {responses[question.id] ? (
                      typeof responses[question.id] === 'string' ? (
                        responses[question.id]
                      ) : Array.isArray(responses[question.id]) ? (
                        responses[question.id].join(', ')
                      ) : (
                        String(responses[question.id])
                      )
                    ) : (
                      <em>No response</em>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setShowResults(false);
                setCurrentQuestionIndex(0);
                setResponses({});
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Start Over
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssessmentPreview;