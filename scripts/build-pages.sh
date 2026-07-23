#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCS="$ROOT/docs"

rm -rf "$DOCS"
mkdir -p "$DOCS/alpha"

python3 - "$ROOT" "$DOCS" <<'PY'
from datetime import datetime, timezone
from pathlib import Path
import json
import re
import shutil
import subprocess
import sys

root = Path(sys.argv[1])
docs = Path(sys.argv[2])
version = json.loads((root / 'VERSION.json').read_text())

try:
    commit = subprocess.check_output(['git', 'rev-parse', '--short', 'HEAD'], cwd=root, text=True).strip()
except Exception:
    commit = None


def remove_public_dev_html(html: str) -> str:
    html = html.replace('        <a class="home-link" href="./home.html">홈</a>\n', '')
    html = html.replace('        <button id="promotionTestBtn" type="button">레벨업 테스트</button>\n', '')
    html = html.replace('        <button id="devScoreViewBtn" type="button">개편 랭킹</button>\n', '')
    html = html.replace('        <button id="devAutoPlayBtn" type="button">자동 플레이</button>\n', '')
    html = re.sub(r"\n        <div id=\"devNoticeEditorPanel\"[\s\S]*?\n        </div>", "", html, count=1)
    html = html.replace('          <button id="devNoticeEditorEditBtn" type="button">편집</button>\n', '')
    html = html.replace('          <button id="devNoticeEditorSaveBtn" type="button" hidden>저장</button>\n', '')
    return html


def remove_public_dev_js(js: str) -> str:
    js = js.replace("const promotionTestBtn = $('promotionTestBtn');\n", "")
    js = js.replace("const devScoreViewBtn = $('devScoreViewBtn');\n", "")
    js = js.replace("const devNoticeEditorPanel = $('devNoticeEditorPanel');\n", "")
    js = js.replace("const devNoticeEditorInput = $('devNoticeEditorInput');\n", "")
    js = js.replace("const devNoticeEditorStatus = $('devNoticeEditorStatus');\n", "")
    js = js.replace("const devNoticeEditorEditBtn = $('devNoticeEditorEditBtn');\n", "")
    js = js.replace("const devNoticeEditorSaveBtn = $('devNoticeEditorSaveBtn');\n", "")
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
    start = js.find("\nasync function enableDevNoticeEditMode() {")
    end = js.find("\nfunction toggleDevAutoPlay()", start)
    if start != -1 and end != -1:
        js = js[:start] + js[end:]
    js = js.replace("  disableDevNoticeEditMode();\n", "")
    start = js.find("\nfunction updateDevScoreViewButton() {")
    end = js.find("\nfunction updateDevAutoPlayButton()", start)
    if start != -1 and end != -1:
        js = js[:start] + js[end:]
    js = js.replace("if (promotionTestBtn) promotionTestBtn.addEventListener('click', runPromotionTest);\n", "")
    js = js.replace("if (devScoreViewBtn) devScoreViewBtn.addEventListener('click', toggleDevScoreView);\n", "")
    js = js.replace("if (devNoticeEditorEditBtn) devNoticeEditorEditBtn.addEventListener('click', enableDevNoticeEditMode);\n", "")
    js = js.replace("if (devNoticeEditorSaveBtn) devNoticeEditorSaveBtn.addEventListener('click', saveDevNoticeEditor);\n", "")
    js = js.replace("  if (state.devAutoPlayActive) stopDevAutoPlay('자동 플레이를 중지하고 새 게임을 시작합니다.');\n", "")
    js = js.replace("if (devAutoPlayBtn) devAutoPlayBtn.addEventListener('click', toggleDevAutoPlay);\n", "")
    js = js.replace("updateDevScoreViewButton();\n", "")
    js = js.replace("updateDevAutoPlayButton();\n", "")
    return js


