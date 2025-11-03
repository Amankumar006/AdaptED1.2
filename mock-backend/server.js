const express = require('express');
const cors = require('cors');
const app = express();

// Enable CORS for all origins (development only)
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
}));

app.use(express.json());

// Load demo data
const fs = require('fs');
const path = require('path');

const loadJSON = (filename) => {
  try {
    const filePath = path.join(__dirname, '..', filename);
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.log(`Warning: Could not load ${filename}`);
    return null;
  }
};

const demoUsers = loadJSON('demo-users.json');
const demoLessons = loadJSON('demo-lessons.json');
const demoAssessments = loadJSON('demo-assessments.json');
const demoConversations = loadJSON('demo-ai-conversations.json');
const demoAnalytics = loadJSON('demo-analytics.json');

// Mock JWT token generation
const generateToken = (user) => {
  return `mock_token_${user.id}_${Date.now()}`;
};

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// AUTH ENDPOINTS
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  console.log(`Login attempt: ${email}`);
  
  if (!demoUsers) {
    return res.status(200).json({
      message: 'Login successful',
      user: {
        id: 'demo_user',
        email: email,
        profile: {
          firstName: 'Demo',
          lastName: 'User'
        },
        roles: [email.includes('teacher') ? 'teacher' : 'student']
      },
      tokens: {
        accessToken: generateToken({ id: 'demo_user', email }),
        refreshToken: generateToken({ id: 'demo_user', email }) + '_refresh',
        expiresIn: 3600
      }
    });
  }
  
  // Check students
  const student = demoUsers.students?.find(u => u.email === email && u.password === password);
  if (student) {
    const [firstName, lastName] = student.name.split(' ');
    return res.json({
      message: 'Login successful',
      user: {
        id: student.id,
        email: student.email,
        profile: {
          firstName: firstName || student.name,
          lastName: lastName || '',
        },
        roles: ['student'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      tokens: {
        accessToken: generateToken(student),
        refreshToken: generateToken(student) + '_refresh',
        expiresIn: 3600
      }
    });
  }
  
  // Check teachers
  const teacher = demoUsers.teachers?.find(u => u.email === email && u.password === password);
  if (teacher) {
    const [firstName, lastName] = teacher.name.split(' ');
    return res.json({
      message: 'Login successful',
      user: {
        id: teacher.id,
        email: teacher.email,
        profile: {
          firstName: firstName || teacher.name,
          lastName: lastName || '',
        },
        roles: ['teacher'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      tokens: {
        accessToken: generateToken(teacher),
        refreshToken: generateToken(teacher) + '_refresh',
        expiresIn: 3600
      }
    });
  }
  
  res.status(401).json({
    success: false,
    message: 'Invalid email or password'
  });
});

app.post('/api/auth/register', (req, res) => {
  const { email, name, password, role } = req.body;
  
  const newUser = {
    id: `user_${Date.now()}`,
    email,
    name,
    role: role || 'student'
  };
  
  res.json({
    success: true,
    user: newUser,
    token: generateToken(newUser)
  });
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }
  
  res.json({
    success: true,
    user: {
      id: 'current_user',
      email: 'demo@example.com',
      name: 'Demo User',
      role: 'student'
    }
  });
});

// LESSONS ENDPOINTS
app.get('/api/lessons', (req, res) => {
  res.json({
    success: true,
    lessons: demoLessons?.lessons || []
  });
});

app.get('/api/lessons/:id', (req, res) => {
  const lesson = demoLessons?.lessons?.find(l => l.id === req.params.id);
  if (lesson) {
    res.json({ success: true, lesson });
  } else {
    res.status(404).json({ success: false, message: 'Lesson not found' });
  }
});

// ASSESSMENTS ENDPOINTS
app.get('/api/assessments', (req, res) => {
  res.json({
    success: true,
    assessments: demoAssessments?.assessments || []
  });
});

app.get('/api/assessments/:id', (req, res) => {
  const assessment = demoAssessments?.assessments?.find(a => a.id === req.params.id);
  if (assessment) {
    res.json({ success: true, assessment });
  } else {
    res.status(404).json({ success: false, message: 'Assessment not found' });
  }
});

app.post('/api/assessments/:id/submit', (req, res) => {
  const { answers } = req.body;
  
  res.json({
    success: true,
    result: {
      score: 85,
      totalPoints: 100,
      feedback: 'Great job!',
      submittedAt: new Date().toISOString()
    }
  });
});

// AI CHAT ENDPOINTS
app.post('/api/ai/chat', (req, res) => {
  const { message } = req.body;
  
  res.json({
    success: true,
    response: {
      message: `I understand you said: "${message}". As an AI tutor, I'm here to help! This is a demo response.`,
      timestamp: new Date().toISOString()
    }
  });
});

app.get('/api/ai/conversations', (req, res) => {
  res.json({
    success: true,
    conversations: demoConversations?.conversations || []
  });
});

// ANALYTICS ENDPOINTS
app.get('/api/analytics/student/:id', (req, res) => {
  res.json({
    success: true,
    analytics: demoAnalytics || {
      progress: [],
      results: [],
      metrics: {}
    }
  });
});

app.get('/api/analytics/dashboard', (req, res) => {
  res.json({
    success: true,
    metrics: demoAnalytics?.systemMetrics || {
      activeUsers: 0,
      lessonsCompleted: 0,
      assessmentsTaken: 0
    }
  });
});

// USER ENDPOINTS
app.get('/api/users/profile', (req, res) => {
  res.json({
    success: true,
    profile: {
      id: 'current_user',
      name: 'Demo User',
      email: 'demo@example.com',
      avatar: null,
      preferences: {}
    }
  });
});

app.put('/api/users/profile', (req, res) => {
  res.json({
    success: true,
    profile: req.body
  });
});

// CONTENT ENDPOINTS
app.get('/api/content', (req, res) => {
  res.json({
    success: true,
    content: []
  });
});

// Catch-all for unhandled routes
app.use((req, res) => {
  console.log(`Unhandled route: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.path
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: err.message
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Mock Backend Server running on http://localhost:${PORT}`);
  console.log(`📝 Available endpoints:`);
  console.log(`   POST /api/auth/login`);
  console.log(`   POST /api/auth/register`);
  console.log(`   GET  /api/lessons`);
  console.log(`   GET  /api/assessments`);
  console.log(`   POST /api/ai/chat`);
  console.log(`   GET  /api/analytics/dashboard`);
});
