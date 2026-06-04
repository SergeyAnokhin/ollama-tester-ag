# Ollama Vision Model Benchmarker

An interactive, premium web application to benchmark local Ollama vision models sequentially across three setups (Image 1, Image 2, and both images) using a single prompt. It features real-time resource tracking, dynamic animated SVG charts, external LLM evaluation generator, and score comparing.

## Documentation Index

| Document | Description |
|---|---|
| [CLAUDE.md](file:///c:/REPOS/ollama-tester-ag/GEMINI.md) | AI assistant behavioral rules and constraints |
| [Architecture Documentation](file:///c:/REPOS/ollama-tester-ag/docs/architecture.md) | Folder layout, data streams, and subcomponents design |
| [API Documentation](file:///c:/REPOS/ollama-tester-ag/docs/api.md) | Endpoint specifications and WebSocket message formats |

---

## Getting Started

### Prerequisites
- [Ollama](https://ollama.com/) installed and running locally on port `11434`.
- Python 3.10+
- Node.js 18+

### Setup & Running the Backend
1. Open a terminal in the root folder.
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv .venv
   .venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```
4. Start the FastAPI server:
   ```bash
   cd backend
   ..\.venv\Scripts\uvicorn app:app --reload --host 127.0.0.1 --port 8000
   ```

### Setup & Running the Frontend
1. Open a new terminal in the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Access the web interface in your browser at `http://localhost:5173`.