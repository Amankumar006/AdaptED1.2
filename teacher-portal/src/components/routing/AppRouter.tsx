import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAppSelector } from '../../store';

// Layout components
import AuthLayout from '../layout/AuthLayout';
import DashboardLayout from '../layout/DashboardLayout';

// Auth pages
import LoginPage from '../../pages/auth/LoginPage';
import ForgotPasswordPage from '../../pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '../../pages/auth/ResetPasswordPage';

// Dashboard pages
import DashboardPage from '../../pages/dashboard/DashboardPage';
import LessonsPage from '../../pages/lessons/LessonsPage';
import AssessmentsPage from '../../pages/assessments/AssessmentsPage';
import StudentsPage from '../../pages/students/StudentsPage';
import AnalyticsPage from '../../pages/analytics/AnalyticsPage';
import SettingsPage from '../../pages/settings/SettingsPage';

// Protected route component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);

  if (isLoading) {
    return <div>Loading...</div>; // Replace with proper loading component
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// Public route component (redirect if authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>;
};

const AppRouter: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <AuthLayout>
                <LoginPage />
              </AuthLayout>
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <AuthLayout>
                <ForgotPasswordPage />
              </AuthLayout>
            </PublicRoute>
          }
        />
        <Route
          path="/reset-password"
          element={
            <PublicRoute>
              <AuthLayout>
                <ResetPasswordPage />
              </AuthLayout>
            </PublicRoute>
          }
        />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <DashboardPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/lessons/*"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <LessonsPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/assessments/*"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <AssessmentsPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/students/*"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <StudentsPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <AnalyticsPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <SettingsPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Default redirects */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
};

export default AppRouter;