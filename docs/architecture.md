# System Architecture

The Ollama Vision Model Benchmarker is a local model-testing dashboard built with a decoupled FastAPI python backend and a Vite React + TypeScript frontend.

## Overview

The application is structured to run locally alongside an active Ollama instance. It automates image prompts validation by sequentially querying selected models, measuring times, tracking resources, and aggregating results.

```
+------------------------------------------------------------------------+
|                               Browser                                  |
|                                                                        |
|  +------------------+   +------------------+   +--------------------+  |
|  |    UI Controls   |   |   Live Monitor   |   |   Charts & Evals   |  |
|  +--------+---------+   +--------+---------+   +---------+----------+  |
|           |                      ^                       ^             |
|           | HTTP Config          | WS Stats/Logs         | HTTP JSON   |
|           v                      v                       v             |
+-----------+----------------------+-----------------------+-------------+
|                                                                        |
|                               Backend                                  |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  |                           FastAPI App                            |  |
|  +--------+----------------------+-----------------------+----------+  |
|           |                      |                       |             |
|           v Query tags           v psutil                v generate    |
|  +--------+---------+   +--------+---------+   +---------+----------+  |
|  |  Ollama tags API |   |   System Stats   |   |  Ollama Generate   |  |
|  +------------------+   +------------------+   +--------------------+  |
+------------------------------------------------------------------------+
```

## Folder Layout

| Component | File Path | Purpose |
|---|---|---|
| **Backend** | [backend/app.py](../backend/app.py) | Main FastAPI server routes, WebSocket orchestration, and JSON storage management |
| **Backend** | [backend/sys_stats.py](../backend/sys_stats.py) | Queries system memory/CPU and filters subprocesses to identify Ollama's footprints |
| **Backend** | [backend/ollama_client.py](../backend/ollama_client.py) | Connects to local port 11434 to list tags and post prompt payloads |
| **Frontend** | [frontend/src/App.tsx](../frontend/src/App.tsx) | Root application router and benchmark WebSockets controller |
| **Frontend** | [frontend/src/components/LiveMonitor.tsx](../frontend/src/components/LiveMonitor.tsx) | Dashboard component housing resource gauges and streaming logs console |
| **Frontend** | [frontend/src/components/Charts.tsx](../frontend/src/components/Charts.tsx) | Lightweight custom SVG bar chart builders for benchmark speeds and ratings |
| **Frontend** | [frontend/src/components/ResultsViewer.tsx](../frontend/src/components/ResultsViewer.tsx) | Interactive prompt and response explorer card with tabs for each run |
| **Frontend** | [frontend/src/components/EvalImporter.tsx](../frontend/src/components/EvalImporter.tsx) | Clipboard prompt copier and JSON rating validator panel |

## Key Workflows

### 1. WebSocket Benchmark Loop

1. Frontend initiates a WebSocket connection to `/api/benchmark/ws`.
2. Frontend sends testing configuration (selected models, prompt text, and Base64 images).
3. Backend starts an asynchronous system statistics pusher thread.
4. Backend iterates through models sequentially:
   - For each model, it runs three distinct testing configurations (Run 1: Image 1, Run 2: Image 2, Run 3: Image 1 + 2).
   - In each run, it logs model loading times, computes prompt completion latencies, and gathers response strings.
   - It reports progress details (`run_start`, `run_end`) dynamically over WebSockets.
5. On completion, the backend compiles results, builds the review evaluation prompt, writes stats to `results/runs.json`, sends a `complete` payload, and disconnects.
