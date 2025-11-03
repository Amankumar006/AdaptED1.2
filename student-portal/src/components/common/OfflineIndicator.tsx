import { useSelector } from 'react-redux'
import { RootState } from '../../store'

export const OfflineIndicator = () => {
  const { syncInProgress } = useSelector((state: RootState) => state.offline)

  return (
    <div className="offline-indicator">
      <div className="flex items-center justify-center space-x-2">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.18l.09.83a2.97 2.97 0 00-.09-.83zM12 21.82l-.09-.83a2.97 2.97 0 00.09.83zM2.18 12l.83-.09a2.97 2.97 0 00-.83.09zM21.82 12l-.83.09a2.97 2.97 0 00.83-.09z" />
        </svg>
        <span className="text-sm font-medium">
          {syncInProgress ? 'Syncing changes...' : 'You are offline'}
        </span>
        {syncInProgress && (
          <div className="h-3 w-3 border border-white border-t-transparent rounded-full animate-spin"></div>
        )}
      </div>
    </div>
  )
}