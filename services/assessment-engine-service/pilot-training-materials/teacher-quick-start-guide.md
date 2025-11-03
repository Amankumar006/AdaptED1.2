# Teacher Quick Start Guide - Assessment Engine

## Welcome to the Assessment Engine Pilot Program! 🎓

This guide will help you get started with creating and managing assessments using our new assessment engine. The pilot program runs for 30 days and includes comprehensive support.

## Getting Started

### 1. Accessing the Assessment System

**URL**: `http://localhost:3003/api/v1`  
**Support**: pilot-support@school.edu  
**Training Materials**: Available in the pilot-training-materials folder

### 2. First Login and Setup

1. **Login Credentials**: You'll receive your pilot credentials via email
2. **Profile Setup**: Complete your teacher profile with subject areas
3. **Notification Preferences**: Configure how you want to receive updates
4. **Dashboard Tour**: Take the guided tour of your new dashboard

## Core Features Overview

### Question Bank Management
- **Create Question Banks**: Organize questions by subject, difficulty, or topic
- **Question Types**: Multiple choice, essay, code submission, file upload
- **Tagging System**: Use tags to categorize and search questions easily
- **Import/Export**: Bulk import questions from existing materials

### Assessment Creation
- **Drag-and-Drop Builder**: Intuitive interface for creating assessments
- **Question Selection**: Choose from your question banks or create new questions
- **Settings Configuration**: Time limits, attempts, randomization options
- **Preview Mode**: Test your assessments before publishing

### Student Management
- **Class Organization**: Manage multiple classes and student groups
- **Progress Tracking**: Monitor individual and class performance
- **Communication Tools**: Send announcements and feedback
- **Grade Management**: Automated grading with manual override options

## Step-by-Step: Creating Your First Assessment

### Step 1: Create a Question Bank
```
1. Navigate to "Question Banks" in the main menu
2. Click "Create New Bank"
3. Fill in:
   - Name: "Grade 8 Mathematics - Unit 1"
   - Description: "Algebraic expressions and equations"
   - Subject: "Mathematics"
   - Tags: ["grade8", "algebra", "unit1"]
4. Click "Save"
```

### Step 2: Add Questions to Your Bank
```
1. Open your newly created question bank
2. Click "Add Question"
3. Choose question type (start with Multiple Choice)
4. Fill in question details:
   - Question text
   - Answer options
   - Correct answer(s)
   - Points value
   - Difficulty level
5. Add explanation (optional but recommended)
6. Save the question
```

### Step 3: Create an Assessment
```
1. Go to "Assessments" → "Create New"
2. Basic Information:
   - Title: "Unit 1 Quiz - Algebraic Expressions"
   - Description: Brief description for students
   - Time Limit: 30 minutes
   - Max Attempts: 2
3. Add Questions:
   - Select from your question bank
   - Or create new questions directly
   - Arrange in desired order
4. Configure Settings:
   - Shuffle questions: Yes/No
   - Show results immediately: Yes/No
   - Allow review after submission: Yes/No
5. Preview your assessment
6. Publish when ready
```

### Step 4: Assign to Students
```
1. Open your published assessment
2. Click "Assign to Classes"
3. Select target classes/students
4. Set availability dates
5. Send notification to students
```

## Question Types Guide

### 1. Multiple Choice Questions
**Best for**: Factual knowledge, concept understanding
**Tips**:
- Use 4-5 answer options
- Make distractors plausible but clearly incorrect
- Avoid "all of the above" or "none of the above"
- Include explanations for both correct and incorrect answers

**Example**:
```
Question: What is the slope of the line y = 3x + 2?
A) 2
B) 3 ✓
C) 5
D) -3

Explanation: In the equation y = mx + b, m represents the slope. Here, m = 3.
```

### 2. Essay Questions
**Best for**: Critical thinking, analysis, extended responses
**Tips**:
- Provide clear rubrics
- Set word limits (e.g., 200-300 words)
- Give specific prompts
- Include grading criteria

**Example**:
```
Question: Explain the process of photosynthesis and its importance to life on Earth.
Word Limit: 250-300 words
Rubric:
- Scientific accuracy (40%)
- Explanation clarity (30%)
- Examples provided (20%)
- Grammar and structure (10%)
```

### 3. Code Submission Questions
**Best for**: Programming courses, algorithm understanding
**Tips**:
- Provide starter code when appropriate
- Include multiple test cases
- Specify programming language
- Give clear requirements

**Example**:
```
Question: Write a function to calculate the factorial of a number.
Language: Python
Starter Code:
def factorial(n):
    # Your code here
    pass

Test Cases:
- factorial(5) should return 120
- factorial(0) should return 1
- factorial(1) should return 1
```

### 4. File Upload Questions
**Best for**: Projects, reports, creative assignments
**Tips**:
- Specify file formats (PDF, DOCX, etc.)
- Set file size limits
- Provide submission guidelines
- Include rubrics for evaluation

## Assessment Settings Explained

### Time Management
- **Time Limit**: Total time allowed for completion
- **Grace Period**: Extra time after limit (optional)
- **Auto-Submit**: Automatically submit when time expires

### Attempt Settings
- **Max Attempts**: How many times students can take the assessment
- **Attempt Scoring**: Highest, latest, or average score
- **Cooldown Period**: Time between attempts

### Display Options
- **Question Order**: Sequential or randomized
- **Option Order**: Fixed or shuffled (for multiple choice)
- **Progress Indicator**: Show completion percentage
- **Question Navigation**: Allow jumping between questions

