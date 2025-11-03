# Teacher Portal - Enhanced Educational Platform

A modern React/TypeScript frontend application for teachers to manage their educational content, students, and assessments.

## Features

- **Authentication & Authorization**: JWT-based authentication with OAuth 2.0 and SSO support
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **State Management**: Redux Toolkit for predictable state management
- **Routing**: React Router for client-side navigation
- **API Integration**: Axios-based API client with error handling
- **Real-time Notifications**: Toast notifications for user feedback

## Tech Stack

- **Frontend**: React 19, TypeScript
- **Build Tool**: Vite with Rolldown
- **Styling**: Tailwind CSS
- **State Management**: Redux Toolkit
- **Routing**: React Router v7
- **HTTP Client**: Axios
- **Development**: Hot Module Replacement (HMR)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

3. Update the `.env` file with your API endpoints:
   ```
   VITE_API_BASE_URL=http://localhost:3000/api
   ```

### Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Building

Build for production:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── common/         # Common components (notifications, etc.)
│   ├── layout/         # Layout components (header, sidebar, etc.)
│   └── routing/        # Routing configuration
├── hooks/              # Custom React hooks
├── pages/              # Page components
│   ├── auth/          # Authentication pages
│   ├── dashboard/     # Dashboard pages
│   ├── lessons/       # Lesson management pages
│   ├── assessments/   # Assessment pages
│   ├── students/      # Student management pages
│   ├── analytics/     # Analytics pages
│   └── settings/      # Settings pages
├── services/           # API services and utilities
│   └── api/           # API client and endpoints
├── store/              # Redux store configuration
│   └── slices/        # Redux slices
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

## Features Implementation Status

### ✅ Completed (Task 8.1)
- [x] React/TypeScript application setup with Vite
- [x] React Router configuration
- [x] Redux Toolkit state management
- [x] Authentication integration with auth service
- [x] Axios API client with error handling
- [x] Development environment and build pipeline
- [x] Basic responsive layout with Tailwind CSS
- [x] Authentication pages (Login, Forgot Password, Reset Password)
- [x] Dashboard layout with sidebar navigation
- [x] Protected and public route handling
- [x] Notification system
- [x] TypeScript configuration and type safety

### 🚧 Upcoming Features
- [ ] Responsive dashboard with analytics widgets (Task 8.2)
- [ ] AI-powered lesson builder (Task 8.3)
- [ ] Assessment creation tools (Task 8.4)
- [ ] Student management and communication features (Task 8.5)
- [ ] Testing suite with accessibility CI (Task 8.6)

## API Integration

The application integrates with the following backend services:
- **Authentication Service**: User login, logout, token validation
- **User Management Service**: User profiles and preferences
- **Content Management Service**: Lesson and content management
- **Assessment Engine Service**: Quiz and assessment management
- **Learning Analytics Service**: Student progress and analytics
- **AI/LLM Service**: BuddyAI integration for content assistance

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API base URL | `http://localhost:3000/api` |
| `VITE_NODE_ENV` | Environment mode | `development` |
| `VITE_ENABLE_ANALYTICS` | Enable analytics features | `true` |
| `VITE_ENABLE_AI_FEATURES` | Enable AI features | `true` |
| `VITE_ENABLE_COLLABORATION` | Enable collaboration features | `true` |

## Contributing

1. Follow the existing code structure and naming conventions
2. Use TypeScript for type safety
3. Implement responsive design with Tailwind CSS
4. Add proper error handling and loading states
5. Write meaningful commit messages
6. Test your changes before submitting

## License

This project is part of the Enhanced Educational Platform and follows the same licensing terms.