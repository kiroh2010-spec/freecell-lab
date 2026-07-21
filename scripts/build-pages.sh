#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCS="$ROOT/docs"

mkdir -p "$DOCS"

python3 - "$ROOT/index.html" "$DOCS/index.html" <<'PY'
from pathlib import Path
import sys
src = Path(sys.argv[1])
dst = Path(sys.argv[2])
html = src.read_text()
# 공개용 GitHub Pages 빌드에서는 아직 불필요한 로컬 홈페이지 링크를 제거한다.
html = html.replace('        <a class="home-link" href="./home.html">홈</a>\n', '')
dst.write_text(html)
PY

cp "$ROOT/style.css" "$DOCS/style.css"
cp "$ROOT/script.js" "$DOCS/script.js"

cat > "$DOCS/README.txt" <<'TXT'
Freecell Lab

This folder is generated for GitHub Pages deployment.
Public entry: index.html
TXT

echo "GitHub Pages files generated in: $DOCS"
