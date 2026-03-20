# DevInsight
🚀 **Live Deployment:** [https://dev-insight-umber.vercel.app/](https://dev-insight-umber.vercel.app/)

DevInsight is a developer tool to test API endpoints and view performance analytics.

## Features

- **🚀 API Tester**: Send HTTP requests from the UI to test endpoints and preview responses.
- **📊 Analytics Dashboard**: Visualize API response times and status code distribution.

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

- `POST /test-api`: Tests a given URL and method.
- `GET /stats`: Aggregates usage data.
- `GET /logs/api`: Retrieves all historical API logs.
