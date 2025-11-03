# 🧪 Manual Testing Guide

## Quick Start - Run the System Yourself

### 1. Start Everything
```bash
# Setup demo data first
./setup-demo-data.sh

# Start all services
./start-system.sh
```

### 2. Open in Browser
- **Student Portal**: http://localhost:3000
- **Teacher Portal**: http://localhost:3001

### 3. Test Accounts
**Students:**
- alice@student.demo / demo123
- bob@student.demo / demo123

**Teachers:**
- sarah@teacher.demo / demo123  
- john@teacher.demo / demo123

### 4. Stop When Done
```bash
./stop-system.sh
```

---

## 🎯 What to Test

### Student Experience
1. **Login & Dashboard**
   - Go to http://localhost:3000
   - Login as alice@student.demo / demo123
   - Check dashboard loads with widgets

2. **Lessons**
   - Navigate to Lessons page
   - Open "Introduction to Algebra" 
   - Try different content types (text, video, interactive)
   - Test note-taking and bookmarks

3. **BuddyAI Chat**
   - Go to Chat page
   - Ask: "Can you help me with algebra?"
   - Try voice input (if supported)
   - Test safety features with inappropriate content

4. **Assessments**
   - Go to Assignments page
   - Take "Algebra Basics Quiz"
   - Answer questions and submit
   - Check results and feedback

5. **Collaboration**
   - Visit Study Groups page
   - Try discussion forums
   - Test peer interactions

6. **Practice & Games**
   - Go to Practice page
   - Try flashcards and practice problems
   - Check gamification features

### Teacher Experience  
1. **Login & Analytics Dashboard**
   - Go to http://localhost:3001
   - Login as sarah@teacher.demo / demo123
   - Check analytics widgets and charts

2. **Lesson Creation**
   - Go to Lessons page
   - Click "Create New Lesson"
   - Add different content types
   - Use AI assistant for content generation
   - Save and publish lesson

3. **Assessment Builder**
   - Go to Assessments page
   - Create new assessment
   - Add multiple question types
   - Set up rubrics and grading
   - Preview assessment

4. **Student Management**
   - Go to Students page
   - View student list and progress
   - Check individual student details
   - Send messages/feedback
   - Monitor attendance

5. **Analytics & Reports**
   - Visit Analytics page
   - Check real-time dashboards
   - Generate custom reports
   - Export data

---

## 🔍 Things to Look For

### Functionality Tests
- [ ] All pages load without errors
- [ ] Navigation works smoothly
- [ ] Forms submit successfully
- [ ] Data persists between sessions
- [ ] Real-time updates work
- [ ] File uploads function
- [ ] Search features work

### User Experience Tests
- [ ] Interface is intuitive
- [ ] Responsive design on mobile
- [ ] Loading times are reasonable
- [ ] Error messages are helpful
- [ ] Accessibility features work
- [ ] Keyboard navigation works

### Performance Tests
- [ ] Pages load quickly (< 3 seconds)
- [ ] No memory leaks in browser
- [ ] Smooth animations
- [ ] No console errors
- [ ] Network requests are efficient

### AI/BuddyAI Tests
- [ ] AI responds appropriately
- [ ] Safety filters work
- [ ] Multi-modal input works
- [ ] Context is maintained
- [ ] Escalation to teachers works

---

## 🐛 Common Issues & Solutions

### Services Won't Start
```bash
# Check if ports are in use
lsof -i :3000
lsof -i :3001

# Kill existing processes
./stop-system.sh

# Try starting again
./start-system.sh
```

### Login Issues
- Make sure you ran `./setup-demo-data.sh`
- Use exact email/password from demo accounts
- Check browser console for errors
- Try clearing browser cache

### Pages Not Loading
- Check if services are running: `ps aux | grep node`
- Verify URLs: http://localhost:3000 and http://localhost:3001
- Check browser network tab for failed requests
- Look at terminal output for error messages

### Missing Features
- Some features may be UI-only (no backend)
- Check browser console for API errors
- Features may be simulated with mock data

---

## 🎮 Test Scenarios

### Scenario 1: New Student Journey
1. Login as new student
2. Complete onboarding
3. Browse available lessons
4. Start first lesson
5. Interact with BuddyAI for help
6. Take first assessment
7. Check progress dashboard

### Scenario 2: Teacher Creating Content
1. Login as teacher
2. Create new lesson with mixed content
3. Build assessment with various question types
4. Publish to students
5. Monitor student progress
6. Provide feedback

### Scenario 3: Collaborative Learning
1. Login as multiple students (different browsers)
2. Join same study group
3. Participate in discussions
4. Share practice problems
5. Peer review work

### Scenario 4: AI Tutoring Session
1. Student asks complex question
2. AI provides step-by-step help
3. Student asks follow-up questions
4. AI maintains context
5. Test safety boundaries

---

## 📊 Performance Monitoring

### Browser Dev Tools
- **Network Tab**: Check request/response times
- **Performance Tab**: Monitor CPU/memory usage
- **Console**: Look for JavaScript errors
- **Application Tab**: Check local storage/cookies

### What to Monitor
- Page load times
- API response times
- Memory usage over time
- Network request efficiency
- JavaScript errors
- Accessibility violations

---

## 📝 Reporting Issues

When you find issues, note:
1. **What you were doing** (exact steps)
2. **What happened** (actual behavior)
3. **What you expected** (expected behavior)
4. **Browser/device** (Chrome, Safari, mobile, etc.)
5. **Console errors** (copy from browser console)
6. **Screenshots** (if visual issue)

### Example Issue Report
```
Title: Login button not working on mobile

Steps:
1. Open student portal on iPhone Safari
2. Enter alice@student.demo / demo123
3. Tap Login button

Expected: Should login and redirect to dashboard
Actual: Button doesn't respond, no error message

Browser: Safari on iOS 15
Console Error: "Uncaught TypeError: Cannot read property 'submit'"
```

---

## 🎯 Success Criteria

The system is working well if:
- ✅ All major user flows complete successfully
- ✅ No critical JavaScript errors
- ✅ Pages load in under 3 seconds
- ✅ AI interactions are helpful and safe
- ✅ Data persists correctly
- ✅ Interface is responsive and accessible
- ✅ Real-time features work smoothly

---

## 🚀 Advanced Testing

### Load Testing (Manual)
1. Open multiple browser tabs
2. Login as different users
3. Perform actions simultaneously
4. Monitor performance degradation

### Cross-Browser Testing
- Test in Chrome, Firefox, Safari, Edge
- Check mobile browsers
- Verify consistent behavior

### Accessibility Testing
- Navigate using only keyboard
- Test with screen reader
- Check color contrast
- Verify ARIA labels

### Security Testing
- Try SQL injection in forms
- Test XSS with script tags
- Check for exposed sensitive data
- Verify proper authentication

---

## 💡 Tips for Effective Testing

1. **Test like a real user** - Don't just click randomly
2. **Try edge cases** - Empty forms, long text, special characters
3. **Test error conditions** - Wrong passwords, network issues
4. **Use different devices** - Desktop, tablet, mobile
5. **Test accessibility** - Keyboard navigation, screen readers
6. **Check performance** - Monitor network and CPU usage
7. **Document everything** - Keep notes of what you test

Happy testing! 🎉