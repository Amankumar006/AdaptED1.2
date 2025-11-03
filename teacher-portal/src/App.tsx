import React from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import AppRouter from './components/routing/AppRouter';
import { useAuth } from './hooks/useAuth';
import './App.css';

// App content component that uses auth hook
const AppContent: React.FC = () => {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return <AppRouter />;
};

function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

export default App;
