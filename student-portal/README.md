# Student Portal

Enhanced Educational Platform - Student Portal Frontend

## Features

- **Authentication & Security**
  - JWT-based authentication with refresh tokens
  - OAuth 2.0 and SSO integration
  - Biometric authentication support
  - Multi-factor authentication

- **Progressive Web App**
  - Offline-first architecture
  - Service worker for caching
  - Push notifications
  - App-like experience

- **Responsive Design**
  - Mobile-first approach
  - Adaptive layouts
  - Accessibility compliant (WCAG 2.1 AA)
  - Dark mode support

- **Learning Features**
  - Personalized dashboard
  - Interactive lesson viewer
  - BuddyAI chat interface
  - Practice and collaboration tools
  - Progress tracking

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **State Management**: Redux Toolkit
- **Routing**: React Router v7
- **Styling**: Tailwind CSS
- **Testing**: Vitest, React Testing Library, Cypress
- **PWA**: Vite PWA Plugin, Workbox

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run e2e` - Run end-to-end tests
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── common/         # Common components
│   ├── layout/         # Layout components
│   └── routing/        # Route components
├── pages/              # Page components
├── services/           # API services
├── store/              # Redux store and slices
├── types/              # TypeScript type definitions
├── test/               # Test utilities
└── utils/              # Utility functions
```

## Development Guidelines

### Code Style

- Use TypeScript for all new code
- Follow React best practices
- Use functional components with hooks
- Implement proper error boundaries
- Write comprehensive tests

### Accessibility

- Follow WCAG 2.1 AA guidelines
- Use semantic HTML elements
- Provide proper ARIA labels
- Support keyboard navigation
- Test with screen readers

### Performance

- Implement code splitting
- Use React.memo for expensive components
- Optimize images and assets
- Monitor bundle size
- Implement proper caching strategies

## Testing

### Unit Tests

Run unit tests with:
```bash
npm run test
```

### Integration Tests

Run integration tests with:
```bash
npm run e2e
```

### Accessibility Tests

Run accessibility tests with:
```bash
npm run test:a11y
```

## Deployment

### Build

```bash
npm run build
```

### Environment Variables

Set the following environment variables for production:

- `VITE_API_BASE_URL` - Backend API URL
- `VITE_GOOGLE_CLIENT_ID` - Google OAuth client ID
- `VITE_MICROSOFT_CLIENT_ID` - Microsoft OAuth client ID

## Contributing

1. Follow the existing code style
2. Write tests for new features
3. Update documentation as needed
4. Ensure accessibility compliance
5. Test across different devices and browsers

## License

This project is part of the Enhanced Educational Platform.