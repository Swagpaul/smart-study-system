from flask import Flask, render_template, request, jsonify, redirect, url_for, session
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime
import hashlib
import os
from dotenv import load_dotenv
from google import genai

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
try:
    client = genai.Client(api_key=GEMINI_API_KEY)
except Exception as e:
    print(f"Warning: Failed to initialize Gemini client: {e}")
    print("AI features will not work until API key is valid")

# Model configuration - using latest Gemini 2.0 Flash model
GEMINI_MODEL = "gemini-3-flash-preview"

# Secret key for sessions
app.config["SECRET_KEY"] = "supersecretkey"

# Database configuration
base_dir = os.path.abspath(os.path.dirname(__file__))
db_path = os.path.join(base_dir, "planner.db")
app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{db_path}"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

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


def generate_gemini_text(local_client, prompt):
    """
    Compatibility wrapper for Gemini SDK variants:
    - client.responses.create(...)
    - client.models.generate_content(...)
    """
    if hasattr(local_client, "responses"):
        response = local_client.responses.create(model=GEMINI_MODEL, input=prompt)
        return extract_gemini_text(response)

    if hasattr(local_client, "models"):
        response = local_client.models.generate_content(model=GEMINI_MODEL, contents=prompt)
        return extract_gemini_text(response)

    raise RuntimeError("Unsupported Gemini SDK: neither responses nor models API available")


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

    return jsonify({"message": "Task added"})


@app.route("/tasks/<int:id>", methods=["PUT"])
def update_task(id):
    task = Task.query.get(id)
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
    return jsonify({
        "success": True,
        "new_stage": get_forest_stage(get_or_create_forest_progress(session["user_id"]).points)
    })


@app.route("/tasks/<int:id>", methods=["DELETE"])
def delete_task(id):
    task = Task.query.get(id)

    if task.user_id != session.get("user_id"):
        return jsonify({"error": "Unauthorized"}), 403

    db.session.delete(task)
    db.session.commit()
    return jsonify({"message": "Task deleted"})

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
        local_client = genai.Client(api_key=current_key)

        reply = generate_gemini_text(local_client, prompt)

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
    


@app.route("/api/motivation-quote", methods=["POST"])
def motivation_quote():
    """
    Motivational quotes endpoint.
    Returns JSON: { "quote": "..." }
    On any failure, returns a safe fallback quote (no hard error to the frontend).
    """
    data = request.get_json(silent=True) or {}
    screen = (data.get("screen") or "").strip().lower()

    fallback_quote = "Stay consistent. You're building something great."

    # Map UI screen IDs to prompt-friendly descriptions.
    # (The frontend caches per-screen, but the AI prompt uses these descriptions.)
    screen_name_map = {
        "dashboard": "general motivation",
        "calendar": "planning and discipline",
        "timer": "focus and deep work",
        "tasks": "productivity and execution",
        "history": "productivity and execution",
        "ai": "general motivation",
        "analytics": "productivity and execution",
    }

    screen_name = screen_name_map.get(screen, screen_name_map["dashboard"])

    prompt = (
        "Give me a short motivational quote for a student working on "
        f"{screen_name}.\n"
        "Keep it under 15 words. Make it powerful and unique.\n\n"
        "Return only the quote text, with no surrounding quotes or extra commentary."
    )

    try:
        current_key = os.getenv("GEMINI_API_KEY")
        if not current_key:
            return jsonify({"quote": fallback_quote, "fallback": True}), 200

        local_client = genai.Client(api_key=current_key)
        quote = generate_gemini_text(local_client, prompt).strip().strip('"').strip("'")

        if not quote:
            return jsonify({"quote": fallback_quote, "fallback": True}), 200

        # Enforce the "under 15 words" requirement defensively.
        words = quote.split()
        if len(words) > 15:
            quote = " ".join(words[:15]).strip()
            # Keep punctuation natural if truncation cut mid-sentence.
            if quote and quote[-1] not in ".!?":
                quote = quote + "."

        return jsonify({"quote": quote, "fallback": False}), 200

    except Exception as e:
        # Never crash the page due to AI issues.
        print("Gemini quote error:", str(e))
        return jsonify({"quote": fallback_quote, "fallback": True}), 200


if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True)