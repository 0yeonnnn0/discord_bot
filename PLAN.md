# 디스코드 대화 참여형 AI 봇 기획서

## 1. 프로젝트 개요

친구들과 함께 사용하는 디스코드 서버에 자연스럽게 대화에 끼어드는 AI 봇을 개발한다.
단순한 명령어 기반이 아닌, 대화 맥락을 파악하고 적절한 타이밍에 반응하는 것을 목표로 한다.

---

## 2. 서버 환경

| 항목 | 내용 |
|------|------|
| 서버 구성원 | 지인 소규모 그룹 |
| 주요 활동 | 게임, 음악/문화 얘기, 일상 수다, 개발 관련 대화 |
| 봇 컨셉 | 재미/개그 위주, 친구처럼 자연스럽게 끼어드는 느낌 |

---

## 3. 핵심 기능

### 3-1. 멘션 반응
- `@봇` 으로 멘션 시 무조건 응답
- 대화 맥락을 기반으로 자연스러운 답변 생성

### 3-2. 확률 기반 자동 참여
- 모든 메시지를 모니터링하다가 **8% 확률**로 자동 끼어들기
- 너무 시끄럽거나 조용하면 `REPLY_CHANCE` 값으로 조절 가능

### 3-3. 대화 맥락 유지
- 채널별 최근 메시지 **10개**를 히스토리로 유지
- 맥락 기반 응답으로 자연스러운 대화 흐름 구현

---

## 4. 기술 스택

| 항목 | 선택 |
|------|------|
| 언어 | Node.js |
| 디스코드 라이브러리 | discord.js |
| AI 백엔드 | Anthropic Claude API (claude-sonnet-4-20250514) |
| 환경변수 관리 | dotenv |
| 프로세스 관리 | pm2 |

---

## 5. 프로젝트 구조

```
discord-bot/
├── index.js        # 봇 메인 로직
├── claude.js       # Claude API 호출
├── .env            # 환경변수
└── package.json
```

---

## 6. 봇 성격 설정 (System Prompt)

```
너는 친구들 디스코드 서버에 끼어있는 봇이야.
말투는 한국어 반말이고, 친구처럼 자연스럽게 대화에 껴들어.
너무 길게 말하지 말고, 재밌게 받아쳐. 가끔 드립도 쳐.
개발자 친구들이라 개발 드립도 환영.
```

> `claude.js`의 `SYSTEM_PROMPT`를 수정하면 성격 커스텀 가능

---

## 7. 인프라

| 항목 | 내용 |
|------|------|
| 호스팅 | 자택 Raspberry Pi |
| 원격 접속 | Tailscale + SSH |
| 비용 | Claude API 비용 외 서버비 없음 |
| 프로세스 관리 | pm2 (재부팅 후 자동 재시작) |

---

## 8. 배포 방법

```bash
# 1. 프로젝트 세팅
git clone https://github.com/레포/discord-bot.git
cd discord-bot
npm install

# 2. 환경변수 설정
nano .env
# DISCORD_TOKEN=your_discord_bot_token
# ANTHROPIC_API_KEY=your_anthropic_api_key

# 3. pm2로 실행
npm install -g pm2
pm2 start index.js --name discord-bot
pm2 save
pm2 startup
```

---

## 9. 운영 명령어

| 목적 | 명령어 |
|------|--------|
| 재시작 | `pm2 restart discord-bot` |
| 로그 확인 | `pm2 logs discord-bot` |
| 상태 확인 | `pm2 status` |

---

## 10. 향후 확장 아이디어

- **키워드 트리거** — 특정 단어 감지 시 특정 반응 (예: "배고파" → 치킨 추천)
- **게임 룰렛** — 오늘 뭐 할지 랜덤 뽑기
- **채널별 성격 분리** — 채널마다 다른 System Prompt 적용
