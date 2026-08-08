import git
import logging
from typing import List, Dict

logger = logging.getLogger(__name__)

def extract_diff(repo_local_path: str, commit_hash: str) -> List[Dict]:
    """
    Use GitPython to run git diff <hash>^ <hash>.
    Parse output into list of {file_path, diff_text, additions, deletions}.
    TRUNCATE: if total diff > 10MB or > 50,000 lines, truncate and log a warning.
    Returns per-file diff objects.
    """
    repo = git.Repo(repo_local_path)
    commit = repo.commit(commit_hash)
    
    # Handle the case where the commit has no parents (initial commit)
    parent = commit.parents[0] if commit.parents else git.NULL_TREE
    
    diffs = parent.diff(commit, create_patch=True)
    
    extracted_diffs = []
    total_lines = 0
    total_bytes = 0
    
    for diff_item in diffs:
        # Stop processing if we've hit our limits
        if total_bytes > 10 * 1024 * 1024 or total_lines > 50000:
            logger.warning(f"Diff for commit {commit_hash} exceeds limits (10MB/50k lines). Truncating remaining files.")
            break
            
        file_path = diff_item.b_path or diff_item.a_path
        
        # GitPython diffs can be bytes or str, handle safely
        diff_text_bytes = diff_item.diff
        if isinstance(diff_text_bytes, bytes):
            try:
                diff_text = diff_text_bytes.decode('utf-8', errors='replace')
            except UnicodeDecodeError:
                diff_text = "<binary file or invalid encoding>"
        else:
            diff_text = diff_text_bytes or ""
            
        # Count additions and deletions from the patch
        additions = sum(1 for line in diff_text.splitlines() if line.startswith('+') and not line.startswith('+++'))
        deletions = sum(1 for line in diff_text.splitlines() if line.startswith('-') and not line.startswith('---'))
        
        lines_in_file = len(diff_text.splitlines())
        bytes_in_file = len(diff_text.encode('utf-8', errors='replace'))
        
        # Enforce limits per file to avoid massive single files blowing past limits silently
        if bytes_in_file > 10 * 1024 * 1024 or lines_in_file > 50000:
             diff_text = diff_text[:50000] + "\n... [TRUNCATED] ..."
             
        extracted_diffs.append({
            "file_path": file_path,
            "diff_text": diff_text,
            "additions": additions,
            "deletions": deletions
        })
        
        total_lines += lines_in_file
        total_bytes += bytes_in_file

    return extracted_diffs
