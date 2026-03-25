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
GEMINI_MODEL = "gemini-2.0-flash"

# Secret key for sessions
app.config["SECRET_KEY"] = "supersecretkey"

# Database configuration
base_dir = os.path.abspath(os.path.dirname(__file__))
db_path = os.path.join(base_dir, "planner.db")
app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{db_path}"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)


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


# routes

@app.route("/")
def dashboard():
    if "user_id" not in session:
        return redirect(url_for("login"))
    return render_template("dashboard.html")


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

    if task.user_id != session.get("user_id"):
        return jsonify({"error": "Unauthorized"}), 403

    task.title = data.get("title", task.title)
    task.deadline = data.get("deadline", task.deadline)
    task.completed = data.get("completed", task.completed)
    task.priority = data.get("priority", task.priority)

    db.session.commit()
    return jsonify({"message": "Task updated"})


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
def ask_ai():
    """AI assistant route: process study questions using Gemini."""
    data = request.json or {}
    question = data.get("question", "").strip()

    # Validate input
    if not question:
        return jsonify({"error": "Question is required"}), 400

    # Apply study filter - reject non-academic questions
    if not is_academic_question(question):
        return jsonify({"reply": "I am designed to help only with study-related queries."})

    # Build prompt for Gemini
    prompt = f"You are a strict study assistant. Give clear, concise, educational answers.\n\nQuestion: {question}"

    try:
        # Call Gemini API with latest google-genai SDK
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt
        )

        # Extract and validate response text
        reply = response.text.strip() if response.text else ""

        if not reply:
            return jsonify({"reply": "Unable to generate a response. Please try again."})

        return jsonify({"reply": reply})

    except Exception as e:
        # Log error for debugging
        print(f"Gemini API error: {str(e)}")
        return jsonify({"error": "AI service error: Unable to process request"}), 500


if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True)