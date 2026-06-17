import json
import subprocess
import os

langs = ["en", "es", "id", "ja", "ko", "pt", "ru", "zh"]
commit_hash = "a0e32de29af4dd0652c69055c5f86811bf457704"

for lang in langs:
    file_path = f"lib/i18n/dictionaries/{lang}.json"
    print(f"Processing {lang}.json...")
    
    # Get old privacy object
    cmd = ["git", "show", f"{commit_hash}:{file_path}"]
    try:
        old_content_str = subprocess.check_output(cmd, text=True)
        old_content = json.loads(old_content_str)
        old_privacy = old_content.get("privacy")
        if not old_privacy:
            print(f"Error: 'privacy' object not found in old commit for {lang}")
            continue
    except Exception as e:
        print(f"Error fetching old content for {lang}: {e}")
        continue
    
    # Get current content
    full_path = os.path.abspath(file_path)
    with open(full_path, 'r', encoding='utf-8') as f:
        current_content = json.load(f)
    
    # Replace learn_more with old_privacy
    current_content["learn_more"] = old_privacy
    
    # Save back with 2 spaces indentation and ensure_ascii=False for non-English chars
    with open(full_path, 'w', encoding='utf-8') as f:
        json.dump(current_content, f, ensure_ascii=False, indent=2)
        f.write('\n') # Add trailing newline
    
    print(f"Successfully updated {lang}.json")
