# 🌱 Smart Planner

> An intelligent, gamified study planning and task management web application powered by Google Gemini AI

[![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0+-green.svg)](https://flask.palletsprojects.com/)
[![Google Gemini AI](https://img.shields.io/badge/Google%20Gemini-AI%20Powered-orange.svg)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 📋 Table of Contents

- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [Project Structure](#-project-structure)
- [API Endpoints](#-api-endpoints)
- [Database Models](#-database-models)
- [Gamification System](#-gamification-system)
- [AI Features](#-ai-features)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

## 🚀 Features

### 📝 Task Management
- **Create, read, update, and delete tasks** with full CRUD operations
- **Priority levels** (low, medium, high) for task organization
- **Deadline tracking** with calendar integration
- **Completion status** tracking to monitor progress
- **Date-based filtering** to view tasks by specific dates

### 🎮 Gamification System
- **Forest Growth Mechanics**: Earn points by completing tasks to grow your virtual forest
- **Progressive Stages**: Watch your forest evolve through 5 stages:
  - 🌱 Seed (0-49 points)
  - 🌿 Sprout (50-149 points)
  - 🌳 Young Trees (150-299 points)
  - 🌲 Forest (300-599 points)
  - 🌳 Lush Forest (600+ points)
- **Daily Point Decay**: Incomplete tasks reduce forest points by 15 daily (once per day)
- **Bonus Dates**: Special dates to earn bonus points
- **Visual Forest Representation**: Real-time visual feedback of your progress

### 🤖 AI-Powered Features
- **Gemini AI Assistant**: Study-focused AI chatbot powered by Google Generative AI
- **Smart Study Filter**: Blocks non-academic questions to keep users focused
- **Task Suggestions**: AI-generated intelligent task recommendations
- **Motivation Quotes**: AI-generated personalized motivational quotes
- **Document Analysis**: Upload study materials for AI-assisted learning

### 📚 Document Management
- **Upload Study Documents**: Store PDFs and study materials (max 5 MB per file)
- **Document Limit**: Max 10 documents per user account
- **Organized Storage**: Documents separated by user for privacy
- **Quick Access**: Retrieve and view uploaded documents easily
- **Delete Documents**: Remove outdated study materials

### 📊 Analytics Dashboard
- **Daily Completion Tracking**: Visualize daily task completion percentages
- **Progress Insights**: AI-generated insights about your study patterns
- **Analytics Cache**: Efficient data caching for performance
- **Productivity Metrics**: Track consistency and improvement over time

### 🎨 Additional Features
- **Dark/Light Theme Support**: Customize your interface appearance
- **Calendar View**: Visual timeline of deadlines and tasks
- **Focus Timer**: Pomodoro-style timer for focused study sessions
- **Focus Music**: Background ambient music integration
- **Split View**: Multitask with document viewer alongside planner
- **Feedback System**: Submit feedback and suggestions
- **User Authentication**: Secure login and registration system
- **Session Management**: Persistent user sessions and data

## 💻 Technology Stack

### Backend
- **Python 3.9+** - Programming language
- **Flask** - Lightweight web framework
- **Flask-SQLAlchemy** - ORM for database management
- **Flask-CORS** - Cross-origin resource sharing
- **SQLite** - Lightweight database
- **Google Generative AI SDK** - AI integration

### Frontend
- **HTML5** - Markup structure
- **CSS3** - Responsive styling
- **JavaScript (ES6+)** - Interactive functionality
- **Vanilla JS** - No heavy framework dependencies

### AI & APIs
- **Google Gemini AI** (`gemini-2.5-flash`) - AI model for text generation

### DevOps & Deployment
- **Gunicorn** - WSGI HTTP Server for production
- **python-dotenv** - Environment variable management

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.9 or higher** ([Download](https://www.python.org/downloads/))
- **pip** (Python package manager, usually included with Python)
- **Git** (for version control) ([Download](https://git-scm.com/))
- **Google Gemini API Key** ([Get one here](https://aistudio.google.com/app/apikey))

### System Requirements
- **RAM**: Minimum 4GB (8GB recommended)
- **Storage**: 500MB free space
- **Browser**: Modern browser (Chrome, Firefox, Safari, Edge)

## 🔧 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/smart-planner.git
cd smart-planner
```

### 2. Create a Virtual Environment

#### On Windows:
```bash
python -m venv venv
venv\Scripts\activate
```

#### On macOS/Linux:
```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Environment Configuration

Create a `.env` file in the project root directory:

```bash
cd smart-planner
echo # Create .env file (Windows)
# or touch .env (macOS/Linux)
```

Add the following to your `.env` file:

```plaintext
GEMINI_API_KEY=your_actual_api_key_here
```

**⚠️ Important**: 
- Never commit the `.env` file to version control
- Add `.env` to your `.gitignore` file
- Keep your API key confidential

### 5. Verify Installation

```bash
python app.py
```

You should see:
```
Loaded API Key: present
 * Running on http://127.0.0.1:5000
```

## ⚙️ Configuration

### Google Gemini API Setup

#### Step 1: Get Your API Key
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click **"Create API key"** in your Google project
3. Copy the generated API key

#### Step 2: Enable Generative Language API
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Search for **"Generative Language API"**
3. Click **"Enable"**

#### Step 3: Update .env
```plaintext
GEMINI_API_KEY=sk-proj-xxxxxxxxxxxxx
```

#### Step 4: Test the Setup
```bash
# Start the server
python app.py

# In another terminal, test the API
curl -X POST http://127.0.0.1:5000/api/test-key \
  -H "Content-Type: application/json" \
  -d '{"api_key":"your_key_here"}'
```

### Application Configuration

Edit configuration in `app.py`:

```python
# AI Model
GEMINI_MODEL = "gemini-2.5-flash"  # Change model version if needed

# Document Management
MAX_DOCS_PER_USER = 10             # Max documents per user
MAX_FILE_SIZE = 5 * 1024 * 1024    # 5 MB per file

# Session Management
app.config["SECRET_KEY"] = "supersecretkey"  # Change in production!
```

## 📖 Usage

### Starting the Application

```bash
# Development mode
python app.py

# Production mode with Gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

Visit `http://localhost:5000` in your browser

### User Workflow

#### 1. **Registration & Login**
- Create an account with username and password
- Login with your credentials
- Your session is automatically maintained

#### 2. **Dashboard**
- View all your tasks at a glance
- See your current forest stage
- Access quick action buttons
- Monitor daily completion percentage

#### 3. **Task Management**
- Click **"Add Task"** to create a new task
- Set title, deadline, priority, and date
- Mark tasks as complete/incomplete
- Edit tasks by clicking the edit icon
- Delete tasks when no longer needed

#### 4. **Forest Gamification**
- Complete tasks to earn points
- Watch your forest grow as points accumulate
- Visit **/forest** to view your forest visualization
- Avoid incomplete tasks (causes 15pt decay daily)

#### 5. **AI Assistant**
- Use the chat interface to ask study-related questions
- Ask about programming, math, science, history, languages, etc.
- Get immediate AI-generated responses
- Non-study questions are blocked for focus

#### 6. **Study Documents**
- Upload PDFs or study materials
- Keep up to 10 documents active
- Delete old documents to free space
- View documents in split view while working

#### 7. **Analytics**
- Check your performance dashboard
- Get AI-generated insights on your productivity
- View daily completion rates
- Identify productivity patterns

#### 8. **Additional Features**
- Use the **Pomodoro Timer** for focused study sessions
- Enable **Focus Music** for background ambience
- Switch between **Dark/Light Themes**
- Submit **Feedback** to improve the app
- View **Motivation Quotes** for daily inspiration

## 📂 Project Structure

```
smart-planner/
├── app.py                          # Main Flask application
├── requirements.txt                # Python dependencies
├── GEMINI_SETUP.md                # AI setup documentation
├── .env                            # Environment variables (not in repo)
├── planner.db                      # SQLite database (auto-created)
│
├── templates/                      # HTML templates
│   ├── dashboard.html              # Main dashboard view
│   ├── login.html                  # Login page
│   ├── register.html               # Registration page
│   ├── forest.html                 # Forest visualization
│   ├── feedback_widget.html        # Feedback form
│   └── admin_feedbacks.html        # Admin feedback viewer
│
├── static/                         # Static files
│   ├── js/                         # JavaScript files
│   │   ├── main.js                 # Main application logic
│   │   ├── tasks.js                # Task management
│   │   ├── ai.js                   # AI chat interface
│   │   ├── calendar.js             # Calendar functionality
│   │   ├── analytics.js            # Analytics dashboard
│   │   ├── forest.js               # Forest visualization
│   │   ├── timer.js                # Pomodoro timer
│   │   ├── music.js                # Background music player
│   │   ├── theme.js                # Theme toggle
│   │   ├── docs.js                 # Document management
│   │   ├── suggest.js              # Task suggestions
│   │   ├── aiQuotes.js             # Motivation quotes
│   │   ├── menu.js                 # Navigation menu
│   │   ├── history.js              # Task history
│   │   ├── deadline.js             # Deadline tracker
│   │   ├── feedback.js             # Feedback system
│   │   ├── api_settings.js         # API configuration
│   │   └── splitview.js            # Split view functionality
│   │
│   ├── css/                        # Stylesheets
│   │   ├── style.css               # Main styles
│   │   ├── style_new.css           # Modern styles
│   │   └── splitview.css           # Split view styles
│   │
│   ├── images/                     # Image assets
│   ├── audio/                      # Music files
│   └── docs/                       # Uploaded documents
│
├── instance/                       # Flask instance folder
│
├── __pycache__/                    # Python cache files
│
└── README.md                       # This file
```

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | User registration |
| POST | `/login` | User login |
| GET | `/logout` | User logout |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tasks` | Retrieve all tasks |
| POST | `/tasks` | Create a new task |
| PUT | `/tasks/<id>` | Update a task |
| DELETE | `/tasks/<id>` | Delete a task |

### AI Features
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ask-ai` | Chat with AI assistant |
| POST | `/api/test-key` | Validate API key |
| POST | `/api/motivation-quote` | Get motivational quote |
| POST | `/get_suggestion` | Get task suggestions |

### gamification
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/forest-data` | Get forest progress data |

### Documents
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/get-docs` | Retrieve user documents |
| POST | `/upload-doc` | Upload new document |
| DELETE | `/delete-doc/<id>` | Delete document |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/get_analytics` | Retrieve analytics data |

### Other
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Dashboard (redirect to login if not authenticated) |
| GET | `/forest` | Forest visualization page |
| POST | `/submit-feedback` | Submit user feedback |
| GET | `/admin/feedbacks` | View all feedback (admin) |

## 🗄️ Database Models

### User
```python
id              (Integer, Primary Key)
username        (String, Unique, Required)
password        (String, Required - hashed)
```

### Task
```python
id              (Integer, Primary Key)
title           (String, Required)
deadline        (String)
completed       (Boolean, Default=False)
date            (String)
priority        (String, Default="medium")
user_id         (Foreign Key → User)
created_at      (DateTime, Default=UTC now)
```

### ForestProgress
```python
id              (Integer, Primary Key)
user_id         (Foreign Key → User, Unique)
points          (Integer, Default=0)
last_decay_date (String, nullable)
bonus_dates     (Text, Default="")
```

### Document
```python
id              (Integer, Primary Key)
user_id         (Foreign Key → User)
filename        (String)
display_name    (String)
created_at      (DateTime, Default=UTC now)
```

### DailyCompletion
```python
id                      (Integer, Primary Key)
user_id                 (Foreign Key → User)
date                    (String)
completion_percentage   (Float, Default=0.0)
```

### Feedback
```python
id              (Integer, Primary Key)
message         (Text, Required)
created_at      (DateTime, Default=UTC now)
```

### AnalyticsCache
```python
id              (Integer, Primary Key)
user_id         (Foreign Key → User, Unique)
last_updated    (String)
cached_insights (Text)
```

## 🎮 Gamification System

### How Points Are Earned
- **Task Completion**: Complete a task to earn points
- **Consistent Performance**: Maintain streaks for bonus multipliers
- **Special Dates**: Bonus opportunities on designated dates

### How Points Are Lost
- **Daily Decay**: -15 points if any task remains incomplete when dashboard is opened
- **Frequency**: Decay applied once per day (tracked by `last_decay_date`)

### Forest Stages

| Stage | Points Required | Visual |
|-------|----------------|--------|
| Seed | 0-49 | 🌱 |
| Sprout | 50-149 | 🌿 |
| Young Trees | 150-299 | 🌳 |
| Forest | 300-599 | 🌲 |
| Lush Forest | 600+ | 🌳✨ |

### Progression Strategy
1. Complete small tasks daily for consistent points
2. Prioritize completing all tasks to avoid 15pt decay
3. Focus on high-priority tasks for bigger impact
4. Use bonus dates strategically
5. Watch your forest grow as motivation

## 🤖 AI Features

### Study Filter
The AI is restricted to academic topics:
- ✅ Programming & Computer Science
- ✅ Mathematics & STEM subjects
- ✅ Languages & Literature
- ✅ History & Geography
- ✅ Science topics
- ❌ Entertainment & jokes
- ❌ Non-academic questions

### Supported Study Topics
**Computer Science**: Algorithms, data structures, programming languages, OOP, databases, APIs, web frameworks, networking, security, machine learning

**Mathematics**: Algebra, geometry, calculus, trigonometry, statistics, probability

**Languages**: Grammar, writing, vocabulary, linguistics

**Natural Sciences**: Physics, Chemistry, Biology, Geology, Astronomy

**Humanities**: History, Geography, Economics, Literature

### AI Model
- **Model**: `gemini-2.5-flash` (Fast and efficient)
- **Provider**: Google Generative AI
- **Capabilities**: Text generation, document analysis, smart suggestions

## 🐛 Troubleshooting

### API Key Issues

#### ❌ "GEMINI_API_KEY not set in .env file"
**Solution:**
1. Create `.env` file in project root
2. Add: `GEMINI_API_KEY=your_key_here`
3. Ensure no spaces around `=`
4. Restart the application

#### ❌ "Invalid API Key"
**Solution:**
1. Verify key is copied correctly from [aistudio.google.com](https://aistudio.google.com/app/apikey)
2. Check if key has expired (regenerate if needed)
3. Ensure API is enabled in Google Cloud Console

#### ❌ "Generative Language API not enabled"
**Solution:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Search for "Generative Language API"
3. Click "Enable"
4. Wait 2-3 minutes for propagation

### Database Issues

#### ❌ "No database file"
**Solution:**
```bash
# Delete old database
rm planner.db  # or del planner.db on Windows

# Restart app to recreate
python app.py
```

#### ❌ "Database locked"
**Solution:**
```bash
# Kill the app process
# Restart the application
python app.py
```

### Port Already in Use

#### ❌ "Address already in use"
**Solution:**
```bash
# Change port in app.py
# Replace: app.run(debug=True)
# With: app.run(debug=True, port=5001)

# Or kill the process using port 5000:
# Windows: netstat -ano | findstr :5000
# macOS/Linux: lsof -i :5000
```

### Static Files Not Loading

#### ❌ CSS/JS files return 404
**Solution:**
1. Ensure `static/` folder exists in project root
2. Verify file paths in HTML templates
3. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
4. Clear browser cache

### AI Assistant Not Responding

#### ❌ "AI features not working"
**Solution:**
1. Check API key is valid and enabled
2. Verify internet connection
3. Test with: `curl -X POST http://127.0.0.1:5000/api/test-key -H "Content-Type: application/json" -d '{"api_key":"your_key"}'`
4. Check application logs for errors

## 📝 Contributing

Contributions are welcome! Here's how to contribute:

### Steps to Contribute

1. **Fork the repository**
   ```bash
   git clone https://github.com/yourusername/smart-planner.git
   cd smart-planner
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make your changes**
   - Follow PEP 8 for Python code
   - Use meaningful commit messages
   - Test your changes thoroughly

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "Add: Amazing new feature"
   ```

5. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```

6. **Open a Pull Request**
   - Describe your changes clearly
   - Reference any related issues
   - Wait for review and feedback

### Contribution Guidelines

- Follow existing code style and conventions
- Write clear, descriptive commit messages
- Test features in development environment
- Update documentation for new features
- Add comments for complex logic
- Respect the existing architecture

### Areas for Contribution

- 🐛 Bug fixes and improvements
- ✨ New features and enhancements
- 📚 Documentation improvements
- 🎨 UI/UX improvements
- ♿ Accessibility enhancements
- 🌍 Internationalization support
- ⚡ Performance optimizations

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### MIT License Summary
You are free to:
- ✅ Use this software commercially
- ✅ Modify the source code
- ✅ Distribute the software
- ✅ Include it in proprietary applications

Conditions:
- ⚠️ Include copyright notice and license
- ⚠️ Include list of changes made
- ⚠️ No warranty or liability

## 🙋 Support & Questions

- **Issues**: Report bugs via [GitHub Issues](https://github.com/yourusername/smart-planner/issues)
- **Discussions**: Ask questions in [GitHub Discussions](https://github.com/yourusername/smart-planner/discussions)
- **Documentation**: Check [GEMINI_SETUP.md](GEMINI_SETUP.md) for AI setup help

## 🎯 Roadmap

### Planned Features (v2.0)
- [ ] Mobile app using React Native
- [ ] Real-time collaboration on tasks
- [ ] Advanced analytics with chart visualizations
- [ ] Browser notifications and reminders
- [ ] Email notifications for deadlines
- [ ] Habit tracking module
- [ ] Study group features
- [ ] Integration with Google Calendar
- [ ] Dark mode with multiple themes
- [ ] Offline support with service workers
- [ ] Multi-language support (i18n)
- [ ] Voice-based task creation
- [ ] Video tutorial system
- [ ] Achievement badges and milestones
- [ ] Social sharing features

### Version History

**v1.0.0** (Current)
- ✅ Core task management
- ✅ User authentication
- ✅ Gamification system (Forest)
- ✅ AI-powered assistant
- ✅ Document management
- ✅ Analytics dashboard
- ✅ Timer and music player
- ✅ Theme customization
- ✅ Feedback system

## 👨‍💻 Author

Created with ❤️ for students and learners

---

**Star this project if you find it helpful!** ⭐

<p align="center">
  <strong>Happy Planning & Studying! 🚀📚</strong>
</p>
