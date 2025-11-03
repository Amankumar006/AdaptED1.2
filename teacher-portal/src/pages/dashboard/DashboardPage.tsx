import React from 'react';
import ResponsiveDashboard from '../../components/dashboard/ResponsiveDashboard';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

const DashboardPage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Welcome to your teacher dashboard. Here's an overview of your classes and activities.
        </p>
      </div>

      <ResponsiveDashboard
        userId={user?.id}
        entityId="class-123" // This would come from the selected class context
        level="meso" // Teacher dashboard shows class-level (meso) analytics
        className="w-full"
      />
    </div>
  );
};

export default DashboardPage;