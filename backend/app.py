from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
import uuid
import os
import json
from datetime import datetime

from sys_stats import get_system_stats
from ollama_client import get_local_models, run_ollama_test

app = FastAPI(title="Ollama Vision Model Benchmarker")

# Setup CORS for development frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

RESULTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "results")
RESULTS_FILE = os.path.join(RESULTS_DIR, "runs.json")

# Ensure results directory exists
os.makedirs(RESULTS_DIR, exist_ok=True)
if not os.path.exists(RESULTS_FILE):
    with open(RESULTS_FILE, "w", encoding="utf-8") as f:
        json.dump([], f)

class EvalItem(BaseModel):
    score: int
    comment: str

class RunEval(BaseModel):
    model: str
    evaluations: list # List of objects containing run_index (1,2,3), score, comment

class ExternalEvalImport(BaseModel):
    sessionId: str
    provider: str # e.g. Claude, Gemini, ChatGPT
    evaluations: list # list of RunEval dicts

def load_results():
    try:
        with open(RESULTS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []

def save_results(data):
    try:
        with open(RESULTS_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Error saving results: {e}")

def generate_external_prompt(prompt: str, results_list: list) -> str:
    """
    Generates a prompt for external LLM evaluation based on model responses.
    """
    model_answers_block = ""
    for model_res in results_list:
        model_name = model_res.get("model")
        runs = model_res.get("runs", [])
        
        model_answers_block += f"\n=== MODEL: {model_name} ===\n"
        for run in runs:
            run_idx = run.get("run_index")
            desc = run.get("description")
            resp = run.get("response")
            err = run.get("error")
            
            model_answers_block += f"--- Run {run_idx} ({desc}) ---\n"
            if err:
                model_answers_block += f"ERROR: {err}\n"
            else:
                model_answers_block += f"ANSWER: {resp}\n"
            model_answers_block += "\n"

    eval_prompt = f"""You are an expert evaluator of Vision Language Models (VLMs).
Below is a prompt that was sent to several local models, along with two images they analyzed (Image 1 and Image 2), and their responses for three different runs:
- Run 1: Prompt was run with Image 1.
- Run 2: Prompt was run with Image 2.
- Run 3: Prompt was run with BOTH Image 1 and Image 2.

Here is the original prompt:
"{prompt}"

Below are the responses of the models. For each model, review their answers against the images provided, and evaluate them based on:
1. Accuracy: Are the objects/actions/details described in the images correct? Are there hallucinations?
2. Detail: Did the model describe the image fully and answer the prompt thoroughly?
3. Multi-image comprehension: For Run 3, did the model properly process and contrast both images, or did it confuse them?

Rate each response on a scale from 0 (completely wrong, hallucinated, or failed) to 5 (excellent, highly accurate, and detailed).

Please output your evaluation strictly as a JSON array matching the schema below. Do not include markdown formatting or explanations outside the JSON code block.

JSON Output Schema:
[
  {{
    "model": "model_name",
    "evaluations": [
      {{
        "run_index": 1,
        "score": 4,
        "comment": "Accurately described the main object but missed some background details."
      }},
      {{
        "run_index": 2,
        "score": 3,
        "comment": "Missed the text on the sign."
      }},
      {{
        "run_index": 3,
        "score": 5,
        "comment": "Correctly identified both images and pointed out the differences between them."
      }}
    ]
  }}
]

Model Answers:
{model_answers_block}
"""
    return eval_prompt

@app.get("/api/health")
def health_check():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

@app.get("/api/models")
def list_models():
    return get_local_models()

@app.get("/api/results")
def get_results():
    return load_results()

@app.post("/api/results/clear")
def clear_results():
    save_results([])
    return {"status": "success", "message": "History cleared"}

@app.post("/api/evaluate/import")
def import_evaluation(data: ExternalEvalImport):
    results = load_results()
    found = False
    for session in results:
        if session.get("id") == data.sessionId:
            if "evaluations" not in session:
                session["evaluations"] = {}
            
            # Save or overwrite this provider's evaluations
            session["evaluations"][data.provider] = [item.dict() for item in data.evaluations]
            found = True
            break
            
    if not found:
        raise HTTPException(status_code=404, detail="Benchmark session not found")
        
    save_results(results)
    return {"status": "success", "message": f"Evaluations from {data.provider} imported successfully"}

class GeminiEvalRequest(BaseModel):
    sessionId: str
    apiKey: str
    model: str

def parse_image_data(base64_str: str):
    if "data:" in base64_str and ";base64," in base64_str:
        parts = base64_str.split(";base64,")
        mime = parts[0].replace("data:", "").split(";")[0]
        raw = parts[1]
        return mime, raw
    return "image/jpeg", base64_str

@app.post("/api/evaluate/gemini")
def evaluate_with_gemini(data: GeminiEvalRequest):
    import requests
    results = load_results()
    session_index = -1
    for idx, session in enumerate(results):
        if session.get("id") == data.sessionId:
            session_index = idx
            break
            
    if session_index == -1:
        raise HTTPException(status_code=404, detail="Benchmark session not found")
        
    session = results[session_index]
    eval_prompt = session.get("eval_prompt", "")
    if not eval_prompt:
        raise HTTPException(status_code=400, detail="Evaluation prompt not generated for this session")
        
    parts = [{"text": eval_prompt}]
    
    # Image 1
    image1 = session.get("images", {}).get("image1", "")
    if image1:
        mime, raw = parse_image_data(image1)
        parts.append({
            "inlineData": {
                "mimeType": mime,
                "data": raw
            }
        })
        
    # Image 2
    image2 = session.get("images", {}).get("image2", "")
    if image2:
        mime, raw = parse_image_data(image2)
        parts.append({
            "inlineData": {
                "mimeType": mime,
                "data": raw
            }
        })
        
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{data.model}:generateContent?key={data.apiKey}"
    
    try:
        response = requests.post(url, json={
            "contents": [{"parts": parts}],
            "generationConfig": {
                "responseMimeType": "application/json"
            }
        }, timeout=95)
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Gemini API returned error: {response.text}"
            )
            
        gemini_res = response.json()
        text_output = ""
        try:
            text_output = gemini_res["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError):
            raise HTTPException(
                status_code=500,
                detail=f"Unexpected Gemini API response structure: {json.dumps(gemini_res)}"
            )
            
        try:
            parsed_eval = json.loads(text_output)
        except Exception:
            clean_text = text_output.strip()
            if clean_text.startswith("```"):
                clean_text = clean_text.replace("```json", "").replace("```", "").strip()
            parsed_eval = json.loads(clean_text)
            
        if not isinstance(parsed_eval, list):
            raise ValueError("Gemini response is not a JSON list")
            
        provider_name = f"Gemini ({data.model})"
        if "evaluations" not in session:
            session["evaluations"] = {}
            
        session["evaluations"][provider_name] = parsed_eval
        save_results(results)
        
        return {
            "status": "success",
            "message": f"Successfully evaluated session using {data.model}",
            "evaluations": parsed_eval
        }
        
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="Request to Gemini API timed out")
    except ValueError as val_err:
        raise HTTPException(status_code=422, detail=f"Gemini output is not a valid evaluation list: {str(val_err)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/api/benchmark/ws")
async def benchmark_websocket(websocket: WebSocket):
    await websocket.accept()
    
    is_running = True
    control_state = {"paused": False, "stopped": False}
    
    async def stats_pusher():
        try:
            while is_running:
                stats = get_system_stats()
                await websocket.send_json({
                    "type": "stats", 
                    "data": stats,
                    "control": {
                        "paused": control_state["paused"],
                        "stopped": control_state["stopped"]
                    }
                })
                await asyncio.sleep(1.0)
        except Exception as e:
            print(f"Stats pusher error: {e}")

    async def ws_reader():
        nonlocal is_running
        try:
            while is_running:
                message_text = await websocket.receive_text()
                data = json.loads(message_text)
                if data.get("type") == "control":
                    action = data.get("action")
                    if action == "pause":
                        control_state["paused"] = True
                    elif action == "resume":
                        control_state["paused"] = False
                    elif action == "stop":
                        control_state["stopped"] = True
                        is_running = False
        except Exception:
            pass

    stats_task = None
    reader_task = None
    
    try:
        config_data = await websocket.receive_text()
        config = json.loads(config_data)
        
        models = config.get("models", [])
        prompt = config.get("prompt", "")
        image1 = config.get("image1", "")
        image2 = config.get("image2", "")
        
        if not models:
            await websocket.send_json({"type": "error", "message": "No models selected"})
            await websocket.close()
            return
            
        session_id = str(uuid.uuid4())
        session_timestamp = datetime.now().isoformat()
        
        stats_task = asyncio.create_task(stats_pusher())
        reader_task = asyncio.create_task(ws_reader())
        
        results_summary = []
        
        await websocket.send_json({
            "type": "init",
            "data": {
                "sessionId": session_id,
                "timestamp": session_timestamp,
                "total_models": len(models),
                "total_runs": len(models) * 3
            }
        })
        
        for m_idx, model in enumerate(models):
            if control_state["stopped"]:
                break
                
            model_results = {
                "model": model,
                "runs": []
            }
            
            runs_setup = [
                {"run_index": 1, "description": "Image 1", "images": [image1]},
                {"run_index": 2, "description": "Image 2", "images": [image2]},
                {"run_index": 3, "description": "Image 1 + Image 2", "images": [image1, image2]}
            ]
            
            for run_setup in runs_setup:
                while control_state["paused"] and not control_state["stopped"]:
                    await asyncio.sleep(0.5)
                    
                if control_state["stopped"]:
                    break
                    
                run_idx = run_setup["run_index"]
                desc = run_setup["description"]
                imgs = run_setup["images"]
                
                await websocket.send_json({
                    "type": "run_start",
                    "data": {
                        "model": model,
                        "model_index": m_idx,
                        "run_index": run_idx,
                        "description": desc
                    }
                })
                
                test_result = await asyncio.to_thread(
                    run_ollama_test, model, prompt, imgs
                )
                
                run_data = {
                    "run_index": run_idx,
                    "description": desc,
                    "success": test_result["success"],
                    "time_seconds": test_result["time_seconds"],
                    "response": test_result["response"],
                    "error": test_result["error"]
                }
                
                model_results["runs"].append(run_data)
                
                await websocket.send_json({
                    "type": "run_end",
                    "data": {
                        "model": model,
                        "model_index": m_idx,
                        "run_index": run_idx,
                        "result": run_data
                    }
                })
                
                await asyncio.sleep(0.5)
                
            if model_results["runs"]:
                results_summary.append(model_results)
                
            if control_state["stopped"]:
                break
                
        is_running = False
        if stats_task:
            stats_task.cancel()
        if reader_task:
            reader_task.cancel()
            
        ext_prompt = generate_external_prompt(prompt, results_summary)
        
        session_record = {
            "id": session_id,
            "timestamp": session_timestamp,
            "prompt": prompt,
            "images": {
                "image1": image1,
                "image2": image2
            },
            "results": results_summary,
            "eval_prompt": ext_prompt,
            "evaluations": {},
            "stopped_early": control_state["stopped"]
        }
        
        if results_summary:
            history = load_results()
            history.insert(0, session_record)
            save_results(history)
            
        await websocket.send_json({
            "type": "complete",
            "data": session_record
        })
        
    except WebSocketDisconnect:
        print("WebSocket disconnected by client")
    except Exception as e:
        print(f"WS error: {e}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
    finally:
        is_running = False
        if stats_task and not stats_task.done():
            stats_task.cancel()
        if reader_task and not reader_task.done():
            reader_task.cancel()
        try:
            await websocket.close()
        except Exception:
            pass
