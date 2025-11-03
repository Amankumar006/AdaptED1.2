import { Outlet } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from '../../store'
import { NotificationCenter } from '../common/NotificationCenter'

export const AuthLayout = () => {
  const { theme } = useSelector((state: RootState) => state.ui)

  return (
    <div className={`min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 ${theme === 'dark' ? 'dark' : ''}`}>
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Logo and branding */}
          <div className="text-center">
            <div className="mx-auto h-12 w-12 bg-primary-600 rounded-lg flex items-center justify-center">
              <svg
                className="h-8 w-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <h1 className="mt-6 text-3xl font-bold text-gray-900">
              Student Portal
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Enhanced Educational Platform
            </p>
          </div>

          {/* Auth form content */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <Outlet />
          </div>

          {/* Footer */}
          <div className="text-center text-sm text-gray-500">
            <p>
              © 2024 Enhanced Educational Platform. All rights reserved.
            </p>
            <div className="mt-2 space-x-4">
              <a href="/privacy" className="hover:text-primary-600 transition-colors">
                Privacy Policy
              </a>
              <a href="/terms" className="hover:text-primary-600 transition-colors">
                Terms of Service
              </a>
              <a href="/support" className="hover:text-primary-600 transition-colors">
                Support
              </a>
            </div>
          </div>
        </div>
      </div>

      <NotificationCenter />
    </div>
  )
}