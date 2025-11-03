import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import StudentList from '../../components/students/StudentList';
import StudentDetail from '../../components/students/StudentDetail';
import ClassroomManagement from '../../components/students/ClassroomManagement';
import AttendanceTracker from '../../components/students/AttendanceTracker';
import GradeBook from '../../components/students/GradeBook';
import CommunicationCenter from '../../components/students/CommunicationCenter';
import InterventionAlerts from '../../components/students/InterventionAlerts';

const StudentsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('students');

  useEffect(() => {
    const path = location.pathname.split('/').pop();
    if (path && ['students', 'classrooms', 'attendance', 'grades', 'communication', 'interventions'].includes(path)) {
      setActiveTab(path);
    }
  }, [location.pathname]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    navigate(`/students/${tab}`);
  };

  const tabs = [
    { id: 'students', label: 'Students', icon: '👥' },
    { id: 'classrooms', label: 'Classrooms', icon: '🏫' },
    { id: 'attendance', label: 'Attendance', icon: '📋' },
    { id: 'grades', label: 'Grades', icon: '📊' },
    { id: 'communication', label: 'Communication', icon: '💬' },
    { id: 'interventions', label: 'Interventions', icon: '⚠️' },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Student Management</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage your students, track progress, and communicate with families.
            </p>
          </div>
        </div>

        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="min-h-screen">
        <Routes>
          <Route path="/" element={<StudentList />} />
          <Route path="/students" element={<StudentList />} />
          <Route path="/students/:studentId" element={<StudentDetail />} />
          <Route path="/classrooms" element={<ClassroomManagement />} />
          <Route path="/attendance" element={<AttendanceTracker />} />
          <Route path="/grades" element={<GradeBook />} />
          <Route path="/communication" element={<CommunicationCenter />} />
          <Route path="/interventions" element={<InterventionAlerts />} />
        </Routes>
      </div>
    </div>
  );
};

export default StudentsPage;