### Feedback Settings
- **Immediate Feedback**: Show correct answers after each question
- **End Feedback**: Show results after completion
- **Detailed Results**: Include explanations and analysis
- **Score Visibility**: When students can see their scores

## Grading and Feedback

### Automated Grading
- **Multiple Choice**: Instant scoring
- **Code Submissions**: Automated test case evaluation
- **Partial Credit**: Configurable for complex questions

### Manual Grading
- **Essay Questions**: Use provided rubrics
- **File Uploads**: Download and evaluate offline
- **Override Scores**: Adjust automated grades when needed

### Providing Feedback
- **Question-Level**: Specific feedback for each question
- **Overall Comments**: General assessment feedback
- **Improvement Suggestions**: Personalized recommendations
- **Resource Links**: Additional learning materials

## Analytics and Reporting

### Individual Student Reports
- **Performance Summary**: Scores, time taken, attempts
- **Question Analysis**: Which questions were challenging
- **Progress Tracking**: Improvement over time
- **Skill Assessment**: Strengths and areas for improvement

### Class-Level Analytics
- **Grade Distribution**: Visual representation of class performance
- **Question Statistics**: Which questions were most/least difficult
- **Time Analysis**: How long students spent on different sections
- **Completion Rates**: Who has/hasn't completed assessments

### Assessment Quality Metrics
- **Reliability Statistics**: Internal consistency measures
- **Item Analysis**: Question difficulty and discrimination
- **Feedback Quality**: Student satisfaction with feedback
- **Improvement Suggestions**: Data-driven recommendations

## Best Practices

### Assessment Design
1. **Align with Learning Objectives**: Every question should serve a purpose
2. **Mix Question Types**: Use variety to assess different skills
3. **Progressive Difficulty**: Start easy, build to more challenging
4. **Clear Instructions**: Students should understand what's expected
5. **Reasonable Time Limits**: Allow adequate time without rushing

### Question Writing
1. **Use Clear Language**: Avoid ambiguous wording
2. **Test One Concept**: Each question should focus on one learning objective
3. **Avoid Tricks**: Test knowledge, not reading comprehension
4. **Include Context**: Provide necessary background information
5. **Review and Revise**: Test questions before using with students

### Student Communication
1. **Set Expectations**: Explain assessment format and requirements
2. **Provide Practice**: Offer sample questions or practice assessments
3. **Give Timely Feedback**: Return results promptly with explanations
4. **Encourage Questions**: Be available for clarification
5. **Celebrate Success**: Acknowledge improvement and achievement

## Troubleshooting Common Issues

### Technical Problems
**Issue**: Students can't access the assessment
**Solution**: Check assignment settings and student enrollment

**Issue**: Assessment won't save
**Solution**: Check internet connection and try refreshing the page

**Issue**: Questions not displaying correctly
**Solution**: Verify question format and contact support if needed

### Assessment Issues
**Issue**: Students complaining about time limits
**Solution**: Review time allocation and consider adjusting

**Issue**: Unexpected low scores
**Solution**: Review question difficulty and clarity

**Issue**: Technical difficulties during assessment
**Solution**: Document issues and contact support immediately

## Getting Help

### Support Channels
- **Email**: pilot-support@school.edu
- **Phone**: (555) 123-4567 (weekdays 8 AM - 6 PM)
- **Chat**: Available in the assessment platform
- **Training Sessions**: Weekly group sessions on Wednesdays at 3 PM

### Resources
- **Video Tutorials**: Available in the help section
- **FAQ**: Common questions and answers
- **Best Practices Guide**: Detailed recommendations
- **Community Forum**: Connect with other pilot teachers

### Feedback and Suggestions
We value your input! Please share:
- **Feature Requests**: What would make your job easier?
- **Bug Reports**: Any issues you encounter
- **Success Stories**: What's working well?
- **Improvement Ideas**: How can we make this better?

## Pilot Program Timeline

### Week 1: Getting Started
- [ ] Complete initial training
- [ ] Set up your first question bank
- [ ] Create a practice assessment
- [ ] Test with a small group of students

### Week 2: Full Implementation
- [ ] Deploy assessments to all classes
- [ ] Monitor student progress
- [ ] Collect initial feedback
- [ ] Adjust settings as needed

### Week 3: Optimization
- [ ] Analyze assessment data
- [ ] Refine question banks
- [ ] Implement feedback suggestions
- [ ] Share experiences with other teachers

### Week 4: Evaluation
- [ ] Complete pilot evaluation survey
- [ ] Participate in feedback sessions
- [ ] Document lessons learned
- [ ] Plan for full implementation

## Quick Reference

### Keyboard Shortcuts
- `Ctrl + S`: Save current work
- `Ctrl + P`: Preview assessment
- `Ctrl + Z`: Undo last action
- `Ctrl + Y`: Redo last action
- `F1`: Open help

### Important URLs
- **Main Dashboard**: http://localhost:3003/dashboard
- **Question Banks**: http://localhost:3003/question-banks
- **Assessments**: http://localhost:3003/assessments
- **Analytics**: http://localhost:3003/analytics
- **Help Center**: http://localhost:3003/help

### Contact Information
- **Pilot Coordinator**: Dr. Sarah Johnson (sarah.johnson@school.edu)
- **Technical Support**: pilot-support@school.edu
- **Training Team**: training@school.edu
- **Emergency Contact**: (555) 123-4567

---

**Remember**: This is a pilot program, and your feedback is crucial for success. Don't hesitate to reach out with questions, suggestions, or concerns. We're here to support you every step of the way!

**Good luck with your pilot assessments!** 🚀