import React, { useEffect, useRef } from 'react';
import type { SysStats } from '../types';
import { Cpu, HardDrive, Terminal as TerminalIcon, ShieldAlert } from 'lucide-react';

interface LogLine {
  time: string;
  text: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'log';
}

interface LiveMonitorProps {
  stats: SysStats | null;
  logs: LogLine[];
  isRunning: boolean;
  isPaused: boolean;
  currentModel: string | null;
  currentRunIndex: number | null;
  currentRunDesc: string | null;
  elapsedTime: number;
  totalRuns: number;
  completedRuns: number;
}

export const LiveMonitor: React.FC<LiveMonitorProps> = ({
  stats,
  logs,
  isRunning,
  isPaused,
  currentModel,
  currentRunIndex,
  currentRunDesc,
  elapsedTime,
  totalRuns,
  completedRuns,
}) => {
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const systemCpu = stats?.system.cpu_percent ?? 0;
  const systemMem = stats?.system.memory_percent ?? 0;
  const systemMemUsed = stats?.system.memory_used_bytes ?? 0;
  const systemMemTotal = stats?.system.memory_total_bytes ?? 0;
  
  const ollamaCpu = stats?.ollama.cpu_percent ?? 0;
  const ollamaCpuNorm = stats?.ollama.cpu_percent_normalized ?? 0;
  const ollamaMem = stats?.ollama.memory_bytes ?? 0;
  const isOllamaRunning = stats?.ollama.running ?? false;

  const progressPercent = totalRuns > 0 ? (completedRuns / totalRuns) * 100 : 0;

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Benchmark Execution Status Card */}
      <div className="card" style={{ position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 className="card-title" style={{ fontSize: '1.2rem', color: 'var(--accent-gold)' }}>
              {isRunning 
                ? (isPaused ? 'Benchmark Paused' : 'Benchmarking System Active') 
                : 'Benchmarking Monitor'}
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {isRunning 
                ? (isPaused 
                  ? 'Benchmark paused. Completing active Ollama query, then waiting...' 
                  : 'Executing vision evaluation routines sequentially') 
                : 'System standby. Adjust config and start benchmark.'}
            </p>
          </div>
          
          <div
            style={{
              padding: '6px 12px',
              backgroundColor: isRunning 
                ? (isPaused ? 'rgba(217, 119, 6, 0.08)' : 'rgba(226, 176, 126, 0.08)') 
                : 'rgba(255, 255, 255, 0.03)',
              border: '1px solid ' + (
                isRunning 
                  ? (isPaused ? 'var(--accent-amber)' : 'var(--accent-gold)') 
                  : 'var(--border-color)'
              ),
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isRunning 
                  ? (isPaused ? 'var(--accent-amber)' : 'var(--accent-gold)') 
                  : 'var(--text-muted)',
                boxShadow: isRunning 
                  ? `0 0 8px ${isPaused ? 'var(--accent-amber)' : 'var(--accent-gold)'}` 
                  : 'none'
              }}
            />
            <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
              {isRunning ? (isPaused ? 'Paused' : 'Running') : 'Ready'}
            </span>
          </div>
        </div>

        {/* Executing stats grid */}
        {isRunning && (
          <div className="live-step-grid">
            <div className="live-step-item">
              <div className="live-step-label">Active Model</div>
              <div className="live-step-val" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                {currentModel || '-'}
              </div>
            </div>
            <div className="live-step-item">
              <div className="live-step-label">Current Step</div>
              <div className="live-step-val" style={{ color: 'var(--accent-gold)' }}>
                Run {currentRunIndex}/3 <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({currentRunDesc})</span>
              </div>
            </div>
            <div className="live-step-item">
              <div className="live-step-label">Elapsed Time</div>
              <div className="live-step-val" style={{ fontFamily: 'var(--font-mono)' }}>
                {formatTime(elapsedTime)}
              </div>
            </div>
          </div>
        )}

        {/* Progress Fill Bar */}
        {isRunning && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600 }}>
              <span style={{ color: 'var(--text-muted)' }}>Workload completion: {completedRuns}/{totalRuns}</span>
              <span style={{ color: 'var(--accent-gold)' }}>{Math.round(progressPercent)}%</span>
            </div>
            <div className="live-progress-bar">
              <div className="live-progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* 2. System Hardware Metrics (Flat Progress Bars) */}
      <div className="stats-cards-grid">
        {/* CPU Utilizations */}
        <div className="stat-item-card">
          <div className="stat-header">
            <Cpu size={14} className="stat-header-icon" />
            <span>Processor (CPU)</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '4px' }}>
            {/* System Total CPU */}
            <div className="metric-row">
              <div className="metric-values">
                <span style={{ color: 'var(--text-secondary)' }}>Global CPU Utilization</span>
                <span style={{ color: 'var(--text-primary)' }}>{Math.round(systemCpu)}%</span>
              </div>
              <div className="metric-bar-bg">
                <div className="metric-bar-fill" style={{ width: `${systemCpu}%` }} />
              </div>
            </div>

            {/* Ollama specific CPU */}
            {isOllamaRunning ? (
              <div className="metric-row">
                <div className="metric-values">
                  <span style={{ color: 'var(--text-muted)' }}>Ollama Daemon thread</span>
                  <span style={{ color: 'var(--accent-gold)', fontFamily: 'var(--font-mono)' }}>{ollamaCpu}%</span>
                </div>
                <div className="metric-bar-bg" style={{ height: '4px' }}>
                  <div className="metric-bar-fill" style={{ width: `${Math.min(ollamaCpuNorm, 100)}%` }} />
                </div>
                <div className="metric-subinfo">
                  Consuming approx. {ollamaCpuNorm}% of global processor cycles
                </div>
              </div>
            ) : (
              <div className="metric-subinfo" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                <ShieldAlert size={12} />
                <span>Ollama execution engine not running</span>
              </div>
            )}
          </div>
        </div>

        {/* RAM Utilizations */}
        <div className="stat-item-card">
          <div className="stat-header">
            <HardDrive size={14} className="stat-header-icon" />
            <span>Memory (RAM)</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '4px' }}>
            {/* Global RAM */}
            <div className="metric-row">
              <div className="metric-values">
                <span style={{ color: 'var(--text-secondary)' }}>Global RAM Usage</span>
                <span style={{ color: 'var(--text-primary)' }}>{Math.round(systemMem)}%</span>
              </div>
              <div className="metric-bar-bg">
                <div className="metric-bar-fill" style={{ width: `${systemMem}%` }} />
              </div>
              {systemMemTotal > 0 && (
                <div className="metric-subinfo">
                  Using {formatBytes(systemMemUsed)} of {formatBytes(systemMemTotal)}
                </div>
              )}
            </div>

            {/* Ollama specific RAM */}
            {isOllamaRunning ? (
              <div className="metric-row">
                <div className="metric-values">
                  <span style={{ color: 'var(--text-muted)' }}>Ollama Model VRAM/RAM</span>
                  <span style={{ color: 'var(--accent-gold)', fontFamily: 'var(--font-mono)' }}>{formatBytes(ollamaMem)}</span>
                </div>
                <div className="metric-subinfo">
                  Allocated across {stats?.ollama.process_count} sub-processes
                </div>
              </div>
            ) : (
              <div className="metric-subinfo" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                <ShieldAlert size={12} />
                <span>Ollama execution engine not running</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Log Console Output */}
      <div className="card" style={{ flexGrow: 1, minHeight: '260px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="label-title" style={{ fontSize: '0.8rem' }}>
            <TerminalIcon size={14} style={{ color: 'var(--accent-gold)' }} />
            <span>Process Logs</span>
          </div>
          <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>Live stdout</span>
        </div>
        <div className="console-box" style={{ marginTop: '10px' }}>
          {logs.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '36px 0' }}>
              Waiting for benchmark workload to start...
            </div>
          ) : (
            logs.map((log, idx) => {
              let typeClass = '';
              if (log.type === 'info') typeClass = 'console-info';
              else if (log.type === 'success') typeClass = 'console-success';
              else if (log.type === 'warning') typeClass = 'console-warning';
              else if (log.type === 'error') typeClass = 'console-error';

              return (
                <div key={idx} className="console-line">
                  <span className="console-time">[{log.time}]</span>
                  <span className={typeClass}>{log.text}</span>
                </div>
              );
            })
          )}
          <div ref={terminalEndRef} />
        </div>
      </div>
    </div>
  );
};
