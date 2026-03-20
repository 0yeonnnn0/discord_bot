# TORO

디스코드 서버에 자연스럽게 대화에 끼어드는 AI 봇 + 웹 채팅 서비스.

## 주요 기능

### Discord 봇
- **멘션 반응** — `@TORO` 멘션 시 즉시 응답
- **AI 판단 자동 참여** — 모든 메시지를 AI가 보고 끼어들지 판단 (`<SKIP>` 시스템)
- **응답 모드** — 자동(AI 판단) / 간격(타이머+메시지 수) / 음소거 전환 가능
- **대화 맥락 유지** — 채널별 최근 메시지를 히스토리로 유지
- **프리셋 시스템** — 여러 성격/말투를 프리셋으로 관리 (냥체, 김동연 말투, 문영준 말투 등)
- **RAG** — 카카오톡 대화 파일 업로드 → 벡터 임베딩 → 대화 시 참조
- **멀티 AI** — Google Gemini, OpenAI GPT, Anthropic Claude 전환 가능
- **이미지 인식** — 디스코드 이미지 첨부 시 Gemini Vision으로 인식하여 대화에 반영
- **URL 스크래핑** — 메시지 내 링크 내용을 크롤링하여 AI 컨텍스트로 전달

### 슬래시 명령어

| 명령어 | 설명 |
|--------|------|
| `/ask` | AI에게 직접 질문 |
| `/mode [프리셋]` | 프리셋 변경 |
| `/status` | 봇 상태 확인 |
| `/summary [count]` | 최근 대화 AI 요약 (기본 50개) |
| `/draw [prompt]` | AI 이미지 생성 (Gemini) |
| `/say [text]` | TTS 음성 생성 |
| `/mute [minutes]` | 채널 음소거 (0이면 해제) |
| `/mute-status` | 음소거 남은 시간 확인 |
| `/reply [mode]` | 응답 모드 변경 (auto/interval/mute) |

### 웹 채팅 (`/chat`)
- 디스코드 없이도 웹에서 캐릭터와 대화 가능
- 프리셋 전체를 캐릭터로 동적 노출 (TORO 냥체, 김동연, 문영준 등)
- 카카오톡 스타일 UI (노란 말풍선, 하늘색 배경, 프로필 사진)
- 랜덤 한국어 닉네임 자동 생성, 프로필에서 변경 가능
- 모바일 친화적 디자인 + PWA 지원

### 관리자 대시보드 (`/admin`)
- **Overview** — 봇 상태, 메시지/응답 통계, 유저 랭킹, 트렌딩 키워드 (Top 10)
- **Logs** — 메시지/웹채팅/이벤트/에러 로그 뷰어 + 채널 필터 + 페이지네이션
- **Settings** — 3탭 구조:
  - **AI 설정** — AI 모델 선택, 응답 모드, 웹 채팅 설정, API 키 관리 (마스킹), 이미지 인식 토글
  - **프롬프트** — 프리셋 목록 + 드래그 앤 드롭 순서 변경 + 프롬프트 에디터
  - **메모리** — RAG 벡터 관리, 타임라인 차트, 검색 테스트, 채팅 로그 업로드
- **Live Test** — 플로팅 채팅 위젯으로 실시간 봇 응답 테스트

## 기술 스택

| 구분 | 기술 |
|------|------|
| Backend | Node.js + TypeScript + Express |
| Frontend | React 19 + Vite + Recharts |
| Discord | discord.js v14 |
| AI | Google Gemini (기본), OpenAI GPT, Anthropic Claude |
| 벡터 검색 | Vectra (임베딩: gemini-embedding-002) |
| 테스트 | Vitest |
| 배포 | Docker / Docker Compose |

## 프로젝트 구조

