#!/usr/bin/env bash
# Usage: ./repo_inventory.sh [<repo-url>]  (run from outside a clone to clone temporarily)
set -euo pipefail

REPO_URL="${1:-}"
WORKDIR="$(pwd)/.repo_inventory_tmp"
CLONE_DIR="$WORKDIR/clone"

# If a repo URL is provided, clone to temporary dir; otherwise assume current dir is repo root
if [ -n "$REPO_URL" ]; then
  echo "Cloning $REPO_URL -> $CLONE_DIR"
  rm -rf "$WORKDIR"
  mkdir -p "$WORKDIR"
  git clone --depth 1 "$REPO_URL" "$CLONE_DIR"
  cd "$CLONE_DIR"
else
  echo "No repo URL provided. Assuming current directory is repo root: $(pwd)"
fi

echo
echo "===== Basic repo info ====="
echo "Top-level files and directories:" 
ls -la | sed -n '1,200p'
echo
echo "Git branches (remote + local):"
git fetch --all --prune >/dev/null 2>&1 || true
git branch -a --sort=-committerdate | sed -n '1,200p'
echo
echo "Committers (top 20):"
git shortlog -sn --all | sed -n '1,20p'
echo
echo "Total tracked files and disk usage (top-level):"
git ls-files | wc -l
du -sh .
echo
echo "===== File sizes (largest 50 tracked files) ====="
git ls-files -z | xargs -0 du -h 2>/dev/null | sort -hr | head -n 50 > "$WORKDIR/top_files.txt"
cat "$WORKDIR/top_files.txt"
echo
echo "===== Language breakdown via cloc (if installed) ====="
if command -v cloc >/dev/null 2>&1; then
  cloc --by-file --json . > "$WORKDIR/cloc_by_file.json" || true
  cloc --json . > "$WORKDIR/cloc_summary.json" || true
  cat "$WORKDIR/cloc_summary.json"
else
  echo "cloc not installed; skipping. Install it with 'brew install cloc' or apt."
fi
echo
echo "===== Duplicate-content detection (hashes) ====="
git ls-files -z | xargs -0 sha1sum 2>/dev/null | sort | awk '{
  hash=$1; $1=""; name=substr($0,2);
  files[hash]=files[hash] "||" name; count[hash]++
}
END {
  for (h in count) if (count[h]>1) {
    printf("%s %d -> %s\n", h, count[h], files[h])
  }
}' > "$WORKDIR/duplicates.txt" || true
if [ -s "$WORKDIR/duplicates.txt" ]; then
  echo "Potential duplicate files (same content):"
  cat "$WORKDIR/duplicates.txt"
else
  echo "No duplicate-content files found (or no permission to read)."
fi
echo
echo "===== Same basename in multiple directories (possible duplicates) ====="
git ls-files | awk -F/ '{print $NF}' | sort | uniq -d > "$WORKDIR/duplicate_names.txt" || true
if [ -s "$WORKDIR/duplicate_names.txt" ]; then
  echo "Basenames that repeat across paths (showing full paths):"
  while read -r name; do
    echo "--- $name"
    git ls-files | grep "/\$name$" || true
  done < "$WORKDIR/duplicate_names.txt"
else
  echo "No repeated basenames detected."
fi
echo
echo "Inventory saved to: $WORKDIR (top_files.txt, duplicates.txt, duplicate_names.txt, cloc_*.json)"
echo "If you want, paste the contents of $WORKDIR/top_files.txt and $WORKDIR/duplicates.txt here and I will propose moves."