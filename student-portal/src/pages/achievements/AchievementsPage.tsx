import React from 'react'
import { AchievementDisplay } from '../../components/gamification/AchievementDisplay'
import { ProgressTracker } from '../../components/gamification/ProgressTracker'
import { PeerRecognition } from '../../components/collaboration/PeerRecognition'

export const AchievementsPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Achievements</h1>
        <p className="mt-2 text-gray-600">Track your progress and unlock rewards</p>
      </div>
      
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AchievementDisplay showAll={true} />
        </div>
        
        <div className="space-y-6">
          {/* Progress Overview */}
          <ProgressTracker />
          
          {/* Peer Recognition */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <PeerRecognition />
          </div>
        </div>
      </div>
    </div>
  )
}