import psutil

def get_ollama_processes():
    ollama_procs = []
    for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
        try:
            name = proc.info['name'] or ''
            name_lower = name.lower()
            cmdline = proc.info['cmdline'] or []
            cmdline_str = ' '.join(cmdline).lower()
            
            if 'ollama' in name_lower or 'ollama' in cmdline_str:
                ollama_procs.append(proc)
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            pass
    return ollama_procs

# Keep track of previous CPU times for processes to calculate process CPU usage accurately without blocking
_proc_cpu_trackers = {}

def get_system_stats():
    # System wide
    cpu_percent = psutil.cpu_percent(interval=None)
    mem = psutil.virtual_memory()
    
    ollama_cpu = 0.0
    ollama_mem_bytes = 0
    
    ollama_procs = get_ollama_processes()
    for proc in ollama_procs:
        try:
            # We call cpu_percent(interval=None) which measures since the last call.
            # This is non-blocking.
            cpu_p = proc.cpu_percent(interval=None)
            ollama_cpu += cpu_p
            ollama_mem_bytes += proc.memory_info().rss
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            pass
            
    cpu_count = psutil.cpu_count() or 1
    
    return {
        "system": {
            "cpu_percent": cpu_percent,
            "memory_total_bytes": mem.total,
            "memory_used_bytes": mem.used,
            "memory_percent": mem.percent
        },
        "ollama": {
            "running": len(ollama_procs) > 0,
            "cpu_percent": round(ollama_cpu, 1),
            "cpu_percent_normalized": round(ollama_cpu / cpu_count, 1),
            "memory_bytes": ollama_mem_bytes,
            "process_count": len(ollama_procs)
        }
    }
