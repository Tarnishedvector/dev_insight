# DevInsight

DevInsight is a full-stack developer tool designed to help developers analyze Python errors, test API endpoints, and view performance analytics.

## Features

- **🔍 Error Analyzer**: Paste a typical Python error message and get a human-readable explanation along with suggested fixes.
- **🚀 API Tester**: Send `GET` and `POST` requests directly from the UI, examine status codes, response times, and preview the JSON/text response.
- **📊 Analytics Dashboard**: Visualize response times, status code distribution, and view recent activity via an auto-updating SQLite database.

## Architecture

1. **Backend**: Built with **FastAPI** (`backend/main.py`) which exposes 5 core endpoints. It uses a lightweight `SQLite` database (`database.py`) to persist logs, and custom services for rule-based error matching (`services.py`).
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