```
discord-bot/
├── src/
│   ├── index.ts                  # 진입점
│   ├── bot/
│   │   ├── client.ts             # Discord 클라이언트 + 메시지 핸들링
│   │   ├── commands.ts           # 슬래시 명령어 (/ask, /draw, /mute 등)
│   │   ├── ai.ts                 # AI 응답 생성 (멀티 프로바이더 + fallback)
│   │   ├── prompt.ts             # 프리셋 관리 + 순서 영속화
│   │   ├── history.ts            # 채널별 대화 히스토리 (이미지 데이터 포함)
│   │   ├── rag.ts                # 벡터 검색 / RAG
│   │   ├── queue.ts              # 요청 큐 / 유저별 쿨다운
│   │   ├── scrape.ts             # URL 스크래핑 (링크 내용 추출)
│   │   ├── draw.ts               # 이미지 생성 (Gemini)
│   │   └── tts.ts                # TTS 음성 생성
│   ├── dashboard/
│   │   ├── server.ts             # Express 서버 + 인증 + rate limiting
│   │   ├── chat-logs.ts          # 웹 채팅 로그 저장
│   │   └── routes/api.ts         # API 엔드포인트
│   └── shared/
│       ├── state.ts              # 전역 상태 + 설정 (API 키 포함)
│       └── keys.ts               # API 키 마스킹 유틸
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx               # 라우팅 (공개 /chat + 어드민 /admin/*)
│   │   ├── pages/
│   │   │   ├── Chat.tsx          # 공개 웹 채팅
│   │   │   ├── Dashboard.tsx     # 어드민 Overview
│   │   │   ├── Logs.tsx          # 어드민 Logs
│   │   │   ├── Settings.tsx      # 어드민 Settings (3탭)
│   │   │   └── Login.tsx         # 어드민 Login
│   │   └── components/
│   │       └── Nav.tsx           # 어드민 네비게이션
│   └── public/
│       ├── manifest.json         # PWA 매니페스트
│       └── sw.js                 # Service Worker
│
├── data/                         # 런타임 데이터 (.gitignore)
│   ├── state.json                # 설정 + 통계 + API 키
│   ├── presets.json              # 커스텀 프리셋
│   ├── preset-order.json         # 프리셋 순서
│   ├── active-preset.json        # 활성 프리셋 ID
│   ├── chat-logs.json            # 웹 채팅 로그
│   └── vectors/                  # RAG 벡터 데이터
│
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

## 메시지 처리 흐름

```
디스코드 메시지 도착
  │
  ├─ 봇 메시지 → 무시
  ├─ !모드 명령어 → 프리셋 변경
  │
  ▼
  히스토리 저장 + 통계 + 키워드 추출 + RAG 버퍼 + 이미지 추출
  │
  ├─ @멘션 → 즉시 응답 (URL 스크래핑 + RAG 검색 포함)
  │
  ▼ replyMode 확인
  ├─ "mute" → 종료
  ├─ "auto" → 30초 쿨다운 후 AI 판단 (judgeAndReply)
  └─ "interval" → 타이머 or 메시지 수 충족 시 AI 판단
          │
          ▼ AI 응답
          ├─ "<SKIP>" → 로그에 SKIP 기록
          └─ 답변 → message.reply() + 히스토리에 추가
```

## 보안

- **인증**: `DASHBOARD_SECRET` 기반 세션 인증 (crypto.randomUUID)
- **쿠키**: httpOnly + sameSite: strict
- **Rate Limiting**: 로그인 시도 5회/15분 제한
- **API 키 보호**: 웹에서 마스킹 표시 (`AIza...Mkw`), `/api/config`·`/api/status`에서 키 필드 제외
- **API 키 관리**: Settings에서 웹으로 변경 가능, state.json에 저장 (.env fallback)

## API

| 메서드 | 경로 | 인증 | 설명 |
|--------|------|------|------|
| GET | `/api/chat/characters` | X | 캐릭터 목록 |
| POST | `/api/chat/send` | X | 웹 채팅 메시지 전송 |
| GET | `/api/status` | O | 봇 상태/통계 |
| GET/PUT | `/api/config` | O | 봇 설정 |
| GET/PUT | `/api/keys` | O | API 키 관리 (마스킹) |
| POST | `/api/keys/test` | O | API 키 유효성 검증 |
| GET | `/api/logs` | O | 메시지 로그 |
| GET | `/api/chat-logs` | O | 웹 채팅 로그 |
| GET/POST/PUT/DELETE | `/api/presets/*` | O | 프리셋 CRUD |
| PUT | `/api/presets/reorder` | O | 프리셋 순서 변경 |
| GET/POST/DELETE | `/api/rag/*` | O | RAG 관리 |

## 설치 및 실행

```bash
git clone https://github.com/0yeonnnn0/discord_bot.git
cd discord_bot
npm install
cd frontend && npm install && npm run build && cd ..
```

### 환경변수 설정

```bash
cp .env.example .env
# .env 파일 편집
```

| 변수 | 설명 |
|------|------|
| `DISCORD_TOKEN` | Discord 봇 토큰 |
| `OWNER_ID` | 봇 주인 Discord ID (쉼표로 복수 가능) |
| `DASHBOARD_PORT` | 웹 서버 포트 (기본 3000) |
| `DASHBOARD_SECRET` | 어드민 로그인 비밀번호 |
| `AI_PROVIDER` | `google` / `openai` / `anthropic` |
| `GOOGLE_API_KEY` | Google AI API 키 |
| `OPENAI_API_KEY` | OpenAI API 키 |
| `ANTHROPIC_API_KEY` | Anthropic API 키 |

> API 키는 `.env` 외에도 웹 대시보드 Settings → API Keys에서 변경 가능

### 실행

```bash
# 개발 모드
npm run dev

# 프로덕션
npm run build
npm start

# 테스트
npm test
```

### Docker

```bash
docker compose up -d
```
