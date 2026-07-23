#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCS="$ROOT/docs"

mkdir -p "$DOCS"

python3 - "$ROOT/index.html" "$DOCS/index.html" "$ROOT/VERSION.json" <<'PY'
from pathlib import Path
import json
import re
import sys
src = Path(sys.argv[1])
dst = Path(sys.argv[2])
version_path = Path(sys.argv[3])
version = json.loads(version_path.read_text())
alpha_version = version['alphaVersion']
html = src.read_text()
# 알파/공개 테스트 빌드에서는 dev 전용 UI를 제거한다.
html = html.replace('        <a class="home-link" href="./home.html">홈</a>\n', '')
html = html.replace('        <button id="promotionTestBtn" type="button">레벨업 테스트</button>\n', '')
html = html.replace('        <button id="devAutoPlayBtn" type="button">자동 플레이</button>\n', '')
# 알파 빌드는 명시적인 알파 버전을 표시하고, 같은 버전을 자산 캐시버스터로 사용한다.
asset_version = f"alpha-{alpha_version.replace('.', '-')}"
html = re.sub(r'href="\./style\.css(?:\?v=[^"]+)?"', f'href="./style.css?v={asset_version}"', html)
html = re.sub(r'src="\./script\.js(?:\?v=[^"]+)?"', f'src="./script.js?v={asset_version}"', html)
html = html.replace('DEV v0.9', f'알파 v{alpha_version}')
dst.write_text(html)
PY

cp "$ROOT/style.css" "$DOCS/style.css"

python3 - "$ROOT/script.js" "$DOCS/script.js" "$ROOT/VERSION.json" <<'PY'
from pathlib import Path
import json
import re
import sys
src = Path(sys.argv[1])
dst = Path(sys.argv[2])
version_path = Path(sys.argv[3])
version = json.loads(version_path.read_text())
js = src.read_text()
# 알파/공개 테스트 빌드에서는 dev 전용 테스트 기능/테스트 데이터 경로를 제거한다.
js = js.replace("const promotionTestBtn = $('promotionTestBtn');\n", "")
js = js.replace("  devAutoPlayActive: false,\n", "")
js = js.replace("  devAutoPlayTimerId: null,\n", "")
js = js.replace("  devAutoPlayLastMoveKey: '',\n", "")
js = js.replace("  devAutoPlayRecentMoveKeys: [],\n", "")
js = js.replace("  devAutoPlayRecentLoopKeys: [],\n", "")
js = js.replace("const devAutoPlayBtn = $('devAutoPlayBtn');\n", "")
js = re.sub(r"\n  if \(result\.testPromotion\) \{\n    return `레벨업 테스트 완료입니다\.[\s\S]*?`;\n  \}\n", "\n", js)
start = js.find("\nfunction runPromotionTest() {")
end = js.find("\nfunction updateNoticeTicker()", start)
if start != -1 and end != -1:
    js = js[:start] + js[end:]
js = js.replace("if (promotionTestBtn) promotionTestBtn.addEventListener('click', runPromotionTest);\n", "")
js = js.replace("  if (state.devAutoPlayActive) stopDevAutoPlay('자동 플레이를 중지하고 새 게임을 시작합니다.');\n", "")
js = js.replace("if (devAutoPlayBtn) devAutoPlayBtn.addEventListener('click', toggleDevAutoPlay);\n", "")
js = js.replace("updateDevAutoPlayButton();\n", "")
js = re.sub(r"const AVAILABLE_ALPHA_VERSION = '[^']*';", f"const AVAILABLE_ALPHA_VERSION = '{version['alphaVersion']}';", js)
js = re.sub(r"const CLIENT_ALPHA_VERSION = '[^']*';", f"const CLIENT_ALPHA_VERSION = '{version['alphaVersion']}';", js)
js = js.replace("versionLabel.textContent = 'DEV v0.9';", f"versionLabel.textContent = '알파 v{version['alphaVersion']}';")
dst.write_text(js)
PY

python3 - "$ROOT/VERSION.json" "$DOCS/VERSION.json" <<'PY'
from datetime import datetime, timezone
from pathlib import Path
import json
import subprocess
import sys
src = Path(sys.argv[1])
dst = Path(sys.argv[2])
version = json.loads(src.read_text())
try:
    commit = subprocess.check_output(['git', 'rev-parse', '--short', 'HEAD'], cwd=src.parent, text=True).strip()
except Exception:
    commit = None
version['channel'] = 'alpha'
version['buildId'] = f"alpha-{version['alphaVersion'].replace('.', '-')}"
version['commit'] = commit
version['builtAt'] = datetime.now(timezone.utc).isoformat()
dst.write_text(json.dumps(version, ensure_ascii=False, indent=2) + '\n')
PY

cat > "$DOCS/README.txt" <<'TXT'
Freecell Lab

This folder is generated for GitHub Pages alpha deployment.
Public entry: index.html
TXT

echo "GitHub Pages alpha files generated in: $DOCS"
