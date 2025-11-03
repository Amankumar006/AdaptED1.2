import React, { useState, useEffect } from 'react';
import { InterventionAlert, InterventionType } from '../../types';

const InterventionAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<InterventionAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'acknowledged' | 'resolved'>('active');
  const [selectedAlert, setSelectedAlert] = useState<InterventionAlert | null>(null);

  useEffect(() => {
    loadAlerts();
  }, [filter]);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      // For now, use mock data
      const mockAlerts: InterventionAlert[] = [
        {
          id: '1',
          studentId: '2',
          type: 'academic',
          severity: 'high',
          title: 'Declining Math Performance',
          description: 'Michael Chen has shown a consistent decline in math performance over the past 3 weeks. His average score has dropped from 85% to 68%.',
          recommendations: [
            'Schedule one-on-one tutoring sessions',
            'Review foundational concepts',
            'Contact parents for additional support',
            'Consider modified assignments'
          ],
          triggeredBy: 'automated-system',
          triggeredAt: new Date('2024-01-14T09:00:00Z'),
          status: 'active',
          notes: ''
        },
        {
          id: '2',
          studentId: '3',
          type: 'engagement',
          severity: 'medium',
          title: 'Reduced Class Participation',
          description: 'Sophia Rodriguez has shown decreased participation in class discussions and activities over the past week.',
          recommendations: [
            'Check in with student privately',
            'Offer alternative participation methods',
            'Monitor for personal issues',
            'Encourage peer collaboration'
          ],
          triggeredBy: 'teacher-observation',
          triggeredAt: new Date('2024-01-13T14:30:00Z'),
          status: 'acknowledged',
          assignedTo: 'teacher-1',
          notes: 'Spoke with student - mentioned feeling overwhelmed with workload'
        },
        {
          id: '3',
          studentId: '1',
          type: 'attendance',
          severity: 'low',
          title: 'Perfect Attendance Recognition',
          description: 'Emma Johnson has maintained perfect attendance for the entire semester.',
          recommendations: [
            'Recognize achievement publicly',
            'Send positive note to parents',
            'Consider for attendance award'
          ],
          triggeredBy: 'automated-system',
          triggeredAt: new Date('2024-01-12T08:00:00Z'),
          status: 'resolved',
          resolvedAt: new Date('2024-01-12T10:00:00Z'),
          notes: 'Recognition sent to parents and student acknowledged in class'
        }
      ];

      const filteredAlerts = filter === 'all' 
        ? mockAlerts 
        : mockAlerts.filter(alert => alert.status === filter);

      setAlerts(filteredAlerts);
    } catch (error) {
      console.error('Failed to load alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: InterventionType) => {
    switch (type) {
      case 'academic': return '📚';
      case 'engagement': return '🎯';
      case 'attendance': return '📅';
      case 'behavior': return '👤';
      case 'technical': return '💻';
      default: return '⚠️';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-red-100 text-red-800';
      case 'acknowledged': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      // In a real app, this would call the API
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, status: 'acknowledged' as const, assignedTo: 'teacher-1' }
          : alert
      ));
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  const handleResolve = async (alertId: string, notes: string) => {
    try {
      // In a real app, this would call the API
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId 
          ? { 
              ...alert, 
              status: 'resolved' as const, 
              resolvedAt: new Date(),
              notes: notes || alert.notes
            }
          : alert
      ));
      setSelectedAlert(null);
    } catch (error) {
      console.error('Failed to resolve alert:', error);
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
      {/* Header and Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Intervention Alerts</h2>
            <p className="text-sm text-gray-600">Monitor and respond to student intervention needs</p>
          </div>
        </div>

        <div className="flex space-x-4">
          {(['all', 'active', 'acknowledged', 'resolved'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                filter === status
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              {status === 'active' && alerts.filter(a => a.status === 'active').length > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-1">
                  {alerts.filter(a => a.status === 'active').length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Alert Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-red-600">
            {alerts.filter(a => a.severity === 'critical' || a.severity === 'high').length}
          </div>
          <div className="text-sm text-gray-600">High Priority</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">
            {alerts.filter(a => a.status === 'active').length}
          </div>
          <div className="text-sm text-gray-600">Active Alerts</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {alerts.filter(a => a.status === 'acknowledged').length}
          </div>
          <div className="text-sm text-gray-600">In Progress</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {alerts.filter(a => a.status === 'resolved').length}
          </div>
          <div className="text-sm text-gray-600">Resolved</div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {filter === 'all' ? 'All Alerts' : `${filter.charAt(0).toUpperCase() + filter.slice(1)} Alerts`}
          </h3>
        </div>

        <div className="divide-y divide-gray-200">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="p-6 hover:bg-gray-50 cursor-pointer"
              onClick={() => setSelectedAlert(alert)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="text-2xl">{getTypeIcon(alert.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="text-lg font-medium text-gray-900">{alert.title}</h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getSeverityColor(alert.severity)}`}>
                        {alert.severity}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(alert.status)}`}>
                        {alert.status}
                      </span>
                    </div>
                    
                    <p className="text-gray-600 mb-3">{alert.description}</p>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>Student ID: {alert.studentId}</span>
                      <span>Type: {alert.type}</span>
                      <span>Triggered: {new Date(alert.triggeredAt).toLocaleDateString()}</span>
                      {alert.assignedTo && <span>Assigned to: {alert.assignedTo}</span>}
                    </div>

                    {alert.recommendations.length > 0 && (
                      <div className="mt-3">
                        <span className="text-sm font-medium text-gray-700">Recommendations:</span>
                        <ul className="mt-1 text-sm text-gray-600 list-disc list-inside">
                          {alert.recommendations.slice(0, 2).map((rec, index) => (
                            <li key={index}>{rec}</li>
                          ))}
                          {alert.recommendations.length > 2 && (
                            <li className="text-gray-500">+{alert.recommendations.length - 2} more...</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex space-x-2">
                  {alert.status === 'active' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAcknowledge(alert.id);
                      }}
                      className="px-3 py-1 text-sm bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200"
                    >
                      Acknowledge
                    </button>
                  )}
                  {alert.status !== 'resolved' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAlert(alert);
                      }}
                      className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded hover:bg-green-200"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {alerts.length === 0 && (
          <div className="text-center py-12">
            <span className="text-6xl mb-4 block">✅</span>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === 'active' ? 'No active alerts' : `No ${filter} alerts`}
            </h3>
            <p className="text-gray-500">
              {filter === 'active' 
                ? 'Great! All students are doing well.'
                : `No ${filter} intervention alerts to display.`}
            </p>
          </div>
        )}
      </div>

      {/* Alert Detail Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">{selectedAlert.title}</h3>
              <button
                onClick={() => setSelectedAlert(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">{getTypeIcon(selectedAlert.type)}</span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getSeverityColor(selectedAlert.severity)}`}>
                  {selectedAlert.severity} severity
                </span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedAlert.status)}`}>
                  {selectedAlert.status}
                </span>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                <p className="text-gray-700">{selectedAlert.description}</p>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Recommendations</h4>
                <ul className="space-y-1">
                  {selectedAlert.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-purple-600 mt-1">•</span>
                      <span className="text-gray-700">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Student ID:</span>
                  <span className="ml-2 text-gray-600">{selectedAlert.studentId}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Type:</span>
                  <span className="ml-2 text-gray-600 capitalize">{selectedAlert.type}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Triggered:</span>
                  <span className="ml-2 text-gray-600">{new Date(selectedAlert.triggeredAt).toLocaleString()}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Triggered By:</span>
                  <span className="ml-2 text-gray-600">{selectedAlert.triggeredBy}</span>
                </div>
              </div>

              {selectedAlert.notes && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-gray-700">{selectedAlert.notes}</p>
                  </div>
                </div>
              )}

              {selectedAlert.status !== 'resolved' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Resolution Notes
                  </label>
                  <textarea
                    id="resolution-notes"
                    rows={3}
                    placeholder="Add notes about how this alert was resolved..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Close
                </button>
                {selectedAlert.status === 'active' && (
                  <button
                    onClick={() => handleAcknowledge(selectedAlert.id)}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
                  >
                    Acknowledge
                  </button>
                )}
                {selectedAlert.status !== 'resolved' && (
                  <button
                    onClick={() => {
                      const notes = (document.getElementById('resolution-notes') as HTMLTextAreaElement)?.value || '';
                      handleResolve(selectedAlert.id, notes);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Mark as Resolved
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterventionAlerts;