export interface OllamaModel {
  name: string;
  size: number;
  family: string;
  families: string[];
  parameter_size: string;
  quantization_level: string;
}

export interface RunData {
  run_index: number;
  description: string;
  success: boolean;
  time_seconds: number;
  response: string;
  error: string | null;
}

export interface ModelResult {
  model: string;
  runs: RunData[];
}

export interface LlmEvaluation {
  run_index: number;
  score: number;
  comment: string;
}

export interface ModelEvaluation {
  model: string;
  evaluations: LlmEvaluation[];
}

export interface BenchmarkSession {
  id: string;
  timestamp: string;
  prompt: string;
  images: {
    image1: string; // Base64
    image2: string; // Base64
  };
  results: ModelResult[];
  eval_prompt: string;
  evaluations: Record<string, ModelEvaluation[]>; // Key is provider name (e.g. Claude, Gemini)
}

export interface CpuMemStats {
  cpu_percent: number;
  memory_percent: number;
}

export interface SysStats {
  system: {
    cpu_percent: number;
    memory_total_bytes: number;
    memory_used_bytes: number;
    memory_percent: number;
  };
  ollama: {
    running: boolean;
    cpu_percent: number;
    cpu_percent_normalized: number;
    memory_bytes: number;
    process_count: number;
  };
}

export interface WSMessage {
  type: 'init' | 'run_start' | 'run_end' | 'stats' | 'complete' | 'error';
  message?: string;
  data?: any;
}
