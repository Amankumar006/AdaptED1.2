
import { useLocation } from 'react-router-dom'
import { BuddyAIChat } from '../../components/chat/BuddyAIChat'

export const ChatPage = () => {
  const location = useLocation()
  const initialMessage = location.state?.initialMessage

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">BuddyAI Chat</h1>
        <p className="mt-2 text-gray-600">Chat with your AI learning assistant</p>
      </div>
      
      <div className="flex-1 min-h-0">
        <BuddyAIChat 
          initialMessage={initialMessage}
          className="h-full"
        />
      </div>
    </div>
  )
}