import { apiRequest } from './client';
import { 
  ApiResponse, 
  PaginatedResponse, 
  Student, 
  Classroom, 
  Attendance, 
  Grade, 
  Message, 
  Announcement, 
  InterventionAlert,
  AttendanceStatus,
  MessageType,
  MessagePriority,
  AnnouncementAudience
} from '../../types';

export interface StudentFilters {
  classroomId?: string;
  status?: string;
  grade?: string;
  riskLevel?: 'low' | 'medium' | 'high';
  search?: string;
  sortBy?: 'name' | 'lastActivity' | 'progress' | 'riskScore';
  sortOrder?: 'asc' | 'desc';
}

export interface AttendanceFilters {
  classroomId?: string;
  date?: Date;
  status?: AttendanceStatus;
  studentIds?: string[];
}

export interface GradeFilters {
  classroomId?: string;
  assessmentId?: string;
  studentId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface MessageFilters {
  type?: MessageType;
  priority?: MessagePriority;
  unreadOnly?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface CreateMessageRequest {
  recipientIds: string[];
  subject: string;
  content: string;
  type: MessageType;
  priority: MessagePriority;
  attachments?: File[];
  scheduledFor?: Date;
}

export interface CreateAnnouncementRequest {
  title: string;
  content: string;
  targetAudience: AnnouncementAudience;
  classroomIds?: string[];
  studentIds?: string[];
  parentIds?: string[];
  priority: MessagePriority;
  scheduledFor?: Date;
  expiresAt?: Date;
  attachments?: File[];
}

export interface BulkAttendanceUpdate {
  classroomId: string;
  date: Date;
  attendance: {
    studentId: string;
    status: AttendanceStatus;
    notes?: string;
  }[];
}

class StudentsAPI {
  private baseURL = '/api/v1/students';

  // Student Management
  async getStudents(
    page: number = 1,
    limit: number = 20,
    filters?: StudentFilters
  ): Promise<PaginatedResponse<Student>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters,
    });

