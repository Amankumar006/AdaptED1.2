import React from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import VideoPerformanceTest from '../../components/performance/VideoPerformanceTest';

const VideoPerformancePage: React.FC = () => {
  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        <VideoPerformanceTest />
      </div>
    </DashboardLayout>
  );
};

export default VideoPerformancePage;