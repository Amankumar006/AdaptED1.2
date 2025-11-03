import React, { useState } from 'react';
import { LessonModule } from '../../types';

interface LessonBuilderSidebarProps {
  onAddModule: (type: string) => void;
  selectedModule: LessonModule | null;
  modules: LessonModule[];
  onSelectModule: (module: LessonModule) => void;
}

const moduleTypes = [
  {
    type: 'text',
    name: 'Text Content',
    icon: '📝',
    description: 'Rich text content with formatting'
  },
  {
    type: 'video',
    name: 'Video',
    icon: '🎥',
    description: 'Video content with interactive elements'
  },
  {
    type: 'audio',
    name: 'Audio',
    icon: '🎵',
    description: 'Audio content and podcasts'
  },
  {
    type: 'image',
    name: 'Image',
    icon: '🖼️',
    description: 'Images with annotations'
  },
  {
    type: 'interactive',
    name: 'Interactive',
    icon: '🎮',
    description: 'Interactive exercises and simulations'
  },
  {
    type: 'assessment',
    name: 'Assessment',
    icon: '📊',
    description: 'Quizzes and assessments'
  },
  {
    type: 'file',
    name: 'File',
    icon: '📎',
    description: 'Downloadable files and resources'
  }
];

const LessonBuilderSidebar: React.FC<LessonBuilderSidebarProps> = ({
  onAddModule,
  selectedModule,
  modules,
  onSelectModule
}) => {
  const [activeTab, setActiveTab] = useState<'modules' | 'outline'>('modules');

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const getTotalDuration = () => {
    return modules.reduce((total, module) => total + module.duration, 0);
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('modules')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'modules'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Add Modules
          </button>
          <button
            onClick={() => setActiveTab('outline')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'outline'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Outline
          </button>
        </div>
      </div>

      {/* Sidebar Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'modules' ? (
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Module Types</h3>
            <div className="space-y-2">
              {moduleTypes.map((moduleType) => (
                <button
                  key={moduleType.type}
                  onClick={() => onAddModule(moduleType.type)}
                  className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">{moduleType.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700">
                        {moduleType.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {moduleType.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Quick Templates */}
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Templates</h3>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    onAddModule('text');
                    onAddModule('video');
                    onAddModule('assessment');
                  }}
                  className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">⚡</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Basic Lesson</p>
                      <p className="text-xs text-gray-500">Text + Video + Quiz</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    onAddModule('text');
                    onAddModule('interactive');
                    onAddModule('assessment');
                  }}
                  className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">🎯</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Interactive Lesson</p>
                      <p className="text-xs text-gray-500">Text + Interactive + Quiz</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-900">Lesson Outline</h3>
              <span className="text-xs text-gray-500">
                {modules.length} modules • {formatDuration(getTotalDuration())}
              </span>
            </div>

            {modules.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">📋</div>
                <p className="text-sm text-gray-500">No modules yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  Add modules to build your lesson
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {modules.map((module, index) => (
                  <button
                    key={module.id}
                    onClick={() => onSelectModule(module)}
                    className={`w-full p-3 text-left rounded-lg border transition-colors ${
                      selectedModule?.id === module.id
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-medium text-gray-600 bg-gray-100 rounded-full">
                          {index + 1}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {module.title}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-gray-500 capitalize">
                            {module.type}
                          </span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500">
                            {formatDuration(module.duration)}
                          </span>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <span className="text-lg">
                          {moduleTypes.find(t => t.type === module.type)?.icon || '📄'}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Lesson Statistics */}
            {modules.length > 0 && (
              <div className="mt-6 p-3 bg-gray-50 rounded-lg">
                <h4 className="text-xs font-medium text-gray-700 mb-2">Lesson Stats</h4>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Total Duration:</span>
                    <span className="font-medium">{formatDuration(getTotalDuration())}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Modules:</span>
                    <span className="font-medium">{modules.length}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Assessments:</span>
                    <span className="font-medium">
                      {modules.filter(m => m.type === 'assessment').length}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LessonBuilderSidebar;