def build_channel(out_dir: Path, channel: str, visible_label: str, public_version: str, update_version: str, notes: list[dict], build_prefix: str):
    out_dir.mkdir(parents=True, exist_ok=True)
    asset_version = f"{build_prefix}-{public_version.replace('.', '-')}"

    html = remove_public_dev_html((root / 'index.html').read_text())
    html = re.sub(r'href="\./style\.css(?:\?v=[^"]+)?"', f'href="./style.css?v={asset_version}"', html)
    html = re.sub(r'src="\./script\.js(?:\?v=[^"]+)?"', f'src="./script.js?v={asset_version}"', html)
    html = html.replace('DEV v0.9', visible_label)
    html = re.sub(r'>패치 v[0-9]+(?:\.[0-9]+)?</button>', f'>패치 v{public_version}</button>', html)
    (out_dir / 'index.html').write_text(html)

    css = (root / 'style.css').read_text()
    css = css.replace('.operator-notice-card,\n.dev-notice-editor-card,\n.patch-notes-card', '.operator-notice-card,\n.patch-notes-card')
    css = re.sub(r"\n\.dev-notice-editor-help,[\s\S]*?\.dev-notice-editor-input:focus \{[\s\S]*?\n\}", "", css, count=1)
    (out_dir / 'style.css').write_text(css)
    shutil.copyfile(root / 'NOTICE.json', out_dir / 'NOTICE.json')

    js = remove_public_dev_js((root / 'script.js').read_text())
    js = js.replace('const DEV_FORCE_SPECIAL_UNLOCK = true;', 'const DEV_FORCE_SPECIAL_UNLOCK = false;')
    if channel == 'alpha':
        js = js.replace("  scoreViewMode: 'current',", "  scoreViewMode: 'reform',")
    notes_json = json.dumps(notes, ensure_ascii=False, indent=2)
    js = re.sub(r"const PATCH_NOTES = \[[\s\S]*?\];\nconst CURRENT_PATCH_NOTE_VERSION", f"const PATCH_NOTES = {notes_json};\nconst CURRENT_PATCH_NOTE_VERSION", js, count=1)
    js = re.sub(r"const AVAILABLE_ALPHA_VERSION = '[^']*';", f"const AVAILABLE_ALPHA_VERSION = '{update_version}';", js)
    js = re.sub(r"const CLIENT_ALPHA_VERSION = '[^']*';", f"const CLIENT_ALPHA_VERSION = '{public_version}';", js)
    js = js.replace("versionLabel.textContent = 'DEV v0.9';", f"versionLabel.textContent = '{visible_label}';")
    (out_dir / 'script.js').write_text(js)

    if channel == 'beta':
        out_version = dict(version)
        out_version['patchNotes'] = notes
        out_version['channel'] = 'beta'
        out_version['buildId'] = f"beta-{public_version.replace('.', '-')}"
    else:
        out_version = {
            'devVersion': version['devVersion'],
            'alphaVersion': public_version,
            'betaVersion': version['betaVersion'],
            'launchVersion': version['launchVersion'],
            'patchNotes': notes,
            'channels': version['channels'],
            'versionPolicy': version['versionPolicy'],
            'channel': 'alpha',
            'buildId': f"alpha-{public_version.replace('.', '-')}",
        }
    out_version['commit'] = commit
    out_version['builtAt'] = datetime.now(timezone.utc).isoformat()
    (out_dir / 'VERSION.json').write_text(json.dumps(out_version, ensure_ascii=False, indent=2) + '\n')

    (out_dir / 'README.txt').write_text(f"Freecell Lab\n\nGenerated GitHub Pages {channel} deployment.\nPublic entry: index.html\n")


build_channel(
    docs,
    'beta',
    version['channels']['beta']['visibleLabel'],
    version['betaVersion'],
    version['betaVersion'],
    version['patchNotes'],
    'beta',
)

build_channel(
    docs / 'alpha',
    'alpha',
    version['channels']['alpha']['visibleLabel'],
    version['alphaPublicVersion'],
    version['alphaPublicVersion'],
    version.get('alphaPatchNotes') or version['patchNotes'],
    'alpha',
)
PY

echo "GitHub Pages beta files generated in: $DOCS"
echo "GitHub Pages alpha files generated in: $DOCS/alpha"
