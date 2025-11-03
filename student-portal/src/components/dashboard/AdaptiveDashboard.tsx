import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { RootState, AppDispatch } from '../../store'
import { updateDashboardLayout } from '../../store/slices/uiSlice'
import { 
  fetchLearningProgress, 
  fetchAssignments, 
  fetchRecommendations,
  fetchLearningAnalytics,
  fetchPersonalizationData,
  fetchDashboardRecommendations,
  trackDashboardEvent
} from '../../store/slices/learningSlice'
import { ProgressWidget } from './widgets/ProgressWidget'
import { RecommendationsWidget } from './widgets/RecommendationsWidget'
import { UpcomingWidget } from './widgets/UpcomingWidget'
import { BuddyAIWidget } from './widgets/BuddyAIWidget'
import { GamificationWidget } from './widgets/GamificationWidget'
import { SocialWidget } from './widgets/SocialWidget'

interface WidgetConfig {
  id: string
  type: 'progress' | 'recommendations' | 'upcoming' | 'buddyai' | 'achievements' | 'quickActions' | 'gamification' | 'social'
  title: string
  component: React.ComponentType<any>
  defaultSize: { w: number; h: number }
  minSize: { w: number; h: number }
  isEnabled: boolean
  learningStylePreference?: ('visual' | 'auditory' | 'kinesthetic' | 'mixed')[]
}

const WIDGET_CONFIGS: WidgetConfig[] = [
  {
    id: 'progress',
    type: 'progress',
    title: 'Learning Progress',
    component: ProgressWidget,
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
    isEnabled: true,
    learningStylePreference: ['visual', 'mixed'],
  },
  {
    id: 'recommendations',
    type: 'recommendations',
    title: 'Recommended for You',
    component: RecommendationsWidget,
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
    isEnabled: true,
  },
  {
    id: 'upcoming',
    type: 'upcoming',
    title: 'Upcoming Assignments',
    component: UpcomingWidget,
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
    isEnabled: true,
  },
  {
    id: 'buddyai',
    type: 'buddyai',
    title: 'BuddyAI Assistant',
    component: BuddyAIWidget,
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
    isEnabled: true,
  },
  {
    id: 'gamification',
    type: 'achievements',
    title: 'Your Progress',
    component: GamificationWidget,
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
    isEnabled: true,
    learningStylePreference: ['visual', 'mixed'],
  },
  {
    id: 'social',
    type: 'quickActions',
    title: 'Social Learning',
    component: SocialWidget,
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
    isEnabled: true,
  },
]

