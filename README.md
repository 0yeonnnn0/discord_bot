# TORO

디스코드 서버에 자연스럽게 대화에 끼어드는 AI 봇 + 웹 채팅 서비스.

## 주요 기능

### Discord 봇
- **멘션 반응** — `@TORO` 멘션 시 즉시 응답
- **AI 판단 자동 참여** — 모든 메시지를 AI가 보고 끼어들지 판단 (확률 X, `<SKIP>` 시스템)
- **대화 맥락 유지** — 채널별 최근 메시지를 히스토리로 유지
- **프리셋 시스템** — 여러 성격/말투를 프리셋으로 관리 (냥체, 김동연 말투, 문영준 말투 등)
- **RAG** — 카카오톡 대화 파일 업로드 → 벡터 임베딩 → 대화 시 참조
- **멀티 AI** — Anthropic Claude, OpenAI GPT, Google Gemini 전환 가능

### 웹 채팅 (`/chat`)
- 디스코드 없이도 웹에서 캐릭터와 대화 가능
- 프리셋 전체를 캐릭터로 동적 노출 (TORO 냥체, 김동연, 문영준 등)
- 카카오톡 스타일 UI (노란 말풍선, 하늘색 배경, 프로필 사진)
- 랜덤 한국어 닉네임 자동 생성 (random-korean-nickname), 프로필에서 변경 가능
- 모바일 친화적 디자인 (max-width 440px)
- PWA 지원 (홈 화면 추가, 오프라인 대응)
- 모든 대화 로그 자동 저장

### 관리자 대시보드 (`/admin`)
- **Overview** — 봇 상태, 메시지/응답 통계, 유저 랭킹, 트렌딩 키워드
- **Logs** — 메시지, 웹 채팅, 이벤트, 에러 로그 뷰어 + 채널 필터
- **Settings** — AI 모델, 프리셋 관리, RAG 관리, 테스트 채팅

## 기술 스택

| 구분 | 기술 |
|------|------|
| Backend | Node.js + TypeScript + Express |
| Frontend | React 19 + Vite 8 + Tailwind CSS 4 |
| Discord | discord.js v14 |
| AI | Anthropic Claude, OpenAI GPT, Google Gemini |
| 벡터 검색 | Vectra |
| 배포 | Docker / Docker Compose |

## 프로젝트 구조

```
discord-bot/
├── src/
│   ├── index.ts                  # 진입점
│   ├── bot/
│   │   ├── client.ts             # Discord 클라이언트
│   │   ├── ai.ts                 # AI 응답 생성 (멀티 프로바이더)
│   │   ├── prompt.ts             # 프리셋 관리
│   │   ├── history.ts            # 채널별 대화 히스토리
│   │   ├── rag.ts                # 벡터 검색 / RAG
│   │   └── queue.ts              # 요청 큐 / 레이트 리밋
│   ├── dashboard/
│   │   ├── server.ts             # Express 서버 + 인증
│   │   ├── chat-logs.ts          # 웹 채팅 로그 저장
│   │   └── routes/api.ts         # API 엔드포인트
│   └── shared/
│       └── state.ts              # 전역 상태
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx               # 라우팅 (공개 /chat + 어드민 /admin/*)
│   │   ├── pages/
│   │   │   ├── Chat.tsx          # 공개 웹 채팅
│   │   │   ├── Dashboard.tsx     # 어드민 Overview
│   │   │   ├── Logs.tsx          # 어드민 Logs
│   │   │   ├── Settings.tsx      # 어드민 Settings
│   │   │   └── Login.tsx         # 어드민 Login
│   │   └── components/
│   │       └── Nav.tsx           # 어드민 네비게이션
│   └── public/
│       ├── manifest.json         # PWA 매니페스트
│       ├── sw.js                 # Service Worker
│       ├── icon-192.png          # PWA 아이콘
│       └── icon-512.png
│
├── data/                         # 런타임 데이터
│   ├── presets.json
│   ├── active-preset.json
│   ├── chat-logs.json
│   └── vectors/
│
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

## 라우트

### 공개 페이지
| 경로 | 설명 |
|------|------|
| `/chat` | 웹 채팅 (프로필 닉네임 설정 → 캐릭터 선택 → 대화) |

### 어드민 페이지 (인증 필요)
| 경로 | 설명 |
|------|------|
| `/admin` | Overview 대시보드 |
| `/admin/logs` | 메시지/웹채팅/이벤트/에러 로그 |
| `/admin/settings` | 봇 설정, 프리셋, RAG 관리 |
| `/admin/login` | 로그인 |

### API
| 메서드 | 경로 | 인증 | 설명 |
|--------|------|------|------|
| GET | `/api/chat/characters` | X | 캐릭터 목록 |
| POST | `/api/chat/send` | X | 웹 채팅 메시지 전송 |
| GET | `/api/status` | O | 봇 상태/통계 |
| GET | `/api/logs` | O | 메시지 로그 |
| GET | `/api/chat-logs` | O | 웹 채팅 로그 |
| PUT | `/api/config` | O | 봇 설정 변경 |
| GET/POST/PUT/DELETE | `/api/presets/*` | O | 프리셋 CRUD |
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
| `REPLY_CHANCE` | (레거시) AI 판단 모드에서는 미사용 |
| `AI_PROVIDER` | `anthropic` / `openai` / `google` |
| `ANTHROPIC_API_KEY` | Anthropic API 키 |
| `GOOGLE_API_KEY` | Google AI API 키 |
| `OPENAI_API_KEY` | OpenAI API 키 |

### 실행

```bash
# 개발 모드
npm run dev

# 프로덕션
npm run build
npm start
```

### Docker

```bash
docker compose up -d
```
