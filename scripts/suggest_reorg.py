#!/usr/bin/env python3
"""
Suggest reorganization moves based on heuristics.

Outputs git mv commands to stdout (dry-run). Review before applying.
Usage:
  python3 suggest_reorg.py [--apply]
"""
import os
import sys
import argparse
from collections import defaultdict

EXT_MAP = {
    # common mapping heuristics
    '.md': 'docs',
    '.rst': 'docs',
    '.txt': 'docs',
    '.py': 'src',
    '.js': 'src',
    '.ts': 'src',
    '.jsx': 'src',
    '.tsx': 'src',
    '.go': 'src',
    '.java': 'src',
    '.c': 'src',
    '.cpp': 'src',
    '.h': 'src',
    '.sh': 'scripts',
    '.ps1': 'scripts',
    '.yaml': '.github',
    '.yml': '.github',
    '.json': 'config',
    '.dockerfile': 'docker',
    'Dockerfile': 'docker',
    '.lock': 'vendor',
    '.jar': 'bin',
    '.exe': 'bin',
}

ROOT_DIR_PREFER = set(['README.md', 'LICENSE', 'CONTRIBUTING.md', '.gitignore', '.gitattributes', 'Makefile'])

def top_level(item):
    return '/' not in item

def propose_moves(repo_root='.'): 
    files = []
    for root, dirs, filenames in os.walk(repo_root):
        # skip .git
        if '.git' in root.split(os.sep):
            continue
        for fn in filenames:
            path = os.path.join(root, fn)
            rel = os.path.relpath(path, repo_root)
            # skip hidden inventory output or scripts folder
            if rel.startswith('scripts' + os.sep):
                continue
            files.append(rel)
    moves = []
    seen_targets = defaultdict(list)
    for f in files:
        base = os.path.basename(f)
        if base in ROOT_DIR_PREFER and top_level(f):
            continue
        ext = os.path.splitext(base)[1]
        # special-case Dockerfile
        if base == 'Dockerfile':
            ext = 'Dockerfile'
        target_dir = None
        # heuristic 1: if file already in a reasonable dir, skip
        if rel_in_good_place(f):
            continue
        if ext in EXT_MAP:
            target_dir = EXT_MAP[ext]
        else:
            # heuristic: long path or in root -> move to src or scripts
            if top_level(f):
                # move root-level source files into src or scripts depending on shebang/extension
                if ext in ['.sh', '.ps1']:
                    target_dir = 'scripts'
                elif ext in ['.py', '.go', '.js', '.ts', '.java', '.c', '.cpp']:
                    target_dir = 'src'
                elif ext in ['.md', '.rst', '.txt']:
                    target_dir = 'docs'
                else:
                    target_dir = 'misc'
            else:
                # if already nested but name suggests examples or tests
                if '/test' in f or '/tests' in f or f.endswith('_test.py') or f.endswith('_test.go'):
                    target_dir = 'tests'
                else:
                    # leave alone
                    continue
        # produce move only if different from current parent
        if not target_dir:
            continue
        current_parent = os.path.dirname(f)
        if current_parent == target_dir or current_parent == '.' or current_parent == '':
            continue
        newpath = os.path.join(target_dir, os.path.basename(f))
        # avoid move if destination exists
        if os.path.exists(newpath):
            newpath = os.path.join(target_dir, unique_name(os.path.basename(f), target_dir))
        moves.append((f, newpath))
        seen_targets[newpath].append(f)
    return moves

def unique_name(base, target_dir):
    name, ext = os.path.splitext(base)
    i = 1
    while True:
        candidate = f"{name}_{i}{ext}"
        if not os.path.exists(os.path.join(target_dir, candidate)):
            return candidate
        i += 1

def rel_in_good_place(path):
    # heuristics: files in standard-looking dirs are ok
    good_roots = ['docs', 'scripts', 'src', 'tests', 'cmd', 'pkg', 'internal', '.github', 'examples', 'bin', 'config']
    parts = path.split(os.sep)
    if parts[0] in good_roots:
        return True
    return False

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--apply', action='store_true', help='Perform git mv commands (requires clean working tree)')
    parser.add_argument('--dry-run', dest='dry', action='store_true', help='Print moves only')
    args = parser.parse_args()
    moves = propose_moves('.')
    if not moves:
        print("# No moves proposed by heuristics.")
        return
    out = []
    for src, dst in moves:
        dst_dir = os.path.dirname(dst)
        out.append(f"mkdir -p {dst_dir} && git mv --force "{src}" "{dst}"")
    script = "\n".join(out)
    if args.apply:
        # run commands (dangerous) - only do with user's consent
        print("# Applying moves now (apply mode).")
        os.system(script)
    else:
        print("# Proposed git commands (dry-run). Review before running:")
        print(script)

if __name__ == '__main__':
    main()
