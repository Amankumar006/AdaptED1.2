import React, { useState, useEffect } from 'react';
import { studentsAPI } from '../../services/api/studentsAPI';

interface GradebookEntry {
  studentId: string;
  studentName: string;
  avatar?: string;
  grades: Record<string, number>;
  average: number;
}

const GradeBook: React.FC = () => {

  const [gradebook, setGradebook] = useState<GradebookEntry[]>([]);
  const [selectedClassroom, setSelectedClassroom] = useState('math-101');
  const [loading, setLoading] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);

  // Mock assessments for the gradebook
  const assessments = [
    { id: 'quiz-1', name: 'Quiz 1: Basic Algebra', maxScore: 100, date: '2024-01-10' },
    { id: 'hw-1', name: 'Homework 1', maxScore: 50, date: '2024-01-12' },
    { id: 'test-1', name: 'Test 1: Linear Equations', maxScore: 100, date: '2024-01-15' },
    { id: 'quiz-2', name: 'Quiz 2: Graphing', maxScore: 100, date: '2024-01-18' },
    { id: 'project-1', name: 'Project: Real World Math', maxScore: 200, date: '2024-01-20' },
  ];

  useEffect(() => {
    loadGradebook();
  }, [selectedClassroom]);

  const loadGradebook = async () => {
    try {
      setLoading(true);
      // For now, use mock data
      const mockStudents = await studentsAPI.getMockStudents();

      // Generate mock gradebook data
      const mockGradebook: GradebookEntry[] = mockStudents.map(student => {
        const grades: Record<string, number> = {};
        let total = 0;
        let count = 0;

        assessments.forEach(assessment => {
          // Generate random grades based on student's average score
          const baseScore = student.progressSummary.averageScore;
          const variation = (Math.random() - 0.5) * 0.3; // ±15% variation
          const score = Math.max(0, Math.min(1, baseScore + variation));
          grades[assessment.id] = Math.round(score * assessment.maxScore);
          total += score * assessment.maxScore;
          count += assessment.maxScore;
        });

        return {
          studentId: student.id,
          studentName: `${student.firstName} ${student.lastName}`,
          avatar: student.avatar,
          grades,
          average: count > 0 ? Math.round((total / count) * 100) : 0
        };
      });

      setGradebook(mockGradebook);
    } catch (error) {
      console.error('Failed to load gradebook:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGradeChange = (studentId: string, assessmentId: string, newGrade: number) => {
    setGradebook(prev => prev.map(entry => {
      if (entry.studentId === studentId) {
        const updatedGrades = { ...entry.grades, [assessmentId]: newGrade };
        
        // Recalculate average
        let total = 0;
        let maxTotal = 0;
        assessments.forEach(assessment => {
          total += updatedGrades[assessment.id] || 0;
          maxTotal += assessment.maxScore;
        });
        
        const average = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;
        
        return {
          ...entry,
          grades: updatedGrades,
          average
        };
      }
      return entry;
    }));
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 80) return 'text-blue-600';
    if (percentage >= 70) return 'text-yellow-600';
    if (percentage >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const getLetterGrade = (percentage: number) => {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  };

  const exportGrades = async (format: 'csv' | 'xlsx') => {
    try {
      // In a real app, this would call the API to export grades
      console.log(`Exporting grades as ${format}`);
      setShowExportModal(false);
    } catch (error) {
      console.error('Failed to export grades:', error);
    }
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
      {/* Header and Controls */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Grade Book</h2>
            <p className="text-sm text-gray-600">Manage and track student grades</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowExportModal(true)}
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50"
            >
              Export Grades
            </button>
            <button className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700">
              Add Assessment
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              Grading Period
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500">
              <option value="q1">Quarter 1</option>
              <option value="q2">Quarter 2</option>
              <option value="q3">Quarter 3</option>
              <option value="q4">Quarter 4</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              View Options
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500">
              <option value="all">All Assessments</option>
              <option value="quizzes">Quizzes Only</option>
              <option value="tests">Tests Only</option>
              <option value="homework">Homework Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grade Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {gradebook.filter(entry => entry.average >= 90).length}
          </div>
          <div className="text-sm text-gray-600">A Students</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {gradebook.filter(entry => entry.average >= 80 && entry.average < 90).length}
          </div>
          <div className="text-sm text-gray-600">B Students</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">
            {gradebook.filter(entry => entry.average >= 70 && entry.average < 80).length}
          </div>
          <div className="text-sm text-gray-600">C Students</div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-red-600">
            {gradebook.filter(entry => entry.average < 70).length}
          </div>
          <div className="text-sm text-gray-600">Below C</div>
        </div>
      </div>

      {/* Gradebook Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Student Grades</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50">
                  Student
                </th>
                {assessments.map(assessment => (
                  <th key={assessment.id} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-24">
                    <div className="truncate" title={assessment.name}>
                      {assessment.name.length > 15 ? assessment.name.substring(0, 15) + '...' : assessment.name}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {assessment.maxScore} pts
                    </div>
                  </th>
                ))}
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Average
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Letter Grade
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {gradebook.map((entry) => (
                <tr key={entry.studentId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white">
                    <div className="flex items-center">
                      {entry.avatar ? (
                        <img
                          src={entry.avatar}
                          alt={entry.studentName}
                          className="h-8 w-8 rounded-full object-cover mr-3"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center mr-3">
                          <span className="text-purple-600 font-medium text-sm">
                            {entry.studentName.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                      )}
                      <div className="text-sm font-medium text-gray-900">
                        {entry.studentName}
                      </div>
                    </div>
                  </td>
                  {assessments.map(assessment => {
                    const grade = entry.grades[assessment.id];
                    const percentage = Math.round((grade / assessment.maxScore) * 100);
                    return (
                      <td key={assessment.id} className="px-3 py-4 whitespace-nowrap text-center">
                        <input
                          type="number"
                          min="0"
                          max={assessment.maxScore}
                          value={grade || ''}
                          onChange={(e) => handleGradeChange(entry.studentId, assessment.id, parseInt(e.target.value) || 0)}
                          className={`w-16 px-2 py-1 text-sm text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 ${getGradeColor(percentage)}`}
                        />
                        <div className={`text-xs mt-1 ${getGradeColor(percentage)}`}>
                          {grade ? `${percentage}%` : '-'}
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className={`text-lg font-semibold ${getGradeColor(entry.average)}`}>
                      {entry.average}%
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      entry.average >= 90 ? 'bg-green-100 text-green-800' :
                      entry.average >= 80 ? 'bg-blue-100 text-blue-800' :
                      entry.average >= 70 ? 'bg-yellow-100 text-yellow-800' :
                      entry.average >= 60 ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {getLetterGrade(entry.average)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Export Grades</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Export Format
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="format"
                      value="csv"
                      defaultChecked
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">CSV (Comma Separated Values)</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="format"
                      value="xlsx"
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Excel (XLSX)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Include
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Individual assignment grades</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Overall averages</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Student contact information</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => exportGrades('csv')}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                Export
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GradeBook;