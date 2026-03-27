## 🚀 Gemini AI Assistant Setup Guide

### 📋 Current Status
✅ **Code Implementation**: Complete and working  
✅ **Study Filter**: Functional (blocks non-academic questions)  
❌ **API Key**: Invalid or expired (needs replacement)

---

### 🔑 Getting a Valid Gemini API Key

#### **Step 1: Go to Google AI Studio**
1. Visit [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Click **"Create API key"** or **"Get API key"**
3. Select your Google project (or create a new one)

#### **Step 2: Enable Generative Language API**
If you get an error about the API not being enabled:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Search for **"Generative Language API"**
3. Click **"Enable"**

#### **Step 3: Copy Your API Key**
- Copy the generated API key from [aistudio.google.com](https://aistudio.google.com/app/apikey)
- Keep it secure (don't commit to git)

#### **Step 4: Update .env File**
Edit `.env` in the project root:

```
GEMINI_API_KEY=your_api_key_here
```

Replace `your_api_key_here` with your actual API key.

---

### 🧪 Testing the Setup

#### **Test 1: Verify the App Starts**
```bash
python app.py
```
Should start without errors on `http://127.0.0.1:5000`

#### **Test 2: Test Study Filter (should be blocked)**
```bash
curl -X POST http://127.0.0.1:5000/api/ask-ai \
  -H "Content-Type: application/json" \
  -d '{"question":"Tell me a joke"}'
```

**Expected Response:**
```json
{"reply":"I am designed to help only with study-related queries."}
```

#### **Test 3: Test Study Question (should work)**
```bash
curl -X POST http://127.0.0.1:5000/api/ask-ai \
  -H "Content-Type: application/json" \
  -d '{"question":"Explain binary search algorithm"}'
```

**Expected Response:**
```json
{"reply":"Binary search is an efficient algorithm..."}
```

---

### 📚 Study Keywords Recognized

The AI assistant accepts questions containing these keywords:

```
programming  |  code       |  computer     |  algorithm
math         |  science    |  exam         |  study
database     |  os         |  network      |  python
java         |  javascript |  data structure | web
html         |  css        |  sql          |  chemistry
physics      |  biology    |  history      |  geography
```

---

### ⚙️ Configuration Details

| Setting | Value | Purpose |
|---------|-------|---------|
| **SDK Package** | `google-genai` | Latest Google Gemini SDK |
| **Model** | `gemini-2.0-flash` | Fast, efficient model for study queries |
| **Route** | `/api/ask-ai` | AI endpoint for frontend |
| **Method** | `POST` | Receives study questions |
| **Input** | `{"question":"..."}` | JSON payload format |
| **Output** | `{"reply":"..."}` | JSON response with AI answer |

---

### 🐛 Troubleshooting

**Error: "GEMINI_API_KEY not set in environment"**
→ Add to `.env` file and restart

**Error: "API Key not found. Please pass a valid API key"**
→ API key is invalid/expired → Get a new one from [aistudio.google.com](https://aistudio.google.com/app/apikey)

**Error: "AI service error: Unable to process request"**
→ Check:
1. .env file has a valid GEMINI_API_KEY
2. Generative Language API is enabled in Google Cloud
3. Internet connection is active

---

### 📦 Dependencies

```
google-genai>=1.68.0    # Latest Gemini SDK
flask                   # Web framework
flask-cors              # Enable CORS
python-dotenv           # Load environment variables
```

Install with:
```bash
pip install google-genai flask flask-cors python-dotenv
```

---

### 🌐 Frontend Integration

The frontend (`static/js/ai.js`) is already configured to call the endpoint:

```javascript
fetch("/api/ask-ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: message })
})
```

**No frontend changes needed!**

---

### ✨ Features

✅ **Study Filter**: Only answers academic questions  
✅ **Gemini 2.0 Flash**: Fast, accurate responses  
✅ **Clean Error Handling**: User-friendly messages  
✅ **No API Key Hardcoding**: Secure via .env  
✅ **CORS Enabled**: Works with frontend

---

### 📝 Sample Questions

**✓ Accepted (Study Topics)**
- "Explain binary search"
- "What is Python?"
- "How do algorithms work?"
- "Database design best practices"

**✗ Rejected (Non-Academic)**
- "Tell me a joke"
- "What's the weather?"
- "Cook a pizza recipe"
- "Who is your favorite celebrity?"

---

### 🔗 Resources

- [Google AI Studio](https://aistudio.google.com/app/apikey) - Get API key
- [Gemini API Docs](https://ai.google.dev/tutorials) - Documentation
- [google-genai PyPI](https://pypi.org/project/google-genai/) - Package info

---

**Last Updated**: March 2026  
**Status**: Ready for deployment (pending valid API key)
