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
// Mock API Builder Component (Artificial Backend & Simulator)
// ---------------------------------------------------------------------------
function MockApiBuilder({ user }) {
  const [endpoints, setEndpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', route_path: '', method: 'GET', status_code: 200, delay_ms: 0, response_body: '{\n  "message": "Hello World"\n}' });
  const [errorMsg, setErrorMsg] = useState('');
  
  // For Simulation Console
  const [simResult, setSimResult] = useState(null);
  const [simLoading, setSimLoading] = useState(false);
  const [activeSimId, setActiveSimId] = useState(null);

  useEffect(() => {
    fetchEndpoints();
  }, []);

  const fetchEndpoints = () => {
    axios.get(`${API_BASE}/mock-api/endpoints`)
      .then(res => setEndpoints(res.data.endpoints || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const createEndpoint = async (e) => {
    e.preventDefault();
    if (!form.name || !form.route_path) return;
    setErrorMsg('');
    try {
      await axios.post(`${API_BASE}/mock-api/endpoints`, form);
      fetchEndpoints();
      setForm({ ...form, name: '', route_path: '' });
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || err.message);
    }
  };

  const deleteEndpoint = async (id) => {
    try {
      await axios.delete(`${API_BASE}/mock-api/endpoints/${id}`);
      fetchEndpoints();
    } catch (err) {
      console.error(err);
    }
  };

  const runSimulation = async (ep) => {
    setSimLoading(true);
    setActiveSimId(ep.id);
    setSimResult(null);
    const start = Date.now();
    try {
      const res = await axios({
        url: `${API_BASE}/sim/${user?.id || 1}/${ep.route_path}`,
        method: ep.method,
        validateStatus: () => true
      });
      const time = ((Date.now() - start) / 1000).toFixed(2);
      setSimResult({ status: res.status, data: res.data, time });
    } catch (err) {
      setSimResult({ status: 500, error: err.message, time: 0 });
    } finally {
      setSimLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 slide-up w-full">
      <div className="card flex-1">
        <h2>Artificial Backend Builder</h2>
        <p className="card-desc">Define custom database-backed mock API endpoints with custom JSON responses to automatically simulate backends.</p>
        
        {errorMsg && <div className="text-rose-400 text-sm mb-3 bg-rose-500/10 p-2 rounded">{errorMsg}</div>}
        
        <form onSubmit={createEndpoint} className="flex flex-col gap-4 mt-2">
          <div className="flex gap-4">
             <div className="input-group flex-1">
                <label>Endpoint Name / Tag</label>
                <input required type="text" placeholder="e.g. Get User Profile" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
             </div>
             <div className="input-group w-32">
                <label>Method</label>
                <select value={form.method} onChange={e => setForm({...form, method: e.target.value})}>
                  <option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option>
                </select>
             </div>
          </div>
          
          <div className="flex gap-4">
             <div className="input-group flex-[2]">
                <label>Route Path</label>
                <div className="flex items-center">
                  <span className="text-secondary bg-darker p-2 rounded-l border border-r-0 border-accent/20">/sim/</span>
                  <input className="rounded-l-none" required type="text" placeholder="users/123" value={form.route_path} onChange={e => setForm({...form, route_path: e.target.value})} />
                </div>
             </div>
             <div className="input-group flex-1">
                <label>Status Code</label>
                <input type="number" required value={form.status_code} onChange={e => setForm({...form, status_code: Number(e.target.value)})} />
             </div>
             <div className="input-group flex-1">
                <label>Delay (ms)</label>
                <input type="number" required max="10000" step="100" value={form.delay_ms} onChange={e => setForm({...form, delay_ms: Number(e.target.value)})} />
             </div>
          </div>
          
          <div className="input-group">
            <label>Custom JSON Response Body</label>
            <textarea required rows="5" className="font-mono text-sm" value={form.response_body} onChange={e => setForm({...form, response_body: e.target.value})} />
          </div>
          
          <button type="submit" className="primary-btn w-full mt-2">Create Endpoint</button>
        </form>
      </div>

      <div className="card flex-1 flex flex-col h-fit max-h-[800px]">
        <h3>Client Simulator Console</h3>
        <p className="card-desc">Simulate a frontend application fetching your custom endpoints in real time.</p>
        
        <div className="flex flex-col gap-3 overflow-y-auto mt-4 custom-scrollbar pr-2">
          {loading ? (
             <p className="text-secondary text-sm">Loading endpoints...</p>
          ) : endpoints.length === 0 ? (
             <p className="text-secondary text-sm">No custom endpoints created yet.</p>
          ) : endpoints.map(ep => (
             <div key={ep.id} className="bg-darker p-4 rounded border border-transparent hover:border-accent transition-colors relative group">
                <div className="flex justify-between items-start mb-2">
                   <div>
                      <strong className="block text-white">{ep.name}</strong>
                      <div className="flex gap-2 items-center text-xs mt-1">
                        <span className="text-blue-400 font-bold">{ep.method}</span>
                        <span className="text-secondary">/sim/{ep.route_path}</span>
                      </div>
                   </div>
                   <button className="text-xs text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity" title="Delete Mock Endpoint" onClick={() => deleteEndpoint(ep.id)}>Delete</button>
                </div>
                
                <div className="flex gap-2 items-center text-xs mb-3">
                   <span className="meta-chip border-emerald-500/30 text-emerald-400">Status: {ep.status_code}</span>
                   <span className="meta-chip border-amber-500/30 text-amber-400">{ep.delay_ms}ms Delay</span>
                </div>
                
                <button 
                  className="w-full text-xs py-1.5 border border-indigo-500/50 hover:bg-indigo-500/20 hover:border-indigo-400 rounded transition-colors text-indigo-300 font-bold"
                  onClick={() => runSimulation(ep)}
                  disabled={simLoading && activeSimId === ep.id}
                >
                  {simLoading && activeSimId === ep.id ? 'Simulating Network Request...' : 'Simulate Client Fetch Request'}
                </button>
                
                {activeSimId === ep.id && simResult && (
                  <div className="mt-3 p-3 bg-black rounded border border-secondary/20 fade-in">
                     <div className="flex gap-3 text-xs mb-2">
                        <span className={simResult.status >= 400 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>Received: {simResult.status}</span>
                        <span className="text-secondary">Network Wait Time: {simResult.time}s</span>
                     </div>
                     <pre className="text-emerald-300 font-mono text-[10px] sm:text-xs overflow-x-auto max-h-40">
                        {simResult.error ? simResult.error : JSON.stringify(simResult.data, null, 2)}
                     </pre>
                  </div>
                )}
             </div>
          ))}
        </div>
      </div>
      
      <div className="card w-full mt-6 flex flex-col items-center justify-center p-6 text-center border-accent/20 border">
        <h3 className="mb-2 text-xl font-bold flex items-center justify-center gap-2">
          <Zap size={20} className="text-amber-400" /> DevInsight Network Interceptor SDK
        </h3>
        <p className="text-secondary tracking-wide leading-relaxed max-w-2xl mb-4 text-sm">
          Want to magically connect your real frontend application (like a local React app) to these Mock APIs? Simply drop this 1-line script tag into your <strong>index.html</strong> file head. It will seamlessly intercept your frontend network requests and secretly route targeted APIs to your DevInsight Sandbox without changing your codebase!
        </p>
        <div className="bg-[#1e212b] p-3 rounded font-mono text-xs w-full max-w-4xl border border-secondary/20 flex justify-between items-center text-emerald-400">
          <code>&lt;script src="https://devinsight-backend.onrender.com/injector.js?user={user?.id || 'YOUR_ID'}"&gt;&lt;/script&gt;</code>
          <button 
             className="text-xs ml-4 py-1.5 px-3 bg-[#2d3142] hover:bg-white/10 rounded text-amber-400 border border-amber-400/30 transition-colors whitespace-nowrap"
             onClick={(e) => { navigator.clipboard.writeText(`<script src="https://devinsight-backend.onrender.com/injector.js?user=${user?.id}"></script>`); e.target.innerText = 'Copied!'; setTimeout(() => e.target.innerText = 'Copy Script', 2000); }}
          >
            Copy Script
          </button>
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
          <button className="text-secondary hover:text-white transition-colors" onClick={() => setIsLogin(!isLogin)} type="button">
            {isLogin ? "Need an account? Sign up" : "Already have an account? Login"}
          </button>
        </div>
        {onClose && <button className="absolute top-4 right-4 text-secondary hover:text-white" onClick={onClose} type="button">✕</button>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Theme Toggle Component
// ---------------------------------------------------------------------------
function ThemeToggle() {
  const [isDark, setIsDark] = useState(
    localStorage.getItem('theme') === 'light' ? false : true
  );

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.remove('light-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.add('light-theme');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  return (
    <button 
      onClick={() => setIsDark(!isDark)}
      className="p-2 rounded-full hover:bg-secondary/20 transition-colors ml-2"
      title="Toggle Theme"
    >
      {isDark ? <Sun size={18} className="text-amber-300" /> : <Moon size={18} className="text-indigo-500" />}
    </button>
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
      {(!user || showAuth) && <AuthModal onClose={user ? () => setShowAuth(false) : null} onLogin={handleLogin} />}
      
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
            ) : null}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {user ? (
        <>
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
            {tab === 'mock-api' && <MockApiBuilder user={user} />}
            {tab === 'analytics' && <Analytics />}
          </main>
        </>
      ) : (
        <main className="flex-1 w-full max-w-5xl px-4 flex flex-col items-center justify-center opacity-70">
           <h2 className="text-2xl font-bold mb-3">Welcome to DevInsight Pro</h2>
           <p className="text-secondary max-w-md text-center">Please log in to access your personal workspace. All error analysis, api testing history, and analytics metrics are completely segregated and secured to your account.</p>
        </main>
      )}

      <footer id="app-footer" className="w-full">
        <p>DevInsight &copy; 2026 — Built with FastAPI & React</p>
      </footer>
    </div>
  );
}
