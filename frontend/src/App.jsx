import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
} from 'chart.js';
import { Activity, Search, Server, Zap, ChevronRight } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip);

const API_BASE = 'https://devinsight-backend.onrender.com';

// ---------------------------------------------------------------------------
// Error Analyzer Component
// ---------------------------------------------------------------------------
function ErrorAnalyzer() {
  const [errorText, setErrorText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorObj, setErrorObj] = useState(null);

  const analyzeError = async () => {
    if (!errorText.trim()) return;
    setLoading(true);
    setErrorObj(null);
    try {
      const res = await axios.post(`${API_BASE}/analyze-error`, { error_text: errorText });
      setResult(res.data);
    } catch (err) {
      setErrorObj(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card tab-panel slide-up">
      <h2>Error Analyzer</h2>
      <p className="card-desc">Paste a Python error message and get a human-readable explanation with suggested fixes.</p>
      
      <div className="input-group">
        <label>Error Message</label>
        <textarea 
          rows="4" 
          placeholder="e.g. KeyError: 'username'"
          value={errorText}
          onChange={(e) => setErrorText(e.target.value)}
        />
      </div>

      <button className="primary-btn" onClick={analyzeError} disabled={loading}>
        {loading ? <span className="spinner"></span> : 'Analyze Error'}
      </button>

      {errorObj && (
        <div className="result-box">
          <div className="result-title err">Request Failed</div>
          <div className="result-explanation">{errorObj}</div>
        </div>
      )}

      {result && (
        <div className="result-box mt-4">
          <div className="result-title">{result.title || 'Result'}</div>
          <div className="result-explanation">{result.explanation}</div>
          {result.fixes && result.fixes.length > 0 && (
            <ul className="result-fixes">
              {result.fixes.map((fix, idx) => (
                <li key={idx}><span className="fix-icon"><ChevronRight size={14}/></span> {fix}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// API Tester Component
// ---------------------------------------------------------------------------
function ApiTester() {
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState('GET');
  const [body, setBody] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorObj, setErrorObj] = useState(null);

  const testApi = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setErrorObj(null);
    setResult(null);

    const payload = { url, method };
    if (method === 'POST' && body.trim()) {
      try {
        payload.body = JSON.parse(body.trim());
      } catch {
        // Just send as is, or ignore
      }
    }

    try {
      const res = await axios.post(`${API_BASE}/test-api`, payload);
      setResult(res.data);
    } catch (err) {
      setErrorObj(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card tab-panel slide-up">
      <h2>API Tester</h2>
      <p className="card-desc">Send a GET or POST request to any endpoint and inspect the response.</p>
      
      <div className="input-row flex gap-4">
        <div className="input-group method-group flex-shrink-0 w-32">
          <label>Method</label>
          <select value={method} onChange={e => setMethod(e.target.value)}>
            <option>GET</option>
            <option>POST</option>
          </select>
        </div>
        <div className="input-group url-group flex-1">
          <label>URL</label>
          <input 
            type="text" 
            placeholder="https://api.example.com/data"
            value={url}
            onChange={e => setUrl(e.target.value)}
          />
        </div>
      </div>

      {method === 'POST' && (
        <div className="input-group">
          <label>Request Body (JSON)</label>
          <textarea 
            rows="3" 
            placeholder='{"key": "value"}'
            value={body}
            onChange={e => setBody(e.target.value)}
          />
        </div>
      )}

      <button className="primary-btn" onClick={testApi} disabled={loading}>
        {loading ? <span className="spinner"></span> : 'Send Request'}
      </button>

      {errorObj && (
        <div className="result-box mt-4">
          <div className="api-meta">
            <span className="meta-chip error">Failed</span>
          </div>
          <div className="api-preview">{errorObj}</div>
        </div>
      )}

      {result && (
        <div className="result-box mt-4">
          <div className="api-meta flex gap-3 mb-3">
            <span className={`meta-chip ${result.status_code >= 200 && result.status_code < 300 ? 'success' : result.status_code >= 400 ? 'error' : 'success'}`}>
              Status: {result.status_code || 'N/A'}
            </span>
            <span className="meta-chip time">Time: {result.response_time}s</span>
            <span className="meta-chip">{result.method}</span>
          </div>
          <div className="api-preview">
            {result.error 
              ? result.error 
              : typeof result.preview === 'object' 
                ? JSON.stringify(result.preview, null, 2) 
                : String(result.preview)}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Analytics Component
// ---------------------------------------------------------------------------
function Analytics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_BASE}/stats`)
      .then(res => setStats(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center p-8 text-secondary"><span className="spinner border-accent"></span> Loading analytics...</div>;
  if (!stats) return <div className="text-center p-8 text-red">Failed to load analytics</div>;

  const responseTimeData = {
    labels: (stats.response_time_series || []).map((_, i) => `#${i + 1}`),
    datasets: [{
      label: 'Response Time (s)',
      data: (stats.response_time_series || []).map(s => s.response_time),
      borderColor: '#6c63ff',
      backgroundColor: 'rgba(108,99,255,0.1)',
      tension: 0.3,
      fill: true,
      pointRadius: 3,
      pointBackgroundColor: '#6c63ff',
    }]
  };

  const statusColors = (stats.status_code_distribution || []).map(d => {
    const code = d.status_code;
    if (code >= 200 && code < 300) return '#34d399';
    if (code >= 300 && code < 400) return '#60a5fa';
    if (code >= 400 && code < 500) return '#fbbf24';
    return '#f87171';
  });

  const statusCodeData = {
    labels: (stats.status_code_distribution || []).map(d => `${d.status_code}`),
    datasets: [{
      data: (stats.status_code_distribution || []).map(d => d.count),
      backgroundColor: statusColors,
      borderWidth: 0,
    }]
  };

  return (
    <div className="tab-panel slide-up">
      <div className="stats-grid grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <div className="stat-card card text-center">
          <span className="stat-value">{stats.total_api_requests}</span>
          <span className="stat-label">Total API Requests</span>
        </div>
        <div className="stat-card card text-center">
          <span className="stat-value">{stats.average_response_time}s</span>
          <span className="stat-label">Avg Response Time</span>
        </div>
        <div className="stat-card card text-center">
          <span className="stat-value">{stats.total_error_queries}</span>
          <span className="stat-label">Error Queries</span>
        </div>
      </div>

      <div className="charts-grid grid grid-cols-1 md:grid-cols-2 gap-4 mb-5 flex">
        <div className="card chart-card flex-1 h-64">
          <h3>Response Times</h3>
          <div className="h-48">
            <Line 
              data={responseTimeData} 
              options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: '#2e3240'} }, y: { beginAtZero: true, grid: { color: '#2e3240'} } } }} 
            />
          </div>
        </div>
        <div className="card chart-card flex-1 h-64">
          <h3>Status Code Distribution</h3>
          <div className="h-48 flex justify-center">
            {stats.status_code_distribution?.length > 0 ? (
              <Doughnut data={statusCodeData} options={{ maintainAspectRatio: false }} />
            ) : (
              <div className="flex items-center text-muted">No data available</div>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Recent Activity</h3>
        <div className="overflow-x-auto">
          {(!stats.recent_api_logs?.length && !stats.recent_error_logs?.length) ? (
            <p className="placeholder-text">No activity yet. Analyze errors or test APIs to see data here.</p>
          ) : (
            <table className="activity-table w-full text-left">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Detail</th>
                  <th>Status</th>
                  <th>Time</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {(stats.recent_api_logs || []).slice(0, 5).map(log => (
                  <tr key={`api-${log.id}`}>
                    <td>🚀 API Test</td>
                    <td className="truncate max-w-xs">{log.url}</td>
                    <td>
                      <span className={`status-badge ${log.status_code >= 200 && log.status_code < 300 ? 'ok' : log.status_code >= 400 ? 'err' : 'warn'}`}>
                        {log.status_code}
                      </span>
                    </td>
                    <td>{log.response_time}s</td>
                    <td>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  </tr>
                ))}
                {(stats.recent_error_logs || []).slice(0, 5).map(log => (
                  <tr key={`err-${log.id}`}>
                    <td>🔍 Error</td>
                    <td className="truncate max-w-xs">{log.error_text}</td>
                    <td><span className="status-badge err">—</span></td>
                    <td>—</td>
                    <td>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main App Component
// ---------------------------------------------------------------------------
export default function App() {
  const [tab, setTab] = useState('error-analyzer');

  return (
    <div className="min-h-screen flex flex-col items-center w-full">
      <header id="app-header" className="w-full">
        <div className="header-inner flex flex-col items-center">
          <div className="logo flex items-center justify-center gap-2 mb-1">
            <Zap className="text-accent" size={28} />
            <h1 className="text-2xl font-bold tracking-tight">DevInsight</h1>
          </div>
          <p className="tagline">Analyze errors · Test APIs · Track performance</p>
        </div>
      </header>

      <nav id="main-nav" className="w-full flex justify-center mt-5 mb-0 px-4">
        <button 
          className={`nav-btn ${tab === 'error-analyzer' ? 'active' : ''}`}
          onClick={() => setTab('error-analyzer')}
        >
          <Search size={16} className="nav-icon inline-block relative -top-0.5 mr-1.5"/> Error Analyzer
        </button>
        <button 
          className={`nav-btn ${tab === 'api-tester' ? 'active' : ''}`}
          onClick={() => setTab('api-tester')}
        >
          <Server size={16} className="nav-icon inline-block relative -top-0.5 mr-1.5"/> API Tester
        </button>
        <button 
          className={`nav-btn ${tab === 'analytics' ? 'active' : ''}`}
          onClick={() => setTab('analytics')}
        >
          <Activity size={16} className="nav-icon inline-block relative -top-0.5 mr-1.5"/> Analytics
        </button>
      </nav>

      <main id="app-main" className="flex-1 w-full max-w-4xl px-4 py-8 relative">
        {tab === 'error-analyzer' && <ErrorAnalyzer />}
        {tab === 'api-tester' && <ApiTester />}
        {tab === 'analytics' && <Analytics />}
      </main>

      <footer id="app-footer" className="w-full">
        <p>DevInsight &copy; 2026 — Built with FastAPI & React</p>
      </footer>
    </div>
  );
}