    return apiRequest.get(`${this.baseURL}?${params}`);
  }

  async getStudent(studentId: string): Promise<ApiResponse<Student>> {
    return apiRequest.get(`${this.baseURL}/${studentId}`);
  }

  async updateStudent(studentId: string, updates: Partial<Student>): Promise<ApiResponse<Student>> {
    return apiRequest.patch(`${this.baseURL}/${studentId}`, updates);
  }

  async getStudentProgress(studentId: string, timeframe?: { start: Date; end: Date }): Promise<ApiResponse<any>> {
    const params = timeframe ? new URLSearchParams({
      start: timeframe.start.toISOString(),
      end: timeframe.end.toISOString(),
    }) : '';

    return apiRequest.get(`${this.baseURL}/${studentId}/progress?${params}`);
  }

  async getStudentAnalytics(studentId: string): Promise<ApiResponse<any>> {
    return apiRequest.get(`${this.baseURL}/${studentId}/analytics`);
  }

  // Classroom Management
  async getClassrooms(): Promise<ApiResponse<Classroom[]>> {
    return apiRequest.get('/api/v1/classrooms');
  }

  async getClassroom(classroomId: string): Promise<ApiResponse<Classroom>> {
    return apiRequest.get(`/api/v1/classrooms/${classroomId}`);
  }

  async createClassroom(classroom: Omit<Classroom, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Classroom>> {
    return apiRequest.post('/api/v1/classrooms', classroom);
  }

  async updateClassroom(classroomId: string, updates: Partial<Classroom>): Promise<ApiResponse<Classroom>> {
    return apiRequest.patch(`/api/v1/classrooms/${classroomId}`, updates);
  }

  async addStudentsToClassroom(classroomId: string, studentIds: string[]): Promise<ApiResponse<void>> {
    return apiRequest.post(`/api/v1/classrooms/${classroomId}/students`, { studentIds });
  }

  async removeStudentFromClassroom(classroomId: string, studentId: string): Promise<ApiResponse<void>> {
    return apiRequest.delete(`/api/v1/classrooms/${classroomId}/students/${studentId}`);
  }

  // Attendance Management
  async getAttendance(
    page: number = 1,
    limit: number = 50,
    filters?: AttendanceFilters
  ): Promise<PaginatedResponse<Attendance>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          if (key === 'date' && value instanceof Date) {
            params.append(key, value.toISOString().split('T')[0]);
          } else if (key === 'studentIds' && Array.isArray(value)) {
            value.forEach(id => params.append('studentIds[]', id));
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }

    return apiRequest.get(`/api/v1/attendance?${params}`);
  }

  async recordAttendance(attendance: Omit<Attendance, 'id' | 'recordedAt'>): Promise<ApiResponse<Attendance>> {
    return apiRequest.post('/api/v1/attendance', attendance);
  }

  async bulkUpdateAttendance(bulkUpdate: BulkAttendanceUpdate): Promise<ApiResponse<Attendance[]>> {
    return apiRequest.post('/api/v1/attendance/bulk', bulkUpdate);
  }

  async updateAttendance(attendanceId: string, updates: Partial<Attendance>): Promise<ApiResponse<Attendance>> {
    return apiRequest.patch(`/api/v1/attendance/${attendanceId}`, updates);
  }

  // Grade Management
  async getGrades(
    page: number = 1,
    limit: number = 50,
    filters?: GradeFilters
  ): Promise<PaginatedResponse<Grade>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          if (key === 'dateRange' && typeof value === 'object') {
            params.append('startDate', value.start.toISOString());
            params.append('endDate', value.end.toISOString());
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }

    return apiRequest.get(`/api/v1/grades?${params}`);
  }

  async updateGrade(gradeId: string, updates: Partial<Grade>): Promise<ApiResponse<Grade>> {
    return apiRequest.patch(`/api/v1/grades/${gradeId}`, updates);
  }

  async getGradebook(classroomId: string): Promise<ApiResponse<any>> {
    return apiRequest.get(`/api/v1/classrooms/${classroomId}/gradebook`);
  }

  async exportGrades(classroomId: string, format: 'csv' | 'xlsx' = 'csv'): Promise<Blob> {
    const response = await fetch(`/api/v1/classrooms/${classroomId}/grades/export?format=${format}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });
    return response.blob();
  }

  // Communication
  async getMessages(
    page: number = 1,
    limit: number = 20,
    filters?: MessageFilters
  ): Promise<PaginatedResponse<Message>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          if (key === 'dateRange' && typeof value === 'object') {
            params.append('startDate', value.start.toISOString());
            params.append('endDate', value.end.toISOString());
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }

    return apiRequest.get(`/api/v1/messages?${params}`);
  }

  async getMessage(messageId: string): Promise<ApiResponse<Message>> {
    return apiRequest.get(`/api/v1/messages/${messageId}`);
  }

  async sendMessage(message: CreateMessageRequest): Promise<ApiResponse<Message>> {
    const formData = new FormData();
    
    Object.entries(message).forEach(([key, value]) => {
      if (key === 'attachments' && Array.isArray(value)) {
        value.forEach(file => formData.append('attachments', file));
      } else if (key === 'recipientIds' && Array.isArray(value)) {
        value.forEach(id => formData.append('recipientIds[]', id));
      } else if (value !== undefined) {
        formData.append(key, typeof value === 'object' ? JSON.stringify(value) : value.toString());
      }
    });

    return apiRequest.post('/api/v1/messages', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }

  async markMessageAsRead(messageId: string): Promise<ApiResponse<void>> {
    return apiRequest.post(`/api/v1/messages/${messageId}/read`);
  }

  async deleteMessage(messageId: string): Promise<ApiResponse<void>> {
    return apiRequest.delete(`/api/v1/messages/${messageId}`);
  }

  // Announcements
  async getAnnouncements(
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<Announcement>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    return apiRequest.get(`/api/v1/announcements?${params}`);
  }

  async createAnnouncement(announcement: CreateAnnouncementRequest): Promise<ApiResponse<Announcement>> {
    const formData = new FormData();
    
    Object.entries(announcement).forEach(([key, value]) => {
      if (key === 'attachments' && Array.isArray(value)) {
        value.forEach(file => formData.append('attachments', file));
      } else if (Array.isArray(value)) {
        value.forEach(item => formData.append(`${key}[]`, item));
      } else if (value !== undefined) {
        formData.append(key, typeof value === 'object' ? JSON.stringify(value) : value.toString());
      }
    });

    return apiRequest.post('/api/v1/announcements', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }

  async updateAnnouncement(announcementId: string, updates: Partial<Announcement>): Promise<ApiResponse<Announcement>> {
    return apiRequest.patch(`/api/v1/announcements/${announcementId}`, updates);
  }

  async deleteAnnouncement(announcementId: string): Promise<ApiResponse<void>> {
    return apiRequest.delete(`/api/v1/announcements/${announcementId}`);
  }

  // Intervention Alerts
  async getInterventionAlerts(
    page: number = 1,
    limit: number = 20,
    status?: 'active' | 'acknowledged' | 'resolved'
  ): Promise<PaginatedResponse<InterventionAlert>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (status) {
      params.append('status', status);
    }

    return apiRequest.get(`/api/v1/interventions?${params}`);
  }

  async acknowledgeAlert(alertId: string, notes?: string): Promise<ApiResponse<InterventionAlert>> {
    return apiRequest.post(`/api/v1/interventions/${alertId}/acknowledge`, { notes });
  }

  async resolveAlert(alertId: string, notes?: string): Promise<ApiResponse<InterventionAlert>> {
    return apiRequest.post(`/api/v1/interventions/${alertId}/resolve`, { notes });
  }

  async assignAlert(alertId: string, assignedTo: string): Promise<ApiResponse<InterventionAlert>> {
    return apiRequest.post(`/api/v1/interventions/${alertId}/assign`, { assignedTo });
  }

  // Mock data for development
  async getMockStudents(): Promise<Student[]> {
    return [
      {
        id: '1',
        firstName: 'Emma',
        lastName: 'Johnson',
        email: 'emma.johnson@school.edu',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150',
        enrollmentDate: new Date('2023-09-01'),
        status: 'active',
        grade: '10th',
        classrooms: ['math-101', 'science-201'],
        parentGuardians: [
          {
            id: 'p1',
            firstName: 'Sarah',
            lastName: 'Johnson',
            email: 'sarah.johnson@email.com',
            phone: '+1-555-0123',
            relationship: 'parent',
            isPrimary: true,
            communicationPreferences: { email: true, sms: true, phone: false }
          }
        ],
        learningProfile: {
          learningStyle: 'visual',
          strengths: ['Mathematics', 'Problem Solving'],
          challenges: ['Reading Comprehension'],
          accommodations: ['Extended Time'],
          interests: ['Science', 'Technology'],
          preferredLanguage: 'English'
        },
        progressSummary: {
          overallProgress: 0.85,
          completedLessons: 42,
          totalLessons: 50,
          averageScore: 0.88,
          engagementScore: 0.92,
          timeSpent: 3600,
          lastAssessmentScore: 0.91,
          streakDays: 7
        },
        lastActivity: new Date('2024-01-15T10:30:00Z'),
        riskScore: 0.15,
        tags: ['high-achiever', 'stem-focused']
      },
      {
        id: '2',
        firstName: 'Michael',
        lastName: 'Chen',
        email: 'michael.chen@school.edu',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        enrollmentDate: new Date('2023-09-01'),
        status: 'active',
        grade: '10th',
        classrooms: ['math-101', 'history-301'],
        parentGuardians: [
          {
            id: 'p2',
            firstName: 'Li',
            lastName: 'Chen',
            email: 'li.chen@email.com',
            phone: '+1-555-0124',
            relationship: 'parent',
            isPrimary: true,
            communicationPreferences: { email: true, sms: false, phone: true }
          }
        ],
        learningProfile: {
          learningStyle: 'kinesthetic',
          strengths: ['Critical Thinking', 'History'],
          challenges: ['Mathematics'],
          accommodations: [],
          interests: ['History', 'Literature'],
          preferredLanguage: 'English'
        },
        progressSummary: {
          overallProgress: 0.72,
          completedLessons: 36,
          totalLessons: 50,
          averageScore: 0.75,
          engagementScore: 0.68,
          timeSpent: 2800,
          lastAssessmentScore: 0.73,
          streakDays: 3
        },
        lastActivity: new Date('2024-01-14T14:20:00Z'),
        riskScore: 0.35,
        tags: ['needs-support', 'math-struggling']
      },
      {
        id: '3',
        firstName: 'Sophia',
        lastName: 'Rodriguez',
        email: 'sophia.rodriguez@school.edu',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
        enrollmentDate: new Date('2023-09-01'),
        status: 'active',
        grade: '10th',
        classrooms: ['math-101', 'art-101'],
        parentGuardians: [
          {
            id: 'p3',
            firstName: 'Maria',
            lastName: 'Rodriguez',
            email: 'maria.rodriguez@email.com',
            phone: '+1-555-0125',
            relationship: 'parent',
            isPrimary: true,
            communicationPreferences: { email: true, sms: true, phone: true }
          }
        ],
        learningProfile: {
          learningStyle: 'visual',
          strengths: ['Art', 'Creativity', 'Visual Learning'],
          challenges: ['Test Anxiety'],
          accommodations: ['Quiet Testing Environment'],
          interests: ['Art', 'Design', 'Music'],
          preferredLanguage: 'Spanish'
        },
        progressSummary: {
          overallProgress: 0.78,
          completedLessons: 39,
          totalLessons: 50,
          averageScore: 0.82,
          engagementScore: 0.85,
          timeSpent: 3200,
          lastAssessmentScore: 0.79,
          streakDays: 5
        },
        lastActivity: new Date('2024-01-15T09:15:00Z'),
        riskScore: 0.22,
        tags: ['creative', 'bilingual']
      }
    ];
  }

  async getMockClassrooms(): Promise<Classroom[]> {
    return [
      {
        id: 'math-101',
        name: 'Algebra I',
        description: 'Introduction to algebraic concepts and problem solving',
        subject: 'Mathematics',
        grade: '10th',
        teacherId: 'teacher-1',
        students: ['1', '2', '3'],
        schedule: [
          { dayOfWeek: 1, startTime: '09:00', endTime: '10:30', location: 'Room 201' },
          { dayOfWeek: 3, startTime: '09:00', endTime: '10:30', location: 'Room 201' },
          { dayOfWeek: 5, startTime: '09:00', endTime: '10:30', location: 'Room 201' }
        ],
        settings: {
          allowLateSubmissions: true,
          autoGrading: true,
          showLeaderboard: false,
          enableDiscussions: true,
          parentVisibility: true
        },
        createdAt: new Date('2023-08-15'),
        updatedAt: new Date('2024-01-10')
      }
    ];
  }
}

export const studentsAPI = new StudentsAPI();
export default studentsAPI;