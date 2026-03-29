from flask import Flask, render_template, request, jsonify, redirect, url_for, session
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime
import hashlib
import os
from dotenv import load_dotenv
# from google import genai
import google.generativeai as genai

load_dotenv()  # load .env from project root

app = Flask(__name__)
CORS(app)

# ============================================
# Gemini AI Configuration (google-genai)
# ============================================
# Load API key from environment variable
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Avoid logging the raw API key (security).
print("Loaded API Key:", "present" if GEMINI_API_KEY else "missing")

if not GEMINI_API_KEY:
    raise RuntimeError(
        "GEMINI_API_KEY not set in .env file.\n"
        "Sign up at: https://aistudio.google.com/app/apikey\n"
        "Add to .env: GEMINI_API_KEY=your_api_key_here"
    )

# Initialize Gemini client with latest SDK (google-genai)
# This replaces the deprecated google.generativeai package
# try:
#     client = genai.Client(api_key=GEMINI_API_KEY)
# except Exception as e:
#     print(f"Warning: Failed to initialize Gemini client: {e}")
#     print("AI features will not work until API key is valid")

genai.configure(api_key=GEMINI_API_KEY)

# Model configuration
GEMINI_MODEL = "gemini-2.5-flash"

# Secret key for sessions
app.config["SECRET_KEY"] = "supersecretkey"

# Database configuration
base_dir = os.path.abspath(os.path.dirname(__file__))
db_path = os.path.join(base_dir, "planner.db")
app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{db_path}"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# PDF Upload Configuration
UPLOAD_FOLDER = os.path.join(base_dir, "static", "docs")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
MAX_DOCS_PER_USER = 10
MAX_FILE_SIZE = 5 * 1024 * 1024 # 5 MB

db = SQLAlchemy(app)


def parse_bonus_dates(raw_value):
    if not raw_value:
        return set()
    return {item for item in str(raw_value).split(",") if item}


def serialize_bonus_dates(dates_set):
    return ",".join(sorted(dates_set))


def get_or_create_forest_progress(user_id):
    progress = ForestProgress.query.filter_by(user_id=user_id).first()
    if progress is None:
        progress = ForestProgress(user_id=user_id, points=0, last_decay_date=None, bonus_dates="")
        db.session.add(progress)
        db.session.commit()
    progress.points = max(0, int(progress.points or 0))
    return progress


def ensure_forest_points():
    """Ensure persistent forest progress exists for logged-in user."""
    user_id = session.get("user_id")
    if not user_id:
        return

    progress = get_or_create_forest_progress(user_id)
    # Mirror in session only for legacy compatibility with existing code paths.
    session["forest_points"] = progress.points


def adjust_forest_points(delta):
    user_id = session.get("user_id")
    if not user_id:
        return 0

    progress = get_or_create_forest_progress(user_id)
    progress.points = max(0, int(progress.points or 0) + int(delta))
    db.session.commit()
    session["forest_points"] = progress.points
    return progress.points


def get_forest_stage(points):
    if points < 50:
        return "seed"
    elif points < 150:
        return "sprout"
    elif points < 300:
        return "young_trees"
    elif points < 600:
        return "forest"
    else:
        return "lush_forest"


@app.before_request
def initialize_forest_points():
    ensure_forest_points()


def extract_gemini_text(response):
    """Normalize text extraction across different Gemini SDK response shapes."""
    # Newer SDKs may expose output/content blocks.
    reply_text = ""
    for output_block in getattr(response, "output", []):
        for content in getattr(output_block, "content", []):
            if hasattr(content, "text") and content.text:
                reply_text += content.text
            elif isinstance(content, dict) and content.get("text"):
                reply_text += content.get("text")

    if reply_text.strip():
        return reply_text.strip()

    # Alternate response fields in other SDK versions.
    if hasattr(response, "text") and response.text:
        return str(response.text).strip()

    # Dictionary-like fallback (defensive).
    if isinstance(response, dict):
        text_val = response.get("text")
        if text_val:
            return str(text_val).strip()

    return ""


