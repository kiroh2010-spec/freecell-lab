# GitHub Pages 배포 계획

목표: 프리셀 게임을 GitHub Pages로 외부 접속 가능한 웹게임으로 배포한다.

현재는 실제 공개하지 않고, 공개 직전까지 필요한 구조만 준비한다.

## 추천 방식

GitHub Pages의 `main` 브랜치 + `/docs` 폴더 배포 방식을 사용한다.

이유:

- 루트 전체를 공개하지 않아도 된다.
- 개발용 파일, ZIP, 메모, 로드맵 등을 실수로 공개할 위험이 줄어든다.
- `/docs` 안에는 공개할 파일만 복사한다.

## 공개되는 파일

`docs/` 폴더 안의 파일만 공개한다.

현재 공개 후보:

- `docs/index.html`
- `docs/style.css`
- `docs/script.js`

현재 제외:

- `home.html`, `home.css` — 아직 불필요
- 공개용 `docs/index.html`에서는 로컬 홈페이지로 가는 `홈` 링크를 자동 제거한다.
- `freecell-iphone-*.zip`
- `freecell-mobile-*.html`
- `README.md`, `ROADMAP.md`
- `deploy/`, `scripts/`

## 배포 전 로컬 준비

```bash
cd projects/active/freecell
./scripts/build-pages.sh
```

이 명령은 현재 게임 파일을 `docs/`로 복사한다.

## GitHub 저장소 생성 후 절차

1. GitHub에서 새 repository 생성
   - 예: `freecell-lab`
   - 공개하려면 Public repository
   - 처음에는 Private으로 두고 준비해도 됨

2. 로컬에서 원격 저장소 연결

```bash
git remote add origin git@github.com:<username>/freecell-lab.git
git branch -M main
git push -u origin main
```

3. GitHub repository에서 Pages 설정

- Settings
- Pages
- Build and deployment
- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/docs`
- Save

4. 배포 URL 확인

보통 아래 형태가 된다.

```text
https://<username>.github.io/freecell-lab/
```

## 업데이트 방식

게임을 수정한 뒤:

```bash
cd projects/active/freecell
./scripts/build-pages.sh
git add index.html style.css script.js README.md docs scripts deploy
git commit -m "Update freecell game"
git push
```

공개 전에 `docs/index.html`을 열어서 로컬 전용 링크나 테스트 파일 링크가 섞이지 않았는지 확인한다.

GitHub Pages가 자동으로 다시 배포한다.

## 나중에 도메인 연결

원하면 GitHub Pages에 커스텀 도메인을 연결할 수 있다.

예:

```text
freecell.example.com
```

그 단계에서는 DNS 설정과 GitHub Pages Custom domain 설정이 필요하다.

## 주의사항

- GitHub Pages로 배포하면 URL을 아는 사람은 접속할 수 있다.
- Public repository면 코드도 공개된다.
- 게임 기록/랭킹/로그인은 현재 없음. 전부 브라우저 안에서만 동작한다.
- 서버 기능이 필요해지면 GitHub Pages만으로는 부족하고 별도 백엔드가 필요하다.
