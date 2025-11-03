import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Lesson, LessonModule, CollaborationSession } from '../../types';

interface LessonBuilderCanvasProps {
  lesson: Lesson | null;
  modules: LessonModule[];
  selectedModule: LessonModule | null;
  onSelectModule: (module: LessonModule) => void;
  onUpdateModule: (module: LessonModule) => void;
  onDeleteModule: (moduleId: string) => void;
  collaborationSession: CollaborationSession | null;
}

interface SortableModuleProps {
  module: LessonModule;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  collaborators: any[];
}

const SortableModule: React.FC<SortableModuleProps> = ({
  module,
  isSelected,
  onSelect,
  onDelete,
  collaborators
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getModuleIcon = (type: string) => {
    const icons = {
      text: '📝',
      video: '🎥',
      audio: '🎵',
      image: '🖼️',
      interactive: '🎮',
      assessment: '📊',
      file: '📎'
    };
    return icons[type as keyof typeof icons] || '📄';
  };

  const getModuleTypeColor = (type: string) => {
    const colors = {
      text: 'bg-blue-100 text-blue-800',
      video: 'bg-red-100 text-red-800',
      audio: 'bg-purple-100 text-purple-800',
      image: 'bg-green-100 text-green-800',
      interactive: 'bg-yellow-100 text-yellow-800',
      assessment: 'bg-indigo-100 text-indigo-800',
      file: 'bg-gray-100 text-gray-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${isDragging ? 'opacity-50' : ''}`}
    >
      <div
        onClick={onSelect}
        className={`p-4 border rounded-lg cursor-pointer transition-all ${
          isSelected
            ? 'border-blue-500 bg-blue-50 shadow-md'
            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
        }`}
      >
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="absolute left-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
        >
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </div>

        {/* Module Content */}
        <div className="ml-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <span className="text-2xl">{getModuleIcon(module.type)}</span>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-medium text-gray-900 truncate">
                  {module.title}
                </h3>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getModuleTypeColor(module.type)}`}>
                    {module.type}
                  </span>
                  <span className="text-sm text-gray-500">
                    {formatDuration(module.duration)}
                  </span>
                </div>
                
                {/* Module Preview */}
                <div className="mt-2">
                  {module.type === 'text' && module.content.text && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {module.content.text.substring(0, 100)}...
                    </p>
                  )}
                  {module.type === 'video' && module.content.mediaUrl && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m6-6V7a2 2 0 00-2-2H5a2 2 0 00-2 2v3m0 0v8a2 2 0 002 2h14a2 2 0 002-2v-8m0 0V7" />
                      </svg>
                      <span>Video content attached</span>
                    </div>
                  )}
                  {module.type === 'assessment' && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <span>Assessment questions</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Handle duplicate
                }}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
                title="Duplicate"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="p-1 text-gray-400 hover:text-red-600 rounded"
                title="Delete"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Collaboration Cursors */}
          {collaborators.length > 0 && (
            <div className="mt-2 flex items-center space-x-1">
              {collaborators.map((collaborator, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-1 text-xs text-blue-600"
                >
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>{collaborator.name} is editing</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const LessonBuilderCanvas: React.FC<LessonBuilderCanvasProps> = ({
  lesson,
  modules,
  selectedModule,
  onSelectModule,
  onUpdateModule: _onUpdateModule,
  onDeleteModule,
  collaborationSession
}) => {
  const getCollaboratorsForModule = (moduleId: string) => {
    if (!collaborationSession) return [];
    return collaborationSession.participants.filter(
      p => p.cursor?.moduleId === moduleId && p.isOnline
    );
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-gray-50">
      {/* Lesson Header */}
      <div className="mb-8">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {lesson?.title || 'Untitled Lesson'}
              </h1>
              <p className="text-gray-600 mb-4">
                {lesson?.description || 'Add a description to help students understand what they will learn.'}
              </p>
              
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>
                    {modules.reduce((total, module) => total + module.duration, 0)} minutes
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <span>{modules.length} modules</span>
                </div>
                <div className="flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="capitalize">{lesson?.difficulty || 'beginner'}</span>
                </div>
              </div>

              {/* Learning Objectives */}
              {lesson?.learningObjectives && lesson.learningObjectives.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Learning Objectives</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                    {lesson.learningObjectives.map((objective, index) => (
                      <li key={index}>{objective}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex-shrink-0 ml-6">
              <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md">
                Edit Details
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modules */}
      <div className="space-y-4">
        {modules.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Start Building Your Lesson
            </h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Add modules from the sidebar to create engaging learning content. 
              You can drag and drop to reorder them.
            </p>
            <div className="flex justify-center space-x-3">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                Add Text Module
              </button>
              <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
                Use AI Assistant
              </button>
            </div>
          </div>
        ) : (
          modules.map((module) => (
            <SortableModule
              key={module.id}
              module={module}
              isSelected={selectedModule?.id === module.id}
              onSelect={() => onSelectModule(module)}
              onDelete={() => onDeleteModule(module.id)}
              collaborators={getCollaboratorsForModule(module.id)}
            />
          ))
        )}
      </div>

      {/* Add Module Button */}
      {modules.length > 0 && (
        <div className="mt-6 text-center">
          <button className="px-6 py-3 border-2 border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-blue-300 hover:text-blue-600 transition-colors">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Add Module</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

export default LessonBuilderCanvas;