# def generate_gemini_text(local_client, prompt):
#     """
#     Compatibility wrapper for Gemini SDK variants:
#     - client.responses.create(...)
#     - client.models.generate_content(...)
#     """
#     if hasattr(local_client, "responses"):
#         response = local_client.responses.create(model=GEMINI_MODEL, input=prompt)
#         return extract_gemini_text(response)

#     if hasattr(local_client, "models"):
#         response = local_client.models.generate_content(model=GEMINI_MODEL, contents=prompt)
#         return extract_gemini_text(response)

#     raise RuntimeError("Unsupported Gemini SDK: neither responses nor models API available")


def generate_gemini_text(prompt):
    try:
        import google.generativeai as genai

        genai.configure(api_key=GEMINI_API_KEY)

        model = genai.GenerativeModel(GEMINI_MODEL)

        response = model.generate_content(prompt)

        return response.text if response.text else ""

    except Exception as e:
        print("Gemini error:", str(e))
        return ""

# models

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)


class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    deadline = db.Column(db.String(10))
    completed = db.Column(db.Boolean, default=False)
    date = db.Column(db.String(20))
    priority = db.Column(db.String(10), default="medium")
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Feedback(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    message = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class ForestProgress(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), unique=True, nullable=False)
    points = db.Column(db.Integer, default=0, nullable=False)
    last_decay_date = db.Column(db.String(20), nullable=True)
    bonus_dates = db.Column(db.Text, default="", nullable=False)


