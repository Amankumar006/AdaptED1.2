#!/bin/bash

# Demo Data Setup Script
# Creates sample data for testing the educational platform

echo "📚 Setting up demo data for testing..."

# Create demo users file
cat > demo-users.json << 'EOF'
{
  "students": [
    {
      "id": "student1",
      "email": "alice@student.demo",
      "password": "demo123",
      "name": "Alice Johnson",
      "grade": "10th Grade",
      "subjects": ["Mathematics", "Science", "English"]
    },
    {
      "id": "student2", 
      "email": "bob@student.demo",
      "password": "demo123",
      "name": "Bob Smith",
      "grade": "9th Grade",
      "subjects": ["Mathematics", "History", "Art"]
    }
  ],
  "teachers": [
    {
      "id": "teacher1",
      "email": "sarah@teacher.demo", 
      "password": "demo123",
      "name": "Sarah Wilson",
      "subjects": ["Mathematics", "Physics"],
      "classes": ["Math 101", "Physics Advanced"]
    },
    {
      "id": "teacher2",
      "email": "john@teacher.demo",
      "password": "demo123", 
      "name": "John Davis",
      "subjects": ["English", "Literature"],
      "classes": ["English 101", "Creative Writing"]
    }
  ]
}
EOF

# Create demo lessons
cat > demo-lessons.json << 'EOF'
{
  "lessons": [
    {
      "id": "lesson1",
      "title": "Introduction to Algebra",
      "subject": "Mathematics",
      "grade": "9th Grade",
      "description": "Learn the basics of algebraic expressions and equations",
      "content": [
        {
          "type": "text",
          "title": "What is Algebra?",
          "content": "Algebra is a branch of mathematics that uses symbols and letters to represent numbers and quantities in formulas and equations."
        },
        {
          "type": "video",
          "title": "Algebra Basics Video",
          "url": "https://www.youtube.com/watch?v=NybHckSEQBI",
          "duration": "10:30"
        },
        {
          "type": "interactive",
          "title": "Practice Problems",
          "problems": [
            "Solve for x: 2x + 5 = 15",
            "Simplify: 3x + 2x - 4",
            "If y = 2x + 3, find y when x = 4"
          ]
        }
      ],
      "createdBy": "teacher1",
      "createdAt": "2024-01-15"
    },
    {
      "id": "lesson2", 
      "title": "Creative Writing Techniques",
      "subject": "English",
      "grade": "10th Grade",
      "description": "Explore different techniques for creative writing",
      "content": [
        {
          "type": "text",
          "title": "Elements of Creative Writing",
          "content": "Creative writing involves imagination and creativity to tell stories, express emotions, and create vivid imagery through words."
        },
        {
          "type": "text",
          "title": "Writing Techniques",
          "content": "Key techniques include: Show don't tell, Character development, Setting description, Dialogue, Plot structure"
        },
        {
          "type": "interactive",
          "title": "Writing Exercise",
          "prompt": "Write a short paragraph describing a mysterious door. Use sensory details and create atmosphere."
        }
      ],
      "createdBy": "teacher2",
      "createdAt": "2024-01-20"
    }
  ]
}
EOF

# Create demo assessments
cat > demo-assessments.json << 'EOF'
{
  "assessments": [
    {
      "id": "assessment1",
      "title": "Algebra Basics Quiz",
      "subject": "Mathematics", 
      "lessonId": "lesson1",
      "questions": [
        {
          "id": "q1",
          "type": "multiple-choice",
          "question": "What is the value of x in the equation 2x + 4 = 12?",
          "options": ["2", "4", "6", "8"],
          "correct": "4",
          "points": 10
        },
        {
          "id": "q2", 
          "type": "multiple-choice",
          "question": "Simplify: 5x + 3x",
          "options": ["8x", "8", "5x + 3x", "15x"],
          "correct": "8x",
          "points": 10
        },
        {
          "id": "q3",
          "type": "short-answer",
          "question": "Solve for y: 3y - 6 = 15",
          "correct": "7",
          "points": 15
        }
      ],
      "totalPoints": 35,
      "timeLimit": 30,
      "createdBy": "teacher1"
    },
    {
      "id": "assessment2",
      "title": "Creative Writing Reflection", 
      "subject": "English",
      "lessonId": "lesson2",
      "questions": [
        {
          "id": "q1",
          "type": "essay",
          "question": "Write a short story (200-300 words) that includes a mysterious character, an unexpected discovery, and a twist ending.",
          "points": 50,
          "rubric": {
            "creativity": 15,
            "structure": 15, 
            "grammar": 10,
            "requirements": 10
          }
        },
        {
          "id": "q2",
          "type": "multiple-choice", 
          "question": "Which writing technique involves revealing character traits through actions rather than direct description?",
          "options": ["Show don't tell", "Foreshadowing", "Metaphor", "Dialogue"],
          "correct": "Show don't tell",
          "points": 10
        }
      ],
      "totalPoints": 60,
      "timeLimit": 45,
      "createdBy": "teacher2"
    }
  ]
}
EOF