export const AdaptiveDashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { user } = useSelector((state: RootState) => state.auth)
  const { dashboardLayout } = useSelector((state: RootState) => state.ui)
  const { 
    isLoading: learningLoading, 
    analytics, 
    personalizationData
  } = useSelector((state: RootState) => state.learning)
  
  const [widgets, setWidgets] = useState<string[]>([])
  const [isCustomizing, setIsCustomizing] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Initialize widgets based on learning style and preferences
  useEffect(() => {
    const learningStyle = user?.learningProfile?.learningStyle || 'mixed'
    
    // Filter widgets based on learning style preferences
    const enabledWidgets = WIDGET_CONFIGS.filter(config => {
      if (!config.isEnabled) return false
      if (!config.learningStylePreference) return true
      return config.learningStylePreference.includes(learningStyle)
    })

    // Adapt widget order based on learning style
    const adaptedOrder = adaptWidgetOrderForLearningStyle(enabledWidgets, learningStyle)
    setWidgets(adaptedOrder.map(w => w.id))
  }, [user?.learningProfile?.learningStyle])

  // Fetch data on mount
  useEffect(() => {
    dispatch(fetchLearningProgress())
    dispatch(fetchAssignments())
    dispatch(fetchRecommendations())
    dispatch(fetchLearningAnalytics('month'))
    dispatch(fetchPersonalizationData())
    dispatch(fetchDashboardRecommendations())
  }, [dispatch])

  const adaptWidgetOrderForLearningStyle = (
    widgets: WidgetConfig[],
    learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'mixed'
  ): WidgetConfig[] => {
    switch (learningStyle) {
      case 'visual':
        // Visual learners prefer progress and visual data first
        return widgets.sort((a, b) => {
          const visualPriority: Record<string, number> = { progress: 1, recommendations: 2, upcoming: 3, buddyai: 4, achievements: 5, quickActions: 6 }
          return (visualPriority[a.type] || 7) - (visualPriority[b.type] || 7)
        })
      
      case 'auditory':
        // Auditory learners prefer text-based and interactive content
        return widgets.sort((a, b) => {
          const auditoryPriority: Record<string, number> = { buddyai: 1, upcoming: 2, recommendations: 3, progress: 4, achievements: 5, quickActions: 6 }
          return (auditoryPriority[a.type] || 7) - (auditoryPriority[b.type] || 7)
        })
      
      case 'kinesthetic':
        // Kinesthetic learners prefer interactive and action-oriented widgets
        return widgets.sort((a, b) => {
          const kinestheticPriority: Record<string, number> = { buddyai: 1, upcoming: 2, progress: 3, recommendations: 4, achievements: 5, quickActions: 6 }
          return (kinestheticPriority[a.type] || 7) - (kinestheticPriority[b.type] || 7)
        })
      
      case 'mixed':
      default:
        // Balanced approach for mixed learning styles
        return widgets.sort((a, b) => {
          const mixedPriority: Record<string, number> = { progress: 1, recommendations: 2, upcoming: 3, buddyai: 4, achievements: 5, quickActions: 6 }
          return (mixedPriority[a.type] || 7) - (mixedPriority[b.type] || 7)
        })
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = widgets.indexOf(active.id as string)
      const newIndex = widgets.indexOf(over.id as string)
      
      const newWidgets = arrayMove(widgets, oldIndex, newIndex)
      setWidgets(newWidgets)
      
      // Update layout in store
      const newLayout = newWidgets.map((widgetId, index) => ({
        id: widgetId,
        x: (index % 2) * 6,
        y: Math.floor(index / 2) * 4,
        w: 6,
        h: 4,
      }))
      
      dispatch(updateDashboardLayout(newLayout))
      
      // Track layout change event
      dispatch(trackDashboardEvent({
        eventType: 'layout_change',
        data: { newLayout, oldLayout: widgets }
      }))
    }
  }

  const renderWidget = (widgetId: string) => {
    const config = WIDGET_CONFIGS.find(w => w.id === widgetId)
    if (!config) return null

    const learningStyle = user?.learningProfile?.learningStyle || 'mixed'
    const commonProps = {
      id: widgetId,
      learningStyle,
      isLoading: learningLoading,
      analytics,
      personalizationData,
    }

    // Add specific data for each widget type
    let specificProps = {}
    switch (config.type) {
      case 'progress':
        specificProps = {
          data: analytics ? {
            overallProgress: analytics.overallProgress,
            completedLessons: analytics.completedLessons,
            totalLessons: analytics.totalLessons,
            currentStreak: analytics.currentStreak,
            weeklyGoal: analytics.weeklyGoal,
            weeklyProgress: analytics.weeklyProgress,
            recentAchievements: analytics.recentAchievements,
          } : undefined
        }
        break
      default:
        break
    }

    const WidgetComponent = config.component
    return <WidgetComponent key={widgetId} {...commonProps} {...specificProps} />
  }

  const getLayoutClass = () => {
    const learningStyle = user?.learningProfile?.learningStyle || 'mixed'
    
    switch (learningStyle) {
      case 'visual':
        return 'grid-cols-1 lg:grid-cols-2 gap-6'
      case 'auditory':
        return 'grid-cols-1 gap-4'
      case 'kinesthetic':
        return 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'
      case 'mixed':
      default:
        return 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6'
    }
  }

  const getContainerClass = () => {
    const learningStyle = user?.learningProfile?.learningStyle || 'mixed'
    
    switch (learningStyle) {
      case 'visual':
        return 'bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen p-6'
      case 'auditory':
        return 'bg-white min-h-screen p-4'
      case 'kinesthetic':
        return 'bg-gradient-to-br from-green-50 to-teal-50 min-h-screen p-4'
      case 'mixed':
      default:
        return 'bg-gray-50 min-h-screen p-6'
    }
  }

  return (
    <div className={getContainerClass()}>
      {/* Dashboard Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {user?.firstName}! 👋
            </h1>
            <p className="text-gray-600 mt-1">
              Your personalized learning dashboard
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                const newCustomizing = !isCustomizing
                setIsCustomizing(newCustomizing)
                
                // Track customization events
                dispatch(trackDashboardEvent({
                  eventType: newCustomizing ? 'customization_start' : 'customization_end',
                  data: { learningStyle: user?.learningProfile?.learningStyle }
                }))
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isCustomizing
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {isCustomizing ? 'Done Customizing' : 'Customize'}
            </button>
          </div>
        </div>
        
        {isCustomizing && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 mb-2">
              <strong>Customization Mode:</strong> Drag widgets to reorder them according to your preferences.
            </p>
            <p className="text-xs text-blue-600">
              Your dashboard is automatically adapted for your {user?.learningProfile?.learningStyle || 'mixed'} learning style.
            </p>
          </div>
        )}
      </div>

      {/* Adaptive Dashboard Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={widgets} strategy={rectSortingStrategy}>
          <div className={`grid ${getLayoutClass()}`}>
            {widgets.map(renderWidget)}
          </div>
        </SortableContext>
      </DndContext>

      {/* Learning Style Indicator */}
      <div className="mt-8 text-center">
        <div className="inline-flex items-center px-4 py-2 bg-white rounded-full shadow-sm border border-gray-200">
          <div className="w-2 h-2 bg-primary-500 rounded-full mr-2"></div>
          <span className="text-sm text-gray-600">
            Optimized for {user?.learningProfile?.learningStyle || 'mixed'} learning style
          </span>
        </div>
      </div>
    </div>
  )
}