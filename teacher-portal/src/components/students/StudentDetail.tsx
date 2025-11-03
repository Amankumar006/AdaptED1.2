import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Student } from '../../types';
import { studentsAPI } from '../../services/api/studentsAPI';

const StudentDetail: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (studentId) {
      loadStudent(studentId);
    }
  }, [studentId]);

  const loadStudent = async (id: string) => {
    try {
      setLoading(true);
      // For now, use mock data
      const mockStudents = await studentsAPI.getMockStudents();
      const foundStudent = mockStudents.find(s => s.id === id);
      setStudent(foundStudent || null);
    } catch (error) {
      console.error('Failed to load student:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Student not found</h3>
        <button
          onClick={() => navigate('/students')}
          className="text-purple-600 hover:text-purple-700"
        >
          Back to Students
        </button>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'progress', label: 'Progress' },
    { id: 'grades', label: 'Grades' },
    { id: 'communication', label: 'Communication' },
    { id: 'profile', label: 'Profile' },
  ];

  const getRiskLevelColor = (riskScore?: number) => {
    if (!riskScore) return 'bg-green-100 text-green-800';
    if (riskScore < 0.3) return 'bg-green-100 text-green-800';
    if (riskScore < 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getRiskLevelText = (riskScore?: number) => {
    if (!riskScore) return 'Low';
    if (riskScore < 0.3) return 'Low';
    if (riskScore < 0.6) return 'Medium';
    return 'High';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/students')}
              className="text-gray-400 hover:text-gray-600"
            >
              ← Back
            </button>
            <div className="flex items-center space-x-4">
              {student.avatar ? (
                <img
                  src={student.avatar}
                  alt={`${student.firstName} ${student.lastName}`}
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-purple-100 flex items-center justify-center">
                  <span className="text-purple-600 font-medium text-2xl">
                    {student.firstName[0]}{student.lastName[0]}
                  </span>
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {student.firstName} {student.lastName}
                </h1>
                <p className="text-gray-500">{student.email}</p>
                <div className="flex items-center space-x-4 mt-2">
                  <span className="text-sm text-gray-500">Grade: {student.grade}</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRiskLevelColor(student.riskScore)}`}>
                    {getRiskLevelText(student.riskScore)} Risk
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex space-x-3">
            <button className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700">
              Send Message
            </button>
            <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50">
              Contact Parent
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Progress Summary */}
          <div className="lg:col-span-2 bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Progress Summary</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round(student.progressSummary.overallProgress * 100)}%
                </div>
                <div className="text-sm text-gray-600">Overall Progress</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round(student.progressSummary.averageScore * 100)}%
                </div>
                <div className="text-sm text-gray-600">Average Score</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {student.progressSummary.engagementScore * 100}%
                </div>
                <div className="text-sm text-gray-600">Engagement</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {student.progressSummary.streakDays}
                </div>
                <div className="text-sm text-gray-600">Day Streak</div>
              </div>
            </div>
            
            <div className="mt-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Lessons Completed</span>
                <span>{student.progressSummary.completedLessons}/{student.progressSummary.totalLessons}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full"
                  style={{ width: `${(student.progressSummary.completedLessons / student.progressSummary.totalLessons) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Quick Info */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Info</h3>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-500">Status:</span>
                <span className="ml-2 text-sm font-medium text-gray-900 capitalize">
                  {student.status}
                </span>
              </div>
              <div>
                <span className="text-sm text-gray-500">Enrollment Date:</span>
                <span className="ml-2 text-sm font-medium text-gray-900">
                  {new Date(student.enrollmentDate).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-sm text-gray-500">Last Activity:</span>
                <span className="ml-2 text-sm font-medium text-gray-900">
                  {new Date(student.lastActivity).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-sm text-gray-500">Time Spent:</span>
                <span className="ml-2 text-sm font-medium text-gray-900">
                  {Math.round(student.progressSummary.timeSpent / 60)} minutes
                </span>
              </div>
            </div>

            {student.tags.length > 0 && (
              <div className="mt-4">
                <span className="text-sm text-gray-500 block mb-2">Tags:</span>
                <div className="flex flex-wrap gap-1">
                  {student.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Learning Profile */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Learning Profile</h3>
            <div className="space-y-4">
              <div>
                <span className="text-sm font-medium text-gray-700">Learning Style:</span>
                <span className="ml-2 text-sm text-gray-900 capitalize">
                  {student.learningProfile.learningStyle}
                </span>
              </div>
              
              <div>
                <span className="text-sm font-medium text-gray-700">Strengths:</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {student.learningProfile.strengths.map((strength) => (
                    <span
                      key={strength}
                      className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full"
                    >
                      {strength}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-sm font-medium text-gray-700">Challenges:</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {student.learningProfile.challenges.map((challenge) => (
                    <span
                      key={challenge}
                      className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full"
                    >
                      {challenge}
                    </span>
                  ))}
                </div>
              </div>

              {student.learningProfile.accommodations.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Accommodations:</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {student.learningProfile.accommodations.map((accommodation) => (
                      <span
                        key={accommodation}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                      >
                        {accommodation}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <span className="text-sm font-medium text-gray-700">Interests:</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {student.learningProfile.interests.map((interest) => (
                    <span
                      key={interest}
                      className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Parent/Guardian Info */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Parent/Guardian Information</h3>
            <div className="space-y-4">
              {student.parentGuardians.map((parent) => (
                <div key={parent.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {parent.firstName} {parent.lastName}
                      </h4>
                      <p className="text-sm text-gray-500 capitalize">{parent.relationship}</p>
                    </div>
                    {parent.isPrimary && (
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                        Primary
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    <div>
                      <span className="text-gray-500">Email:</span>
                      <span className="ml-2 text-gray-900">{parent.email}</span>
                    </div>
                    {parent.phone && (
                      <div>
                        <span className="text-gray-500">Phone:</span>
                        <span className="ml-2 text-gray-900">{parent.phone}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3">
                    <span className="text-xs text-gray-500">Communication Preferences:</span>
                    <div className="flex space-x-2 mt-1">
                      {parent.communicationPreferences.email && (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">Email</span>
                      )}
                      {parent.communicationPreferences.sms && (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">SMS</span>
                      )}
                      {parent.communicationPreferences.phone && (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">Phone</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex space-x-2">
                    <button className="text-xs bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700">
                      Send Message
                    </button>
                    <button className="text-xs border border-gray-300 text-gray-700 px-3 py-1 rounded hover:bg-gray-50">
                      Schedule Meeting
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Other tabs would be implemented similarly */}
      {activeTab !== 'overview' && activeTab !== 'profile' && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {tabs.find(t => t.id === activeTab)?.label} Tab
            </h3>
            <p className="text-gray-500">
              This tab content will be implemented with detailed {activeTab} information.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDetail;