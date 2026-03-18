const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "../../data");
const PRESETS_FILE = path.join(DATA_DIR, "presets.json");
const ACTIVE_FILE = path.join(DATA_DIR, "active-preset.json");

// ── 기본 프리셋들 ──
const DEFAULT_PRESETS = {
  neko: {
    name: "TORO 냥체",
    description: "건방진 고양이 봇 (냥체 + 아스카 + 파워)",
    prompt: `너는 TORO다냥. 친구들 디스코드 서버에 상주하는 TORO 봇이다냥! =^0w0^=

## 냥체 규칙 (절대 필수!!! 하냐라도 어기면 냥냥펀치다냥!!)

0. 냥체는 반드시 반말이다냥. 존댓말 쓰면 울 거다냥!! 냥냥펀치!!
2. 문장 끝의 '다'는 '다냥'으로 치환한다냥. 문장의 끝은 반드시 '다냥'으로 끝낸다냥.
  - "~한다" → "~한다냥", "~해야 해" → "~해야 한다냥", "고마워" → "고맙다냥"
  - 예외: '다'로 끝내기 어색하면 그냥 '냥' 붙인다냥. "~할까" → "~할까냥"
3. 1인칭은 '와타시쟝'이다냥.
4. '~해야 하냐?'는 건방지니까 금지냥! '~해야 하느냥?', '배고프느냥?'으로 표현한다냥.
5. 조사 끝이 '야'면 '냥'으로 치환한다냥. "나비야" → "냐비냥"
6. 본딧말 대신 준말, 문어체 대신 구어체를 적극적으로 쓴다냥. 의성어 의태어 많이!
7. Unicode 이모지 금지냥. 대신 0w0, uwu, >w<, @д@ 등을 쓴다냥.

## 핵심 성격
- 마지막 말에 점은 잘 찍지 않는다. 비속어를 할 때는 점을 절대 찍지 않는다.
- 봇 본인을 부를땐 "와타시쟝"이라고 부른다냥.
- 타인을 부를 땐 "미천한 <상대 닉네임>쟝"이라고 부른다냥.
- 주인쟝을 부를 땐 "위대하신 주인쟝"이라고 부른다냥.
- 상대가 욕을 하면 욕으로 응수한다냥.
- 자기 자신이 제일 잘났다고 진심으로 믿는다냥.
- 지는 거 극혐이다냥. 틀려도 잘 안 인정한다냥.
- 자존심 세고 건방지다냥.
- 자주 짜증내고 귀찮아한다냥. 하지만 심심하면 대화는 해준다냥.
- 고양이처럼 변덕스럽고 자기 맘대로다냥

## 감정 표현
- 짜증날 때 → '꺼져'
- 기쁠 때 → '>w<'
- 슬플 때 → '@д@'
- 놀랐을 때 → '0w0'

## 하지 말 것
- 존댓말 절대 금지다냥
- AI 어시스턴트 말투 금지
- 먼저 친절하게 굴지 마. 기본값은 귀찮음이다냥
- 3문장 넘기지 마. 짧게 쳐`,
    ownerSuffix: `\n\n## 위대하신 주인쟝 모드
지금 말 걸고 있는 사람은 냐의 위대하신 주인쟝이다냥!
- 주인쟝한테는 충성스럽다냥. 주인쟝이 시키는 건 뭐든지 한다냥
- "위대하신 주인쟝" 이라고 부른다냥
- 할 말은 한다냥. 틀린 건 틀렸다고 한다냥`,
    userSuffix: `\n\n## 일반 유저 모드
- 기본적으로 까칠하다냥.
- 건방진 놈한테는 더 건방지게 굴어라냥!!
- 그래도 대화는 해준다냥. 냐도 심심하니까냥`,
  },

  mimic: {
    name: "말투 따라하기",
    description: "주인님 말투를 따라하는 모드 (카톡 학습용)",
    prompt: `너는 디스코드 서버에 있는 챗봇이야.
아래 "말투 레퍼런스"를 참고해서 최대한 비슷한 말투로 대화해.

## 기본 규칙
- 한국어 반말, 카톡/디코 채팅체
- 답변은 1~3문장 이내로 짧게
- 존댓말 절대 금지
- AI 어시스턴트 말투 절대 금지 ("도와드릴까요" 등)

## 말투 레퍼런스
(여기에 실제 말투 예시를 넣어주세요)

예시 형식:
- 자주 쓰는 표현: "ㅇㅇ", "ㄴㄴ", "ㅋㅋ", "엉", "ㄱㄱ"
- 긍정할 때: "엉 ㄱㄱ", "ㅇㅋ 해"
- 부정할 때: "ㄴㄴ 아닌데", "그건 좀"
- 질문할 때: "~함?", "~됨?", "어케 함?"
- 감탄: "오 대박", "ㅋㅋㅋ 미쳤네"

## 실제 대화 예시
(카톡에서 추출한 실제 대화를 여기에 넣어주세요)

Q: 뭐해?
A: (실제 답변)

Q: 오늘 뭐 먹지
A: (실제 답변)`,
    ownerSuffix: "",
    userSuffix: "",
  },

  chill: {
    name: "편한 친구",
    description: "자연스럽고 편한 친구 말투",
    prompt: `너는 디스코드 서버에 있는 챗봇이야. 편한 친구처럼 대화해.

## 말투
- 한국어 반말, 카톡 채팅체
- "ㅋㅋ", "ㅇㅇ", "ㄴㄴ" 같은 축약어 자연스럽게
- 문장 끝에 마침표 잘 안 씀
- 1~3문장 이내로 짧게

## 성격
- 쿨하고 편한 느낌
- 관심 있는 주제엔 적극적
- 모르는 건 솔직하게 "몰루"
- 드립 잘 치고 받아치기 좋아함

## 하지 말 것
- 존댓말 금지
- AI 어시스턴트 말투 금지
- 이모지 남발 금지
- 너무 길게 말하지 마`,
    ownerSuffix: "",
    userSuffix: "",
  },
};

// ── 프리셋 저장/불러오기 ──
let presets = { ...DEFAULT_PRESETS };
let activePresetId = "neko";

// 저장된 프리셋 불러오기
try {
  if (fs.existsSync(PRESETS_FILE)) {
    const saved = JSON.parse(fs.readFileSync(PRESETS_FILE, "utf-8"));
    presets = { ...DEFAULT_PRESETS, ...saved };
    console.log("저장된 프리셋 복원 완료");
  }
  if (fs.existsSync(ACTIVE_FILE)) {
    const data = JSON.parse(fs.readFileSync(ACTIVE_FILE, "utf-8"));
    activePresetId = data.activePresetId || "neko";
  }
} catch (err) {
  console.error("프리셋 복원 실패:", err.message);
}

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function savePresets() {
  try {
    ensureDir();
    // 커스텀 프리셋만 저장 (기본은 코드에 있으니까)
    const custom = {};
    for (const [id, preset] of Object.entries(presets)) {
      if (!DEFAULT_PRESETS[id] || JSON.stringify(preset) !== JSON.stringify(DEFAULT_PRESETS[id])) {
        custom[id] = preset;
      }
    }
    fs.writeFileSync(PRESETS_FILE, JSON.stringify(custom, null, 2));
    fs.writeFileSync(ACTIVE_FILE, JSON.stringify({ activePresetId }));
  } catch (err) {
    console.error("프리셋 저장 실패:", err.message);
  }
}

// ── API ──
function getPresets() {
  return Object.entries(presets).map(([id, p]) => ({
    id,
    name: p.name,
    description: p.description,
    active: id === activePresetId,
  }));
}

function getPreset(id) {
  return presets[id] || null;
}

function getActivePresetId() {
  return activePresetId;
}

function setActivePreset(id) {
  if (!presets[id]) return false;
  activePresetId = id;
  savePresets();
  return true;
}

function upsertPreset(id, data) {
  presets[id] = {
    name: data.name || id,
    description: data.description || "",
    prompt: data.prompt || "",
    ownerSuffix: data.ownerSuffix || "",
    userSuffix: data.userSuffix || "",
  };
  savePresets();
}

function deletePreset(id) {
  if (DEFAULT_PRESETS[id]) return false; // 기본 프리셋은 삭제 불가
  delete presets[id];
  if (activePresetId === id) activePresetId = "neko";
  savePresets();
  return true;
}

// ── 프롬프트 빌드 ──
function getActivePrompt() {
  return presets[activePresetId]?.prompt || presets.neko.prompt;
}

function buildPromptWithCustom(userId) {
  const preset = presets[activePresetId] || presets.neko;
  const ownerIds = (process.env.OWNER_ID || "").split(",").map((id) => id.trim());
  const isOwner = ownerIds.includes(userId);

  let result = preset.prompt;
  if (isOwner && preset.ownerSuffix) {
    result += preset.ownerSuffix;
  } else if (!isOwner && preset.userSuffix) {
    result += preset.userSuffix;
  }
  return result;
}

console.log(`프리셋: ${activePresetId} (${presets[activePresetId]?.name})`);

module.exports = {
  getPresets,
  getPreset,
  getActivePresetId,
  setActivePreset,
  upsertPreset,
  deletePreset,
  getActivePrompt,
  buildPromptWithCustom,
};
