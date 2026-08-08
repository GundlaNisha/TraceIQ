import json
import os
import subprocess


def ripgrep_search(query: str, snapshot_dir: str) -> list[dict]:
    """
    Uses the system ripgrep (rg) binary to do ultra-fast exact keyword searches.
    We NEVER use shell=True to completely avoid shell injection vulnerabilities.
    """
    try:
        result = subprocess.run(
            ["rg", "--json", "-i", "--max-count", "5", query, snapshot_dir],
            capture_output=True,
            text=True,
            shell=False,
            check=False
        )
    except FileNotFoundError:
        # If 'rg' isn't installed on the system, gracefully degrade
        return []
        
    items = []
    for line in result.stdout.splitlines():
        if not line.strip():
            continue
        try:
            data = json.loads(line)
            if data.get("type") == "match":
                file_path = data["data"]["path"]["text"]
                # Clean up the path so it's relative to the repo root
                if file_path.startswith(snapshot_dir):
                    file_path = os.path.relpath(file_path, snapshot_dir)
                    
                # Strip the random temp directory root (e.g. 'tmpb5t11okc/...')
                path_parts = file_path.split("/", 1)
                clean_path = path_parts[1] if len(path_parts) > 1 else file_path
                    
                snippet = data["data"]["lines"]["text"].strip()
                
                items.append({
                    "file_path": clean_path,
                    "match_type": "exact",
                    "snippet": snippet,
                    "score": 1.0
                })
        except Exception:
            continue
            
    return items
