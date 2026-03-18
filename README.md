# DevInsight
🚀 **Live Deployment:** [https://dev-insight-umber.vercel.app/](https://dev-insight-umber.vercel.app/)

DevInsight is a comprehensive full-stack platform designed to help developers analyze stack traces dynamically with AI, test API endpoints, instantly launch Artificial Backend Mock environments, and view performance analytics.

## Features

- **🤖 AI Error Analyzer**: Paste a Python trace or error message and get a human-readable explanation along with instantly generated code fixes. This is powered by **Groq**, enabling lightning-fast LLM inference so developers don't have to wait for insights.
- **🚀 API Tester**: Send HTTP requests directly from the UI, examine status codes, response times, headers, and preview the JSON response body.
- **☁️ Artificial Backend Builder / SDK**: Dynamically define your own remote API endpoints with custom payloads and delays. Then, use our **Network Interceptor SDK**—a 1-line `<script>` tag you drop into your frontend code—to automatically hijack your browser's native `fetch()` calls and secretly reroute them to the Sandbox without changing your codebase!
- **📊 Analytics Dashboard**: Visualize response times, status code distribution, and track system health via an auto-updating remote PostgreSQL database.

## Architecture

1. **Backend**: Built with **FastAPI** (`backend/main.py`). It uses a remote **Neon PostgreSQL** database (`database.py`) to persist logs, simulate custom endpoints, and safely isolate workspaces by User ID.
2. **Frontend**: A modern **React** application built via Vite (`frontend/`). It connects to the FastAPI backend, fetches data via Axios, and charts analytics using `Chart.js`.

---

## Getting Started

### Prerequisites
- Python 3.9+
- Node.js & npm

### 1. Start the Backend

```bash
# Navigate to the project root
cd devinsight

# Install backend dependencies
pip install -r requirements.txt

# Start the FastAPI server
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```
*The backend will be available at `http://127.0.0.1:8000`*

### 2. Start the Frontend

```bash
# Open a new terminal and navigate to the frontend directory
cd devinsight/frontend

# Install frontend dependencies
npm install

# Start the Vite development server
npm run dev
```
*The React UI will be available at `http://localhost:5173`*

---

## API Endpoints

- `POST /analyze-error`: Analyzes an error string.
- `POST /test-api`: Tests a given URL and method.
- `GET /stats`: Aggregates usage data.
- `GET /logs/api`: Retrieves all historical API logs.
- `GET /logs/errors`: Retrieves all historical error logs.
