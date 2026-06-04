import React, { useState } from 'react';
import type { ModelResult, BenchmarkSession } from '../types';
import { Clock, Star } from 'lucide-react';

interface ChartsProps {
  session: BenchmarkSession | null;
}

export const Charts: React.FC<ChartsProps> = ({ session }) => {
  const [hoveredBar, setHoveredBar] = useState<{
    model: string;
    runIndex: number;
    value: number;
    label: string;
    x: number;
    y: number;
  } | null>(null);

  const [hoveredEvalBar, setHoveredEvalBar] = useState<{
    model: string;
    provider: string;
    runIndex: number;
    score: number;
    comment: string;
    x: number;
    y: number;
  } | null>(null);

  const [activeEvalRunTab, setActiveEvalRunTab] = useState<number>(1); // Run 1, 2, or 3

  if (!session || session.results.length === 0) {
    return (
      <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
        No benchmark data available. Run a benchmark to view comparative timing charts.
      </div>
    );
  }

  // --- CHART 1: RESPONSE TIME CHART SETUP ---
  const results = session.results;
  const numModels = results.length;
  
  let maxTime = 0.5;
  results.forEach((modelRes) => {
    modelRes.runs.forEach((run) => {
      if (run.time_seconds > maxTime) {
        maxTime = run.time_seconds;
      }
    });
  });
  maxTime = Math.ceil(maxTime * 1.1);

  const paddingLeft = 60;
  const paddingRight = 40;
  const paddingTop = 30;
  const paddingBottom = 60;
  const chartHeight = 280;
  const chartWidth = 720;
  const drawWidth = chartWidth - paddingLeft - paddingRight;
  const drawHeight = chartHeight - paddingTop - paddingBottom;

  const modelWidth = drawWidth / numModels;
  const groupSpacing = modelWidth * 0.25;
  const innerWidth = modelWidth - groupSpacing;
  const barWidth = innerWidth / 3;

  // Anthropic warm palette colors
  const runColors = {
    1: 'url(#gradRun1)', // Deep Ochre/Amber
    2: 'url(#gradRun2)', // Warm Gold/Sand
    3: 'url(#gradRun3)', // Elegant Cream
  };

  // --- CHART 2: EVALUATION SCORES CHART SETUP ---
  const providers = Object.keys(session.evaluations || {});
  const evalChartHeight = 260;
  const evalDrawHeight = evalChartHeight - paddingTop - paddingBottom;
  
  const evalColors: Record<string, string> = {
    Claude: 'url(#gradClaude)',
    Gemini: 'url(#gradGemini)',
    ChatGPT: 'url(#gradChatGPT)',
    Default: 'url(#gradDefault)'
  };

  const getProviderColor = (prov: string) => {
    const norm = prov.toLowerCase();
    if (norm.includes('claude') || norm.includes('anthropic')) return evalColors.Claude;
    if (norm.includes('gemini') || norm.includes('google')) return evalColors.Gemini;
    if (norm.includes('gpt') || norm.includes('chatgpt') || norm.includes('openai')) return evalColors.ChatGPT;
    return evalColors.Default;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 1. SPEED BENCHMARK */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={16} style={{ color: 'var(--accent-gold)' }} />
            <h3 className="card-title">Execution Speed Analysis</h3>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Response latency in seconds (lower is better)</span>
        </div>

        {/* Custom SVG Bar Chart */}
        <div style={{ position: 'relative', overflowX: 'auto', width: '100%' }}>
          <svg className="w-full min-w-[640px]" viewBox={`0 0 ${chartWidth} ${chartHeight}`} height={chartHeight}>
            <defs>
              {/* Warm Anthropic Speed gradients */}
              <linearGradient id="gradRun1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#d97706" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#d97706" stopOpacity="0.25" />
              </linearGradient>
              <linearGradient id="gradRun2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e2b07e" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#e2b07e" stopOpacity="0.25" />
              </linearGradient>
              <linearGradient id="gradRun3" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f1ede4" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#f1ede4" stopOpacity="0.2" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1.0].map((ratio, idx) => {
              const val = ratio * maxTime;
              const y = paddingTop + drawHeight - ratio * drawHeight;
              return (
                <g key={idx}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={chartWidth - paddingRight}
                    y2={y}
                    stroke="rgba(255,255,255,0.03)"
                    strokeWidth="1"
                    strokeDasharray="4,4"
                  />
                  <text
                    x={paddingLeft - 10}
                    y={y + 4}
                    textAnchor="end"
                    fill="var(--text-muted)"
                    fontSize="10"
                    className="font-mono"
                  >
                    {val.toFixed(1)}s
                  </text>
                </g>
              );
            })}

            {/* Bars drawing */}
            {results.map((modelResult, mIdx) => {
              const xStart = paddingLeft + mIdx * modelWidth + groupSpacing / 2;
              
              return (
                <g key={modelResult.model}>
                  {mIdx > 0 && (
                    <line
                      x1={paddingLeft + mIdx * modelWidth}
                      y1={paddingTop - 10}
                      x2={paddingLeft + mIdx * modelWidth}
                      y2={paddingTop + drawHeight}
                      stroke="var(--border-color)"
                      strokeWidth="1"
                      strokeOpacity="0.4"
                    />
                  )}

                  {/* 3 bars */}
                  {modelResult.runs.map((run) => {
                    const runIdx = run.run_index;
                    const val = run.success ? run.time_seconds : 0;
                    
                    const barHeight = (val / maxTime) * drawHeight;
                    const barX = xStart + (runIdx - 1) * barWidth;
                    const barY = paddingTop + drawHeight - barHeight;

                    return (
                      <rect
                        key={runIdx}
                        x={barX}
                        y={barY}
                        width={barWidth - 2}
                        height={barHeight}
                        fill={run.success ? runColors[runIdx as 1|2|3] : 'rgba(244, 63, 94, 0.15)'}
                        stroke={run.success ? 'transparent' : 'rgba(244, 63, 94, 0.4)'}
                        strokeWidth={run.success ? 0 : 1}
                        rx="3"
                        className="animate-bar cursor-pointer"
                        style={{ transition: 'fill 0.2s ease' }}
                        onMouseEnter={(e) => {
                          setHoveredBar({
                            model: modelResult.model,
                            runIndex: runIdx,
                            value: val,
                            label: run.description,
                            x: barX + barWidth / 2,
                            y: barY - 10,
                          });
                        }}
                        onMouseLeave={() => setHoveredBar(null)}
                      />
                    );
                  })}

                  {/* Label */}
                  <text
                    x={xStart + innerWidth / 2}
                    y={paddingTop + drawHeight + 20}
                    textAnchor="middle"
                    fill="var(--text-primary)"
                    fontSize="11"
                    fontWeight="600"
                  >
                    {modelResult.model.split(':')[0]}
                  </text>
                  <text
                    x={xStart + innerWidth / 2}
                    y={paddingTop + drawHeight + 32}
                    textAnchor="middle"
                    fill="var(--text-muted)"
                    fontSize="9"
                    className="font-mono"
                  >
                    {modelResult.model.split(':')[1] || 'latest'}
                  </text>
                </g>
              );
            })}

            {/* X-axis */}
            <line
              x1={paddingLeft}
              y1={paddingTop + drawHeight}
              x2={chartWidth - paddingRight}
              y2={paddingTop + drawHeight}
              stroke="var(--border-color)"
              strokeWidth="1"
            />
          </svg>

          {/* Time Tooltip */}
          {hoveredBar && (
            <div
              style={{
                position: 'absolute',
                pointerEvents: 'none',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--accent-gold)',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '0.75rem',
                boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                zIndex: 100,
                left: hoveredBar.x + 10,
                top: hoveredBar.y - 20,
              }}
            >
              <div style={{ fontWeight: 700, color: 'var(--accent-gold)' }}>{hoveredBar.model}</div>
              <div style={{ color: 'var(--text-secondary)' }}>
                Run {hoveredBar.runIndex}: <span style={{ color: 'var(--text-primary)' }}>{hoveredBar.label}</span>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#f1ede4', marginTop: '2px' }}>
                {hoveredBar.value > 0 ? `${hoveredBar.value.toFixed(2)}s` : 'Request Failed'}
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', fontSize: '0.75rem', marginTop: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#d97706' }} />
            <span style={{ color: 'var(--text-secondary)' }}>Run 1: Image 1</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#e2b07e' }} />
            <span style={{ color: 'var(--text-secondary)' }}>Run 2: Image 2</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#f1ede4' }} />
            <span style={{ color: 'var(--text-secondary)' }}>Run 3: Image 1 + Image 2</span>
          </div>
        </div>
      </div>

      {/* 2. ACCURACY RATING CHART */}
      {providers.length > 0 ? (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Star size={16} style={{ color: 'var(--accent-gold)' }} />
              <h3 className="card-title">LLM Quality Scores</h3>
            </div>
            
            {/* Run Selection Tab */}
            <div style={{ display: 'flex', backgroundColor: 'var(--bg-input)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              {[1, 2, 3].map((runIdx) => (
                <button
                  key={runIdx}
                  onClick={() => setActiveEvalRunTab(runIdx)}
                  style={{
                    backgroundColor: activeEvalRunTab === runIdx ? 'var(--accent-gold)' : 'transparent',
                    color: activeEvalRunTab === runIdx ? 'var(--bg-app)' : 'var(--text-muted)',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 10px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Run {runIdx}
                </button>
              ))}
            </div>
          </div>

          <div style={{ position: 'relative', overflowX: 'auto', width: '100%' }}>
            <svg className="w-full min-w-[640px]" viewBox={`0 0 ${chartWidth} ${evalChartHeight}`} height={evalChartHeight}>
              <defs>
                {/* Review gradients */}
                <linearGradient id="gradClaude" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e2b07e" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#e2b07e" stopOpacity="0.25" />
                </linearGradient>
                <linearGradient id="gradGemini" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.25" />
                </linearGradient>
                <linearGradient id="gradChatGPT" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.25" />
                </linearGradient>
                <linearGradient id="gradDefault" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8c887d" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#8c887d" stopOpacity="0.25" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0, 1, 2, 3, 4, 5].map((score) => {
                const y = paddingTop + evalDrawHeight - (score / 5) * evalDrawHeight;
                return (
                  <g key={score}>
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={chartWidth - paddingRight}
                      y2={y}
                      stroke="rgba(255,255,255,0.03)"
                      strokeWidth="1"
                    />
                    <text
                      x={paddingLeft - 10}
                      y={y + 4}
                      textAnchor="end"
                      fill="var(--text-muted)"
                      fontSize="10"
                      className="font-mono font-bold"
                    >
                      {score}
                    </text>
                  </g>
                );
              })}

              {/* Grouped Bars */}
              {results.map((modelResult, mIdx) => {
                const xStart = paddingLeft + mIdx * modelWidth + groupSpacing / 2;
                const numProviders = providers.length;
                const evalBarWidth = innerWidth / Math.max(numProviders, 1);

                return (
                  <g key={modelResult.model}>
                    {mIdx > 0 && (
                      <line
                        x1={paddingLeft + mIdx * modelWidth}
                        y1={paddingTop - 10}
                        x2={paddingLeft + mIdx * modelWidth}
                        y2={paddingTop + evalDrawHeight}
                        stroke="var(--border-color)"
                        strokeWidth="1"
                        strokeOpacity="0.4"
                      />
                    )}

                    {providers.map((prov, pIdx) => {
                      const modelEvals = session.evaluations[prov] || [];
                      const matchModelEval = modelEvals.find((me) => me.model === modelResult.model);
                      const runEval = matchModelEval?.evaluations.find((e) => e.run_index === activeEvalRunTab);
                      
                      const score = runEval ? runEval.score : 0;
                      const comment = runEval ? runEval.comment : 'No evaluation score imported';

                      const barHeight = (score / 5) * evalDrawHeight;
                      const barX = xStart + pIdx * evalBarWidth;
                      const barY = paddingTop + evalDrawHeight - barHeight;

                      return (
                        <rect
                          key={prov}
                          x={barX}
                          y={barY}
                          width={evalBarWidth - 2}
                          height={barHeight}
                          fill={getProviderColor(prov)}
                          rx="3"
                          className="animate-bar cursor-pointer"
                          onMouseEnter={(e) => {
                            setHoveredEvalBar({
                              model: modelResult.model,
                              provider: prov,
                              runIndex: activeEvalRunTab,
                              score,
                              comment,
                              x: barX + evalBarWidth / 2,
                              y: barY - 10,
                            });
                          }}
                          onMouseLeave={() => setHoveredEvalBar(null)}
                        />
                      );
                    })}

                    <text
                      x={xStart + innerWidth / 2}
                      y={paddingTop + evalDrawHeight + 20}
                      textAnchor="middle"
                      fill="var(--text-primary)"
                      fontSize="11"
                      fontWeight="600"
                    >
                      {modelResult.model.split(':')[0]}
                    </text>
                  </g>
                );
              })}

              <line
                x1={paddingLeft}
                y1={paddingTop + evalDrawHeight}
                x2={chartWidth - paddingRight}
                y2={paddingTop + evalDrawHeight}
                stroke="var(--border-color)"
                strokeWidth="1"
              />
            </svg>

            {/* Score Tooltip */}
            {hoveredEvalBar && (
              <div
                style={{
                  position: 'absolute',
                  pointerEvents: 'none',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--accent-gold)',
                  borderRadius: '6px',
                  padding: '10px 14px',
                  fontSize: '0.75rem',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  zIndex: 100,
                  maxWidth: '280px',
                  left: Math.min(hoveredEvalBar.x + 10, chartWidth - 300),
                  top: hoveredEvalBar.y - 40,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, gap: '16px' }}>
                  <span style={{ color: 'var(--accent-gold)' }}>{hoveredEvalBar.provider} Review</span>
                  <span style={{ color: 'var(--text-muted)' }}>Run {hoveredEvalBar.runIndex}</span>
                </div>
                <div style={{ fontWeight: 600, color: '#f1ede4', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {hoveredEvalBar.model}
                </div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Score: {hoveredEvalBar.score}/5
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', borderTop: '1px solid var(--border-color)', paddingTop: '6px', lineHeight: 1.4 }}>
                  {hoveredEvalBar.comment}
                </div>
              </div>
            )}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', fontSize: '0.75rem', marginTop: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
            {providers.map((prov) => {
              let color = '#8c887d';
              if (prov.toLowerCase().includes('claude')) color = '#e2b07e';
              else if (prov.toLowerCase().includes('gemini')) color = '#a78bfa';
              else if (prov.toLowerCase().includes('gpt') || prov.toLowerCase().includes('chatgpt')) color = '#10b981';

              return (
                <div key={prov} className="flex items-center gap-1.5" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: color }} />
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{prov}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
};
