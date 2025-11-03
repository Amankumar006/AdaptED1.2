import { Routes, Route, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from '../../store'
import { DashboardLayout } from '../layout/DashboardLayout'
import { AuthLayout } from '../layout/AuthLayout'

// Pages
import { LoginPage } from '../../pages/auth/LoginPage'
import { RegisterPage } from '../../pages/auth/RegisterPage'
import { ForgotPasswordPage } from '../../pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '../../pages/auth/ResetPasswordPage'
import { DashboardPage } from '../../pages/dashboard/DashboardPage'
import { LessonsPage } from '../../pages/lessons/LessonsPage'
import { LessonViewerPage } from '../../pages/lessons/LessonViewerPage'
import { AssignmentsPage } from '../../pages/assignments/AssignmentsPage'
import { AssignmentPage } from '../../pages/assignments/AssignmentPage'
import { PracticePage } from '../../pages/practice/PracticePage'
import { ChatPage } from '../../pages/chat/ChatPage'
import { ProgressPage } from '../../pages/progress/ProgressPage'
import { SettingsPage } from '../../pages/settings/SettingsPage'
import { ProfilePage } from '../../pages/profile/ProfilePage'
import { StudyGroupsPage } from '../../pages/collaboration/StudyGroupsPage'
import { DiscussionsPage } from '../../pages/collaboration/DiscussionsPage'
import { AchievementsPage } from '../../pages/achievements/AchievementsPage'
import { NotFoundPage } from '../../pages/NotFoundPage'

// Route guards
import { ProtectedRoute } from './ProtectedRoute'
import { PublicRoute } from './PublicRoute'

export const AppRouter = () => {
  const { isLoading } = useSelector((state: RootState) => state.auth)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  return (
    <Routes>
      {/* Public routes (only accessible when not authenticated) */}
      <Route element={<PublicRoute />}>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>
      </Route>

      {/* Protected routes (only accessible when authenticated) */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          
          {/* Learning routes */}
          <Route path="/lessons" element={<LessonsPage />} />
          <Route path="/lessons/:lessonId" element={<LessonViewerPage />} />
          
          {/* Assignment routes */}
          <Route path="/assignments" element={<AssignmentsPage />} />
          <Route path="/assignments/:assignmentId" element={<AssignmentPage />} />
          
          {/* Practice and study tools */}
          <Route path="/practice" element={<PracticePage />} />
          <Route path="/practice/:topicId" element={<PracticePage />} />
          
          {/* BuddyAI chat */}
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/chat/:sessionId" element={<ChatPage />} />
          
          {/* Progress and analytics */}
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/achievements" element={<AchievementsPage />} />
          
          {/* Collaboration */}
          <Route path="/study-groups" element={<StudyGroupsPage />} />
          <Route path="/study-groups/:groupId" element={<StudyGroupsPage />} />
          <Route path="/discussions" element={<DiscussionsPage />} />
          <Route path="/discussions/:discussionId" element={<DiscussionsPage />} />
          
          {/* User management */}
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      {/* Fallback route */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}