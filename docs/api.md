# API Documentation

The backend service runs a REST and WebSocket API on `http://localhost:8000`.

## REST Endpoints

### 1. Health Check
* **URL**: `/api/health`
* **Method**: `GET`
* **Response**:
```json
{
  "status": "ok",
  "timestamp": "2026-06-04T22:00:00.000000"
}
```

### 2. List Local Models
* **URL**: `/api/models`
* **Method**: `GET`
* **Description**: Queries local Ollama daemon for installed tags and returns details.
* **Response**:
```json
[
  {
    "name": "llava:latest",
    "size": 4733363377,
    "family": "llama",
    "families": ["llama", "clip"],
    "parameter_size": "7B",
    "quantization_level": "Q4_0"
  }
]
```

### 3. Get Benchmark Results
* **URL**: `/api/results`
* **Method**: `GET`
* **Description**: Loads historical benchmark runs from `results/runs.json`.
* **Response**: A JSON array of session records.

### 4. Clear Benchmark Results
* **URL**: `/api/results/clear`
* **Method**: `POST`
* **Description**: Empties historical benchmark records.
* **Response**:
```json
{
  "status": "success",
  "message": "History cleared"
}
```

### 5. Import External Review
* **URL**: `/api/evaluate/import`
* **Method**: `POST`
* **Description**: Uploads evaluation scores imported from external models.
* **Payload Schema**:
```json
{
  "sessionId": "uuid-string",
  "provider": "Claude",
  "evaluations": [
    {
      "model": "llava:latest",
      "evaluations": [
        {
          "run_index": 1,
          "score": 4,
          "comment": "Good response"
        }
      ]
    }
  ]
}
```
* **Response**:
```json
{
  "status": "success",
  "message": "Evaluations from Claude imported successfully"
}
```

---

## WebSocket Endpoints

### 1. Run Benchmark WS
* **URL**: `/api/benchmark/ws`
* **Protocol**: `WS`
* **Payload (Client -> Server on connection open)**:
```json
{
  "models": ["llava:latest"],
  "prompt": "Describe this image",
  "image1": "data:image/jpeg;base64,...",
  "image2": "data:image/jpeg;base64,..."
}
```
* **Events Streamed (Server -> Client)**:
  * **Init**:
    ```json
    { "type": "init", "data": { "sessionId": "uuid", "timestamp": "...", "total_models": 1, "total_runs": 3 } }
    ```
  * **System Stats**: (Pushed every 1.0s)
    ```json
    { "type": "stats", "data": { "system": { "cpu_percent": 15.2, "memory_percent": 64.1 }, "ollama": { "running": true, "cpu_percent": 305.5, "memory_bytes": 4829302192 } } }
    ```
  * **Run Start**:
    ```json
    { "type": "run_start", "data": { "model": "llava:latest", "model_index": 0, "run_index": 1, "description": "Image 1" } }
    ```
  * **Run End**:
    ```json
    { "type": "run_end", "data": { "model": "llava:latest", "model_index": 0, "run_index": 1, "result": { "success": true, "time_seconds": 4.52, "response": "Answer text...", "error": null } } }
    ```
  * **Complete**:
    ```json
    { "type": "complete", "data": { "id": "uuid", "prompt": "...", "results": [...] } }
    ```
