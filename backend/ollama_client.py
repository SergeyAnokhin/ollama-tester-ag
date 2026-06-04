import requests
import json
import base64
import time

OLLAMA_BASE_URL = "http://localhost:11434"

def get_local_models():
    """
    Scans and returns the list of installed Ollama models.
    """
    try:
        response = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
        if response.status_code == 200:
            data = response.json()
            models_list = []
            for item in data.get("models", []):
                details = item.get("details", {})
                models_list.append({
                    "name": item.get("name"),
                    "size": item.get("size", 0),
                    "family": details.get("family", ""),
                    "families": details.get("families", []),
                    "parameter_size": details.get("parameter_size", ""),
                    "quantization_level": details.get("quantization_level", "")
                })
            return models_list
        return []
    except Exception as e:
        print(f"Error scanning Ollama models: {e}")
        return []

def clean_base64_image(base64_str: str) -> str:
    """
    Removes data URI prefix (e.g. data:image/jpeg;base64,) if present.
    """
    if "," in base64_str:
        return base64_str.split(",", 1)[1]
    return base64_str

def run_ollama_test(model: str, prompt: str, images_base64: list) -> dict:
    """
    Runs a test prompt against a specific model with a list of base64 images.
    Measures elapsed time and returns the response.
    """
    cleaned_images = [clean_base64_image(img) for img in images_base64 if img]
    
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False
    }
    
    if cleaned_images:
        payload["images"] = cleaned_images
        
    start_time = time.perf_counter()
    try:
        response = requests.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=1200 # 20 minutes timeout for slow local models (e.g. running on CPU)
        )
        end_time = time.perf_counter()
        elapsed_seconds = end_time - start_time
        
        if response.status_code == 200:
            result_data = response.json()
            return {
                "success": True,
                "response": result_data.get("response", ""),
                "time_seconds": round(elapsed_seconds, 2),
                "error": None
            }
        else:
            return {
                "success": False,
                "response": "",
                "time_seconds": round(elapsed_seconds, 2),
                "error": f"Ollama HTTP {response.status_code}: {response.text}"
            }
    except requests.exceptions.Timeout:
        end_time = time.perf_counter()
        return {
            "success": False,
            "response": "",
            "time_seconds": round(end_time - start_time, 2),
            "error": "Request timed out"
        }
    except Exception as e:
        end_time = time.perf_counter()
        return {
            "success": False,
            "response": "",
            "time_seconds": round(end_time - start_time, 2),
            "error": str(e)
        }
