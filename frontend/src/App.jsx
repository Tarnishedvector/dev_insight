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
import { Activity, Search, Server, Zap, ChevronRight, Moon, Sun } from 'lucide-react';

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
          {result.example && (
            <div className="mt-3 bg-darker p-3 rounded text-sm mt-3 overflow-x-auto">
              <strong className="text-secondary block mb-1">Example Fix:</strong>
              <pre className="text-emerald-400 font-mono">
                <code>{result.example}</code>
              </pre>
            </div>
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
  const [headers, setHeaders] = useState('');
  const [body, setBody] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorObj, setErrorObj] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = () => {
    axios.get(`${API_BASE}/logs/api`)
      .then(res => setHistory((res.data.logs || []).slice(0, 15)))
      .catch(console.error);
  };

  const loadFromHistory = (log) => {
    setUrl(log.url);
    setMethod(log.method);
    setHeaders('');
    setBody('');
  };

  const testApi = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setErrorObj(null);
    setResult(null);

    const payload = { url, method };
    
    if (headers.trim()) {
      try {
        payload.headers = JSON.parse(headers.trim());
      } catch (e) {
        setErrorObj("Invalid JSON in headers.");
        setLoading(false);
        return;
      }
    }

    if (method === 'POST' || method === 'PUT') {
      if (body.trim()) {
        try {
          payload.body = JSON.parse(body.trim());
        } catch {
          // Send as is if not valid JSON
        }
      }
    }

    try {
      const res = await axios.post(`${API_BASE}/test-api`, payload);
      setResult(res.data);
      fetchHistory(); // Refresh history
    } catch (err) {
      setErrorObj(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 slide-up w-full">
      <div className="card flex-1">
        <h2>API Tester</h2>
        <p className="card-desc">Send a request to any endpoint with custom headers & body.</p>
        
        <div className="input-row flex gap-4 mb-4">
          <div className="input-group method-group flex-shrink-0 w-32">
            <label>Method</label>
            <select value={method} onChange={e => setMethod(e.target.value)}>
              <option>GET</option>
              <option>POST</option>
              <option>PUT</option>
              <option>DELETE</option>
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

        <div className="input-group mb-4">
          <label>Headers (JSON)</label>
          <textarea 
            rows="2" 
            placeholder='{"Authorization": "Bearer token", "Content-Type": "application/json"}'
            value={headers}
            onChange={e => setHeaders(e.target.value)}
            className="font-mono text-sm"
          />
        </div>

        {(method === 'POST' || method === 'PUT') && (
          <div className="input-group mb-4">
            <label>Request Body (JSON)</label>
            <textarea 
              rows="4" 
              placeholder='{"key": "value"}'
              value={body}
              onChange={e => setBody(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
        )}

        <button className="primary-btn w-full mt-2" onClick={testApi} disabled={loading}>
          {loading ? <span className="spinner"></span> : 'Send Request'}
        </button>

        {errorObj && (
          <div className="result-box mt-4">
            <div className="api-meta">
              <span className="meta-chip error">Failed</span>
            </div>
            <div className="api-preview text-red-400">{errorObj}</div>
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
            <div className="api-preview overflow-x-auto bg-darker p-3 rounded">
              {result.error 
                ? <div className="text-red-400">{result.error}</div> 
                : typeof result.preview === 'object' 
                  ? <pre className="text-emerald-400 text-sm font-mono"><code>{JSON.stringify(result.preview, null, 2)}</code></pre> 
                  : <pre className="text-emerald-400 text-sm font-mono"><code>{String(result.preview)}</code></pre>}
            </div>
          </div>
        )}
      </div>

      <div className="card w-full lg:w-80 h-fit max-h-[600px] flex flex-col">
        <h3>Request History</h3>
        <p className="text-secondary text-sm mb-3">Last {history.length} API calls</p>
        <div className="flex flex-col gap-2 overflow-y-auto pr-2 custom-scrollbar">
          {history.length === 0 ? (
            <p className="text-sm text-secondary">No history found.</p>
          ) : (
            history.map((log) => (
              <div 
                key={log.id} 
                className="p-3 bg-darker rounded cursor-pointer hover:border-accent border border-transparent transition-colors"
                onClick={() => loadFromHistory(log)}
              >
                <div className="flex gap-2 items-center mb-1">
                  <span className={`text-xs font-bold ${log.method === 'GET' ? 'text-blue-400' : log.method === 'POST' ? 'text-green-400' : log.method === 'PUT' ? 'text-amber-400' : 'text-red-400'}`}>
                    {log.method}
                  </span>
                  <span className="text-xs text-secondary truncate" title={log.url}>{log.url}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className={`${log.status_code >= 200 && log.status_code < 300 ? 'text-emerald-400' : log.status_code >= 400 ? 'text-rose-400' : 'text-amber-400'}`}>
                    Status: {log.status_code}
                  </span>
                  <span className="text-secondary">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
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
      <div className="stats-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-5">
        <div className="stat-card card text-center p-4">
          <span className="stat-value block text-2xl font-bold">{stats.total_api_requests}</span>
          <span className="stat-label text-xs text-secondary">Total API Requests</span>
        </div>
        <div className="stat-card card text-center p-4">
          <span className="stat-value block text-2xl font-bold">{stats.average_response_time}s</span>
          <span className="stat-label text-xs text-secondary">Avg Response Time</span>
        </div>
        <div className="stat-card card text-center p-4">
          <span className="stat-value block text-2xl font-bold text-emerald-400">{stats.fastest_request}s</span>
          <span className="stat-label text-xs text-secondary">Fastest Request</span>
        </div>
        <div className="stat-card card text-center p-4">
          <span className="stat-value block text-2xl font-bold text-rose-400">{stats.slowest_request}s</span>
          <span className="stat-label text-xs text-secondary">Slowest Request</span>
        </div>
        <div className="stat-card card text-center p-4">
          <span className="stat-value block text-2xl font-bold">{stats.total_error_queries}</span>
          <span className="stat-label text-xs text-secondary">Error Queries</span>
        </div>
        <div className="stat-card card text-center p-4">
          <span className="stat-value block text-2xl font-bold text-amber-400">{stats.error_rate}%</span>
          <span className="stat-label text-xs text-secondary">Error Rate</span>
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
// Mock API Builder Component
// ---------------------------------------------------------------------------
function MockApiBuilder() {
  const [status, setStatus] = useState(200);
  const [delay, setDelay] = useState(0);

  const mockUrl = `${API_BASE}/mock?status=${status}&delay=${delay}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(mockUrl);
  };

  return (
    <div className="card tab-panel slide-up">
      <h2>Mock API Builder</h2>
      <p className="card-desc">Generate a mock endpoint that returns specific status codes and simulates network delay.</p>
      
      <div className="flex flex-col md:flex-row gap-6 mt-6">
        <div className="flex-1 flex flex-col gap-4">
          <div className="input-group">
            <label>Response Status Code</label>
            <select value={status} onChange={e => setStatus(Number(e.target.value))}>
              <option value={200}>200 OK</option>
              <option value={201}>201 Created</option>
              <option value={400}>400 Bad Request</option>
              <option value={401}>401 Unauthorized</option>
              <option value={403}>403 Forbidden</option>
              <option value={404}>404 Not Found</option>
              <option value={500}>500 Internal Server Error</option>
              <option value={502}>502 Bad Gateway</option>
              <option value={503}>503 Service Unavailable</option>
            </select>
          </div>
          <div className="input-group">
            <label>Delay (milliseconds)</label>
            <input 
              type="number" 
              min="0" 
              max="10000" 
              step="100" 
              value={delay} 
              onChange={e => setDelay(Number(e.target.value))} 
            />
          </div>
        </div>
        
        <div className="flex-1 card bg-darker p-5 h-fit border border-accent/20">
          <h3 className="mb-4">Your Mock Endpoint</h3>
          <div className="bg-[#1e212b] p-3 rounded text-emerald-400 font-mono text-sm break-all mb-4">
            {mockUrl}
          </div>
          <div className="flex gap-3">
            <button className="primary-btn flex-1" onClick={copyUrl}>Copy URL</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main App Component
// ---------------------------------------------------------------------------
function AuthModal({ onClose, onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = isLogin ? '/login' : '/signup';
      const res = await axios.post(`${API_BASE}${endpoint}`, { username, password });
      if (res.data.success) {
        onLogin({ username: res.data.username, token: res.data.token });
      } else {
        setError(res.data.error || 'Authentication failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-sm relative">
        <h2 className="mb-4 text-xl font-bold">{isLogin ? 'Login to DevInsight' : 'Sign Up'}</h2>
        {error && <div className="text-rose-400 text-sm mb-3 bg-rose-500/10 p-2 rounded">{error}</div>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="input-group">
            <label>Username</label>
            <input required type="text" value={username} onChange={e => setUsername(e.target.value)} />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input required type="password" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <button type="submit" className="primary-btn w-full mt-2" disabled={loading}>
            {loading ? <span className="spinner"></span> : (isLogin ? 'Secure Login' : 'Create Account')}
          </button>
        </form>
        <div className="mt-4 text-center text-sm">
          <button className="text-secondary hover:text-white transition-colors" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? "Need an account? Sign up" : "Already have an account? Login"}
          </button>
        </div>
        <button className="absolute top-4 right-4 text-secondary hover:text-white" onClick={onClose}>✕</button>
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState('error-analyzer');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('devinsight_user') || 'null'));
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    const interceptor = axios.interceptors.request.use(config => {
      const token = localStorage.getItem('devinsight_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
    return () => axios.interceptors.request.eject(interceptor);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('devinsight_user', JSON.stringify(userData));
    localStorage.setItem('devinsight_token', userData.token);
    setShowAuth(false);
    window.location.reload(); 
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('devinsight_user');
    localStorage.removeItem('devinsight_token');
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex flex-col items-center w-full">
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onLogin={handleLogin} />}
      
      <header id="app-header" className="w-full">
        <div className="header-inner flex flex-col md:flex-row justify-between items-center w-full max-w-5xl mx-auto px-4 py-3">
          <div className="flex flex-col items-start">
            <div className="logo flex items-center justify-center gap-2 mb-1">
              <Zap className="text-accent" size={28} />
              <h1 className="text-2xl font-bold tracking-tight">DevInsight</h1>
            </div>
            <p className="tagline">Analyze errors · Test APIs · Track performance</p>
          </div>
          
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-secondary">Hello, <strong className="text-white">{user.username}</strong></span>
                <button onClick={handleLogout} className="text-sm px-3 py-1.5 border border-secondary/30 rounded hover:bg-secondary/10 transition-colors">
                  Log Out
                </button>
              </div>
            ) : (
              <button onClick={() => setShowAuth(true)} className="primary-btn text-sm px-4 py-1.5 min-h-[32px]">
                Sign In
              </button>
            )}
            <ThemeToggle />
          </div>
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
          className={`nav-btn ${tab === 'mock-api' ? 'active' : ''}`}
          onClick={() => setTab('mock-api')}
        >
          <Server size={16} className="nav-icon inline-block relative -top-0.5 mr-1.5"/> Mock API
        </button>
        <button 
          className={`nav-btn ${tab === 'analytics' ? 'active' : ''}`}
          onClick={() => setTab('analytics')}
        >
          <Activity size={16} className="nav-icon inline-block relative -top-0.5 mr-1.5"/> Analytics
        </button>
      </nav>

      <main id="app-main" className="flex-1 w-full max-w-5xl px-4 py-8 relative">
        {tab === 'error-analyzer' && <ErrorAnalyzer />}
        {tab === 'api-tester' && <ApiTester />}
        {tab === 'mock-api' && <MockApiBuilder />}
        {tab === 'analytics' && <Analytics />}
      </main>

      <footer id="app-footer" className="w-full">
        <p>DevInsight &copy; 2026 — Built with FastAPI & React</p>
      </footer>
    </div>
  );
}
