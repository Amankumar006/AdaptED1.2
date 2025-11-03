import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { AppRouter } from './components/routing/AppRouter'
import { initializeAuth } from './store/slices/authSlice'
import { AppDispatch } from './store'
import './App.css'

function App() {
  const dispatch = useDispatch<AppDispatch>()

  useEffect(() => {
    // Initialize authentication state on app load
    dispatch(initializeAuth())
  }, [dispatch])

  return (
    <div className="App min-h-screen bg-gray-50">
      <AppRouter />
    </div>
  )
}

export default App