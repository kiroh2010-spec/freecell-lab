# Freecell Project

현재 집중할 메인 프로젝트입니다.

## 현재 초안

브라우저에서 바로 플레이 가능한 단일 페이지 프리셀 초안입니다.

현재 버전: v0.5

- 진입 파일: `index.html`
- 스타일: `style.css`
- 게임 로직: `script.js`

## 플레이 방법

1. `index.html`을 브라우저로 엽니다.
2. 이동할 카드를 클릭한 뒤 목적지를 클릭합니다.
3. 또는 이동 가능한 카드를 드래그해서 Free Cell, Foundation, Tableau 열에 놓습니다.
4. Tableau의 맨 아래 카드나 Free Cell 카드를 더블클릭하면, 가능한 경우 Foundation으로 바로 이동합니다.
5. `소리 켜짐/꺼짐` 버튼으로 이동 사운드를 제어합니다.

## 현재 구현된 룰

- 52장 셔플 후 8개 Tableau 열에 배치
- 각 Tableau 열의 맨 아래 카드만 이동 가능
- Free Cell 4칸 사용 가능
- Foundation은 A부터 같은 무늬로 오름차순
- Tableau는 다른 색상 + 내림차순으로 이동
- 빈 Tableau 열에는 아무 카드나 이동 가능
- 새 게임 버튼
- Foundation으로 가능한 카드 자동 이동 버튼
- 데스크톱 브라우저 드래그 앤 드롭
- Tableau 맨 아래 카드 또는 Free Cell 카드 더블클릭 시 Foundation 이동
- 겹친 Tableau에서도 숫자+마크가 같이 보이는 카드 상단 표시
- 이동 성공 / Foundation 이동 / 불가능한 이동 / 승리 사운드
- 소리 켜기/끄기 버튼
- Foundation에 카드가 쌓이는 레이어 표현

## 다음 개선 후보

- 여러 장 연속 이동
- 실행 취소 Undo
- 승리 가능 시 자동 정리
- 모바일 터치 UX 개선
- 점수/시간/시드 기록
