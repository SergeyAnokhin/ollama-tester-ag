import React, { useState, useEffect } from 'react';
import type { BenchmarkSession } from '../types';
import { Copy, Check, Sparkles, Send, FileJson, AlertCircle, Play } from 'lucide-react';

interface EvalImporterProps {
  session: BenchmarkSession | null;
  onImportSuccess: () => void;
}

export const EvalImporter: React.FC<EvalImporterProps> = ({ session, onImportSuccess }) => {
  const [importMethod, setImportMethod] = useState<'manual' | 'gemini_api'>('manual');
  
  // Manual Paste states
  const [provider, setProvider] = useState<string>('Claude');
  const [jsonText, setJsonText] = useState<string>('');
  
  // Gemini API states
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => localStorage.getItem('gemini_api_key') || '');
  const [geminiModel, setGeminiModel] = useState<string>('gemini-1.5-flash');
  
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [importStatus, setImportStatus] = useState<{
    type: 'idle' | 'loading' | 'success' | 'error';
    message: string;
  }>({ type: 'idle', message: '' });

  // Save API key to localStorage
  useEffect(() => {
    localStorage.setItem('gemini_api_key', geminiApiKey);
  }, [geminiApiKey]);

  if (!session) return null;

  const copyPromptToClipboard = () => {
    navigator.clipboard.writeText(session.eval_prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportStatus({ type: 'loading', message: 'Validating and importing JSON...' });

    if (!jsonText.trim()) {
      setImportStatus({ type: 'error', message: 'Please paste the evaluation JSON text first.' });
      return;
    }

    let parsedData: any = null;
    try {
      let cleanJson = jsonText.trim();
      if (cleanJson.includes('```json')) {
        const parts = cleanJson.split('```json');
        cleanJson = parts[1].split('```')[0].trim();
      } else if (cleanJson.includes('```')) {
        const parts = cleanJson.split('```');
        cleanJson = parts[1].split('```')[0].trim();
      }

      parsedData = JSON.parse(cleanJson);
    } catch (err: any) {
      setImportStatus({
        type: 'error',
        message: `Invalid JSON syntax: ${err?.message || 'Check for missing commas/quotes'}`,
      });
      return;
    }

    if (!Array.isArray(parsedData)) {
      setImportStatus({ type: 'error', message: 'JSON root must be an array of model evaluations.' });
      return;
    }

    for (let i = 0; i < parsedData.length; i++) {
      const item = parsedData[i];
      if (!item.model || !Array.isArray(item.evaluations)) {
        setImportStatus({
          type: 'error',
          message: `Item at index ${i} is missing "model" string or "evaluations" array.`,
        });
        return;
      }

      for (let j = 0; j < item.evaluations.length; j++) {
        const ev = item.evaluations[j];
        if (typeof ev.run_index !== 'number' || typeof ev.score !== 'number') {
          setImportStatus({
            type: 'error',
            message: `Evaluation inside item ${item.model} is missing "run_index" or "score".`,
          });
          return;
        }
      }
    }

    try {
      const response = await fetch('/api/evaluate/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          provider: provider,
          evaluations: parsedData,
        }),
      });

      const res = await response.json();
      if (response.ok) {
        setImportStatus({
          type: 'success',
          message: `Successfully imported evaluations from ${provider}!`,
        });
        setJsonText('');
        onImportSuccess();
      } else {
        setImportStatus({
          type: 'error',
          message: res.detail || 'Failed to save evaluation to backend.',
        });
      }
    } catch (error: any) {
      setImportStatus({
        type: 'error',
        message: error?.message || 'Network error communicating with the server.',
      });
    }
  };

  const handleGeminiEvalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportStatus({ type: 'loading', message: `Sending images and prompts directly to Gemini (${geminiModel})...` });

    if (!geminiApiKey.trim()) {
      setImportStatus({ type: 'error', message: 'Please enter a valid Gemini API Key.' });
      return;
    }

    try {
      const response = await fetch('/api/evaluate/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          apiKey: geminiApiKey,
          model: geminiModel,
        }),
      });

      const res = await response.json();
      if (response.ok) {
        setImportStatus({
          type: 'success',
          message: `Successfully generated evaluations directly from Gemini API (${geminiModel})!`,
        });
        onImportSuccess();
      } else {
        setImportStatus({
          type: 'error',
          message: res.detail || 'Gemini direct evaluation request failed.',
        });
      }
    } catch (error: any) {
      setImportStatus({
        type: 'error',
        message: error?.message || 'Network error communicating with Gemini API.',
      });
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
      
      {/* 1. Prompt Copier */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={16} style={{ color: 'var(--accent-gold)' }} />
            <h3 className="card-title">1. Copy Benchmark Prompt</h3>
          </div>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Send to external VLM</span>
        </div>

        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
          Copy the generated evaluation script below and send it to a premium model (Claude 3.5 Sonnet, Gemini 1.5 Pro, or GPT-4o).
          **Make sure to upload Image 1 and Image 2 as attachments together with the prompt!**
        </p>

        <div style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', maxHeight: '240px', overflowY: 'auto' }}>
          <pre style={{ margin: 0, fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
            {session.eval_prompt}
          </pre>
        </div>

        <button onClick={copyPromptToClipboard} className="btn btn-primary" style={{ width: '100%', marginTop: '6px' }}>
          {copiedPrompt ? <Check size={14} /> : <Copy size={14} />}
          <span>{copiedPrompt ? 'Prompt Copied!' : 'Copy Evaluation Prompt'}</span>
        </button>
      </div>

      {/* 2. Paste JSON Reviews or Direct Gemini API */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileJson size={16} style={{ color: 'var(--accent-gold)' }} />
            <h3 className="card-title">2. Quality Import Method</h3>
          </div>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Grades ingestion</span>
        </div>

        {/* Choice Toggle Tab */}
        <div style={{ display: 'flex', backgroundColor: 'var(--bg-input)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
          <button
            type="button"
            onClick={() => { setImportMethod('manual'); setImportStatus({ type: 'idle', message: '' }); }}
            style={{
              flex: 1,
              backgroundColor: importMethod === 'manual' ? 'var(--accent-gold)' : 'transparent',
              color: importMethod === 'manual' ? 'var(--bg-app)' : 'var(--text-muted)',
              border: 'none',
              borderRadius: '4px',
              padding: '6px',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Manual Copy-Paste JSON
          </button>
          <button
            type="button"
            onClick={() => { setImportMethod('gemini_api'); setImportStatus({ type: 'idle', message: '' }); }}
            style={{
              flex: 1,
              backgroundColor: importMethod === 'gemini_api' ? 'var(--accent-gold)' : 'transparent',
              color: importMethod === 'gemini_api' ? 'var(--bg-app)' : 'var(--text-muted)',
              border: 'none',
              borderRadius: '4px',
              padding: '6px',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Direct Gemini API
          </button>
        </div>

        {importMethod === 'manual' ? (
          /* MANUAL JSON PASTE FORM */
          <form onSubmit={handleImportSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', flexGrow: 1 }}>
            <div className="form-group">
              <span className="label-title">Evaluation Provider</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['Claude', 'Gemini', 'ChatGPT'].map((prov) => (
                  <button
                    type="button"
                    key={prov}
                    onClick={() => setProvider(prov)}
                    className="btn"
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      fontSize: '0.75rem',
                      backgroundColor: provider === prov ? 'var(--accent-gold)' : 'transparent',
                      color: provider === prov ? 'var(--bg-app)' : 'var(--text-muted)',
                      border: provider === prov ? '1px solid transparent' : '1px solid var(--border-color)'
                    }}
                  >
                    {prov}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <span className="label-title">Paste JSON Output</span>
              <textarea
                placeholder="Paste JSON evaluations array..."
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                className="anthropic-textarea"
                style={{ flexGrow: 1, minHeight: '130px', fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}
              />
            </div>

            {/* Status Message */}
            {importStatus.type !== 'idle' && (
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'flex-start',
                  padding: '10px',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  backgroundColor: importStatus.type === 'loading' ? 'rgba(255,255,255,0.03)' : importStatus.type === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(244,63,94,0.08)',
                  border: '1px solid ' + (importStatus.type === 'loading' ? 'var(--border-color)' : importStatus.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)'),
                  color: importStatus.type === 'loading' ? 'var(--text-primary)' : importStatus.type === 'success' ? 'var(--accent-emerald)' : '#f43f5e',
                }}
              >
                <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>{importStatus.message}</div>
              </div>
            )}

            <button
              type="submit"
              disabled={importStatus.type === 'loading'}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 'auto' }}
            >
              <Send size={14} />
              <span>Import Scores</span>
            </button>
          </form>
        ) : (
          /* DIRECT GEMINI API FORM */
          <form onSubmit={handleGeminiEvalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', flexGrow: 1 }}>
            <div className="form-group">
              <span className="label-title">Gemini API Key</span>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                className="anthropic-input"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Saved locally in your browser.</span>
            </div>

            <div className="form-group">
              <span className="label-title">Gemini Model</span>
              <select
                value={geminiModel}
                onChange={(e) => setGeminiModel(e.target.value)}
                className="anthropic-input"
                style={{ backgroundColor: 'var(--bg-input)' }}
              >
                <option value="gemini-1.5-flash">gemini-1.5-flash (Fast, recommended)</option>
                <option value="gemini-1.5-pro">gemini-1.5-pro (High reasoning)</option>
                <option value="gemini-2.0-flash-exp">gemini-2.0-flash-exp (Experimental)</option>
                <option value="gemini-2.5-flash">gemini-2.5-flash (Latest Flash)</option>
                <option value="gemini-2.5-pro">gemini-2.5-pro (Latest Pro)</option>
              </select>
            </div>

            {/* Status Message */}
            {importStatus.type !== 'idle' && (
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'flex-start',
                  padding: '10px',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  backgroundColor: importStatus.type === 'loading' ? 'rgba(255,255,255,0.03)' : importStatus.type === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(244,63,94,0.08)',
                  border: '1px solid ' + (importStatus.type === 'loading' ? 'var(--border-color)' : importStatus.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)'),
                  color: importStatus.type === 'loading' ? 'var(--text-primary)' : importStatus.type === 'success' ? 'var(--accent-emerald)' : '#f43f5e',
                }}
              >
                <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ flexGrow: 1 }}>{importStatus.message}</div>
              </div>
            )}

            <button
              type="submit"
              disabled={importStatus.type === 'loading'}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 'auto' }}
            >
              <Play size={14} style={{ fill: 'currentColor' }} />
              <span>Evaluate directly via API</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
