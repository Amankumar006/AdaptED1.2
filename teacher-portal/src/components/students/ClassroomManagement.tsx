import React, { useState, useEffect } from 'react';
import { Classroom } from '../../types';
import { studentsAPI } from '../../services/api/studentsAPI';

const ClassroomManagement: React.FC = () => {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null);

  useEffect(() => {
    loadClassrooms();
  }, []);

  const loadClassrooms = async () => {
    try {
      setLoading(true);
      // For now, use mock data
      const mockClassrooms = await studentsAPI.getMockClassrooms();
      setClassrooms(mockClassrooms);
    } catch (error) {
      console.error('Failed to load classrooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDayName = (dayOfWeek: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek];
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Classroom Management</h2>
          <p className="text-sm text-gray-600">Manage your classrooms and student enrollment</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
        >
          Create Classroom
        </button>
      </div>

      {/* Classroom Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classrooms.map((classroom) => (
          <div
            key={classroom.id}
            className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{classroom.name}</h3>
                <p className="text-sm text-gray-500">{classroom.subject}</p>
                {classroom.grade && (
                  <p className="text-sm text-gray-500">Grade: {classroom.grade}</p>
                )}
              </div>
              <button
                onClick={() => setSelectedClassroom(classroom)}
                className="text-gray-400 hover:text-gray-600"
              >
                ⚙️
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">{classroom.description}</p>

            {/* Student Count */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-500">Students:</span>
              <span className="text-sm font-medium text-gray-900">
                {classroom.students.length} enrolled
              </span>
            </div>

            {/* Schedule */}
            <div className="mb-4">
              <span className="text-sm text-gray-500 block mb-2">Schedule:</span>
              <div className="space-y-1">
                {classroom.schedule.map((schedule, index) => (
                  <div key={index} className="text-xs text-gray-600">
                    {getDayName(schedule.dayOfWeek)} {schedule.startTime} - {schedule.endTime}
                    {schedule.location && ` (${schedule.location})`}
                  </div>
                ))}
              </div>
            </div>

            {/* Settings Summary */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex flex-wrap gap-1">
                {classroom.settings.allowLateSubmissions && (
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                    Late Submissions
                  </span>
                )}
                {classroom.settings.autoGrading && (
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                    Auto Grading
                  </span>
                )}
                {classroom.settings.showLeaderboard && (
                  <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                    Leaderboard
                  </span>
                )}
                {classroom.settings.enableDiscussions && (
                  <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">
                    Discussions
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 flex space-x-2">
              <button className="flex-1 bg-purple-600 text-white px-3 py-2 text-sm rounded-md hover:bg-purple-700">
                View Students
              </button>
              <button className="flex-1 border border-gray-300 text-gray-700 px-3 py-2 text-sm rounded-md hover:bg-gray-50">
                Manage
              </button>
            </div>
          </div>
        ))}
      </div>

      {classrooms.length === 0 && (
        <div className="text-center py-12">
          <span className="text-6xl mb-4 block">🏫</span>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No classrooms yet</h3>
          <p className="text-gray-500 mb-6">
            Create your first classroom to start managing students and lessons.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
          >
            Create Classroom
          </button>
        </div>
      )}

      {/* Create Classroom Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Classroom</h3>
            
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Classroom Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Algebra I - Period 1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  placeholder="e.g., Mathematics"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Grade Level
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="">Select grade level</option>
                  <option value="9th">9th Grade</option>
                  <option value="10th">10th Grade</option>
                  <option value="11th">11th Grade</option>
                  <option value="12th">12th Grade</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Brief description of the classroom..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                >
                  Create Classroom
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Classroom Settings Modal */}
      {selectedClassroom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedClassroom.name} Settings
              </h3>
              <button
                onClick={() => setSelectedClassroom(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Basic Info */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Basic Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      defaultValue={selectedClassroom.name}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subject
                    </label>
                    <input
                      type="text"
                      defaultValue={selectedClassroom.subject}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Settings */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Classroom Settings</h4>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      defaultChecked={selectedClassroom.settings.allowLateSubmissions}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Allow late submissions</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      defaultChecked={selectedClassroom.settings.autoGrading}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Enable auto-grading</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      defaultChecked={selectedClassroom.settings.showLeaderboard}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Show leaderboard</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      defaultChecked={selectedClassroom.settings.enableDiscussions}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Enable discussions</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      defaultChecked={selectedClassroom.settings.parentVisibility}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Parent visibility</span>
                  </label>
                </div>
              </div>

              {/* Students */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">
                  Students ({selectedClassroom.students.length})
                </h4>
                <div className="border border-gray-200 rounded-md p-4 max-h-40 overflow-y-auto">
                  {selectedClassroom.students.length > 0 ? (
                    <div className="text-sm text-gray-600">
                      {selectedClassroom.students.length} students enrolled
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">No students enrolled yet</div>
                  )}
                </div>
                <button className="mt-2 text-sm text-purple-600 hover:text-purple-700">
                  + Add Students
                </button>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                onClick={() => setSelectedClassroom(null)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassroomManagement;