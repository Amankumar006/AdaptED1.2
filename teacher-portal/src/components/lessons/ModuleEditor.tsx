import React, { useState, useEffect } from 'react';
import { LessonModule, MediaAsset } from '../../types';
import { mediaAPI } from '../../services/api/lessonsAPI';

interface ModuleEditorProps {
  module: LessonModule;
  onUpdate: (module: LessonModule) => void;
  onClose: () => void;
}

const ModuleEditor: React.FC<ModuleEditorProps> = ({
  module,
  onUpdate,
  onClose
}) => {
  const [editedModule, setEditedModule] = useState<LessonModule>(module);
  const [isUploading, setIsUploading] = useState(false);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);

  useEffect(() => {
    setEditedModule(module);
  }, [module]);

  useEffect(() => {
    if (showMediaLibrary) {
      loadMediaAssets();
    }
  }, [showMediaLibrary]);

  const loadMediaAssets = async () => {
    try {
      const response = await mediaAPI.getMediaAssets({
        type: getMediaTypeForModule(module.type),
        limit: 20
      });
      setMediaAssets(response.data);
    } catch (error) {
      console.error('Failed to load media assets:', error);
    }
  };

  const getMediaTypeForModule = (moduleType: string) => {
    const typeMap: Record<string, string> = {
      video: 'video',
      audio: 'audio',
      image: 'image',
      file: 'document'
    };
    return typeMap[moduleType] || 'image';
  };

  const handleInputChange = (field: string, value: any) => {
    const updatedModule = {
      ...editedModule,
      [field]: value
    };
    setEditedModule(updatedModule);
    onUpdate(updatedModule);
  };

  const handleContentChange = (field: string, value: any) => {
    const updatedModule = {
      ...editedModule,
      content: {
        ...editedModule.content,
        [field]: value
      }
    };
    setEditedModule(updatedModule);
    onUpdate(updatedModule);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const response = await mediaAPI.uploadMedia({
        file,
        type: getMediaTypeForModule(module.type) as any
      });

      handleContentChange('mediaUrl', response.data.url);
      handleContentChange('mediaType', response.data.mimeType);
    } catch (error) {
      console.error('Failed to upload file:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleMediaSelect = (asset: MediaAsset) => {
    handleContentChange('mediaUrl', asset.url);
    handleContentChange('mediaType', asset.mimeType);
    setShowMediaLibrary(false);
  };

  const renderContentEditor = () => {
    switch (module.type) {
      case 'text':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content
              </label>
              <textarea
                value={editedModule.content.text || ''}
                onChange={(e) => handleContentChange('text', e.target.value)}
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your text content here..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rich Text Editor
              </label>
              <div className="border border-gray-300 rounded-md">
                <div className="flex items-center space-x-2 p-2 border-b border-gray-200 bg-gray-50">
                  <button className="p-1 text-gray-600 hover:text-gray-900 rounded">
                    <strong>B</strong>
                  </button>
                  <button className="p-1 text-gray-600 hover:text-gray-900 rounded">
                    <em>I</em>
                  </button>
                  <button className="p-1 text-gray-600 hover:text-gray-900 rounded">
                    <u>U</u>
                  </button>
                  <div className="w-px h-4 bg-gray-300"></div>
                  <button className="p-1 text-gray-600 hover:text-gray-900 rounded">
                    📝
                  </button>
                  <button className="p-1 text-gray-600 hover:text-gray-900 rounded">
                    🔗
                  </button>
                </div>
                <textarea
                  value={editedModule.content.html || ''}
                  onChange={(e) => handleContentChange('html', e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border-0 focus:outline-none resize-none"
                  placeholder="Rich text content..."
                />
              </div>
            </div>
          </div>
        );

      case 'video':
      case 'audio':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {module.type === 'video' ? 'Video' : 'Audio'} File
              </label>
              
              {editedModule.content.mediaUrl ? (
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm text-green-800">Media file attached</span>
                    </div>
                  </div>
                  
                  {module.type === 'video' ? (
                    <video
                      src={editedModule.content.mediaUrl}
                      controls
                      className="w-full rounded-md"
                      style={{ maxHeight: '200px' }}
                    />
                  ) : (
                    <audio
                      src={editedModule.content.mediaUrl}
                      controls
                      className="w-full"
                    />
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex space-x-2">
                    <label className="flex-1 cursor-pointer">
                      <input
                        type="file"
                        accept={module.type === 'video' ? 'video/*' : 'audio/*'}
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={isUploading}
                      />
                      <div className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-md hover:border-blue-400 transition-colors">
                        {isUploading ? (
                          <div className="flex items-center space-x-2">
                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="text-sm text-gray-600">Uploading...</span>
                          </div>
                        ) : (
                          <div className="text-center">
                            <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <span className="text-sm text-gray-600">Upload {module.type}</span>
                          </div>
                        )}
                      </div>
                    </label>
                    
                    <button
                      onClick={() => setShowMediaLibrary(true)}
                      className="px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
                    >
                      Library
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={editedModule.content.text || ''}
                onChange={(e) => handleContentChange('text', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Add a description for this media..."
              />
            </div>
          </div>
        );

      case 'image':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Image
              </label>
              
              {editedModule.content.mediaUrl ? (
                <div className="space-y-3">
                  <img
                    src={editedModule.content.mediaUrl}
                    alt={editedModule.title}
                    className="w-full rounded-md"
                    style={{ maxHeight: '200px', objectFit: 'cover' }}
                  />
                  <button
                    onClick={() => handleContentChange('mediaUrl', '')}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Remove image
                  </button>
                </div>
              ) : (
                <div className="flex space-x-2">
                  <label className="flex-1 cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={isUploading}
                    />
                    <div className="flex items-center justify-center px-4 py-8 border-2 border-dashed border-gray-300 rounded-md hover:border-blue-400 transition-colors">
                      {isUploading ? (
                        <div className="flex items-center space-x-2">
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span className="text-sm text-gray-600">Uploading...</span>
                        </div>
                      ) : (
                        <div className="text-center">
                          <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-sm text-gray-600">Upload image</span>
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alt Text
              </label>
              <input
                type="text"
                value={editedModule.content.text || ''}
                onChange={(e) => handleContentChange('text', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe the image for accessibility..."
              />
            </div>
          </div>
        );

      case 'interactive':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Interactive Type
              </label>
              <select
                value={editedModule.content.metadata?.interactiveType || 'simulation'}
                onChange={(e) => handleContentChange('metadata', { 
                  ...editedModule.content.metadata, 
                  interactiveType: e.target.value 
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="simulation">Simulation</option>
                <option value="game">Educational Game</option>
                <option value="exercise">Interactive Exercise</option>
                <option value="lab">Virtual Lab</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Instructions
              </label>
              <textarea
                value={editedModule.content.text || ''}
                onChange={(e) => handleContentChange('text', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Provide instructions for the interactive element..."
              />
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                Interactive elements will be integrated with external tools and simulations.
              </p>
            </div>
          </div>
        );

      case 'assessment':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assessment Type
              </label>
              <select
                value={editedModule.content.metadata?.assessmentType || 'quiz'}
                onChange={(e) => handleContentChange('metadata', { 
                  ...editedModule.content.metadata, 
                  assessmentType: e.target.value 
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="quiz">Quiz</option>
                <option value="assignment">Assignment</option>
                <option value="survey">Survey</option>
                <option value="poll">Poll</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Instructions
              </label>
              <textarea
                value={editedModule.content.text || ''}
                onChange={(e) => handleContentChange('text', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Assessment instructions..."
              />
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                Assessment questions will be managed through the Assessment Engine.
              </p>
            </div>
          </div>
        );

      default:
        return (
          <div>
            <p className="text-sm text-gray-500">
              Content editor for {module.type} modules coming soon.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Edit Module</h2>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Basic Settings */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Module Title
            </label>
            <input
              type="text"
              value={editedModule.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter module title..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duration (minutes)
            </label>
            <input
              type="number"
              value={editedModule.duration}
              onChange={(e) => handleInputChange('duration', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="1"
              max="300"
            />
          </div>
        </div>

        {/* Content Editor */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Content</h3>
          {renderContentEditor()}
        </div>
      </div>

      {/* Media Library Modal */}
      {showMediaLibrary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Media Library</h3>
              <button
                onClick={() => setShowMediaLibrary(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="grid grid-cols-4 gap-4">
              {mediaAssets.map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => handleMediaSelect(asset)}
                  className="p-2 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50"
                >
                  {asset.mimeType.startsWith('image/') ? (
                    <img
                      src={asset.thumbnailUrl || asset.url}
                      alt={asset.originalName}
                      className="w-full h-24 object-cover rounded"
                    />
                  ) : (
                    <div className="w-full h-24 bg-gray-100 rounded flex items-center justify-center">
                      <span className="text-2xl">📄</span>
                    </div>
                  )}
                  <p className="text-xs text-gray-600 mt-1 truncate">
                    {asset.originalName}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModuleEditor;