import React, { useState, useEffect } from 'react';
import { Student, AttendanceStatus } from '../../types';
import { studentsAPI } from '../../services/api/studentsAPI';

const AttendanceTracker: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClassroom, setSelectedClassroom] = useState('math-101');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadStudents();
    loadAttendance();
  }, [selectedDate, selectedClassroom]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      // For now, use mock data
      const mockStudents = await studentsAPI.getMockStudents();
      setStudents(mockStudents);
    } catch (error) {
      console.error('Failed to load students:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAttendance = async () => {
    try {
      // For now, initialize with default 'present' status
      const attendanceRecord: Record<string, AttendanceStatus> = {};
      students.forEach(student => {
        attendanceRecord[student.id] = 'present';
      });
      setAttendance(attendanceRecord);
    } catch (error) {
      console.error('Failed to load attendance:', error);
    }
  };

  const handleAttendanceChange = (studentId: string, status: AttendanceStatus) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleBulkSave = async () => {
    try {
      setSaving(true);
      
      const bulkUpdate = {
        classroomId: selectedClassroom,
        date: new Date(selectedDate),
        attendance: Object.entries(attendance).map(([studentId, status]) => ({
          studentId,
          status,
          notes: ''
        }))
      };

      // In a real app, this would call the API
      console.log('Saving attendance:', bulkUpdate);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error('Failed to save attendance:', error);
    } finally {
      setSaving(false);
    }
  };



  const getAttendanceSummary = () => {
    const summary = {
      present: 0,
      absent: 0,
      late: 0,
      excused: 0
    };

    Object.values(attendance).forEach(status => {
      summary[status]++;
    });

    return summary;
  };

  const summary = getAttendanceSummary();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Attendance Tracker</h2>
            <p className="text-sm text-gray-600">Track and manage student attendance</p>
          </div>
          <button
            onClick={handleBulkSave}
            disabled={saving}
            className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Attendance'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Classroom
            </label>
            <select
              value={selectedClassroom}
              onChange={(e) => setSelectedClassroom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="math-101">Algebra I</option>
              <option value="science-201">Biology</option>
              <option value="history-301">World History</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Actions
            </label>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  const newAttendance: Record<string, AttendanceStatus> = {};
                  students.forEach(student => {
                    newAttendance[student.id] = 'present';
                  });
                  setAttendance(newAttendance);
                }}
                className="px-3 py-2 text-sm bg-green-100 text-green-800 rounded-md hover:bg-green-200"
              >
                Mark All Present
              </button>
              <button
                onClick={() => {
                  const newAttendance: Record<string, AttendanceStatus> = {};
                  students.forEach(student => {
                    newAttendance[student.id] = 'absent';
                  });
                  setAttendance(newAttendance);
                }}
                className="px-3 py-2 text-sm bg-red-100 text-red-800 rounded-md hover:bg-red-200"
              >
                Mark All Absent
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{summary.present}</div>
          <div className="text-sm text-gray-600">Present</div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-red-600">{summary.absent}</div>
          <div className="text-sm text-gray-600">Absent</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">{summary.late}</div>
          <div className="text-sm text-gray-600">Late</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{summary.excused}</div>
          <div className="text-sm text-gray-600">Excused</div>
        </div>
      </div>

      {/* Attendance Grid */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Student Attendance - {new Date(selectedDate).toLocaleDateString()}
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Present
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Absent
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Late
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Excused
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {student.avatar ? (
                        <img
                          src={student.avatar}
                          alt={`${student.firstName} ${student.lastName}`}
                          className="h-8 w-8 rounded-full object-cover mr-3"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center mr-3">
                          <span className="text-purple-600 font-medium text-sm">
                            {student.firstName[0]}{student.lastName[0]}
                          </span>
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {student.firstName} {student.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{student.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <input
                      type="radio"
                      name={`attendance-${student.id}`}
                      checked={attendance[student.id] === 'present'}
                      onChange={() => handleAttendanceChange(student.id, 'present')}
                      className="text-green-600 focus:ring-green-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <input
                      type="radio"
                      name={`attendance-${student.id}`}
                      checked={attendance[student.id] === 'absent'}
                      onChange={() => handleAttendanceChange(student.id, 'absent')}
                      className="text-red-600 focus:ring-red-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <input
                      type="radio"
                      name={`attendance-${student.id}`}
                      checked={attendance[student.id] === 'late'}
                      onChange={() => handleAttendanceChange(student.id, 'late')}
                      className="text-yellow-600 focus:ring-yellow-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <input
                      type="radio"
                      name={`attendance-${student.id}`}
                      checked={attendance[student.id] === 'excused'}
                      onChange={() => handleAttendanceChange(student.id, 'excused')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="text"
                      placeholder="Add notes..."
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Attendance History */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Attendance History</h3>
        <div className="text-center py-8 text-gray-500">
          <span className="text-4xl mb-2 block">📊</span>
          <p>Attendance history and trends will be displayed here</p>
        </div>
      </div>
    </div>
  );
};

export default AttendanceTracker;