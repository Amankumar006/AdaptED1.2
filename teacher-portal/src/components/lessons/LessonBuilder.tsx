import React, { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Lesson, LessonModule, AIContentSuggestion, CollaborationSession } from '../../types';
import { lessonsAPI, aiContentAPI, collaborationAPI } from '../../services/api/lessonsAPI';
import LessonBuilderSidebar from './LessonBuilderSidebar';
import LessonBuilderCanvas from './LessonBuilderCanvas';
import LessonBuilderToolbar from './LessonBuilderToolbar';
import ModuleEditor from './ModuleEditor';
import AIAssistantPanel from './AIAssistantPanel';
import CollaborationIndicator from './CollaborationIndicator';
import { useNotification } from '../../hooks/useNotification';

interface LessonBuilderProps {
  lessonId?: string;
  onSave?: (lesson: Lesson) => void;
  onClose?: () => void;
}

const LessonBuilder: React.FC<LessonBuilderProps> = ({
  lessonId,
  onSave,
  onClose
}) => {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [modules, setModules] = useState<LessonModule[]>([]);
  const [selectedModule, setSelectedModule] = useState<LessonModule | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AIContentSuggestion[]>([]);
  const [collaborationSession, setCollaborationSession] = useState<CollaborationSession | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  const { showNotification } = useNotification();

  // Load lesson data
  useEffect(() => {
    if (lessonId) {
      loadLesson();
    } else {
      // Create new lesson
      initializeNewLesson();
    }
  }, [lessonId]);

  // Auto-save functionality
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (lesson && !isSaving) {
        handleAutoSave();
      }
    }, 30000); // Auto-save every 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [lesson, isSaving]);

  const loadLesson = async () => {
    if (!lessonId) return;
    
    setIsLoading(true);
    try {
      const response = await lessonsAPI.getLesson(lessonId);
      setLesson(response.data);
      setModules(response.data.modules || []);
      
      // Load AI suggestions
      loadAISuggestions();
      
      // Start collaboration session if needed
      startCollaborationSession();
    } catch (error) {
      showNotification('Failed to load lesson', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const initializeNewLesson = () => {
    const newLesson: Partial<Lesson> = {
      title: 'Untitled Lesson',
      description: '',
      modules: [],
      prerequisites: [],
      learningObjectives: [],
      estimatedDuration: 60,
      difficulty: 'beginner',
      tags: [],
      status: 'draft',
      isPublished: false,
    };
    setLesson(newLesson as Lesson);
    setModules([]);
  };

  const loadAISuggestions = async () => {
    if (!lessonId) return;
    
    try {
      const response = await aiContentAPI.getSuggestions(lessonId);
      setAiSuggestions(response.data);
    } catch (error) {
      console.error('Failed to load AI suggestions:', error);
    }
  };

  const startCollaborationSession = async () => {
    if (!lessonId) return;
    
    try {
      const response = await collaborationAPI.startCollaboration(lessonId);
      setCollaborationSession(response.data);
    } catch (error) {
      console.error('Failed to start collaboration session:', error);
    }
  };

  const handleAutoSave = async () => {
    if (!lesson || !lessonId) return;
    
    try {
      await lessonsAPI.updateLesson(lessonId, {
        title: lesson.title,
        description: lesson.description,
        modules,
        learningObjectives: lesson.learningObjectives,
        tags: lesson.tags,
      });
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  const handleSave = async () => {
    if (!lesson) return;
    
    setIsSaving(true);
    try {
      let savedLesson: Lesson;
      
      if (lessonId) {
        const response = await lessonsAPI.updateLesson(lessonId, {
          title: lesson.title,
          description: lesson.description,
          modules,
          learningObjectives: lesson.learningObjectives,
          tags: lesson.tags,
          difficulty: lesson.difficulty,
          estimatedDuration: lesson.estimatedDuration,
        });
        savedLesson = response.data;
      } else {
        const response = await lessonsAPI.createLesson({
          title: lesson.title,
          description: lesson.description,
          difficulty: lesson.difficulty,
          estimatedDuration: lesson.estimatedDuration,
          learningObjectives: lesson.learningObjectives,
          tags: lesson.tags,
        });
        savedLesson = response.data;
      }
      
      setLesson(savedLesson);
      showNotification('Lesson saved successfully', 'success');
      onSave?.(savedLesson);
    } catch (error) {
      showNotification('Failed to save lesson', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) {
      setActiveId(null);
      return;
    }

    const oldIndex = modules.findIndex(module => module.id === active.id);
    const newIndex = modules.findIndex(module => module.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newModules = [...modules];
      const [movedModule] = newModules.splice(oldIndex, 1);
      newModules.splice(newIndex, 0, movedModule);
      
      // Update order property
      const updatedModules = newModules.map((module, index) => ({
        ...module,
        order: index
      }));
      
      setModules(updatedModules);
    }
    
    setActiveId(null);
  };

  const handleAddModule = (type: string) => {
    const newModule: LessonModule = {
      id: `module-${Date.now()}`,
      title: `New ${type} Module`,
      type: type as any,
      content: {
        text: '',
        html: '',
      },
      order: modules.length,
      duration: 10,
    };
    
    setModules([...modules, newModule]);
    setSelectedModule(newModule);
  };

  const handleUpdateModule = (updatedModule: LessonModule) => {
    setModules(modules.map(module => 
      module.id === updatedModule.id ? updatedModule : module
    ));
    setSelectedModule(updatedModule);
  };

  const handleDeleteModule = (moduleId: string) => {
    setModules(modules.filter(module => module.id !== moduleId));
    if (selectedModule?.id === moduleId) {
      setSelectedModule(null);
    }
  };

  const handleAIGenerate = async (type: string, prompt: string) => {
    setIsLoading(true);
    try {
      let response;
      const requestData = {
        type: type as any,
        topic: prompt,
        difficulty: lesson?.difficulty || 'beginner',
        duration: lesson?.estimatedDuration,
        context: lesson?.description,
      };

      switch (type) {
        case 'outline':
          response = await aiContentAPI.generateOutline(requestData);
          break;
        case 'content':
          response = await aiContentAPI.generateContent(requestData);
          break;
        case 'objectives':
          response = await aiContentAPI.generateObjectives(requestData);
          break;
        case 'assessment':
          response = await aiContentAPI.generateAssessment(requestData);
          break;
        default:
          throw new Error('Invalid generation type');
      }

      // Apply AI suggestion based on type
      if (type === 'objectives' && lesson) {
        setLesson({
          ...lesson,
          learningObjectives: response.data.content.split('\n').filter(obj => obj.trim())
        });
      } else if (type === 'outline') {
        // Parse outline and create modules
        const outlineModules = parseOutlineToModules(response.data.content);
        setModules([...modules, ...outlineModules]);
      }

      showNotification('AI content generated successfully', 'success');
    } catch (error) {
      showNotification('Failed to generate AI content', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const parseOutlineToModules = (outline: string): LessonModule[] => {
    const lines = outline.split('\n').filter(line => line.trim());
    return lines.map((line, index) => ({
      id: `ai-module-${Date.now()}-${index}`,
      title: line.replace(/^\d+\.\s*/, '').trim(),
      type: 'text',
      content: { text: '', html: '' },
      order: modules.length + index,
      duration: 15,
    }));
  };

  if (isLoading && !lesson) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Toolbar */}
      <LessonBuilderToolbar
        lesson={lesson}
        onSave={handleSave}
        onClose={onClose}
        isSaving={isSaving}
        onToggleAI={() => setShowAIPanel(!showAIPanel)}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        showAIPanel={showAIPanel}
        collaborationSession={collaborationSession}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {!sidebarCollapsed && (
          <LessonBuilderSidebar
            onAddModule={handleAddModule}
            selectedModule={selectedModule}
            modules={modules}
            onSelectModule={setSelectedModule}
          />
        )}

        {/* Main Canvas */}
        <div className="flex-1 flex">
          <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <SortableContext items={modules.map(m => m.id)} strategy={verticalListSortingStrategy}>
              <LessonBuilderCanvas
                lesson={lesson}
                modules={modules}
                selectedModule={selectedModule}
                onSelectModule={setSelectedModule}
                onUpdateModule={handleUpdateModule}
                onDeleteModule={handleDeleteModule}
                collaborationSession={collaborationSession}
              />
            </SortableContext>
            
            <DragOverlay>
              {activeId ? (
                <div className="bg-white p-4 rounded-lg shadow-lg border-2 border-blue-500">
                  {modules.find(m => m.id === activeId)?.title}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>

          {/* Module Editor Panel */}
          {selectedModule && (
            <div className="w-96 bg-white border-l border-gray-200">
              <ModuleEditor
                module={selectedModule}
                onUpdate={handleUpdateModule}
                onClose={() => setSelectedModule(null)}
              />
            </div>
          )}
        </div>

        {/* AI Assistant Panel */}
        {showAIPanel && (
          <AIAssistantPanel
            lesson={lesson}
            suggestions={aiSuggestions}
            onGenerate={handleAIGenerate}
            onClose={() => setShowAIPanel(false)}
            isLoading={isLoading}
          />
        )}
      </div>

      {/* Collaboration Indicator */}
      {collaborationSession && (
        <CollaborationIndicator session={collaborationSession} />
      )}
    </div>
  );
};

export default LessonBuilder;