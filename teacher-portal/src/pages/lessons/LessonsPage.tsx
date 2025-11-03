import React, { useState, useEffect } from 'react';
import { Lesson, LessonTemplate } from '../../types';
import { lessonsAPI, templatesAPI } from '../../services/api/lessonsAPI';
import LessonBuilder from '../../components/lessons/LessonBuilder';
import { useNotification } from '../../hooks/useNotification';

const LessonsPage: React.FC = () => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [templates, setTemplates] = useState<LessonTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [selectedLessonId, setSelectedLessonId] = useState<string | undefined>();
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  const { showNotification } = useNotification();

  useEffect(() => {
    loadLessons();
    loadTemplates();
  }, []);

  const loadLessons = async () => {
    try {
      const response = await lessonsAPI.getLessons({
        page: 1,
        limit: 20,
        search: searchTerm || undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined,
      });
      setLessons(response.data);
    } catch (error) {
      showNotification('Failed to load lessons', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await templatesAPI.getTemplates();
      setTemplates(response.data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const handleCreateLesson = () => {
    setSelectedLessonId(undefined);
    setShowBuilder(true);
  };

  const handleEditLesson = (lessonId: string) => {
    setSelectedLessonId(lessonId);
    setShowBuilder(true);
  };

  const handleCreateFromTemplate = async (templateId: string) => {
    try {
      const response = await templatesAPI.createFromTemplate(templateId, {
        title: `New Lesson from Template`,
        description: 'Created from template',
        difficulty: 'beginner',
        estimatedDuration: 60,
        learningObjectives: [],
        tags: [],
      });
      
      setSelectedLessonId(response.data.id);
      setShowBuilder(true);
      setShowTemplateModal(false);
      showNotification('Lesson created from template', 'success');
    } catch (error) {
      showNotification('Failed to create lesson from template', 'error');
    }
  };

  const handleLessonSaved = () => {
    loadLessons();
    showNotification('Lesson saved successfully', 'success');
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm('Are you sure you want to delete this lesson?')) return;
    
    try {
      await lessonsAPI.deleteLesson(lessonId);
      loadLessons();
      showNotification('Lesson deleted successfully', 'success');
    } catch (error) {
      showNotification('Failed to delete lesson', 'error');
    }
  };

  const handleDuplicateLesson = async (lessonId: string, title: string) => {
    try {
      await lessonsAPI.duplicateLesson(lessonId, `${title} (Copy)`);
      loadLessons();
      showNotification('Lesson duplicated successfully', 'success');
    } catch (error) {
      showNotification('Failed to duplicate lesson', 'error');
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'bg-yellow-100 text-yellow-800',
      review: 'bg-blue-100 text-blue-800',
      published: 'bg-green-100 text-green-800',
      archived: 'bg-gray-100 text-gray-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const filteredLessons = lessons.filter(lesson => {
    const matchesSearch = lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lesson.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || lesson.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (showBuilder) {
    return (
      <LessonBuilder
        lessonId={selectedLessonId}
        onSave={handleLessonSaved}
        onClose={() => setShowBuilder(false)}
      />
    );
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lessons</h1>
            <p className="mt-1 text-sm text-gray-600">
              Create and manage your lessons with AI-powered tools.
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowTemplateModal(true)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Use Template
            </button>
            <button
              onClick={handleCreateLesson}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Create Lesson
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex items-center space-x-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search lessons..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="review">Review</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Lessons Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredLessons.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-center py-12">
            <span className="text-6xl mb-4 block">📚</span>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {lessons.length === 0 ? 'No lessons yet' : 'No lessons match your search'}
            </h3>
            <p className="text-gray-500 mb-6">
              {lessons.length === 0 
                ? 'Create your first lesson with our AI-powered lesson builder.'
                : 'Try adjusting your search terms or filters.'
              }
            </p>
            {lessons.length === 0 && (
              <div className="flex justify-center space-x-3">
                <button
                  onClick={handleCreateLesson}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Your First Lesson
                </button>
                <button
                  onClick={() => setShowTemplateModal(true)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Use Template
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLessons.map((lesson) => (
            <div key={lesson.id} className="bg-white rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {lesson.title}
                  </h3>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleEditLesson(lesson.id)}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDuplicateLesson(lesson.id, lesson.title)}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded"
                      title="Duplicate"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteLesson(lesson.id)}
                      className="p-1 text-gray-400 hover:text-red-600 rounded"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {lesson.description}
                </p>
                
                <div className="flex items-center justify-between mb-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(lesson.status)}`}>
                    {lesson.status}
                  </span>
                  <span className="text-sm text-gray-500 capitalize">
                    {lesson.difficulty}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center space-x-4">
                    <span>{lesson.modules.length} modules</span>
                    <span>{formatDuration(lesson.estimatedDuration)}</span>
                  </div>
                  <span>{new Date(lesson.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Choose a Template</h3>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleCreateFromTemplate(template.id)}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 text-left"
                >
                  <h4 className="font-medium text-gray-900 mb-2">{template.name}</h4>
                  <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="capitalize">{template.difficulty}</span>
                    <span>{formatDuration(template.estimatedDuration)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LessonsPage;