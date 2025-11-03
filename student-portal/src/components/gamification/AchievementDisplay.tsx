import React, { useState, useEffect } from 'react'
import { gamificationAPI, Badge, Challenge, Quest } from '../../services/api/gamificationAPI'
import { Achievement } from '../../types'

interface AchievementDisplayProps {
  showAll?: boolean
}

export const AchievementDisplay: React.FC<AchievementDisplayProps> = ({
  showAll = false
}) => {
  const [activeTab, setActiveTab] = useState<'achievements' | 'badges' | 'challenges' | 'quests'>('achievements')
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [badges, setBadges] = useState<Badge[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [quests, setQuests] = useState<Quest[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [activeTab, showAll])

  const loadData = async () => {
    setIsLoading(true)
    try {
      switch (activeTab) {
        case 'achievements':
          const achievementsResponse = await gamificationAPI.getAchievements({
            status: showAll ? undefined : 'unlocked',
            limit: showAll ? 50 : 10
          })
          setAchievements(achievementsResponse.data)
          break
        case 'badges':
          const badgesResponse = await gamificationAPI.getBadges({
            status: showAll ? undefined : 'unlocked',
            limit: showAll ? 50 : 10
          })
          setBadges(badgesResponse.data)
          break
        case 'challenges':
          const challengesResponse = await gamificationAPI.getChallenges({
            status: showAll ? undefined : 'active',
            limit: showAll ? 50 : 10
          })
          setChallenges(challengesResponse.data)
          break
        case 'quests':
          const questsResponse = await gamificationAPI.getQuests({
            status: showAll ? undefined : 'available',
            limit: showAll ? 50 : 10
          })
          setQuests(questsResponse.data)
          break
      }
    } catch (error) {
      console.error('Failed to load gamification data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleJoinChallenge = async (challengeId: string) => {
    try {
      const updatedChallenge = await gamificationAPI.joinChallenge(challengeId)
      setChallenges(prev => prev.map(c => c.id === challengeId ? updatedChallenge : c))
    } catch (error) {
      console.error('Failed to join challenge:', error)
    }
  }

  const handleStartQuest = async (questId: string) => {
    try {
      const updatedQuest = await gamificationAPI.startQuest(questId)
      setQuests(prev => prev.map(q => q.id === questId ? updatedQuest : q))
    } catch (error) {
      console.error('Failed to start quest:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'achievements', label: 'Achievements' },
            { key: 'badges', label: 'Badges' },
            { key: 'challenges', label: 'Challenges' },
            { key: 'quests', label: 'Quests' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div>
          {activeTab === 'achievements' && (
            <AchievementGrid achievements={achievements} />
          )}
          {activeTab === 'badges' && (
            <BadgeGrid badges={badges} />
          )}
          {activeTab === 'challenges' && (
            <ChallengeGrid challenges={challenges} onJoin={handleJoinChallenge} />
          )}
          {activeTab === 'quests' && (
            <QuestGrid quests={quests} onStart={handleStartQuest} />
          )}
        </div>
      )}
    </div>
  )
}

interface AchievementGridProps {
  achievements: Achievement[]
}

const AchievementGrid: React.FC<AchievementGridProps> = ({ achievements }) => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {achievements.map(achievement => (
        <div
          key={achievement.id}
          className={`bg-white rounded-lg shadow-md p-6 ${
            achievement.isUnlocked ? 'border-l-4 border-green-500' : 'opacity-75'
          }`}
        >
          <div className="flex items-center mb-3">
            <div className={`text-3xl mr-3 ${achievement.isUnlocked ? '' : 'grayscale'}`}>
              {achievement.icon}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{achievement.title}</h3>
              <p className="text-sm text-gray-600">{achievement.points} points</p>
            </div>
          </div>
          
          <p className="text-sm text-gray-700 mb-3">{achievement.description}</p>
          
          <div className="mb-2">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Progress</span>
              <span>{achievement.progress}/{achievement.maxProgress}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(achievement.progress / achievement.maxProgress) * 100}%` }}
              ></div>
            </div>
          </div>
          
          {achievement.unlockedAt && (
            <p className="text-xs text-green-600">
              Unlocked on {new Date(achievement.unlockedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

interface BadgeGridProps {
  badges: Badge[]
}

const BadgeGrid: React.FC<BadgeGridProps> = ({ badges }) => {
  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-gray-600 bg-gray-100'
      case 'uncommon': return 'text-green-600 bg-green-100'
      case 'rare': return 'text-blue-600 bg-blue-100'
      case 'epic': return 'text-purple-600 bg-purple-100'
      case 'legendary': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {badges.map(badge => (
        <div
          key={badge.id}
          className={`bg-white rounded-lg shadow-md p-4 text-center ${
            badge.isUnlocked ? 'border-2 border-yellow-400' : 'opacity-75'
          }`}
        >
          <div className={`text-4xl mb-2 ${badge.isUnlocked ? '' : 'grayscale'}`}>
            {badge.icon}
          </div>
          
          <h3 className="font-semibold text-gray-900 mb-1">{badge.name}</h3>
          
          <span className={`inline-block px-2 py-1 text-xs rounded-full mb-2 ${getRarityColor(badge.rarity)}`}>
            {badge.rarity}
          </span>
          
          <p className="text-sm text-gray-600 mb-2">{badge.description}</p>
          
          <div className="text-sm text-blue-600 font-medium">
            {badge.points} points
          </div>
          
          {badge.isUnlocked && badge.unlockedAt && (
            <p className="text-xs text-green-600 mt-2">
              Earned {new Date(badge.unlockedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

interface ChallengeGridProps {
  challenges: Challenge[]
  onJoin: (challengeId: string) => void
}

const ChallengeGrid: React.FC<ChallengeGridProps> = ({ challenges, onJoin }) => {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'daily': return 'bg-blue-100 text-blue-800'
      case 'weekly': return 'bg-green-100 text-green-800'
      case 'monthly': return 'bg-purple-100 text-purple-800'
      case 'special': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {challenges.map(challenge => (
        <div key={challenge.id} className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-lg font-semibold text-gray-900">{challenge.title}</h3>
            <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(challenge.type)}`}>
              {challenge.type}
            </span>
          </div>
          
          <p className="text-gray-600 text-sm mb-4">{challenge.description}</p>
          
          <div className="space-y-3 mb-4">
            {challenge.requirements.map((req, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm text-gray-700 capitalize">
                  {req.type.replace('_', ' ')}
                </span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${(req.current / req.target) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600">
                    {req.current}/{req.target}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Rewards</h4>
            <div className="flex flex-wrap gap-2">
              {challenge.rewards.map((reward, index) => (
                <span key={index} className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                  {reward.description}
                </span>
              ))}
            </div>
          </div>
          
          <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
            <span>{challenge.participantCount} participants</span>
            <span>Ends {new Date(challenge.endDate).toLocaleDateString()}</span>
          </div>
          
          {!challenge.isCompleted && (
            <button
              onClick={() => onJoin(challenge.id)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Join Challenge
            </button>
          )}
          
          {challenge.isCompleted && (
            <div className="w-full px-4 py-2 bg-green-100 text-green-800 rounded-md text-center">
              Completed! 🎉
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

interface QuestGridProps {
  quests: Quest[]
  onStart: (questId: string) => void
}

const QuestGrid: React.FC<QuestGridProps> = ({ quests, onStart }) => {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800'
      case 'advanced': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {quests.map(quest => (
        <div key={quest.id} className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-lg font-semibold text-gray-900">{quest.title}</h3>
            <span className={`px-2 py-1 text-xs rounded-full ${getDifficultyColor(quest.difficulty)}`}>
              {quest.difficulty}
            </span>
          </div>
          
          <p className="text-gray-600 text-sm mb-3">{quest.description}</p>
          
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <p className="text-sm text-gray-700 italic">{quest.storyline}</p>
          </div>
          
          <div className="flex justify-between text-sm text-gray-500 mb-4">
            <span>⏱️ {quest.estimatedTime} min</span>
            <span>📋 {quest.steps.length} steps</span>
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Progress</span>
              <span>{quest.progress}/{quest.maxProgress}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${(quest.progress / quest.maxProgress) * 100}%` }}
              ></div>
            </div>
          </div>
          
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Rewards</h4>
            <div className="flex flex-wrap gap-2">
              {quest.rewards.map((reward, index) => (
                <span key={index} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                  {reward.description}
                </span>
              ))}
            </div>
          </div>
          
          {!quest.isUnlocked ? (
            <div className="w-full px-4 py-2 bg-gray-100 text-gray-500 rounded-md text-center">
              🔒 Locked
            </div>
          ) : quest.isCompleted ? (
            <div className="w-full px-4 py-2 bg-green-100 text-green-800 rounded-md text-center">
              ✅ Completed!
            </div>
          ) : quest.progress > 0 ? (
            <div className="w-full px-4 py-2 bg-blue-100 text-blue-800 rounded-md text-center">
              📖 In Progress
            </div>
          ) : (
            <button
              onClick={() => onStart(quest.id)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Start Quest
            </button>
          )}
        </div>
      ))}
    </div>
  )
}