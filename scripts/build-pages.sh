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
# 공개용 GitHub Pages 빌드에서는 로컬/테스트 전용 UI를 제거한다.
html = html.replace('        <a class="home-link" href="./home.html">홈</a>\n', '')
html = html.replace('        <button id="promotionTestBtn" type="button">승급 테스트</button>\n', '')
dst.write_text(html)
PY

cp "$ROOT/style.css" "$DOCS/style.css"

python3 - "$ROOT/script.js" "$DOCS/script.js" <<'PY'
from pathlib import Path
import re
import sys
src = Path(sys.argv[1])
dst = Path(sys.argv[2])
js = src.read_text()
# 공개 배포본에서는 로컬 테스트 기능/테스트 데이터 경로를 제거한다.
js = js.replace("const promotionTestBtn = $('promotionTestBtn');\n", "")
js = re.sub(r"\n  if \(result\.testPromotion\) \{\n    return `승급 테스트 완료입니다\.[\s\S]*?`;\n  \}\n", "\n", js)
start = js.find("\nfunction runPromotionTest() {")
end = js.find("\n\nfunction setStatus(message)", start)
if start != -1 and end != -1:
    js = js[:start] + js[end:]
js = js.replace("if (promotionTestBtn) promotionTestBtn.addEventListener('click', runPromotionTest);\n", "")
dst.write_text(js)
PY

cat > "$DOCS/README.txt" <<'TXT'
Freecell Lab

This folder is generated for GitHub Pages deployment.
Public entry: index.html
TXT

echo "GitHub Pages files generated in: $DOCS"