class Document(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    display_name = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class DailyCompletion(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    date = db.Column(db.String(20), nullable=False)
    completion_percentage = db.Column(db.Float, default=0.0)

class AnalyticsCache(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), unique=True, nullable=False)
    last_updated = db.Column(db.String(20), nullable=False)
    cached_insights = db.Column(db.Text, nullable=False)

def update_daily_completion_sync(user_id, date_str):
    if not date_str:
        return
    from sqlalchemy import func
    tasks = Task.query.filter_by(user_id=user_id, date=date_str).all()
    total = len(tasks)
    completed = sum(1 for t in tasks if t.completed)
    pct = (completed / total * 100) if total > 0 else 0.0
    
    dc = DailyCompletion.query.filter_by(user_id=user_id, date=date_str).first()
    if not dc:
        dc = DailyCompletion(user_id=user_id, date=date_str, completion_percentage=pct)
        db.session.add(dc)
    else:
        dc.completion_percentage = pct
    db.session.commit()

# routes

@app.route("/")
def dashboard():
    if "user_id" not in session:
        return redirect(url_for("login"))

    progress = get_or_create_forest_progress(session["user_id"])
    today = datetime.now().strftime("%Y-%m-%d")
    last_decay_date = progress.last_decay_date

    # Apply daily decay once per day when opening dashboard if any task remains incomplete.
    if last_decay_date != today:
        has_incomplete = Task.query.filter_by(
            user_id=session["user_id"],
            completed=False
        ).first() is not None

        if has_incomplete:
            adjust_forest_points(-15)

        progress = get_or_create_forest_progress(session["user_id"])
        progress.last_decay_date = today
        db.session.commit()

    return render_template("dashboard.html")


@app.route("/forest")
def forest():
    if "user_id" not in session:
        return redirect(url_for("login"))
    return render_template("forest.html")


@app.route("/forest-data")
def forest_data():
    if "user_id" not in session:
        return jsonify({"stage": "seed"})

    progress = get_or_create_forest_progress(session["user_id"])
    points = progress.points
    stage = get_forest_stage(points)
    return jsonify({"stage": stage})


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        data = request.form
        username = data["username"]
        password = hashlib.sha256(data["password"].encode()).hexdigest()

        user = User.query.filter_by(username=username, password=password).first()

        if user:
            session["user_id"] = user.id
            return redirect(url_for("dashboard"))
        else:
            return "Invalid credentials"

    return render_template("login.html")


@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        data = request.form
        username = data["username"]
        password = hashlib.sha256(data["password"].encode()).hexdigest()

        # Prevent duplicate users
        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            return "Username already exists"

        new_user = User(username=username, password=password)
        db.session.add(new_user)
        db.session.commit()

        return redirect(url_for("login"))

    return render_template("register.html")


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


@app.route('/submit-feedback', methods=['POST'])
def submit_feedback():
    data = request.get_json(silent=True) or {}
    message = (data.get('message') or '').strip()

    if not message:
        return jsonify({'success': False, 'error': 'Feedback message cannot be empty.'}), 400
    if len(message) > 500:
        return jsonify({'success': False, 'error': 'Feedback must be under 500 characters.'}), 400

    feedback = Feedback(message=message)
    db.session.add(feedback)
    db.session.commit()

    return jsonify({'success': True, 'message': 'Thank you for your feedback!'}), 201


@app.route('/admin/feedbacks')
def admin_feedbacks():
    if 'user_id' not in session:
        return redirect(url_for('login'))

    feedbacks = Feedback.query.order_by(Feedback.created_at.desc()).all()
    return render_template('admin_feedbacks.html', feedbacks=feedbacks)


# task api s

@app.route("/tasks", methods=["GET"])
def get_tasks():
    if "user_id" not in session:
        return jsonify([])

    selected_date = request.args.get("date")

    if not selected_date:
        selected_date = datetime.now().strftime("%Y-%m-%d")

    tasks = Task.query.filter_by(
        user_id=session["user_id"],
        date=selected_date
    ).all()

    return jsonify([
        {
            "id": task.id,
            "title": task.title,
            "deadline": task.deadline,
            "completed": task.completed,
            "date": task.date,
            "priority": task.priority or "medium"
        }
        for task in tasks
    ])

@app.route("/tasks", methods=["POST"])
def add_task():

    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401

    data = request.json

    new_task = Task(
        title=data["title"],
        deadline=data.get("deadline"),
        completed=data.get("completed", False),
        date=data.get("date"),
        priority=data.get("priority", "medium"),
        user_id=session["user_id"]   # VERY IMPORTANT
    )

    db.session.add(new_task)
    db.session.commit()

    update_daily_completion_sync(session["user_id"], new_task.date)

    return jsonify({"message": "Task added"})


@app.route("/tasks/<int:id>", methods=["PUT"])
def update_task(id):
    task = db.session.get(Task, id)
    data = request.json

    if not task:
        return jsonify({"error": "Task not found"}), 404
    if task.user_id != session.get("user_id"):
        return jsonify({"error": "Unauthorized"}), 403

    was_completed = bool(task.completed)
    old_priority = (task.priority or "medium").lower()

    task.title = data.get("title", task.title)
    task.deadline = data.get("deadline", task.deadline)
    task.completed = data.get("completed", task.completed)
    task.priority = data.get("priority", task.priority)

    is_completed = bool(task.completed)
    new_priority = (task.priority or old_priority or "medium").lower()

    # Points are hidden from UI; only forest stage is exposed.
    if not was_completed and is_completed:
        if new_priority in ("high", "important"):
            adjust_forest_points(+20)
        else:
            adjust_forest_points(+10)
    elif was_completed and not is_completed:
        adjust_forest_points(-15)

    progress = get_or_create_forest_progress(session["user_id"])

    # Optional bonus: all tasks for the date are completed.
    if task.date:
        tasks_for_date = Task.query.filter_by(
            user_id=session["user_id"],
            date=task.date
        ).all()
        bonus_dates = parse_bonus_dates(progress.bonus_dates)
        if tasks_for_date and all(t.completed for t in tasks_for_date):
            if task.date not in bonus_dates:
                adjust_forest_points(+20)
                progress = get_or_create_forest_progress(session["user_id"])
                bonus_dates = parse_bonus_dates(progress.bonus_dates)
                bonus_dates.add(task.date)
                progress.bonus_dates = serialize_bonus_dates(bonus_dates)
                db.session.commit()
        else:
            # Allow earning the bonus later if tasks become complete again.
            if task.date in bonus_dates:
                bonus_dates.remove(task.date)
                progress.bonus_dates = serialize_bonus_dates(bonus_dates)
                db.session.commit()

    db.session.commit()
    update_daily_completion_sync(session["user_id"], task.date)
    return jsonify({
        "success": True,
        "new_stage": get_forest_stage(get_or_create_forest_progress(session["user_id"]).points)
    })


@app.route("/tasks/<int:id>", methods=["DELETE"])
def delete_task(id):
    task = db.session.get(Task, id)

    if task.user_id != session.get("user_id"):
        return jsonify({"error": "Unauthorized"}), 403

    task_date = task.date
    db.session.delete(task)
    db.session.commit()
    update_daily_completion_sync(session["user_id"], task_date)
    return jsonify({"message": "Task deleted"})


# document api s

@app.route("/get-docs", methods=["GET"])
def get_docs():
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    docs = Document.query.filter_by(user_id=session["user_id"]).order_by(Document.created_at.desc()).all()
    return jsonify([
        {
            "id": doc.id,
            "filename": doc.filename,
            "display_name": doc.display_name,
            "url": url_for("static", filename=f"docs/{doc.filename}")
        } for doc in docs
    ])

@app.route("/upload-doc", methods=["POST"])
def upload_doc():
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files['file']
    display_name = request.form.get('display_name', '').strip()

    if not file or file.filename == '':
        return jsonify({"error": "Empty file"}), 400

    if not file.filename.lower().endswith('.pdf'):
        return jsonify({"error": "Only PDF files are allowed"}), 400

    if not display_name:
        return jsonify({"error": "Display name is required"}), 400

    file_bytes = file.read(MAX_FILE_SIZE + 1)
    if len(file_bytes) > MAX_FILE_SIZE:
        return jsonify({"error": "File size exceeds 5MB limit"}), 400
    file.seek(0)

    user_docs_count = Document.query.filter_by(user_id=session["user_id"]).count()
    if user_docs_count >= MAX_DOCS_PER_USER:
        return jsonify({"error": f"You can only upload up to {MAX_DOCS_PER_USER} documents"}), 400

    import time
    import werkzeug.utils
    secure_name = werkzeug.utils.secure_filename(file.filename)
    unique_filename = f"{session['user_id']}_{int(time.time())}_{secure_name}"
    save_path = os.path.join(app.config["UPLOAD_FOLDER"], unique_filename)

    file.save(save_path)

    new_doc = Document(
        user_id=session["user_id"],
        filename=unique_filename,
        display_name=display_name
    )
    db.session.add(new_doc)
    db.session.commit()

    return jsonify({"success": True, "message": "Document uploaded successfully"}), 201

@app.route("/delete-doc/<int:id>", methods=["DELETE"])
def delete_doc(id):
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    doc = db.session.get(Document, id)
    if not doc or doc.user_id != session["user_id"]:
        return jsonify({"error": "Document not found or unauthorized"}), 404

    filepath = os.path.join(app.config["UPLOAD_FOLDER"], doc.filename)
    if os.path.exists(filepath):
        try:
            os.remove(filepath)
        except Exception as e:
            print("Error deleting file:", e)

    db.session.delete(doc)
    db.session.commit()
    return jsonify({"success": True, "message": "Document deleted"})

def is_academic_question(message):
    """Simple study filter: check if question contains study-related keywords."""
    if not message:
        return False

    lower = message.lower()
    
    # Comprehensive study-related keywords
    study_keywords = [
        # Programming & Computer Science
        "programming", "code", "coding", "computer", "algorithm", "algorithms",
        "data structure", "binary", "search", "sorting", "array", "list", "hash",
        "tree", "graph", "node", "pointer", "variables", "function", "class",
        "object", "inheritance", "polymorphism", "encapsulation",
        
        # Languages & Web
        "python", "java", "javascript", "c++", "c#", "ruby", "sql",
        "html", "css", "react", "angular", "framework", "database", "sql",
        "api", "rest", "json", "xml", "web", "server", "client",
        
        # Core CS Topics
        "operating system", "os", "network", "networking", "protocol",
        "encryption", "security", "machine learning", "ai", "artificial intelligence",
        "deep learning", "neural network", "compiler", "interpreter",
        
        # Math & Science
        "math", "mathematics", "algebra", "geometry", "calculus", "statistics",
        "probability", "trigonometry", "science", "physics", "chemistry",
        "biology", "geology", "astronomy",
        
        # General Education
        "exam", "test", "study", "homework", "assignment", "lecture",
        "course", "class", "education", "learn", "tutorial",
        
        # History & Social Sciences
        "history", "geography", "economics", "literature", "language",
        "grammar", "writing"
    ]
    
    # Return True if any study keyword is found in the message
    return any(keyword in lower for keyword in study_keywords)


@app.route("/api/ask-ai", methods=["POST"])
def ask_ai():
    """AI assistant route: process study questions using Gemini."""
    data = request.get_json(silent=True) or {}
    question = (data.get("question") or "").strip()

    if not question:
        return jsonify({"error": "question is required"}), 400

    if not is_academic_question(question):
        return jsonify({"reply": "I am designed to help only with study-related queries."})

    prompt = (
        "You are a strict study assistant. Give clear, concise, educational answers.\n"
        "Answer in a short study-friendly format with examples where appropriate.\n\n"
        f"Student question: {question}\n\n"
        "Answer:"
    )

    try:
        current_key = os.getenv("GEMINI_API_KEY")

        if not current_key:
            print("Gemini API key missing")
            return jsonify({"error": "AI service error: API key missing"}), 500

        # ✅ Use local client (no scope issues)
        # local_client = genai.Client(api_key=current_key)

        # reply = generate_gemini_text(local_client, prompt)

        reply = generate_gemini_text(prompt)

        if not reply:
            print("Gemini API returned empty text response")
            return jsonify({"reply": "Unable to generate a response. Please try again."})

        return jsonify({"reply": reply})

    except Exception as e:
        err_text = str(e)
        print("Gemini API error:", err_text)

        # ✅ Better error detection
        if any(x in err_text for x in [
            "API_KEY_INVALID",
            "INVALID_ARGUMENT",
            "API key expired",
            "API key not valid"
        ]):
            return jsonify({
                "error": "AI service error: API key invalid or expired. Please update it."
            }), 401

        return jsonify({
            "error": "AI service error: Unable to process request."
        }), 500
    


@app.route("/get_suggestion", methods=["POST"])
def get_suggestion():
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.json or {}
    energy_level = data.get("energy_level", "medium")
    extra_tasks = data.get("extra_tasks", [])

    # Filter out empty or generic default tasks like "New Task"
    invalid_names = {"", "new task", "untitled task", "untitled", "task"}
    
    db_tasks = Task.query.filter_by(user_id=session["user_id"], completed=False).all()
    valid_db_tasks = [t.title.strip() for t in db_tasks if t.title and t.title.strip().lower() not in invalid_names]
    
    valid_extra_tasks = [t.strip() for t in extra_tasks if t and t.strip().lower() not in invalid_names]
    
    all_tasks = valid_db_tasks + valid_extra_tasks

    if not all_tasks:
        return jsonify({
            "best_task": "No tasks!",
            "reason": "You have no pending tasks. Take a break!",
            "ordered_tasks": []
        })

    # Get Time of Day
    hour = datetime.now().hour
    if 5 <= hour < 12:
        time_of_day = "Morning"
    elif 12 <= hour < 17:
        time_of_day = "Afternoon"
    elif 17 <= hour < 22:
        time_of_day = "Evening"
    else:
        time_of_day = "Night"

    # Contextual priority
    task_hints = []
    for t in all_tasks:
        t_lower = t.lower()
        hint = "normal priority"
        if any(kw in t_lower for kw in ["assignment", "project", "exam"]):
            hint = "high priority"
        elif any(kw in t_lower for kw in ["revision", "notes"]):
            hint = "medium priority"
        elif any(kw in t_lower for kw in ["reading", "watch"]):
            hint = "low priority"
        task_hints.append(f"- {t} ({hint})")

    tasks_string = "\n".join(task_hints)

    prompt = f"""You are a productivity expert AI.

User details:
- Energy Level: {energy_level}
- Time of Day: {time_of_day}

Tasks:
{tasks_string}

Instructions:
1. Suggest the BEST task to do first from the list provided.
2. Reorder all tasks for optimal productivity.
3. Consider:
   - High energy → difficult tasks
   - Low energy → easy/light tasks
   - Time of day relevance
   - Priorities given in the tasks hints
4. Give a short explanation.
5. Return ONLY a pure JSON object in the exact format shown below, with no markdown formatting or backticks:
{{
    "best_task": "task name",
    "reason": "explanation",
    "ordered_tasks": ["task1", "task2", "task3"]
}}
"""
    try:
        reply = generate_gemini_text(prompt)
        import json
        import re
        
        reply_clean = reply.strip()
        match = re.search(r'```(?:json)?\s*(.*?)\s*```', reply_clean, re.DOTALL)
        if match:
            reply_clean = match.group(1).strip()
            
        parsed = json.loads(reply_clean)
        return jsonify(parsed)
    except Exception as e:
        print("Suggestion AI Error:", e)
        return jsonify({
            "best_task": all_tasks[0] if all_tasks else "",
            "reason": "Could not fetch AI suggestion. Start with your first task.",
            "ordered_tasks": all_tasks
        }), 200

@app.route("/api/motivation-quote", methods=["POST"])
def motivation_quote():
    """
    Motivational quotes endpoint (DISABLED GEMINI).
    Returns a static quote as a safeguard.
    """
    # Gemini API is no longer used for quotes to save on quota.
    # Frontend now handles quotes locally from a list.
    return jsonify({"quote": "Discipline beats motivation.", "fallback": True}), 200


@app.route("/get_analytics", methods=["GET"])
def get_analytics():
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    user_id = session["user_id"]
    from datetime import datetime, timedelta
    
    today = datetime.now()
    dates = [(today - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(6, -1, -1)]
    
    graph_data = []
    
    skipped_tasks_freq = {}
    time_productivity = {"Morning": 0, "Afternoon": 0, "Evening": 0, "Night": 0}
    task_type_freq = {} 
    
    recent_tasks = Task.query.filter(Task.user_id == user_id, Task.date.in_(dates)).all()
    
    tasks_by_date = {d: [] for d in dates}
    for t in recent_tasks:
        tasks_by_date[t.date].append(t)
        
    total_completed = 0
    total_tasks_all = len(recent_tasks)
    
    for date in dates:
        day_tasks = tasks_by_date[date]
        total = len(day_tasks)
        completed = sum(1 for t in day_tasks if t.completed)
        total_completed += completed
        
        dc = DailyCompletion.query.filter_by(user_id=user_id, date=date).first()
        if dc:
            comp_pct = dc.completion_percentage
        else:
            comp_pct = (completed / total * 100) if total > 0 else 0
            
        graph_data.append({"date": date, "completion": round(comp_pct, 2)})
        
        for t in day_tasks:
            created_hour = t.created_at.hour if t.created_at else 12
            if 5 <= created_hour < 12: bucket = "Morning"
            elif 12 <= created_hour < 17: bucket = "Afternoon"
            elif 17 <= created_hour < 22: bucket = "Evening"
            else: bucket = "Night"
            
            t_lower = t.title.lower() if t.title else ""
            if any(kw in t_lower for kw in ["assignment", "hw", "homework", "project", "task"]): t_type = "Assignments"
            elif any(kw in t_lower for kw in ["revision", "revise", "read", "notes", "study"]): t_type = "Revision"
            elif any(kw in t_lower for kw in ["exam", "test", "quiz"]): t_type = "Exams"
            else: t_type = "General"
            
            if not t.completed:
                if t.title:
                    skipped_tasks_freq[t.title] = skipped_tasks_freq.get(t.title, 0) + 1
                task_type_freq[t_type] = task_type_freq.get(t_type, 0) + 1
            else:
                time_productivity[bucket] += 1
                
    sorted_skipped = sorted(skipped_tasks_freq.items(), key=lambda x: x[1], reverse=True)
    top_skipped = [k for k, v in sorted_skipped[:3]] if sorted_skipped else []
    
    sorted_ignored_types = sorted(task_type_freq.items(), key=lambda x: x[1], reverse=True)
    most_ignored_type = sorted_ignored_types[0][0] if sorted_ignored_types else "None"
    
    best_time_tuple = max(time_productivity.items(), key=lambda x: x[1])
    most_productive_time = best_time_tuple[0] if best_time_tuple[1] > 0 else "N/A"
    
    overall_avg = sum(d["completion"] for d in graph_data) / len(graph_data) if graph_data else 0
    if overall_avg >= 80: badge = "Elite"
    elif overall_avg >= 60: badge = "Consistent"
    elif overall_avg >= 40: badge = "Improving"
    else: badge = "Needs Focus"
    
    if len(graph_data) >= 2:
        try:
            recent = graph_data[-1]["completion"] + graph_data[-2]["completion"]
            older = graph_data[0]["completion"] + graph_data[1]["completion"]
            if recent > older + 10: trend = "Improving"
            elif recent < older - 10: trend = "Declining"
            else: trend = "Fluctuating"
        except:
             trend = "Fluctuating"
    else:
        trend = "Stable"
    
    prompt = f"""You are a productivity analyst AI.
User study data (last 7 days completion %, in order): {graph_data}
Frequently skipped tasks: {top_skipped}
Time productivity patterns (completed tasks by time): {time_productivity}

Your job:
1. Analyze behavior patterns
2. Identify weaknesses
3. Detect: procrastination trends, low productivity times, consistency issues
4. Suggest improvements

Return strictly a JSON object:
{{
  "insights": "Short paragraph analyzing behavior...",
  "weaknesses": ["weakness 1", "weakness 2"],
  "suggestions": ["suggestion 1", "suggestion 2"],
  "best_study_time": "{most_productive_time}",
  "consistency_score": "{round(overall_avg)}/100"
}}"""

    import json
    import re
    
    today_str = today.strftime("%Y-%m-%d")
    cache = AnalyticsCache.query.filter_by(user_id=user_id).first()
    
    # Use cache if updated today AND we have some data
    if cache and cache.last_updated == today_str and total_tasks_all > 0:
        try:
            ai_analysis = json.loads(cache.cached_insights)
        except:
            ai_analysis = None
    else:
        ai_analysis = None

    if not ai_analysis:
        try:
            if total_tasks_all == 0:
                 raise ValueError("No task data")
            reply = generate_gemini_text(prompt)
            
            if not reply:
                 raise ValueError("Empty response from Gemini API")
                 
            reply_clean = reply.strip()
            match = re.search(r'```(?:json)?\s*(.*?)\s*```', reply_clean, re.DOTALL)
            if match:
                 reply_clean = match.group(1).strip()
            ai_analysis = json.loads(reply_clean)
            
            # Update cache
            if not cache:
                cache = AnalyticsCache(user_id=user_id, last_updated=today_str, cached_insights=json.dumps(ai_analysis))
                db.session.add(cache)
            else:
                cache.last_updated = today_str
                cache.cached_insights = json.dumps(ai_analysis)
            db.session.commit()
            
        except Exception as e:
            print("Analytics Gemini Error:", e)
            extra_info = "Not enough data yet. Start completing tasks!" if total_tasks_all == 0 else "Daily AI analysis quota reached or API error. Try again tomorrow."
            ai_analysis = {
                "insights": extra_info,
                "weaknesses": ["Analysis temporarily unavailable"],
                "suggestions": ["Keep logging tasks regularly."],
                "best_study_time": most_productive_time,
                "consistency_score": f"{round(overall_avg)}/100"
            }
        
    return jsonify({
        "graph_data": graph_data,
        "ai_analysis": ai_analysis,
        "extra_analytics": {
            "productivity_trend": trend,
            "most_productive_time_block": most_productive_time,
            "most_ignored_task_type": most_ignored_type,
            "completion_consistency_indicator": round(overall_avg),
            "weekly_score_badge": badge
        },
        "total_tasks_all": total_tasks_all
    })


with app.app_context():
    db.create_all()
    
if __name__ == "__main__":
    app.run(debug=True)