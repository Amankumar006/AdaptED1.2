import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from '../../store'

export const PublicRoute = () => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth)
  const location = useLocation()

  if (isAuthenticated) {
    // Redirect to the page they were trying to visit or dashboard
    const from = (location.state as any)?.from?.pathname || '/dashboard'
    return <Navigate to={from} replace />
  }

  return <Outlet />
}