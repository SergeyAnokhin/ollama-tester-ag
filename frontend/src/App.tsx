import { useState, useEffect, useRef } from 'react';
import type { OllamaModel, SysStats, BenchmarkSession, WSMessage, ModelResult } from './types';
import { ModelSelector } from './components/ModelSelector';
import { PromptConfig } from './components/PromptConfig';
import { LiveMonitor } from './components/LiveMonitor';
import { Charts } from './components/Charts';
import { ResultsViewer } from './components/ResultsViewer';
import { EvalImporter } from './components/EvalImporter';
import { 
  Play, 
  Terminal as TerminalIcon, 
  BarChart3, 
  Eye, 
  Star, 
  History as HistoryIcon,
  Trash2,
  Sparkles,
  Download
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface LogLine {
  time: string;
  text: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'log';
}

function App() {
  const [activeTab, setActiveTab] = useState<'monitor' | 'charts' | 'results' | 'eval' | 'history'>('monitor');

  const [availableModels, setAvailableModels] = useState<OllamaModel[]>([]);
  
  // LocalStorage state initializers
  const [selectedModels, setSelectedModels] = useState<string[]>(() => {
    const saved = localStorage.getItem('selectedModels');
    try {
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isLoadingModels, setIsLoadingModels] = useState<boolean>(false);
  const [history, setHistory] = useState<BenchmarkSession[]>([]);

  const [prompt, setPrompt] = useState<string>(() => localStorage.getItem('prompt') || 'Describe the image in detail.');
  const [image1, setImage1] = useState<string>(() => localStorage.getItem('image1') || '');
  const [image2, setImage2] = useState<string>(() => localStorage.getItem('image2') || '');

  // Live state
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  
  const [currentModel, setCurrentModel] = useState<string | null>(null);
  const [currentRunIndex, setCurrentRunIndex] = useState<number | null>(null);
  const [currentRunDesc, setCurrentRunDesc] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [totalRuns, setTotalRuns] = useState<number>(0);
  const [completedRuns, setCompletedRuns] = useState<number>(0);
  const [sysStats, setSysStats] = useState<SysStats | null>(null);
  const [logs, setLogs] = useState<LogLine[]>([]);

  const [activeSession, setActiveSession] = useState<BenchmarkSession | null>(null);

  const timerRef = useRef<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Save configurations to LocalStorage when they change
  useEffect(() => {
    localStorage.setItem('prompt', prompt);
  }, [prompt]);

  useEffect(() => {
    localStorage.setItem('image1', image1);
  }, [image1]);

  useEffect(() => {
    localStorage.setItem('image2', image2);
  }, [image2]);

  useEffect(() => {
    localStorage.setItem('selectedModels', JSON.stringify(selectedModels));
  }, [selectedModels]);

  // Load models and histories on mount
  useEffect(() => {
    fetchModels();
    fetchHistory();
  }, []);

  // Benchmarking elapsed time clock
  useEffect(() => {
    if (isRunning && !isPaused) {
      const start = Date.now() - (elapsedTime * 1000);
      timerRef.current = window.setInterval(() => {
        setElapsedTime(Math.round((Date.now() - start) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, isPaused]);

  const fetchModels = async () => {
    setIsLoadingModels(true);
    try {
      const res = await fetch('/api/models');
      if (res.ok) {
        const data = await res.json();
        setAvailableModels(data);
        // Fallback default selection
        if (data.length > 0 && selectedModels.length === 0) {
          setSelectedModels([data[0].name]);
        }
      }
    } catch (e) {
      console.error("Failed to load models:", e);
      addLog("Error retrieving local model tags. Make sure uvicorn backend is running.", 'error');
    } finally {
      setIsLoadingModels(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/results');
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
        if (data.length > 0 && !activeSession) {
          setActiveSession(data[0]);
        }
      }
    } catch (e) {
      console.error("Failed to load history:", e);
    }
  };

  const addLog = (text: string, type: LogLine['type'] = 'log') => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { time, text, type }]);
  };

  const handleToggleModel = (name: string) => {
    setSelectedModels((prev) =>
      prev.includes(name) ? prev.filter((m) => m !== name) : [...prev, name]
    );
  };

  const handleSelectAll = () => {
    setSelectedModels(availableModels.map((m) => m.name));
  };

  const handleDeselectAll = () => {
    setSelectedModels([]);
  };

  const handleCopySelectedModels = () => {
    if (selectedModels.length === 0) return;
    const modelStr = selectedModels.join(', ');
    navigator.clipboard.writeText(modelStr);
    alert(`Copied selected models list to clipboard:\n${modelStr}`);
  };

  const handleClearHistory = async () => {
    if (!window.confirm("Are you sure you want to clear the entire benchmarking history?")) return;
    try {
      const res = await fetch('/api/results/clear', { method: 'POST' });
      if (res.ok) {
        setHistory([]);
        setActiveSession(null);
        alert("History cleared successfully.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // WS Control commands
  const pauseBenchmark = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'control', action: 'pause' }));
      setIsPaused(true);
      addLog("Pause requested. Waiting for active run step to finish...", "warning");
    }
  };

  const resumeBenchmark = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'control', action: 'resume' }));
      setIsPaused(false);
      addLog("Resuming benchmark queue...", "info");
    }
  };

  const stopBenchmark = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'control', action: 'stop' }));
      setIsPaused(false);
      addLog("Halt command sent. Saving completed tests, stopping queue...", "warning");
    }
  };

  const startBenchmark = () => {
    if (selectedModels.length === 0) {
      alert("Please select at least one Ollama model to benchmark.");
      return;
    }

    if (!image1 || !image2) {
      alert("Please upload both Image 1 and Image 2 before testing.");
      return;
    }

    setIsRunning(true);
    setIsPaused(false);
    setElapsedTime(0);
    setCompletedRuns(0);
    setTotalRuns(selectedModels.length * 3);
    setLogs([]);
    setActiveTab('monitor');

    const mockInitialResults: ModelResult[] = selectedModels.map((m) => ({
      model: m,
      runs: [
        { run_index: 1, description: 'Image 1', success: false, time_seconds: 0, response: '', error: null },
        { run_index: 2, description: 'Image 2', success: false, time_seconds: 0, response: '', error: null },
        { run_index: 3, description: 'Image 1 + Image 2', success: false, time_seconds: 0, response: '', error: null },
      ],
    }));

    const mockSession: BenchmarkSession = {
      id: 'pending',
      timestamp: new Date().toISOString(),
      prompt,
      images: { image1, image2 },
      results: mockInitialResults,
      eval_prompt: '',
      evaluations: {},
    };

    setActiveSession(mockSession);

    addLog("Initializing benchmarking session...", 'info');
    addLog(`Configured with prompt: "${prompt}"`, 'log');
    addLog(`Testing ${selectedModels.length} models sequentially (3 runs each)...`, 'info');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/benchmark/ws`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      addLog("WebSocket connection established. Dispatching payload...", 'success');
      ws.send(JSON.stringify({
        models: selectedModels,
        prompt,
        image1,
        image2
      }));
    };

    ws.onmessage = (event) => {
      const msg: WSMessage = JSON.parse(event.data);

      switch (msg.type) {
        case 'init':
          addLog("Benchmark initialized on server.", 'success');
          break;

        case 'stats':
          setSysStats(msg.data);
          // Sync pause state from backend status dict
          if (msg.control) {
            setIsPaused(msg.control.paused);
          }
          break;

        case 'paused_status':
          addLog(`[PAUSED] Queue waiting at model ${msg.data.model} (Step Run ${msg.data.run_index})`, 'warning');
          break;

        case 'run_start': {
          const { model, run_index, description } = msg.data;
          setCurrentModel(model);
          setCurrentRunIndex(run_index);
          setCurrentRunDesc(description);
          addLog(`[START] Running ${model} — Run ${run_index}: ${description}...`, 'info');
          break;
        }

        case 'run_end': {
          const { model, run_index, result } = msg.data;
          setCompletedRuns((prev) => prev + 1);
          
          if (result.success) {
            addLog(`[OK] ${model} — Run ${run_index} succeeded in ${result.time_seconds}s`, 'success');
          } else {
            addLog(`[FAIL] ${model} — Run ${run_index} failed: ${result.error}`, 'error');
          }

          setActiveSession((prevSession) => {
            if (!prevSession) return null;
            const updatedResults = prevSession.results.map((mRes) => {
              if (mRes.model === model) {
                const updatedRuns = mRes.runs.map((r) => {
                  if (r.run_index === run_index) {
                    return {
                      ...r,
                      success: result.success,
                      time_seconds: result.time_seconds,
                      response: result.response,
                      error: result.error,
                    };
                  }
                  return r;
                });
                return { ...mRes, runs: updatedRuns };
              }
              return mRes;
            });
            return { ...prevSession, results: updatedResults };
          });
          break;
        }

        case 'complete': {
          addLog("🚀 Benchmark execution terminated on server.", 'success');
          setIsRunning(false);
          setIsPaused(false);
          setCurrentModel(null);
          setCurrentRunIndex(null);
          setCurrentRunDesc(null);
          
          const completedSession: BenchmarkSession = msg.data;
          setActiveSession(completedSession);
          fetchHistory();

          // Celebration Confetti
          if (!completedSession.results || completedSession.results.length === 0) {
            addLog("No test results generated.", "warning");
          } else {
            confetti({
              particleCount: 150,
              spread: 80,
              origin: { y: 0.6 },
              colors: ['#e2b07e', '#a78bfa', '#10b981'],
            });
          }

          setActiveTab('charts');
          break;
        }

        case 'error':
          addLog(`Server error: ${msg.message}`, 'error');
          setIsRunning(false);
          setIsPaused(false);
          alert(`Benchmark failed: ${msg.message}`);
          break;

        default:
          break;
      }
    };

    ws.onerror = (err) => {
      console.error(err);
      addLog("WebSocket socket communication error.", 'error');
      setIsRunning(false);
      setIsPaused(false);
    };

    ws.onclose = () => {
      addLog("WebSocket link closed.", 'info');
      setIsRunning(false);
      setIsPaused(false);
    };
  };

  const handleDownloadAllData = (sessionData: BenchmarkSession) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sessionData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `ollama_benchmark_${sessionData.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="app-container">
      {/* Editorial Header */}
      <header className="header">
        <div className="header-logo">
          <Sparkles className="header-logo-icon" size={24} />
          <div>
            <h1 className="header-title">Ollama VLM Benchmarker</h1>
            <p className="header-subtitle">Performance & quality analysis scanner for vision models</p>
          </div>
        </div>

        {/* Global Export actions */}
        {activeSession && activeSession.id !== 'pending' && (
          <button
            onClick={() => handleDownloadAllData(activeSession)}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Download size={14} />
            <span>Download Session JSON</span>
          </button>
        )}
      </header>

      {/* Main Grid split */}
      <div className="dashboard-layout">
        {/* Left configurations Sidebar */}
        <aside className="sidebar">
          <div>
            <h2 className="section-title">Benchmark Panel</h2>
            <p className="section-subtitle">Set up local vision parameters</p>
          </div>

          <ModelSelector
            models={availableModels}
            selectedModels={selectedModels}
            isLoading={isLoadingModels}
            onToggleModel={handleToggleModel}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            onCopySelected={handleCopySelectedModels}
            onRefresh={fetchModels}
          />

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <PromptConfig
              prompt={prompt}
              setPrompt={setPrompt}
              image1={image1}
              setImage1={setImage1}
              image2={image2}
              setImage2={setImage2}
            />
          </div>

          <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {!isRunning ? (
              <button
                onClick={startBenchmark}
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px 16px', fontSize: '0.85rem', fontWeight: 700 }}
              >
                <Play size={14} style={{ fill: 'currentColor' }} />
                <span>Start Local Benchmark</span>
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                {isPaused ? (
                  <button
                    onClick={resumeBenchmark}
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '12px 8px', fontSize: '0.8rem', fontWeight: 700, backgroundColor: 'var(--accent-emerald)', color: '#fff' }}
                  >
                    Resume
                  </button>
                ) : (
                  <button
                    onClick={pauseBenchmark}
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: '12px 8px', fontSize: '0.8rem', fontWeight: 700, borderColor: 'var(--accent-gold)', color: 'var(--accent-gold)' }}
                  >
                    Pause
                  </button>
                )}
                <button
                  onClick={stopBenchmark}
                  className="btn btn-danger"
                  style={{ flex: 1, padding: '12px 8px', fontSize: '0.8rem', fontWeight: 700 }}
                >
                  Stop
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Right content view area */}
        <main className="main-content">
          {/* Tabs navigation */}
          <nav className="navbar-tabs">
            <button
              onClick={() => setActiveTab('monitor')}
              className={`tab-btn ${activeTab === 'monitor' ? 'active' : ''}`}
            >
              <TerminalIcon size={14} />
              <span>Live Monitor</span>
            </button>

            <button
              onClick={() => setActiveTab('charts')}
              className={`tab-btn ${activeTab === 'charts' ? 'active' : ''}`}
            >
              <BarChart3 size={14} />
              <span>Speed & Scores</span>
            </button>

            <button
              onClick={() => setActiveTab('results')}
              className={`tab-btn ${activeTab === 'results' ? 'active' : ''}`}
            >
              <Eye size={14} />
              <span>Response Explorer</span>
            </button>

            <button
              onClick={() => setActiveTab('eval')}
              className={`tab-btn ${activeTab === 'eval' ? 'active' : ''}`}
            >
              <Star size={14} />
              <span>External Review</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            >
              <HistoryIcon size={14} />
              <span>Run History</span>
            </button>
          </nav>

          {/* Active View Container */}
          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '20px', minHeight: 0 }}>
            {activeTab === 'monitor' && (
              <LiveMonitor
                stats={sysStats}
                logs={logs}
                isRunning={isRunning}
                isPaused={isPaused}
                currentModel={currentModel}
                currentRunIndex={currentRunIndex}
                currentRunDesc={currentRunDesc}
                elapsedTime={elapsedTime}
                totalRuns={totalRuns}
                completedRuns={completedRuns}
              />
            )}

            {activeTab === 'charts' && (
              <Charts session={activeSession} />
            )}

            {activeTab === 'results' && (
              <ResultsViewer session={activeSession} />
            )}

            {activeTab === 'eval' && (
              <EvalImporter session={activeSession} onImportSuccess={fetchHistory} />
            )}

            {activeTab === 'history' && (
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '14px' }}>
                  <h3 className="card-title">Completed Benchmark Sessions</h3>
                  <button
                    onClick={handleClearHistory}
                    disabled={history.length === 0}
                    className="btn btn-danger"
                    style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                  >
                    <Trash2 size={12} />
                    <span>Clear All History</span>
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {history.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '30px' }}>
                      No benchmark sessions found. Set up models and click run to compile evaluations.
                    </div>
                  ) : (
                    history.map((sessionItem) => {
                      const date = new Date(sessionItem.timestamp).toLocaleString();
                      const isCurrent = activeSession?.id === sessionItem.id;
                      const hasEvals = Object.keys(sessionItem.evaluations).length > 0;
                      
                      return (
                        <div
                          key={sessionItem.id}
                          onClick={() => {
                            setActiveSession(sessionItem);
                            setActiveTab('charts');
                          }}
                          style={{
                            padding: '16px',
                            backgroundColor: isCurrent ? 'rgba(226, 176, 126, 0.04)' : 'var(--bg-input)',
                            border: '1px solid ' + (isCurrent ? 'var(--accent-gold)' : 'var(--border-color)'),
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            if (!isCurrent) e.currentTarget.style.borderColor = 'var(--border-color-hover)';
                          }}
                          onMouseLeave={(e) => {
                            if (!isCurrent) e.currentTarget.style.borderColor = 'var(--border-color)';
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                              Session: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-gold)' }}>{sessionItem.id.substring(0, 8)}...</span>
                            </div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{date}</span>
                          </div>
                          
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            Prompt: &quot;{sessionItem.prompt}&quot;
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              Tested: {sessionItem.results.map((r) => r.model.split(':')[0]).join(', ')}
                            </div>
                            
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', padding: '2px 6px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                                {sessionItem.results.length} Models
                              </span>
                              {hasEvals && (
                                <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', padding: '2px 6px', backgroundColor: 'rgba(226,176,126,0.08)', border: '1px solid rgba(226,176,126,0.2)', borderRadius: '4px', color: 'var(--accent-gold)' }}>
                                  Scores: {Object.keys(sessionItem.evaluations).join(', ')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
