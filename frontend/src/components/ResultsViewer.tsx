import React, { useState } from 'react';
import type { BenchmarkSession, ModelResult } from '../types';
import { Check, Clipboard, Download, Image as ImageIcon, AlertTriangle } from 'lucide-react';

interface ResultsViewerProps {
  session: BenchmarkSession | null;
}

export const ResultsViewer: React.FC<ResultsViewerProps> = ({ session }) => {
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [activeRunTab, setActiveRunTab] = useState<number>(1);
  const [copied, setCopied] = useState<boolean>(false);

  if (!session || session.results.length === 0) {
    return null;
  }

  if (!selectedModel && session.results.length > 0) {
    setSelectedModel(session.results[0].model);
  }

  const activeModelResult = session.results.find((m) => m.model === selectedModel);
  const activeRun = activeModelResult?.runs.find((r) => r.run_index === activeRunTab);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadModelResults = (modelRes: ModelResult) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(modelRes, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `benchmark_${modelRes.model.replace(':', '_')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getRunImages = (runIndex: number) => {
    switch (runIndex) {
      case 1:
        return session.images.image1 ? [session.images.image1] : [];
      case 2:
        return session.images.image2 ? [session.images.image2] : [];
      case 3:
        const imgs = [];
        if (session.images.image1) imgs.push(session.images.image1);
        if (session.images.image2) imgs.push(session.images.image2);
        return imgs;
      default:
        return [];
    }
  };

  const runImages = getRunImages(activeRunTab);

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '14px' }}>
        <h3 className="card-title">Response Explorer</h3>
        <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>stdout inspection</span>
      </div>

      <div className="explorer-grid">
        {/* Left Column - Models list */}
        <div className="explorer-list">
          <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', paddingLeft: '4px' }}>
            Tested Models
          </div>
          {session.results.map((mRes) => {
            const isSelected = mRes.model === selectedModel;
            const successCount = mRes.runs.filter((r) => r.success).length;

            return (
              <button
                key={mRes.model}
                onClick={() => {
                  setSelectedModel(mRes.model);
                  setActiveRunTab(1);
                }}
                className={`explorer-item-btn ${isSelected ? 'active' : ''}`}
              >
                <div className="explorer-item-title">{mRes.model.split(':')[0]}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <span className="explorer-item-meta">{mRes.model.split(':')[1] || 'latest'}</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: successCount === 3 ? 'var(--accent-emerald)' : 'var(--accent-gold)' }}>
                    {successCount}/3 Ok
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Column - Results output */}
        {activeModelResult ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Header info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h4 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: '1.05rem', color: 'var(--accent-gold)' }}>
                  {activeModelResult.model}
                </h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Prompt: &quot;{session.prompt}&quot;
                </p>
              </div>
              <button
                onClick={() => handleDownloadModelResults(activeModelResult)}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.75rem' }}
              >
                <Download size={12} />
                <span>Export JSON</span>
              </button>
            </div>

            {/* Run tabs */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              {activeModelResult.runs.map((run) => (
                <button
                  key={run.run_index}
                  onClick={() => setActiveRunTab(run.run_index)}
                  className="btn"
                  style={{
                    backgroundColor: activeRunTab === run.run_index ? 'var(--accent-gold)' : 'transparent',
                    color: activeRunTab === run.run_index ? 'var(--bg-app)' : 'var(--text-muted)',
                    border: activeRunTab === run.run_index ? '1px solid transparent' : '1px solid var(--border-color)',
                    padding: '6px 12px',
                    fontSize: '0.75rem'
                  }}
                >
                  Run {run.run_index} ({run.description})
                </button>
              ))}
            </div>

            {/* Response Card details */}
            {activeRun ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Response Speed:</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: activeRun.success ? 'var(--accent-gold)' : 'var(--accent-rose)' }}>
                      {activeRun.success ? `${activeRun.time_seconds.toFixed(2)}s` : 'Failed'}
                    </span>
                  </div>
                  {activeRun.success && (
                    <button
                      onClick={() => handleCopy(activeRun.response)}
                      className="btn btn-secondary"
                      style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                    >
                      {copied ? <Check size={12} style={{ color: 'var(--accent-emerald)' }} /> : <Clipboard size={12} />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  )}
                </div>

                {/* Images */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div className="label-title" style={{ fontSize: '0.65rem' }}>Attached Images</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {runImages.length > 0 ? (
                      runImages.map((img, i) => (
                        <img
                          key={i}
                          src={img}
                          alt="Input visual"
                          style={{
                            width: '48px',
                            height: '48px',
                            objectFit: 'cover',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)'
                          }}
                        />
                      ))
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <ImageIcon size={12} /> No images attached
                      </span>
                    )}
                  </div>
                </div>

                {/* Answer Output */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div className="label-title" style={{ fontSize: '0.65rem' }}>Model Output</div>
                  {activeRun.success ? (
                    <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px', maxHeight: '200px', overflowY: 'auto' }}>
                      <pre style={{ margin: 0, fontSize: '0.75rem', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap', lineHeight: '1.5', color: 'var(--text-primary)' }}>
                        {activeRun.response}
                      </pre>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '12px', backgroundColor: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: '6px', color: '#f43f5e', fontSize: '0.75rem' }}>
                      <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <div style={{ fontWeight: 700 }}>Benchmark Error</div>
                        <div style={{ fontFamily: 'var(--font-mono)', marginTop: '4px', opacity: 0.85 }}>{activeRun.error || 'Request aborted.'}</div>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', padding: '30px' }}>Select a run to load outputs</div>
            )}
          </div>
        ) : (
          <div style={{ gridColumn: 'span 2', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '40px' }}>
            Select a model from the left column to explore its outputs.
          </div>
        )}
      </div>
    </div>
  );
};
