#!/usr/bin/env bash
set -euo pipefail

# Usage: ./flatten_repo_file.sh [TARGET_DIR]
TARGET="${1:-COLLECT}"
mkdir -p "$TARGET"
export LC_ALL=C

# Recursively find only the wanted files, skipping heavy dirs.
# Note: parentheses are escaped for POSIX sh parsing.
find . \
  -type d \( -name node_modules -o -name .git -o -name dist -o -name build -o -name out -o -name .next -o -name .turbo -o -name coverage \) -prune -false \
  -o -type f \( -name '*.js' -o -name '*.jsx' -o -name '*.html' -o -name '*.sql' -o -name 'index.css' \) -print0 \
| while IFS= read -r -d '' f; do
    rel="${f#./}"
    # flatten path (replace /, \, and spaces with __)
    flat="$(printf '%s' "$rel" | sed 's#[/\\ ]#__#g')"

    dest="$TARGET/$flat"
    if [[ -e "$dest" ]]; then
      # handle collisions by appending a short hash of the original path
      hash="$(printf '%s' "$rel" | shasum | cut -c1-8)"
      if [[ "$flat" == *.* ]]; then
        base="${flat%.*}"
        ext=".${flat##*.}"
      else
        base="$flat"
        ext=""
      fi
      dest="$TARGET/${base}__${hash}${ext}"
    fi

    cp "$f" "$dest"
done

echo "Done. Collected files are in ./$TARGET"