# Create demo chat conversations for BuddyAI
cat > demo-ai-conversations.json << 'EOF'
{
  "conversations": [
    {
      "studentId": "student1",
      "messages": [
        {
          "role": "student",
          "message": "Can you help me understand algebra?",
          "timestamp": "2024-01-15T10:30:00Z"
        },
        {
          "role": "buddyai",
          "message": "Of course! Algebra is like a puzzle where we use letters (like x and y) to represent unknown numbers. Think of it as finding the missing piece. What specific part of algebra would you like to explore?",
          "timestamp": "2024-01-15T10:30:05Z"
        },
        {
          "role": "student", 
          "message": "How do I solve 2x + 5 = 15?",
          "timestamp": "2024-01-15T10:31:00Z"
        },
        {
          "role": "buddyai",
          "message": "Great question! Let's solve this step by step:\n\n1. Start with: 2x + 5 = 15\n2. Subtract 5 from both sides: 2x = 10\n3. Divide both sides by 2: x = 5\n\nSo x = 5! Want to check? Substitute back: 2(5) + 5 = 10 + 5 = 15 ✓",
          "timestamp": "2024-01-15T10:31:10Z"
        }
      ]
    }
  ]
}
EOF

# Create demo analytics data
cat > demo-analytics.json << 'EOF'
{
  "studentProgress": [
    {
      "studentId": "student1",
      "lessonId": "lesson1", 
      "progress": 85,
      "timeSpent": 45,
      "completedActivities": 3,
      "totalActivities": 4,
      "lastAccessed": "2024-01-15T14:30:00Z"
    },
    {
      "studentId": "student2",
      "lessonId": "lesson1",
      "progress": 60,
      "timeSpent": 30,
      "completedActivities": 2, 
      "totalActivities": 4,
      "lastAccessed": "2024-01-15T13:15:00Z"
    }
  ],
  "assessmentResults": [
    {
      "studentId": "student1",
      "assessmentId": "assessment1",
      "score": 30,
      "totalPoints": 35,
      "percentage": 85.7,
      "timeSpent": 25,
      "submittedAt": "2024-01-15T15:45:00Z"
    }
  ],
  "systemMetrics": {
    "activeUsers": 45,
    "dailyLogins": 120,
    "lessonsCompleted": 78,
    "assessmentsTaken": 34,
    "aiInteractions": 156,
    "averageSessionTime": 35
  }
}
EOF

echo "✅ Demo data files created:"
echo "  📁 demo-users.json - Sample students and teachers"
echo "  📚 demo-lessons.json - Sample lessons and content"
echo "  📝 demo-assessments.json - Sample quizzes and assignments"
echo "  🤖 demo-ai-conversations.json - Sample BuddyAI chats"
echo "  📊 demo-analytics.json - Sample progress and metrics"
echo ""
echo "🎯 Test Accounts:"
echo "Students:"
echo "  📧 alice@student.demo / demo123"
echo "  📧 bob@student.demo / demo123"
echo ""
echo "Teachers:" 
echo "  📧 sarah@teacher.demo / demo123"
echo "  📧 john@teacher.demo / demo123"
echo ""
echo "💡 Use these accounts to test login and different user experiences!"