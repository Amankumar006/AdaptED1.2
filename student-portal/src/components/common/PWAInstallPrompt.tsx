import { useSelector, useDispatch } from 'react-redux'
import { RootState, AppDispatch } from '../../store'
import { hideInstallPrompt } from '../../store/slices/uiSlice'

export const PWAInstallPrompt = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { installPromptEvent } = useSelector((state: RootState) => state.ui)

  const handleInstall = async () => {
    if (installPromptEvent) {
      installPromptEvent.prompt()
      const { outcome } = await installPromptEvent.userChoice
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt')
      } else {
        console.log('User dismissed the install prompt')
      }
      
      dispatch(hideInstallPrompt())
    }
  }

  const handleDismiss = () => {
    dispatch(hideInstallPrompt())
  }

  return (
    <div className="pwa-install-prompt">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h4 className="text-white font-medium">Install Student Portal</h4>
            <p className="text-white text-opacity-90 text-sm">
              Get the full app experience with offline access
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleInstall}
            className="bg-white text-primary-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
          >
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="text-white text-opacity-90 hover:text-white p-2"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}