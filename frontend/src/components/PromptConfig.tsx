import React, { useRef } from 'react';
import { Image as ImageIcon, Trash2, Edit3 } from 'lucide-react';

interface PromptConfigProps {
  prompt: string;
  setPrompt: (val: string) => void;
  image1: string; // Base64
  setImage1: (val: string) => void;
  image2: string; // Base64
  setImage2: (val: string) => void;
}

export const PromptConfig: React.FC<PromptConfigProps> = ({
  prompt,
  setPrompt,
  image1,
  setImage1,
  image2,
  setImage2,
}) => {
  const file1Ref = useRef<HTMLInputElement>(null);
  const file2Ref = useRef<HTMLInputElement>(null);

  const templates = [
    "Describe the contents of this image in detail.",
    "Compare the objects, lighting, and composition of the image.",
    "Perform OCR and extract all readable text in this image.",
    "Analyze the image and return a JSON structure outlining visible colors and shapes."
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, imageSetter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        imageSetter(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const clearImage = (num: 1 | 2) => {
    if (num === 1) {
      setImage1('');
      if (file1Ref.current) file1Ref.current.value = '';
    } else {
      setImage2('');
      if (file2Ref.current) file2Ref.current.value = '';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Prompt Configuration */}
      <div className="form-group">
        <label className="label-title">
          <Edit3 size={14} style={{ color: 'var(--accent-gold)' }} />
          <span>System Prompt</span>
        </label>
        <textarea
          placeholder="Enter benchmark prompt..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          className="anthropic-textarea"
        />
        
        {/* Templates tag buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
          {templates.map((tmpl, idx) => (
            <button
              key={idx}
              onClick={() => setPrompt(tmpl)}
              type="button"
              className="btn btn-secondary"
              style={{
                padding: '3px 8px',
                fontSize: '0.65rem',
                borderRadius: '6px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '145px',
              }}
              title={tmpl}
            >
              {tmpl}
            </button>
          ))}
        </div>
      </div>

      {/* Image Loading Box Grid */}
      <div className="form-group">
        <label className="label-title">
          <ImageIcon size={14} style={{ color: 'var(--accent-gold)' }} />
          <span>Input Images</span>
        </label>

        <div className="images-grid">
          {/* Image 1 Box */}
          <div className="upload-box" onClick={() => !image1 && file1Ref.current?.click()}>
            {image1 ? (
              <div className="preview-container">
                <img src={image1} alt="Image 1 preview" className="preview-img" />
                <button
                  onClick={(e) => { e.stopPropagation(); clearImage(1); }}
                  className="preview-delete-btn"
                  title="Remove Image 1"
                >
                  <Trash2 size={12} />
                </button>
                <div className="preview-meta">Image 1 Loaded</div>
              </div>
            ) : (
              <div className="upload-placeholder">
                <ImageIcon className="upload-icon" />
                <span>Upload Image 1</span>
              </div>
            )}
            <input
              type="file"
              ref={file1Ref}
              accept="image/*"
              onChange={(e) => handleFileChange(e, setImage1)}
              style={{ display: 'none' }}
            />
          </div>

          {/* Image 2 Box */}
          <div className="upload-box" onClick={() => !image2 && file2Ref.current?.click()}>
            {image2 ? (
              <div className="preview-container">
                <img src={image2} alt="Image 2 preview" className="preview-img" />
                <button
                  onClick={(e) => { e.stopPropagation(); clearImage(2); }}
                  className="preview-delete-btn"
                  title="Remove Image 2"
                >
                  <Trash2 size={12} />
                </button>
                <div className="preview-meta">Image 2 Loaded</div>
              </div>
            ) : (
              <div className="upload-placeholder">
                <ImageIcon className="upload-icon" />
                <span>Upload Image 2</span>
              </div>
            )}
            <input
              type="file"
              ref={file2Ref}
              accept="image/*"
              onChange={(e) => handleFileChange(e, setImage2)}
              style={{ display: 'none' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
