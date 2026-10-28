/* =====================================================================
   중국어 탐험대 · STAGE 02 이름표 마을 (4차시) — 설정 파일 (game-data.js)
   ---------------------------------------------------------------------
   선생님이 고쳐도 되는 곳은 이 파일뿐입니다. (온라인 연결은 firebase-config.js)
   - 따옴표(' ') 안의 글자와 숫자만 바꾸고, 쉼표(,)와 괄호는 지우지 마세요.
   - GitHub에서 연필(✏️) 버튼으로 고친 뒤 Commit changes 하면 반영됩니다.
   ===================================================================== */

window.GAME_DATA = {

  /* ---------- 1. 이름과 문구 ---------- */
  lessonId: 'lesson4',               // 결과 저장 이름 (차시마다 다르게)
  saveKey: 'panda-lesson4',          // 이 기기에 저장할 때 쓰는 이름
  stageLabel: 'STAGE 02 · 4차시',
  title: '세계의 네 문',
  subtitle: '你是哪国人？',
  gateName: '세계의 문',
  nextStage: 'STAGE 03 · 숫자 계곡',
  nextStageLine: '아직 열리지 않았어요! 다음 시간에도 老师好로 인사하고 이름을 말해 봐요.',
  story: [
    '이름표 마을에 세계 여러 나라에서 탐험가들이 찾아왔어요.',
    '마을 끝의 세계의 문은 "你是哪国人？"에 대답할 수 있는 탐험가에게만 열린대요!',
    '국기 마을과 한자 다리를 지나 언덕 위의 대나무 괴물을 만나 보세요. 구덩이에 빠지지 않게 조심!'
  ],

  /* ---------- 2. 점수와 어려움 ---------- */
  points: { firstTry: 100, retry: 60, bossFirstTry: 150, bossRetry: 90, star: 10, block: 20, golden: 50, bump: 10, stomp: 20, fall: 0 },
  // 구덩이에 떨어지면 어디서 다시 시작할까요?  'zone' = 지금 구역의 처음 / 'start' = 맨 처음 / 'bell' = 마지막으로 지나온 종
  fallRespawn: 'zone',

  /* ---------- 3. 중국어 음성 ----------
     audio 폴더에 같은 이름의 MP3가 있으면 그 파일을 먼저 씁니다.
     없으면 온라인 자동 음성 → 기기 내장 음성 순서로 씁니다. (검수 전 임시 음성)
     flag: 국기 그림 (KR 한국, CN 중국, US 미국, JP 일본), pic: 카드 번호         */
  audio: {
    useLocalFiles: true,
    useOnlineVoice: true,
    onlineVoiceUrl: 'https://translate.google.com/translate_tts?ie=UTF-8&tl=zh-CN&client=tw-ob&q=',
    slowRate: 0.7,
    sounds: {
      // 2·3차시 복습
      xiexie:    { text: '谢谢',   pinyin: 'xièxie' },
      bukeqi:    { text: '不客气', pinyin: 'bú kèqi' },
      meiguanxi: { text: '没关系', pinyin: 'méi guānxi' },
      wanan:     { text: '晚安',   pinyin: 'wǎn’ān' },
      zaijian:   { text: '再见',   pinyin: 'zàijiàn' },
      nijiao:    { text: '你叫什么名字？', pinyin: 'Nǐ jiào shénme míngzi?' },
      wojiaoxiaoming: { text: '我叫小明。', pinyin: 'Wǒ jiào Xiǎomíng.' },
      wojiaoanan:     { text: '我叫安安。', pinyin: 'Wǒ jiào Ān’ān.' },
      nine:      { text: '你呢？', pinyin: 'Nǐ ne?' },
      // 4차시: 네 나라 (번호는 수업과 같아요: 1 韩国, 2 中国, 3 美国, 4 日本)
      hanguo:    { text: '韩国', pinyin: 'Hánguó',   flag: 'KR', pic: '1' },
      zhongguo:  { text: '中国', pinyin: 'Zhōngguó', flag: 'CN', pic: '2' },
      meiguo:    { text: '美国', pinyin: 'Měiguó',   flag: 'US', pic: '3' },
      riben:     { text: '日本', pinyin: 'Rìběn',    flag: 'JP', pic: '4' },
      guo:       { text: '国', pinyin: 'guó' },
      ren:       { text: '人', pinyin: 'rén' },
      hanguoren: { text: '韩国人', pinyin: 'Hánguó rén' },
      nishinaguoren:    { text: '你是哪国人？', pinyin: 'Nǐ shì nǎ guó rén?' },
      woshihanguoren:   { text: '我是韩国人。', pinyin: 'Wǒ shì Hánguó rén.' },
      woshizhongguoren: { text: '我是中国人。', pinyin: 'Wǒ shì Zhōngguó rén.' },
      woshimeiguoren:   { text: '我是美国人。', pinyin: 'Wǒ shì Měiguó rén.' },
      woshiribenren:    { text: '我是日本人。', pinyin: 'Wǒ shì Rìběn rén.' }
    }
  },

  /* ---------- 4. 구역과 소리의 종 (9개) ---------- */
  zones: [
    { id: 'review', name: '복습 숲', theme: 'forest', missions: [
      // 3차시 복습
      { id: 'q1', type: 'choiceText', sound: 'nijiao', place: '이름 종', review: '3차시',
        scene: '🐰 💬 🐼  "你叫什么名字？"',
        question: '토끼가 이름을 물었어요. 판다는 뭐라고 대답할까요?',
        options: [
          { text: '我叫小明。', sub: 'Wǒ jiào Xiǎomíng.', sound: 'wojiaoxiaoming', correct: true },
          { text: '你呢？', sub: 'Nǐ ne?', sound: 'nine' },
          { text: '再见。', sub: 'zàijiàn', sound: 'zaijian' }
        ],
        hint: '이름을 물으면 "我叫 + 이름"으로 대답해요.', reward: '이름표' },
      // 2차시 복습
      { id: 'q2', type: 'choiceText', sound: 'xiexie', place: '연필 종', review: '2차시',
        scene: '🐻 ✏️ ➡️ 🐼  "谢谢!"',
        question: '곰이 연필을 빌려줬더니 판다가 "谢谢!"라고 했어요. 곰은 뭐라고 대답할까요?',
        options: [
          { text: '不客气', sub: 'bú kèqi', sound: 'bukeqi', correct: true },
          { text: '没关系', sub: 'méi guānxi', sound: 'meiguanxi' },
          { text: '晚安', sub: 'wǎn’ān', sound: 'wanan' }
        ],
        hint: '고맙다는 말에는 "천만에"라고 대답해요.', reward: '연필' }
    ]},
    { id: 'flags', name: '국기 마을', theme: 'village', missions: [
      { id: 'q3', type: 'matchScenes', place: '국기 종',
        question: '나라 이름을 눌러 듣고, 알맞은 국기에 놓아요.',
        pairs: [
          { flag: 'KR', label: '1', sound: 'hanguo' },
          { flag: 'CN', label: '2', sound: 'zhongguo' },
          { flag: 'US', label: '3', sound: 'meiguo' },
          { flag: 'JP', label: '4', sound: 'riben' }
        ],
        hint: '수업의 번호를 떠올려요: 1 韩国, 2 中国, 3 美国, 4 日本.', reward: '국기 배지' },
      { id: 'q4', type: 'hearPick', sound: 'woshizhongguoren', answer: 'zhongguo', options: ['hanguo', 'zhongguo', 'meiguo', 'riben'], place: '네 문 종',
        question: '탐험가가 자기 나라를 말해요. 몇 번 문으로 가야 할까요?',
        hint: '我是 다음, 人 앞에 나오는 나라 이름을 잘 들어 보세요.', reward: '문 열쇠' },
      { id: 'q5', type: 'wordOrder', place: '질문 종', sound: 'nishinaguoren',
        question: '"너는 어느 나라 사람이야?"를 중국어로 만들어요. 조각을 순서대로 눌러요.',
        tiles: ['你', '是', '哪', '国', '人'], extra: ['我'], ending: '？',
        hint: '너(你) → ~이다(是) → 어느(哪) → 나라(国) → 사람(人) 순서예요.', reward: '물음표 깃발' },
      { id: 'q6', type: 'choiceText', sound: 'nishinaguoren', place: '역할 카드 종',
        flag: 'JP', scene: '역할 카드 · 🐻 💬 "你是哪国人？"',
        question: '판다의 역할 카드는 일본이에요. 곰이 "你是哪国人？"이라고 물으면 뭐라고 대답할까요?',
        options: [
          { text: '我是日本人。', sub: 'Wǒ shì Rìběn rén.', sound: 'woshiribenren', correct: true },
          { text: '我是中国人。', sub: 'Wǒ shì Zhōngguó rén.', sound: 'woshizhongguoren' },
          { text: '我叫日本。', sub: 'Wǒ jiào Rìběn.' }
        ],
        hint: '나라를 물으면 "我是 + 나라 + 人"으로 대답해요.', reward: '역할 카드' }
    ]},
    { id: 'hanzi', name: '한자 다리', theme: 'bridge', missions: [
      { id: 'q7', type: 'choiceText', place: '國과 国 종',
        scene: '國  ↔  国',
        question: '한국에서 배우는 國과 中国 속의 国은 어떤 사이일까요?',
        options: [
          { text: '뜻이 같고 모양이 달라요', correct: true },
          { text: '뜻이 서로 달라요' },
          { text: '国은 틀린 글자예요' }
        ],
        hint: '두 글자 모두 "나라 국", 중국어 소리는 guó예요. 중국에서는 주로 간체자 国를 써요.', reward: '나라 국 도장' },
      { id: 'q8', type: 'choiceText', sound: 'guo', place: '国 찾기 종',
        scene: '国 guó',
        question: '国이 들어 있지 않은 나라 이름은 무엇일까요?',
        options: [
          { text: '日本', sub: 'Rìběn', sound: 'riben', correct: true },
          { text: '中国', sub: 'Zhōngguó', sound: 'zhongguo' },
          { text: '韩国', sub: 'Hánguó', sound: 'hanguo' },
          { text: '美国', sub: 'Měiguó', sound: 'meiguo' }
        ],
        hint: '네 나라 이름을 한 글자씩 살펴보세요.', reward: '돋보기' },
      { id: 'q9', type: 'choiceText', sound: 'hanguoren', place: '사람 종',
        scene: '韩国 + 人 = 韩国人',
        question: '韩国人에서 人은 무슨 뜻일까요?',
        options: [
          { text: '사람', correct: true },
          { text: '나라' },
          { text: '이름' }
        ],
        hint: '人은 "사람 인", 중국어 소리는 rén이에요. 나라 이름 뒤에 붙으면 그 나라 사람이에요.', reward: '사람 인 도장' }
    ]}
  ],

  /* ---------- 5. 언덕의 대나무 괴물: 3인 기자회견 (마지막 문제 3개) ---------- */
  boss: {
    name: '대나무 괴물',
    intro: '하하하! 오늘은 내가 기자다! 오늘 수업을 잘 했다면 이 문제도 풀 수 있겠지. 이 문제를 풀어야 오늘 수업이 끝난다! 하하하!',
    notReady: '흐흠, 아직 울리지 않은 종이 있구나. 종을 모두 울리고 다시 오너라!',
    wrongLine: '하하, 다시 생각해 보거라!',
    outro: '역시 훌륭한 학생이군. 다음 시간에도 기대가 되네.',
    rounds: [
      { flag: 'KR', scene: '판다의 역할 카드', situation: '기자 토끼가 판다에게 나라를 물었어요.',
        a: 'nishinaguoren', b: 'woshihanguoren', answer: 'O',
        hint: '역할 카드의 국기와 대답한 나라가 같은지 보세요.' },
      { flag: 'US', scene: '판다의 역할 카드', situation: '기자 토끼가 판다에게 이름을 물었어요.',
        a: 'nijiao', b: 'woshimeiguoren', answer: 'X', fix: 'wojiaoanan',
        hint: '이름을 물었는데 나라를 대답했어요. 이름은 我叫…로 대답해요.' },
      { flag: 'CN', scene: '판다의 역할 카드', situation: '기자 토끼가 판다에게 나라를 물었어요.',
        a: 'nishinaguoren', b: 'woshiribenren', answer: 'X', fix: 'woshizhongguoren',
        hint: '역할 카드는 2번 中国예요. 대답한 나라와 같은가요?' }
    ]
  },

  /* ---------- 6. 조작과 길 안내 ---------- */
  runSpeed: 250,
  jumpPower: 660,
  guideAfterSeconds: 15
};
