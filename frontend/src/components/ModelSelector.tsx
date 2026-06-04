import React, { useState } from 'react';
import type { OllamaModel } from '../types';
import { RefreshCw, Search, Database } from 'lucide-react';

interface ModelSelectorProps {
  models: OllamaModel[];
  selectedModels: string[];
  isLoading: boolean;
  onToggleModel: (name: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onCopySelected: () => void;
  onRefresh: () => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  models,
  selectedModels,
  isLoading,
  onToggleModel,
  onSelectAll,
  onDeselectAll,
  onCopySelected,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const formatSize = (bytes: number) => {
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  const filteredModels = models.filter((model) =>
    model.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Title & Scan Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label className="label-title">
          <Database size={14} style={{ color: 'var(--accent-gold)' }} />
          <span>Ollama Models</span>
        </label>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="btn btn-secondary"
          style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
          <span>Scan</span>
        </button>
      </div>

      {/* Select All / Clear Selection / Copy Selected */}
      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          onClick={onSelectAll}
          className="btn btn-secondary"
          style={{ flex: 1, padding: '6px 4px', fontSize: '0.7rem', whiteSpace: 'nowrap' }}
        >
          Select All
        </button>
        <button
          onClick={onDeselectAll}
          className="btn btn-secondary"
          style={{ flex: 1, padding: '6px 4px', fontSize: '0.7rem', whiteSpace: 'nowrap' }}
        >
          Clear
        </button>
        <button
          onClick={onCopySelected}
          disabled={selectedModels.length === 0}
          className="btn btn-secondary"
          style={{ flex: 1, padding: '6px 4px', fontSize: '0.7rem', whiteSpace: 'nowrap' }}
        >
          Copy Selected
        </button>
      </div>

      {/* Search Filter */}
      <div style={{ position: 'relative' }}>
        <Search size={14} style={{ position: 'absolute', left: '10px', top: '11px', color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder="Filter local models..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="anthropic-input"
          style={{ paddingLeft: '32px' }}
        />
      </div>

      {/* Models List */}
      <div className="model-list">
        {isLoading ? (
          <div style={{ fontSize: '0.75rem', textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
            Scanning local models...
          </div>
        ) : filteredModels.length === 0 ? (
          <div style={{ fontSize: '0.75rem', textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
            {models.length === 0 ? 'No models found. Check if Ollama is running.' : 'No models match filter.'}
          </div>
        ) : (
          filteredModels.map((model) => {
            const isSelected = selectedModels.includes(model.name);
            return (
              <div
                key={model.name}
                onClick={() => onToggleModel(model.name)}
                className={`model-item ${isSelected ? 'selected' : ''}`}
              >
                <div className="model-info-left">
                  {/* Fixed custom checkbox size */}
                  <div className="checkbox-box">
                    {isSelected && (
                      <svg
                        className="checkbox-icon"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="3.5"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <div className="model-name" title={model.name}>
                      {model.name}
                    </div>
                    <div className="model-meta">
                      {model.parameter_size ? `${model.parameter_size} • ` : ''}
                      {model.quantization_level ? `${model.quantization_level}` : 'GGUF'}
                    </div>
                  </div>
                </div>
                <div className="model-size">
                  {formatSize(model.size)}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
