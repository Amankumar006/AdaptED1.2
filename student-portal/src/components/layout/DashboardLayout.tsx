import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { RootState, AppDispatch } from '../../store'
import { setSidebarOpen, setOnlineStatus } from '../../store/slices/uiSlice'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { NotificationCenter } from '../common/NotificationCenter'
import { OfflineIndicator } from '../common/OfflineIndicator'
import { PWAInstallPrompt } from '../common/PWAInstallPrompt'

export const DashboardLayout = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { sidebarOpen, isOnline, showInstallPrompt } = useSelector((state: RootState) => state.ui)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth < 768) {
        dispatch(setSidebarOpen(false))
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [dispatch])

  useEffect(() => {
    const handleOnline = () => dispatch(setOnlineStatus(true))
    const handleOffline = () => dispatch(setOnlineStatus(false))

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [dispatch])

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:relative md:translate-x-0
        `}
      >
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden"
          onClick={() => dispatch(setSidebarOpen(false))}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 py-6 max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Notification system */}
      <NotificationCenter />

      {/* Offline indicator */}
      {!isOnline && <OfflineIndicator />}

      {/* PWA install prompt */}
      {showInstallPrompt && <PWAInstallPrompt />}
    </div>
  )
}