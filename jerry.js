/* =========================================================================
   jerry.js — 3D AI Human "Jerry"  (#/jerry)
   -------------------------------------------------------------------------
   window.JerryPage = { render($main), destroy() }  ← english.js 와 동일한 패턴

   · 3D 얼굴 : Three.js (index.html 의 importmap 으로 CDN 로드, 첫 진입 시 1회)
               기본은 코드로 만든 얼굴. 설정에 Ready Player Me GLB URL 을 넣으면 교체.
   · 대화     : Anthropic Messages API 를 브라우저에서 직접 스트리밍 호출.
               API 키는 이 브라우저 localStorage 에만 저장됨.
   · 음성     : Web Speech API (무료, OS 제공 한국어 음성)
   · 립싱크   : 한글을 초/중/종성으로 분해 → 모음별 viseme 타임라인 → 발화 시간에 보간.
               ㅁ/ㅂ/ㅍ 은 입술을 닫음. TTS onboundary 로 실제 발화 위치에 재동기화.

   ⚠ Claude Pro/Max 구독으로는 호출 불가. console.anthropic.com 의 API 키 + 크레딧 필요.
   ========================================================================= */
(function () {
  'use strict';

  var LS = 'jerry.cfg.v1';
  var DEFAULT_SYS =
    "너는 'Jerry'라는 이름의 3D AI 휴먼이야. Harry의 개인 홈페이지에 살고 있어.\n" +
    '사람과 얼굴을 보고 말하는 상황이니 짧고 자연스럽게, 한 번에 2~4문장으로 말해.\n' +
    '목록·마크다운·이모지는 쓰지 마. 소리 내어 읽힐 문장이라는 걸 항상 기억해.\n' +
    '모르면 모른다고 솔직히 말하고, 따뜻하지만 담백하게 대화해.';

  var GESTURE_HINT =
    '몸짓: 문장 앞에 대괄호 태그를 넣으면 네 3D 아바타가 실제로 그 동작을 한다.\n' +
    '쓸 수 있는 태그는 [인사] [끄덕] [갸웃] [생각] [으쓱] [손짓] [기쁨] [놀람] [슬픔] 뿐이다.\n' +
    '태그는 소리로 읽히지 않는다. 매 문장 넣지 말고, 정말 어울리는 곳에만 한두 개 써라.\n' +
    '예) [인사] 안녕하세요, 반가워요. / [생각] 음, 그건 좀 어려운 질문인데요.';

  DEFAULT_SYS = DEFAULT_SYS + '\n\n' + GESTURE_HINT;

  /* macOS/iOS 한국어 음성 중 남성 계열 우선순위 (Rocko 가 가장 소년스럽다).
     브라우저마다 이름이 'Rocko' / 'Rocko (한국어(한국))' 로 달라서 부분 일치로 찾는다. */
  var MALE_KO = ['Rocko', 'Eddy', 'Reed', 'Grandpa'];
  var VOICE_PRESETS = {
    boy:   { voice: 'Rocko', pitch: 1.30, rate: 1.06 },
    man:   { voice: 'Eddy',  pitch: 1.00, rate: 1.02 },
    woman: { voice: 'Yuna',  pitch: 1.05, rate: 1.05 }
  };

  /* Google Cloud TTS 한국어 남성 음성 (키를 넣으면 실제 목록을 API 로 다시 받아온다).
     Standard/WaveNet 은 월 400만 자까지 무료. */
  var GOOGLE_MALE = [
    'ko-KR-Standard-C', 'ko-KR-Standard-D',
    'ko-KR-Wavenet-C', 'ko-KR-Wavenet-D', 'ko-KR-Neural2-C'
  ];

  var stored = readCfg();
  var cfg = Object.assign({
    key: '', model: 'claude-sonnet-5', voice: '', rate: 1.05, pitch: 1,
    avatar: '', sys: DEFAULT_SYS, voiceOn: false, preset: 'boy', v: 2,
    tts: 'browser', gkey: '', gvoice: 'ko-KR-Wavenet-C', grate: 1.0, gpitch: 5
  }, stored);

  /* 예전 설정(v 없음)은 여자 목소리가 기본이었으므로 한 번만 소년 목소리로 옮겨준다.
     ※ cfg.v 로 판단하면 기본값 2가 이미 병합돼 있어 절대 참이 되지 않는다 — stored 로 봐야 함 */
  if (stored.v !== 2) {
    var p = VOICE_PRESETS.boy;
    cfg.voice = p.voice; cfg.pitch = p.pitch; cfg.rate = p.rate;
    cfg.preset = 'boy'; cfg.v = 2;
    saveCfg();
  }
  /* 예전에 저장된 성격 문구에는 제스처 설명이 없으므로 뒤에 덧붙인다 (직접 쓴 내용은 보존) */
  if (cfg.sys.indexOf('[끄덕]') < 0) {
    cfg.sys = cfg.sys.trim() + '\n\n' + GESTURE_HINT;
    saveCfg();
  }

  function readCfg() {
    try { return JSON.parse(localStorage.getItem(LS) || '{}'); } catch (e) { return {}; }
  }
  function saveCfg() {
    try { localStorage.setItem(LS, JSON.stringify(cfg)); } catch (e) {}
  }

  /* ===================== 스타일 (1회 주입) ===================== */
  var CSS = '' +
  /* ── 전역 오버레이: 라우터 밖에 떠 있으므로 페이지를 옮겨도 살아있다 ── */
  '#jerry-root{position:fixed;z-index:8;display:flex;flex-direction:column;align-items:center;' +
    'pointer-events:none}' +
  '#jerry-root>*{pointer-events:auto}' +
  /* ── mini: 화면 하단 도크 (원본 디자인) ── */
  '#jerry-root.mini{left:0;right:0;bottom:0;top:auto;width:auto;max-width:900px;margin:0 auto;' +
    'padding:0 14px 12px;align-items:stretch}' +
  /* 위젯 뒤를 넓게 덮는 블러 — 뒤 콘텐츠가 비쳐 어지럽지 않게 */
  '#jerry-root.mini::before{content:"";position:fixed;left:0;right:0;bottom:0;height:330px;' +
    'pointer-events:none;-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);' +
    '-webkit-mask-image:linear-gradient(to top,#000 0,#000 58%,transparent 100%);' +
    'mask-image:linear-gradient(to top,#000 0,#000 58%,transparent 100%);' +
    'background:linear-gradient(to top,var(--bg) 0%,transparent 88%)}' +
  '#jerry-root.mini.closed::before{height:210px}' +
  '#jerry-root.mini #j-dock{display:flex;gap:12px;align-items:flex-end}' +
  '#jerry-root.mini #j-tools{flex-direction:column;gap:9px;flex:0 0 auto;padding-bottom:4px}' +
  '#jerry-root.mini #j-tools .j-btn{width:40px;height:40px;padding:0;border-radius:50%;' +
    'font-size:.9rem;line-height:1;display:grid;place-items:center}' +
  '#jerry-root.mini #j-hide{font-size:.68rem;font-weight:700}' +
  /* 꺼져 있는 기능은 회색 톤으로 */
  '#jerry-root.mini .j-btn.off{background:rgba(255,255,255,.07);color:#8b8085;opacity:.75}' +
  '#jerry-root.mini #j-body{flex:1;min-width:0;position:relative;padding-top:46px}' +
  '#jerry-root.mini #j-stage{position:absolute;left:8px;bottom:0;width:146px;height:186px;' +
    'border:none;background:none;filter:drop-shadow(0 10px 20px rgba(0,0,0,.45));z-index:2}' +
  '#jerry-root.mini #j-panel{display:block;background:var(--card);' +
    'border:1px solid var(--border);border-radius:44px;padding:16px 24px 14px 166px}' +
  '#jerry-root.mini #j-name{display:block}' +
  '#jerry-root.mini #j-cap{position:static;transform:none;max-width:none;text-align:left;' +
    'background:none;backdrop-filter:none;padding:0;border-radius:0;color:#fff;font-weight:600;' +
    'font-size:.95rem;text-shadow:none;min-height:3.9em;display:block;' +
    'overflow-y:auto;max-height:3.9em}' +
  '#jerry-root.mini #j-cap:empty{display:block}' +
  '#jerry-root.mini #j-log{display:none;max-height:30vh;margin-top:12px}' +
  '#jerry-root.mini.logopen #j-log{display:flex}' +
  '#jerry-root.mini #j-hint{display:none}' +
  '#jerry-root.mini #j-copy{display:block}' +
  /* 닫힘: 캐릭터만 남는다 */
  '#jerry-root.mini.closed{max-width:900px;padding:0 14px 12px;align-items:flex-start}' +
  '#jerry-root.mini.closed #j-tools,#jerry-root.mini.closed #j-panel,' +
    '#jerry-root.mini.closed #j-copy{display:none}' +
  '#jerry-root.mini.closed #j-dock{justify-content:flex-start}' +
  '#jerry-root.mini.closed #j-body{padding-top:0;flex:0 0 auto;width:146px;height:186px;' +
    'margin-left:8px}' +
  '#jerry-root.mini.closed #j-stage{position:static;width:146px;height:186px}' +
  /* 대화 로그·입력 (원본 톤) */
  '#jerry-root.mini .j-msg{border:none;font-weight:600}' +
  '#jerry-root.mini .j-msg.u{background:var(--accent-light);color:var(--btn-text,var(--accent))}' +
  '#jerry-root.mini .j-msg.a{background:rgba(255,255,255,.10);color:#fff}' +
  '#jerry-root.mini .j-msg.sys{color:#9a9095}' +
  '#jerry-root.mini #j-form{margin-top:12px;align-items:center;gap:8px}' +
  '#jerry-root.mini #j-input{min-height:36px;height:36px;border:none;border-radius:999px;' +
    'background:var(--accent-light);color:var(--btn-text,var(--accent));font-weight:600;' +
    'text-align:center;padding:7px 16px;font-size:.9rem}' +
  '#jerry-root.mini #j-input::placeholder{color:var(--btn-text,var(--accent));' +
    'opacity:.8;font-weight:600}' +
  '#jerry-root.mini #j-mic{width:36px;height:36px;background:var(--accent-light);border:none;' +
    'color:var(--btn-text,var(--accent))}' +
  '#jerry-root.mini #j-send{width:52px;height:36px;border-radius:999px;border:none;' +
    'background:var(--accent-light);color:var(--btn-text,var(--accent));' +
    'font-weight:700;font-size:.86rem}' +
  '#j-name{display:none;margin:0 0 10px;color:#fff;font-size:1.18rem;font-weight:700}' +
  '#j-copy{display:none;color:var(--muted);font-size:.68rem;line-height:1.5;text-align:right;' +
    'margin:9px 6px 0}' +
  /* stage: Jerry 메뉴에서 크게 */
  '#jerry-root.stage{left:0;right:0;bottom:0;top:auto;width:auto;padding:0 16px 14px;' +
    'max-width:900px;margin:0 auto}' +
  '#jerry-root.stage #j-stage{width:100%;height:clamp(240px,42vh,420px);' +
    'border:1px solid var(--border);border-radius:20px;' +
    'background:radial-gradient(120% 90% at 50% 0%,var(--accent-light) 0%,var(--card) 55%,var(--bg) 100%)}' +
  '#jerry-root.stage #j-panel{display:block;width:100%;margin-top:8px}' +
  '#jerry-root.stage #j-tools{position:static;margin-top:6px}' +
  '#jerry-root.stage #j-hide{display:none}' +
  '#jerry-root.stage #j-body{width:100%}' +
  '#jerry-root.stage #j-cap{position:absolute;left:50%;transform:translateX(-50%);bottom:auto;' +
    'top:calc(clamp(240px,42vh,420px) - 52px)}' +
  '#j-tools{display:flex;gap:6px}' +
  '.j-btn{background:var(--header-glass,rgba(255,255,255,.06));border:1px solid var(--border);' +
    'color:var(--text);border-radius:999px;padding:7px 14px;font:inherit;font-size:.84rem;' +
    'font-weight:600;cursor:pointer;transition:.18s;white-space:nowrap}' +
  '.j-btn:hover{background:var(--accent-light)}' +
  '.j-btn.on{background:var(--accent);border-color:transparent;color:#1a0d10}' +
  '.j-btn.primary{background:var(--accent);border-color:transparent;color:#1a0d10}' +
  '.j-btn:disabled{opacity:.45;cursor:default}' +
  '#j-stage{position:relative;overflow:hidden;cursor:pointer}' +
  '#j-stage canvas{display:block;width:100%;height:100%}' +
  '#j-hint{position:absolute;left:12px;top:10px;font-size:.76rem;color:var(--muted);' +
    'background:rgba(0,0,0,.35);padding:4px 10px;border-radius:999px;transition:opacity .6s}' +
  /* 말풍선: 밝은 아바타 위에서도 읽히도록 어두운 배경 */
  '#j-cap{max-width:90%;text-align:center;font-size:.92rem;line-height:1.45;pointer-events:none;' +
    'background:rgba(0,0,0,.62);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);' +
    'padding:7px 14px;border-radius:14px;text-shadow:0 1px 6px rgba(0,0,0,.6)}' +
  '#j-cap:empty{display:none}' +
  '#j-log{display:flex;flex-direction:column;gap:8px;max-height:26vh;overflow-y:auto;padding:2px}' +
  '.j-msg{max-width:84%;padding:9px 14px;border-radius:16px;font-size:.92rem;' +
    'white-space:pre-wrap;word-break:break-word;border:1px solid var(--border)}' +
  '.j-msg.a{background:var(--card);border-bottom-left-radius:5px;align-self:flex-start}' +
  '.j-msg.u{background:var(--accent-light);border-bottom-right-radius:5px;align-self:flex-end}' +
  '.j-msg.sys{align-self:center;background:none;border:none;color:var(--muted);' +
    'font-size:.8rem;text-align:center;max-width:100%}' +
  '#j-form{display:flex;gap:8px;align-items:flex-end}' +
  '#j-input{flex:1;resize:none;min-height:44px;max-height:120px;background:var(--card);' +
    'border:1px solid var(--border);border-radius:16px;padding:11px 14px;color:var(--text);' +
    'font:inherit;font-size:.95rem;outline:none}' +
  '#j-input:focus{border-color:var(--accent)}' +
  '.j-icon{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;' +
    'font-size:1.05rem;padding:0;flex:0 0 auto}' +
  '#j-cfg{border:1px solid var(--border);background:var(--card);color:var(--text);' +
    'border-radius:20px;padding:22px;width:min(520px,92vw);max-height:88vh;overflow-y:auto}' +
  '#j-cfg::backdrop{background:rgba(0,0,0,.6);backdrop-filter:blur(3px)}' +
  '#j-cfg .j-dlg-head{display:flex;align-items:flex-start;gap:10px;margin-bottom:6px}' +
  '#j-cfg h2{font-size:1.05rem;margin:0}' +
  '#j-cfg .j-dlg-head .sp{margin-left:auto}' +
  '#j-close{width:32px;height:32px;border-radius:50%;padding:0;display:grid;place-items:center;' +
    'font-size:.95rem;line-height:1;flex:0 0 auto}' +
  '#j-cfg .sub{color:var(--muted);font-size:.82rem;margin-bottom:14px}' +
  '#j-cfg label{display:block;font-size:.82rem;font-weight:600;margin:14px 0 5px}' +
  '#j-cfg label .h{display:block;font-weight:400;color:var(--muted);font-size:.76rem;margin-top:2px}' +
  '#j-cfg input,#j-cfg select,#j-cfg textarea{width:100%;background:rgba(0,0,0,.28);' +
    'border:1px solid var(--border);border-radius:11px;padding:9px 12px;color:var(--text);' +
    'font:inherit;font-size:.88rem;outline:none}' +
  '#j-cfg input:focus,#j-cfg select:focus,#j-cfg textarea:focus{border-color:var(--accent)}' +
  '#j-cfg a{color:var(--accent)}' +
  '#j-cfg code{background:rgba(0,0,0,.35);padding:1px 5px;border-radius:4px;font-size:.95em}' +
  '#j-cfg .row{display:flex;gap:10px}#j-cfg .row>*{flex:1}' +
  '#j-cfg .actions{display:flex;gap:8px;justify-content:flex-end;margin-top:22px}' +
  '#j-cfg .warn{background:var(--accent-light);border:1px solid var(--border);border-radius:12px;' +
    'padding:10px 12px;font-size:.79rem;color:var(--sub-text,var(--text));margin-top:14px}' +
  '@media(max-width:700px){#j-log{max-height:24vh}' +
    '#j-cap{font-size:.82rem;padding:6px 12px;max-width:96%;border-radius:12px}' +
    '#jerry-root.mini{right:10px;bottom:10px;width:132px}' +
    '#jerry-root.mini #j-stage{width:132px;height:158px}' +
    '#jerry-root.mini #j-cap{max-width:min(240px,calc(100vw - 28px))}' +
    '#jerry-root.mini #j-panel{width:min(320px,calc(100vw - 20px));position:fixed;right:10px;bottom:180px}}';

  function injectCSS() {
    if (document.getElementById('jerry-style')) return;
    var s = document.createElement('style');
    s.id = 'jerry-style'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ===================== 립싱크 데이터 ===================== */
  var VIS = {
    sil: [0.04, 0.55], PP: [0.00, 0.48], FF: [0.16, 0.62], TH: [0.30, 0.60],
    DD: [0.28, 0.66], kk: [0.30, 0.62], CH: [0.26, 0.52], SS: [0.14, 0.78],
    nn: [0.22, 0.60], RR: [0.26, 0.56],
    aa: [0.92, 0.78], E: [0.52, 0.90], I: [0.28, 1.00], O: [0.62, 0.42], U: [0.44, 0.30]
  };
  var JUNG_VIS = {
    'ㅏ': 'aa', 'ㅑ': 'aa', 'ㅐ': 'aa', 'ㅒ': 'aa',
    'ㅓ': 'E', 'ㅕ': 'E', 'ㅔ': 'E', 'ㅖ': 'E',
    'ㅗ': 'O', 'ㅛ': 'O', 'ㅘ': 'aa', 'ㅙ': 'E', 'ㅚ': 'E',
    'ㅜ': 'U', 'ㅠ': 'U', 'ㅝ': 'O', 'ㅞ': 'E', 'ㅟ': 'I',
    'ㅡ': 'I', 'ㅢ': 'I', 'ㅣ': 'I'
  };
  var CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  var JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
  var JONG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  var CHO_VIS = {
    'ㅁ':'PP','ㅂ':'PP','ㅃ':'PP','ㅍ':'PP','ㅅ':'SS','ㅆ':'SS','ㅈ':'CH','ㅉ':'CH','ㅊ':'CH',
    'ㄴ':'nn','ㄹ':'RR','ㄷ':'DD','ㄸ':'DD','ㅌ':'DD','ㄱ':'kk','ㄲ':'kk','ㅋ':'kk','ㅎ':'FF'
  };
  var EN_VIS = { a:'aa', e:'E', i:'I', o:'O', u:'U', y:'I' };

  /* 텍스트 → [{v, t0, t1, ci}] */
  function buildTimeline(text, rate) {
    var base = 152 / Math.max(0.6, rate || 1);   // 음절당 ms
    var out = [], t = 0;
    function push(v, d, ci) { out.push({ v: v, t0: t, t1: t + d, ci: ci }); t += d; }
    for (var i = 0; i < text.length; i++) {
      var ch = text[i], code = ch.charCodeAt(0) - 0xAC00;
      if (code >= 0 && code < 11172) {                       /* 완성형 한글 */
        var cho = CHO[Math.floor(code / 588)];
        var jung = JUNG[Math.floor((code % 588) / 28)];
        var jong = JONG[code % 28];
        var vv = JUNG_VIS[jung] || 'aa';
        var d = base;
        if (CHO_VIS[cho] === 'PP') { push('PP', base * 0.26, i); d -= base * 0.26; }
        else if (CHO_VIS[cho]) { push(CHO_VIS[cho], base * 0.16, i); d -= base * 0.16; }
        if (jong && 'ㅁㅂㅍㅄ'.indexOf(jong) >= 0) { push(vv, d * 0.66, i); push('PP', d * 0.34, i); }
        else push(vv, d, i);
      } else if (/[aeiouyAEIOUY]/.test(ch)) {
        push(EN_VIS[ch.toLowerCase()] || 'aa', base * 0.9, i);
      } else if (/[a-zA-Z]/.test(ch)) {
        push('DD', base * 0.32, i);
      } else if (/[.,!?…~;:\n]/.test(ch)) {
        push('sil', /[.!?\n…]/.test(ch) ? base * 1.5 : base * 0.7, i);
      } else if (ch === ' ') {
        push('sil', base * 0.35, i);
      }
    }
    push('sil', 140, text.length);
    return out;
  }

  /* ===================== 페이지 안내 (모드 / 맥락) ===================== */
  var mode = 'mini';                 /* mini = 구석 도우미, stage = Jerry 메뉴 */
  var greeted = {};                  /* 같은 페이지에서 반복해서 말 걸지 않도록 */

  /* 페이지별 역할과 첫 인사. API 호출 없이 즉시 나오므로 토큰이 들지 않는다. */
  var PAGES = [
    { m: /^#\/post\//, id: 'post', role: '지금 사용자가 글 한 편을 읽고 있다. 요약·설명·관련 질문을 도와라.',
      hi: function () {
        var t = document.querySelector('#main article h1');
        return t ? '[손짓] "' + t.textContent.trim().slice(0, 24) + '" 읽고 계시네요. 요약해드릴까요?'
                 : '[손짓] 글 읽는 중이시군요. 요약이 필요하면 말씀하세요.';
      } },
    { m: /^#\/about/, id: 'about', role: '하리(Harry)의 소개 페이지다. 이력과 관심사를 안내해라.',
      hi: function () { return '[인사] 하리님 소개 페이지예요. 궁금한 점 물어보세요.'; } },
    { m: /^#\/insights/, id: 'insights', role: '글 목록 페이지다. 주제를 찾아주고 어떤 글을 읽을지 추천해라.',
      hi: function () {
        var n = document.querySelectorAll('#main .post-card').length;
        return n ? '[손짓] 글이 ' + n + '개 있어요. 어떤 주제 찾으세요?'
                 : '[손짓] 글 목록이에요. 어떤 주제 찾으세요?';
      } },
    { m: /^#\/projects/, id: 'projects', role: '프로젝트 소개 페이지다. 각 프로젝트를 설명해라.',
      hi: function () { return '[기쁨] 프로젝트 페이지예요! 뭐가 궁금하세요?'; } },
    { m: /^#\/english/, id: 'study', role: '영어 학습 페이지다. 표현이나 단어 질문을 도와라.',
      hi: function () { return '[끄덕] 영어 공부 중이시군요. 모르는 표현 물어보세요.'; } },
    { m: /^#\/jerry/, id: 'jerry', role: '너 자신을 소개하는 페이지다.',
      hi: function () { return '[인사] 안녕하세요! 저에 대해 궁금한 거 있으세요?'; } },
    { m: /.*/, id: 'home', role: '홈 화면이다. 사이트를 어떻게 둘러볼지 안내해라.',
      hi: function () { return '[인사] 안녕하세요, 저는 제리예요. 뭐부터 볼까요?'; } }
  ];
  function currentPage() {
    var h = location.hash || '#/';
    for (var i = 0; i < PAGES.length; i++) if (PAGES[i].m.test(h)) return PAGES[i];
    return PAGES[PAGES.length - 1];
  }
  /* 화면에 실제로 보이는 텍스트를 같이 넘겨서 "이 글 요약해줘" 가 되게 한다 */
  function pageContext() {
    var p = currentPage(), main = document.getElementById('main');
    var text = main ? (main.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 1800) : '';
    return '\n\n[현재 페이지 정보]\n주소: ' + (location.hash || '#/') + '\n역할: ' + p.role +
      (text ? '\n화면에 보이는 내용(발췌):\n' + text : '');
  }

  /* ===================== 페이지 상태 ===================== */
  var S = null;          /* 활성 인스턴스 (없으면 null) */
  var THREE = null, GLTFLoader = null, modsPromise = null;
  var VRM = null, vrmPromise = null;   /* @pixiv/three-vrm (VRM 아바타를 쓸 때만 로드) */

  function loadMods() {
    if (modsPromise) return modsPromise;
    modsPromise = Promise.all([
      import('three'),
      import('three/addons/loaders/GLTFLoader.js')
    ]).then(function (m) {
      THREE = m[0];
      GLTFLoader = m[1].GLTFLoader;
    });
    return modsPromise;
  }

  function loadVRMMod() {
    if (vrmPromise) return vrmPromise;
    /* 988KB 원본 대신 155KB 압축본. three 만 외부 의존이라 importmap 으로 해결됨 */
    vrmPromise = import('https://cdn.jsdelivr.net/npm/@pixiv/three-vrm@3.5.4/lib/three-vrm.module.min.js')
      .then(function (m) { VRM = m; });
    return vrmPromise;
  }

  function isVRM(url) { return /\.vrm(\?|#|$)/i.test(url || ''); }

  /* 설정이 비어 있으면 저장소에 들어 있는 기본 아바타를 쓴다.
     'none' 을 입력하면 코드로 만든 기본 3D 얼굴로 되돌아간다. */
  var DEFAULT_AVATAR = 'vrm/jerry.vrm';
  function avatarURL() {
    var a = (cfg.avatar || '').trim();
    if (/^(none|off|없음|기본)$/i.test(a)) return '';
    return a || DEFAULT_AVATAR;
  }

  /* ===================== 3D : 절차적 머리 ===================== */
  function buildHead(root) {
    var g = new THREE.Group();
    var skin = new THREE.MeshStandardMaterial({ color: 0xf3cdae, roughness: .55, metalness: .02 });
    var dark = new THREE.MeshStandardMaterial({ color: 0x2a1f22, roughness: .7 });
    var white = new THREE.MeshStandardMaterial({ color: 0xfbfbfd, roughness: .25 });
    var irisM = new THREE.MeshStandardMaterial({ color: 0x3b2b26, roughness: .2 });
    var inner = new THREE.MeshStandardMaterial({ color: 0x50242c, roughness: .75 });

    /* 구를 아래쪽으로 갈수록 좁혀 턱을 만든다 */
    var hg = new THREE.SphereGeometry(1, 72, 56);
    var p = hg.attributes.position;
    for (var i = 0; i < p.count; i++) {
      var x = p.getX(i), y = p.getY(i), z = p.getZ(i), sx = 1, sz = 1;
      if (y < 0) { var t = Math.min(1, -y); sx = 1 - 0.42 * t * t; sz = 1 - 0.16 * t * t; }
      else { sx = 1 - 0.05 * y * y; }
      p.setXYZ(i, x * sx, y * (y < 0 ? 1.06 : 1), z * sz + (y < -0.35 ? -0.06 * (-y - 0.35) : 0));
    }
    hg.computeVertexNormals();
    var head = new THREE.Mesh(hg, skin);
    head.scale.set(.90, 1.10, .94);
    g.add(head);

    /* 앞머리가 눈썹까지 내려오지 않도록 캡 각도를 32%π 로 제한 */
    var hair = new THREE.Mesh(new THREE.SphereGeometry(1.03, 56, 40, 0, Math.PI * 2, 0, Math.PI * 0.32), dark);
    hair.scale.set(.92, 1.12, .96); hair.position.z = -0.03; g.add(hair);
    var back = new THREE.Mesh(new THREE.SphereGeometry(1.0, 40, 28, 0, Math.PI * 2, 0, Math.PI * 0.82), dark);
    back.scale.set(.88, 1.05, .72); back.position.set(0, 0.02, -0.36); g.add(back);

    [-1, 1].forEach(function (s) {
      var ear = new THREE.Mesh(new THREE.SphereGeometry(.15, 20, 14), skin);
      ear.scale.set(.42, .95, .62); ear.position.set(s * .84, -.02, -.04); g.add(ear);
    });

    /* 얼굴 부품의 z 는 두상 표면(눈 0.878 / 코 0.936 / 입 0.868)보다 앞에 와야 보인다 */
    var lids = [], irises = [];
    [-1, 1].forEach(function (s) {
      var eye = new THREE.Mesh(new THREE.SphereGeometry(.148, 28, 20), white);
      eye.position.set(s * .315, .10, .800); eye.scale.set(1, .88, .6); g.add(eye);
      var ir = new THREE.Mesh(new THREE.SphereGeometry(.068, 22, 16), irisM);
      ir.position.set(s * .315, .10, .868); ir.scale.set(1, 1, .5); g.add(ir);
      ir.userData.baseX = s * .315;
      irises.push(ir);
      var pu = new THREE.Mesh(new THREE.SphereGeometry(.028, 16, 12),
        new THREE.MeshStandardMaterial({ color: 0x090607 }));
      pu.position.set(0, 0, .03); ir.add(pu);
      var lid = new THREE.Mesh(new THREE.SphereGeometry(.163, 24, 16), skin);
      lid.scale.set(1, .62, .62); lid.position.set(s * .315, .245, .800); g.add(lid); lids.push(lid);
      var brow = new THREE.Mesh(new THREE.TorusGeometry(.115, .019, 10, 22, Math.PI * 0.78), dark);
      brow.position.set(s * .315, .30, .862); brow.rotation.z = Math.PI * (s > 0 ? 0.12 : 0.88); g.add(brow);
    });

    var nose = new THREE.Mesh(new THREE.SphereGeometry(.085, 20, 16), skin);
    nose.scale.set(.9, 1.25, 1.15); nose.position.set(0, -.10, .90); g.add(nose);

    /* 입: 어두운 구강 + 위/아래 입술. 벌어질수록 입술이 서로 멀어지고 구강이 드러난다 */
    var mouthG = new THREE.Group();
    mouthG.position.set(0, -.40, .865);
    mouthG.rotation.x = -0.15;                 /* 턱 곡면을 따라 살짝 기울임 */
    g.add(mouthG);
    var lipM = new THREE.MeshStandardMaterial({ color: 0xc9767f, roughness: .40 });
    var cavity = new THREE.Mesh(new THREE.SphereGeometry(.5, 32, 20), inner);
    cavity.scale.set(.30, .02, .075); mouthG.add(cavity);
    var upperLip = new THREE.Mesh(new THREE.SphereGeometry(.5, 32, 20), lipM);
    upperLip.scale.set(.33, .05, .09); upperLip.position.set(0, .035, .012); mouthG.add(upperLip);
    var lowerLip = new THREE.Mesh(new THREE.SphereGeometry(.5, 32, 20), lipM);
    lowerLip.scale.set(.33, .055, .09); lowerLip.position.set(0, -.04, .012); mouthG.add(lowerLip);

    var neck = new THREE.Mesh(new THREE.CylinderGeometry(.34, .42, .75, 28), skin);
    neck.position.set(0, -1.30, -.02); g.add(neck);
    var torso = new THREE.Mesh(new THREE.CapsuleGeometry(.78, .42, 10, 28),
      new THREE.MeshStandardMaterial({ color: 0x272a33, roughness: .85 }));
    torso.scale.set(1, 1, .62); torso.position.set(0, -2.28, -.06); g.add(torso);

    root.add(g);
    return { g: g, cavity: cavity, upperLip: upperLip, lowerLip: lowerLip, lids: lids, irises: irises };
  }

  /* ===================== 아바타 파일 캐시 ===================== */
  /* 17MB 를 매번 내려받지 않도록 Cache Storage 에 저장해 둔다.
     (브라우저 HTTP 캐시는 용량 압박이나 max-age 만료로 쉽게 지워진다)
     저장된 게 있으면 네트워크를 아예 건드리지 않는다. */
  var AVATAR_CACHE = 'jerry-avatar-v1';

  function readWithProgress(res, onProg) {
    var total = +(res.headers.get('content-length') || 0);
    if (!res.body || !res.body.getReader) return res.arrayBuffer();
    var reader = res.body.getReader(), chunks = [], loaded = 0;
    return (function step() {
      return reader.read().then(function (r) {
        if (r.done) {
          var out = new Uint8Array(loaded), off = 0;
          for (var i = 0; i < chunks.length; i++) { out.set(chunks[i], off); off += chunks[i].length; }
          return out.buffer;
        }
        chunks.push(r.value); loaded += r.value.length;
        if (onProg) onProg({ loaded: loaded, total: total });
        return step();
      });
    })();
  }

  function download(url, onProg) {
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return readWithProgress(res, onProg);
    });
  }

  function fetchAvatarBuffer(url, onProg) {
    if (!('caches' in window)) return download(url, onProg);      /* 비보안 컨텍스트 등 */
    return caches.open(AVATAR_CACHE).then(function (c) {
      return c.match(url).then(function (hit) {
        if (hit) { if (onProg) onProg({ cached: true }); return hit.arrayBuffer(); }
        return fetch(url).then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return c.put(url, res.clone())
            .catch(function () {})                                 /* 용량 초과여도 로딩은 계속 */
            .then(function () { return readWithProgress(res, onProg); });
        });
      });
    }).catch(function () { return download(url, onProg); });
  }

  function clearAvatarCache() {
    if (!('caches' in window)) return Promise.resolve();
    return caches.delete(AVATAR_CACHE).catch(function () {});
  }

  /* 모델 크기에 맞춰 얼굴을 화면에 채운다.
     머리 높이 = (모델 최상단 - head 본) 을 기준으로 거리를 잡으므로
     SD(2등신)든 실사 비율이든 같은 코드로 얼굴 클로즈업이 나온다. */
  function frameHead(obj, camera, camTarget, headPos) {
    if (S) { S.frameObj = obj; S.headPos = headPos.clone ? headPos.clone() : headPos; }
    var box = new THREE.Box3().setFromObject(obj);
    var headH = box.max.y - headPos.y;
    if (!(headH > 0.01)) headH = (box.max.y - box.min.y) * 0.25;
    /* 턱이 화면 세로 몇 % 지점에 오게 할지 (아래 남는 공간이 자막 자리).
       세로로 긴 화면(모바일)은 자막이 3줄까지 늘어나므로 더 위로 올린다. */
    var a = camera.aspect || 1.6;
    var chinF = a >= 1.5 ? 0.70 : (a <= 0.9 ? 0.55 : 0.55 + (a - 0.9) * (0.15 / 0.6));
    var TOP_M = 0.03;                       /* 정수리 위 여백 */
    var span = headH / (chinF - TOP_M);     /* 화면에 담을 세로 길이 */
    var t = Math.tan(camera.fov * Math.PI / 360);
    var distV = span / (2 * t);
    var distH = (headH * 1.35) / (2 * t * Math.max(0.5, a));   /* 가로로 잘리지 않게 */
    var dist = Math.max(distV, distH);
    /* 실제 거리에 맞춰 정수리가 위 3% 에 오도록 타깃 높이 재계산 */
    var half = dist * t;
    camTarget.set(headPos.x, (headPos.y + headH) + 2 * half * TOP_M - half, headPos.z);
    camera.position.set(camTarget.x, camTarget.y, headPos.z + dist);
  }

  /* T포즈(양팔 수평)를 자연스럽게 내린 자세로 바꾼다.
     좌우 방향·좌표계 규약을 가정하지 않고, 본의 부모 로컬 공간에서
     현재 팔이 향한 방향을 직접 재서 회전 부호를 정한다. */
  function relaxArms(hum) {
    var rig = { bones: {}, base: {}, sign: { left: 1, right: -1 } };
    if (!hum || !hum.getNormalizedBoneNode) return rig;

    ['head', 'neck', 'spine', 'chest', 'upperChest',
     'leftShoulder', 'rightShoulder',
     'leftUpperArm', 'leftLowerArm', 'leftHand',
     'rightUpperArm', 'rightLowerArm', 'rightHand'].forEach(function (n) {
      var b = hum.getNormalizedBoneNode(n);
      if (b) rig.bones[n] = b;
    });

    var DROP = 1.18;                       /* 수평에서 약 68도 아래 */
    ['left', 'right'].forEach(function (side) {
      var up = rig.bones[side + 'UpperArm'], lo = rig.bones[side + 'LowerArm'];
      var hand = rig.bones[side + 'Hand'] || lo;
      if (!up || !hand || !up.parent) return;
      up.parent.updateWorldMatrix(true, false);
      var inv = new THREE.Matrix4().copy(up.parent.matrixWorld).invert();
      var a = up.getWorldPosition(new THREE.Vector3()).applyMatrix4(inv);
      var b = hand.getWorldPosition(new THREE.Vector3()).applyMatrix4(inv);
      var dx = b.x - a.x, dy = b.y - a.y;
      if (Math.abs(dx) < 1e-5) return;
      var cur = Math.atan2(-dy, Math.abs(dx));   /* 0 = T포즈, + = 이미 내려간 각도 */
      var sign = dx > 0 ? -1 : 1;                /* +X 로 뻗은 팔은 -Z 회전이 아래 */
      rig.sign[side] = sign;
      up.rotation.z = sign * (DROP - cur);
      if (lo) lo.rotation.z = sign * 0.16;       /* 팔꿈치 살짝 굽힘 */
    });

    /* 제스처는 이 기본 자세 위에 더해진다 */
    for (var k in rig.bones) {
      var r = rig.bones[k].rotation;
      rig.base[k] = { x: r.x, y: r.y, z: r.z };
    }
    return rig;
  }

  /* ===================== 제스처 ===================== */
  /* 별도 애니메이션 파일 없이 본을 직접 움직인다. VRM 휴머노이드 본 이름은
     규격으로 정해져 있어 어떤 VRM 모델에서도 그대로 동작한다.
     side:true 인 트랙은 좌우 팔 방향 부호(rig.sign)를 곱해 방향을 맞춘다. */
  var GESTURES = {
    끄덕:  { dur: 1000, t: [{ b: 'head', a: 'x', k: [[0,0],[.2,.20],[.4,-.04],[.6,.16],[.8,-.02],[1,0]] }] },
    갸웃:  { dur: 1400, t: [{ b: 'head', a: 'z', k: [[0,0],[.25,.26],[.75,.26],[1,0]] },
                            { b: 'head', a: 'x', k: [[0,0],[.25,-.08],[.75,-.08],[1,0]] }] },
    인사:  { dur: 1800, side: 'right',
             t: [{ b: 'rightUpperArm', a: 'z', s: 1, k: [[0,0],[.2,-.95],[.8,-.95],[1,0]] },
                 { b: 'rightLowerArm', a: 'z', s: 1, k: [[0,0],[.2,-.55],[.35,-.20],[.5,-.55],[.65,-.20],[.8,-.55],[1,0]] },
                 { b: 'head',          a: 'x', k: [[0,0],[.3,.10],[.8,.10],[1,0]] }] },
    생각:  { dur: 2600, side: 'right',
             t: [{ b: 'rightUpperArm', a: 'z', s: 1, k: [[0,0],[.25,-.55],[.8,-.55],[1,0]] },
                 { b: 'rightLowerArm', a: 'z', s: 1, k: [[0,0],[.25,-1.15],[.8,-1.15],[1,0]] },
                 { b: 'head',          a: 'z', k: [[0,0],[.25,.14],[.8,.14],[1,0]] },
                 { b: 'head',          a: 'x', k: [[0,0],[.25,-.10],[.8,-.10],[1,0]] }] },
    으쓱:  { dur: 1500,
             t: [{ b: 'leftShoulder',  a: 'z', s: -1, k: [[0,0],[.3,-.20],[.7,-.20],[1,0]] },
                 { b: 'rightShoulder', a: 'z', s: 1,  k: [[0,0],[.3,-.20],[.7,-.20],[1,0]] },
                 { b: 'leftUpperArm',  a: 'z', s: -1, k: [[0,0],[.3,.28],[.7,.28],[1,0]] },
                 { b: 'rightUpperArm', a: 'z', s: 1,  k: [[0,0],[.3,.28],[.7,.28],[1,0]] },
                 { b: 'head',          a: 'x', k: [[0,0],[.3,-.10],[.7,-.10],[1,0]] }] },
    손짓:  { dur: 1700, side: 'right',
             t: [{ b: 'rightUpperArm', a: 'z', s: 1, k: [[0,0],[.25,-.42],[.75,-.42],[1,0]] },
                 { b: 'rightLowerArm', a: 'y', s: 1, k: [[0,0],[.3,.45],[.55,.15],[.8,.40],[1,0]] }] },
    기쁨:  { dur: 1600, e: 'happy',
             t: [{ b: 'head',          a: 'x', k: [[0,0],[.15,-.14],[.35,.06],[.55,-.10],[1,0]] },
                 { b: 'leftUpperArm',  a: 'z', s: -1, k: [[0,0],[.3,-.35],[.7,-.35],[1,0]] },
                 { b: 'rightUpperArm', a: 'z', s: 1,  k: [[0,0],[.3,-.35],[.7,-.35],[1,0]] }] },
    놀람:  { dur: 1400, e: 'surprised',
             t: [{ b: 'head',  a: 'x', k: [[0,0],[.12,-.20],[.5,-.12],[1,0]] },
                 { b: 'spine', a: 'x', k: [[0,0],[.12,-.07],[.5,-.04],[1,0]] }] },
    슬픔:  { dur: 2000, e: 'sad',
             t: [{ b: 'head',  a: 'x', k: [[0,0],[.3,.22],[.7,.22],[1,0]] },
                 { b: 'spine', a: 'x', k: [[0,0],[.3,.06],[.7,.06],[1,0]] }] }
  };
  var GESTURE_RE = /\[(끄덕|갸웃|인사|생각|으쓱|손짓|기쁨|놀람|슬픔)\]/g;

  function sampleKeys(k, p) {
    if (p <= k[0][0]) return k[0][1];
    for (var i = 1; i < k.length; i++) {
      if (p <= k[i][0]) {
        var t = (p - k[i - 1][0]) / (k[i][0] - k[i - 1][0] || 1);
        t = t * t * (3 - 2 * t);                       /* smoothstep */
        return k[i - 1][1] + (k[i][1] - k[i - 1][1]) * t;
      }
    }
    return k[k.length - 1][1];
  }

  /* ===================== 3D : VRM (VRoid 등 애니메 스타일) ===================== */
  function loadVRMAvatar(url, root, camera, camTarget, onProg) {
    return Promise.all([loadVRMMod(), fetchAvatarBuffer(url, onProg)]).then(function (r) {
      var loader = new GLTFLoader();
      loader.register(function (parser) { return new VRM.VRMLoaderPlugin(parser); });
      return loader.parseAsync(r[1], url.replace(/[^/]*$/, ''));
    }).then(function (gltf) {
      var vrm = gltf.userData.vrm;
      if (!vrm) throw new Error('VRM 데이터를 찾을 수 없습니다');
      try { VRM.VRMUtils.removeUnnecessaryVertices(gltf.scene); } catch (e) {}
      try { VRM.VRMUtils.combineSkeletons(gltf.scene); } catch (e) {}
      vrm.scene.traverse(function (o) { o.frustumCulled = false; });
      VRM.VRMUtils.rotateVRM0(vrm);          /* VRM0.x 는 뒤를 보고 있으므로 180° 돌림 */
      root.add(vrm.scene);
      vrm.scene.updateMatrixWorld(true);

      var hum = vrm.humanoid;
      var rawHead = hum && (hum.getRawBoneNode ? hum.getRawBoneNode('head') : hum.getBoneNode('head'));
      var normHead = hum && hum.getNormalizedBoneNode ? hum.getNormalizedBoneNode('head') : null;

      var rig = relaxArms(hum);                /* T포즈 → 팔 내린 자세 + 제스처용 본 정보 */
      if (hum && hum.update) hum.update();     /* 정규화 본 → 실제 본에 반영 */
      vrm.scene.updateMatrixWorld(true);

      var v = new THREE.Vector3(0, 1.35, 0);
      if (rawHead) rawHead.getWorldPosition(v);
      frameHead(vrm.scene, camera, camTarget, v);
      return { vrm: vrm, head: normHead, rig: rig };
    });
  }

  /* viseme → VRM 표준 표정 프리셋 */
  var VRM_VIS = {
    aa: 'aa', E: 'ee', I: 'ih', O: 'oh', U: 'ou',
    SS: 'ih', CH: 'ih', DD: 'ih', nn: 'ih', RR: 'ih', FF: 'ih', TH: 'ih', kk: 'aa',
    PP: null, sil: null
  };

  /* ===================== 3D : Ready Player Me / 일반 GLB ===================== */
  function loadRPM(url, root, camera, camTarget, onProg) {
    return fetchAvatarBuffer(url, onProg).then(function (buf) {
      return new GLTFLoader().parseAsync(buf, url.replace(/[^/]*$/, ''));
    }).then(function (gltf) {
      var o = gltf.scene, morphs = [], headBone = null;
      o.traverse(function (n) {
        if (n.isMesh) { n.frustumCulled = false; if (n.morphTargetDictionary) morphs.push(n); }
        if (n.isBone && /head/i.test(n.name) && !headBone) headBone = n;
      });
      root.add(o);
      o.updateMatrixWorld(true);
      var v = new THREE.Vector3(0, 1.6, 0);
      if (headBone) headBone.getWorldPosition(v);
      frameHead(o, camera, camTarget, v);
      return { o: o, morphs: morphs, headBone: headBone };
    });
  }

  /* ===================== 렌더 ===================== */
  /* 라우터와 무관하게 body 에 붙는 전역 오버레이.
     mini = 화면 구석의 안내 도우미 / stage = Jerry 메뉴에서 크게 보는 모드 */
  function render() {
    destroy();
    injectCSS();

    var root = document.getElementById('jerry-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'jerry-root';
      document.body.appendChild(root);
    }
    root.className = mode;
    root.innerHTML =
      '<div id="j-dock">' +
        '<div id="j-tools">' +
          '<button class="j-btn" id="j-voice" title="음성 켜기/끄기">🔈</button>' +
          '<button class="j-btn" id="j-toggle" title="대화 로그">📜</button>' +
          '<button class="j-btn" id="j-setting" title="설정">⚙️</button>' +
          '<button class="j-btn" id="j-hide" title="닫기">닫기</button>' +
        '</div>' +
        '<div id="j-body">' +
          '<div id="j-stage">' +
            '<canvas id="j-canvas"></canvas>' +
            '<div id="j-hint">3D 엔진 불러오는 중…</div>' +
          '</div>' +
          '<div id="j-panel">' +
            '<p id="j-name">Jerry</p>' +
            '<div id="j-cap"></div>' +
            '<div id="j-log"></div>' +
            '<form id="j-form">' +
              '<textarea id="j-input" rows="1" placeholder="제리에게 뭐든 물어보세요."></textarea>' +
              '<button type="button" class="j-btn j-icon" id="j-mic" title="음성 입력">🎙</button>' +
              '<button type="submit" class="j-btn primary" id="j-send" title="전송">OK</button>' +
            '</form>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<p id="j-copy">VRM 모델 © 원저작자 (라이선스 표기 예정) · Jerry © Yehroei Ho 2026<br>' +
        '대화 로그 및 내용은 로컬 저장소, 캐시 또는 서버에 수집 및 저장되지 않습니다.</p>';

    var $main = root;

    var dlg = document.createElement('dialog');
    dlg.id = 'j-cfg';
    dlg.innerHTML =
      '<div class="j-dlg-head"><h2>설정</h2><div class="sp"></div>' +
        '<button class="j-btn" id="j-close" aria-label="설정 닫기" title="닫기 (Esc)">✕</button></div>' +
      '<div class="sub">모든 값은 이 브라우저에만 저장됩니다 (localStorage).</div>' +
      '<label>Anthropic API 키' +
        '<span class="h">console.anthropic.com → API Keys 에서 발급. Claude Pro/Max 구독과 별개로 크레딧이 필요합니다.</span>' +
        '<input type="password" id="j-fkey" placeholder="sk-ant-..." autocomplete="off"></label>' +
      '<div class="row">' +
        '<label>모델<select id="j-fmodel">' +
          '<option value="claude-sonnet-5">claude-sonnet-5 (균형)</option>' +
          '<option value="claude-haiku-4-5-20251001">claude-haiku-4-5 (빠르고 저렴)</option>' +
          '<option value="claude-opus-5">claude-opus-5 (최고 품질)</option>' +
        '</select></label>' +
        '<label id="j-vlabel">음성<select id="j-fvoice"></select><span class="h" id="j-vnow"></span></label>' +
      '</div>' +
      '<label>음성 엔진<select id="j-ftts">' +
        '<option value="browser">브라우저 기본 (무료 · 기기에 설치된 음성만)</option>' +
        '<option value="google">Google Cloud TTS (남성·소년 목소리 가능)</option>' +
      '</select></label>' +

      '<div id="j-gwrap">' +
        '<label>Google API 키' +
          '<span class="h">console.cloud.google.com → <b>Cloud Text-to-Speech API</b> 사용 설정 → ' +
          'API 및 서비스 → 사용자 인증 정보 → API 키 만들기. ' +
          'Standard·WaveNet 음성은 <b>월 400만 자까지 무료</b>입니다(결제수단 등록은 필요).</span>' +
          '<input type="password" id="j-fgkey" autocomplete="off" placeholder="AIza..."></label>' +
        '<label>Google 음성 (한국어 남성)' +
          '<select id="j-fgvoice"></select>' +
          '<span class="h" id="j-gvnote"></span></label>' +
        '<button class="j-btn" id="j-gload" type="button" style="margin-top:6px">음성 목록 새로 불러오기</button>' +
        '<div class="row">' +
          '<label>말 속도<span class="h">0.25 ~ 2.0</span><input type="text" id="j-fgrate"></label>' +
          '<label>음 높이 (반음)<span class="h">-20 ~ 20 · 소년 톤은 +4 ~ +8</span><input type="text" id="j-fgpitch"></label>' +
        '</div>' +
      '</div>' +

      '<div id="j-bwrap">' +
      '<label>목소리 톤 <span class="h">고르면 아래 음성·속도·음 높이가 함께 바뀝니다. ' +
        '설정을 닫고 "입 테스트"로 들어보세요.</span>' +
        '<select id="j-fpreset">' +
          '<option value="boy">소년 (Rocko, 높은 톤)</option>' +
          '<option value="man">남성 (Eddy)</option>' +
          '<option value="woman">여성 (Yuna)</option>' +
          '<option value="custom">직접 설정</option>' +
        '</select></label>' +
      '<div class="row">' +
        '<label>말 속도<span class="h">0.7 ~ 1.4</span><input type="text" id="j-frate"></label>' +
        '<label>음 높이<span class="h">0.7 ~ 2.0 (높을수록 어린 목소리)</span><input type="text" id="j-fpitch"></label>' +
      '</div>' +
      '</div>' +
      '<button class="j-btn" id="j-vtest" type="button" style="margin-top:10px">🔊 이 설정으로 미리듣기</button>' +
      '<label>3D 아바타 URL <span class="h">비우면 기본 아바타 <code>vrm/jerry.vrm</code> 를 씁니다. ' +
        '<code>none</code> 을 입력하면 코드로 만든 3D 얼굴로 바뀝니다.<br>' +
        '<b>.vrm</b> (VRoid 애니메 스타일) 과 <b>.glb</b> 를 지원하며 확장자로 자동 판별합니다. ' +
        '새 모델은 저장소 <code>vrm/</code> 폴더에 넣고 <code>vrm/이름.vrm</code> 으로 적으세요.<br>' +
        '모델 구하기: <a href="https://hub.vroid.com/en" target="_blank" rel="noopener">VRoid Hub ↗</a> · ' +
        '<a href="https://vroid.com/en/studio" target="_blank" rel="noopener">VRoid Studio ↗</a> (직접 제작, 무료)</span>' +
        '<input type="text" id="j-favatar" placeholder="vrm/jerry.vrm  (비우면 기본값)"></label>' +
      '<label>성격 (시스템 프롬프트)<textarea id="j-fsys" rows="4"></textarea></label>' +
      '<div class="warn">브라우저에서 API를 직접 호출하므로 <b>이 페이지를 여는 사람은 각자 자기 API 키를 입력해야</b> 합니다. ' +
        '키를 공유하고 싶다면 Cloudflare Worker 같은 프록시를 두는 편이 안전합니다.</div>' +
      '<div class="actions"><button class="j-btn" id="j-cache">아바타 캐시 지우기</button>' +
        '<button class="j-btn" id="j-clear">대화 초기화</button>' +
        '<button class="j-btn primary" id="j-save">저장</button></div>';
    document.body.appendChild(dlg);

    var $ = function (id) { return document.getElementById(id); };
    var stage = $('j-stage'), logEl = $('j-log'), capEl = $('j-cap'), hintEl = $('j-hint');

    S = {
      raf: 0, alive: true, dlg: dlg, ro: null, onMove: null,
      renderer: null, scene: null, camera: null, root: null,
      proc: null, rpm: null, vrm: null, camTarget: null,
      speaking: false, tl: null, tlStart: 0, actx: null, audioSrc: null,
      acts: [], emo: { happy: 0, sad: 0, angry: 0, surprised: 0, relaxed: 0 },
      headPos: null, frameObj: null, resize: null,
      mOpen: 0, mWide: 0.55, blink: 0, nextBlink: 0,
      look: { x: 0, y: 0 }, lookT: { x: 0, y: 0 },
      queue: [], qBusy: false, history: [], voices: [], rec: null, listening: false
    };

    /* ---------- 채팅 UI ---------- */
    function bubble(cls, text) {
      var d = document.createElement('div');
      d.className = 'j-msg ' + cls; d.textContent = text;
      logEl.appendChild(d); logEl.scrollTop = logEl.scrollHeight;
      return d;
    }

    /* ---------- TTS ---------- */
    function loadVoices() {
      if (!S || !('speechSynthesis' in window)) return;   /* 페이지를 떠난 뒤 호출될 수 있음 */
      S.voices = speechSynthesis.getVoices();
      var sel = $('j-fvoice'); if (!sel) return;
      /* macOS 는 음성이 180개가 넘어 그대로 나열하면 못 고른다. 한국어를 맨 위로 묶는다 */
      var ko = [], etc = [], i, v;
      for (i = 0; i < S.voices.length; i++) {
        (/^ko/i.test(S.voices[i].lang) ? ko : etc).push(S.voices[i]);
      }
      function opts(list) {
        var h = '';
        for (var k = 0; k < list.length; k++) {
          v = list[k];
          h += '<option value="' + v.name.replace(/"/g, '&quot;') + '">' + v.name + ' — ' + v.lang + '</option>';
        }
        return h;
      }
      sel.innerHTML = '<option value="">(자동 · 남성 한국어 우선)</option>' +
        (ko.length ? '<optgroup label="한국어 (' + ko.length + ')">' + opts(ko) + '</optgroup>' : '') +
        (etc.length ? '<optgroup label="기타 언어 (' + etc.length + ')">' + opts(etc) + '</optgroup>' : '');
      var cur = cfg.voice ? findVoice(cfg.voice, false) : null;   /* 'Rocko' → 'Rocko (한국어(한국))' 해석 */
      sel.value = cur ? cur.name : '';
      /* 기기에 그 음성이 없으면 다른 게 선택되므로 실제 사용 음성과 후보를 그대로 보여준다 */
      var now = $('j-vnow');
      if (now) {
        var used = pickVoice();
        if (!used) { now.textContent = '사용 가능한 음성을 찾지 못했습니다'; return; }
        var male = null;
        for (var m = 0; m < MALE_KO.length && !male; m++) male = findVoice(MALE_KO[m], true);
        var names = ko.map(function (x) { return x.name.split(' (')[0]; }).join(', ') || '없음';
        now.innerHTML = '실제 사용: <b>' + used.name + '</b> (' + used.lang + ')<br>' +
          '이 기기의 한국어 음성: ' + names +
          (male ? '' : '<br>⚠️ 이 기기에는 <b>남성 한국어 음성이 없습니다</b>. ' +
            '브라우저는 기본 설치된 음성만 쓸 수 있어서, 시스템에 추가로 받은 음성은 여기 나타나지 않습니다.');
      }
    }
    if ('speechSynthesis' in window) {
      speechSynthesis.onvoiceschanged = loadVoices;
      setTimeout(loadVoices, 250);
    }
    /* ⚠ macOS 는 같은 이름의 음성이 14개 언어로 존재한다 (Rocko 독일어/영어/…/한국어).
       언어를 안 따지고 이름만 맞추면 독일어 Rocko 가 걸리고, lang='de-DE' 로
       한글을 읽히려다 브라우저가 시스템 기본 음성(여성)으로 되돌려 버린다.
       → 반드시 언어 필터를 먼저 적용한다. */
    function findVoice(token, koOnly) {
      var i, v, t = String(token).toLowerCase(), partial = null;
      /* getVoices() 는 처음엔 빈 배열을 주는 브라우저가 있어 필요할 때 다시 읽는다 */
      if (!S.voices || !S.voices.length) {
        S.voices = ('speechSynthesis' in window ? speechSynthesis.getVoices() : []) || [];
      }
      for (i = 0; i < S.voices.length; i++) {
        v = S.voices[i];
        if (koOnly && !/^ko/i.test(v.lang)) continue;
        if (v.name === token) return v;                 /* 이름 완전 일치 우선 */
        if (!partial && v.name.toLowerCase().indexOf(t) >= 0) partial = v;
      }
      return partial;
    }
    function hasHangul(s) { return /[ㄱ-ㆎ가-힣]/.test(s || ''); }

    function pickVoice(text) {
      var i, v, needKo = (text === undefined) || hasHangul(text);
      if (cfg.voice) {
        v = findVoice(cfg.voice, needKo) || (needKo ? null : findVoice(cfg.voice, false));
        if (v) return v;
      }
      if (needKo) {                                     /* 기본값: 남성 한국어 음성 */
        for (i = 0; i < MALE_KO.length; i++) { v = findVoice(MALE_KO[i], true); if (v) return v; }
      }
      for (i = 0; i < S.voices.length; i++) { v = S.voices[i]; if (/^ko/i.test(v.lang)) return v; }
      for (i = 0; i < S.voices.length; i++) { v = S.voices[i]; if (/^en/i.test(v.lang)) return v; }
      return S.voices[0] || null;
    }
    /* exactMs 를 주면(클라우드 TTS 는 오디오 길이를 정확히 알 수 있다)
       타임라인을 실제 재생 시간에 맞춰 늘리거나 줄인다 → 립싱크가 훨씬 정확해진다 */
    /* ---------- 제스처 재생 ---------- */
    function addOff(off, bone, axis, v) {
      if (!off[bone]) off[bone] = { x: 0, y: 0, z: 0 };
      off[bone][axis] += v;
    }
    function poseOffsets(now, rig) {
      var off = {};
      for (var i = S.acts.length - 1; i >= 0; i--) {
        var act = S.acts[i], p = (now - act.start) / act.def.dur;
        if (p >= 1) { S.acts.splice(i, 1); continue; }
        for (var j = 0; j < act.def.t.length; j++) {
          var tr = act.def.t[j];
          if (!rig.bones[tr.b]) continue;
          var v = sampleKeys(tr.k, p);
          if (tr.s) v *= tr.s * (rig.sign[/^right/.test(tr.b) ? 'right' : 'left'] || 1);
          addOff(off, tr.b, tr.a, v);
        }
      }
      return off;
    }
    function playGesture(name) {
      var def = GESTURES[name];
      if (!def || !S) return;
      /* 같은 제스처가 겹쳐 쌓이지 않게 */
      for (var i = 0; i < S.acts.length; i++) if (S.acts[i].name === name) return;
      if (S.acts.length > 2) S.acts.shift();
      S.acts.push({ name: name, def: def, start: performance.now() });
      if (def.e) S.emo[def.e] = 0.85;                  /* 표정도 함께 */
    }

    function startMouth(text, rate, exactMs) {
      var tl = buildTimeline(text, rate);
      if (exactMs && tl.length) {
        var k = exactMs / (tl[tl.length - 1].t1 || exactMs);
        for (var i = 0; i < tl.length; i++) { tl[i].t0 *= k; tl[i].t1 *= k; }
      }
      S.tl = tl; S.tlStart = performance.now();
      S.speaking = true; capEl.textContent = text;
    }

    /* ---------- Google Cloud TTS ---------- */
    function ensureAudio() {
      if (!S.actx) {
        var C = window.AudioContext || window.webkitAudioContext;
        if (C) S.actx = new C();
      }
      if (S.actx && S.actx.state === 'suspended') S.actx.resume();
      return S.actx;
    }
    function decodeAudio(ab) {
      return new Promise(function (res, rej) {
        var p = S.actx.decodeAudioData(ab, res, rej);      /* Safari 는 콜백형만 되는 경우가 있다 */
        if (p && p.then) p.then(res, rej);
      });
    }
    function speakGoogle(text) {
      var body = {
        input: { text: text },
        voice: { languageCode: 'ko-KR', name: cfg.gvoice },
        audioConfig: {
          audioEncoding: 'MP3',
          pitch: parseFloat(cfg.gpitch) || 0,             /* 반음 단위 -20~20 */
          speakingRate: parseFloat(cfg.grate) || 1
        }
      };
      fetch('https://texttospeech.googleapis.com/v1/text:synthesize?key=' + encodeURIComponent(cfg.gkey), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
      }).then(function (r) {
        return r.json().then(function (j) {
          if (!r.ok) throw new Error((j.error && j.error.message) || ('HTTP ' + r.status));
          return j;
        });
      }).then(function (j) {
        var raw = atob(j.audioContent), n = raw.length, arr = new Uint8Array(n);
        for (var i = 0; i < n; i++) arr[i] = raw.charCodeAt(i);
        return decodeAudio(arr.buffer);
      }).then(function (buf) {
        if (!S || !S.alive) return;
        var src = S.actx.createBufferSource();
        src.buffer = buf; src.connect(S.actx.destination);
        S.audioSrc = src;
        startMouth(text, 1, buf.duration * 1000);
        src.onended = function () {
          if (!S) return;
          S.audioSrc = null; stopMouth(); S.qBusy = false; pump();
        };
        src.start();
      }).catch(function (e) {
        if (!S) return;
        bubble('sys', 'Google 음성 실패: ' + e.message + ' → 브라우저 음성으로 대체합니다.');
        S.qBusy = false;
        S.queue.unshift(text);
        cfg.tts = 'browser';                              /* 이번 세션 동안만 되돌림 */
        pump();
      });
    }
    function stopMouth() {
      S.speaking = false; S.tl = null;
      /* 대사는 다음 말이 나올 때까지 그대로 둔다 (사라지지 않음) */
    }
    /* 문장에 섞인 [끄덕] 같은 태그를 뽑아내고, 읽을 텍스트에서는 지운다 */
    function enqueue(text) {
      var raw = String(text), g = [], m;
      GESTURE_RE.lastIndex = 0;
      while ((m = GESTURE_RE.exec(raw))) g.push(m[1]);
      /* 목록에 없는 태그를 만들어 쓰더라도 소리 내어 읽지는 않도록 */
      var s = raw.replace(GESTURE_RE, ' ').replace(/\[[가-힣]{1,4}\]/g, ' ')
                 .replace(/\s+/g, ' ').trim();
      if (!s && !g.length) return;
      S.queue.push({ text: s, g: g });
      pump();
    }
    function pump() {
      if (!S || S.qBusy || !S.queue.length) return;
      var item = S.queue.shift();
      var s = item.text;
      /* 이 문장을 말하기 시작하는 시점에 제스처를 건다 */
      if (item.g.length) {
        playGesture(item.g[0]);
        for (var gi = 1; gi < item.g.length; gi++) {
          (function (n, d) { setTimeout(function () { if (S) playGesture(n); }, d); })(item.g[gi], gi * 700);
        }
      } else if (s.length > 22 && Math.random() < 0.33) {
        playGesture('끄덕');                      /* 태그가 없어도 가끔 고개를 끄덕여 준다 */
      }
      if (!s) { pump(); return; }
      if (!cfg.voiceOn || !('speechSynthesis' in window)) {   /* 음성 OFF → 입만 움직임 */
        S.qBusy = true; startMouth(s, cfg.rate);
        var dur = S.tl ? S.tl[S.tl.length - 1].t1 : 600;
        setTimeout(function () { if (!S) return; stopMouth(); S.qBusy = false; pump(); }, dur);
        return;
      }
      if (cfg.tts === 'google' && cfg.gkey) {            /* 클라우드 음성 */
        S.qBusy = true;
        ensureAudio();
        speakGoogle(s);
        return;
      }
      S.qBusy = true;
      var u = new SpeechSynthesisUtterance(s);
      var v = pickVoice(s);                     /* 한글이면 반드시 한국어 음성으로 */
      if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'ko-KR';
      u.rate = parseFloat(cfg.rate) || 1;
      u.pitch = parseFloat(cfg.pitch) || 1;
      var started = false, fallback = null;
      /* 음성 엔진이 응답하지 않는 환경(설치된 음성 없음 등)에서도 입은 움직이게 */
      fallback = setTimeout(function () {
        if (!S || started) return;
        started = true;
        startMouth(s, u.rate);
        var d = S.tl ? S.tl[S.tl.length - 1].t1 : 600;
        setTimeout(function () {
          if (!S || !S.qBusy) return;
          try { speechSynthesis.cancel(); } catch (e) {}
          stopMouth(); S.qBusy = false; pump();
        }, d);
      }, 1200);
      u.onstart = function () {
        if (started) return;
        started = true; clearTimeout(fallback);
        startMouth(s, u.rate);
      };
      u.onboundary = function (e) {                           /* 실제 발화 위치로 재동기화 */
        if (!S || !S.tl || e.charIndex == null) return;
        for (var i = 0; i < S.tl.length; i++) {
          if (S.tl[i].ci >= e.charIndex) { S.tlStart = performance.now() - S.tl[i].t0; return; }
        }
      };
      u.onend = u.onerror = function () {
        if (!S) return;
        clearTimeout(fallback);
        stopMouth(); S.qBusy = false; pump();
      };
      speechSynthesis.speak(u);
    }
    function stopAll() {
      if (!S) return;
      S.queue.length = 0;
      try { speechSynthesis.cancel(); } catch (e) {}
      if (S.audioSrc) {                                  /* 클라우드 음성 재생 중단 */
        try { S.audioSrc.onended = null; S.audioSrc.stop(); } catch (e) {}
        S.audioSrc = null;
      }
      S.qBusy = false; stopMouth();
    }

    /* ---------- Claude ---------- */
    function setBusy(b) { $('j-send').disabled = b; $('j-input').disabled = b; }

    function ask(userText) {
      if (!cfg.key) {
        bubble('sys', '설정에서 Anthropic API 키를 먼저 입력해 주세요.');
        openCfg();
        return;
      }
      S.history.push({ role: 'user', content: userText });
      var el = bubble('a', ''), full = '', buf = '';
      setBusy(true);

      fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': cfg.key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: cfg.model, max_tokens: 700, stream: true,
          system: (cfg.sys || DEFAULT_SYS) + pageContext(),
          messages: S.history.slice(-16)
        })
      }).then(function (res) {
        if (!res.ok) {
          return res.text().then(function (t) {
            throw new Error(res.status + ' ' + res.statusText + ' — ' + t.slice(0, 300));
          });
        }
        var reader = res.body.getReader(), dec = new TextDecoder(), raw = '';
        function step() {
          return reader.read().then(function (r) {
            if (r.done) return;
            raw += dec.decode(r.value, { stream: true });
            var lines = raw.split('\n');
            raw = lines.pop();
            for (var i = 0; i < lines.length; i++) {
              var line = lines[i];
              if (line.indexOf('data:') !== 0) continue;
              var ev;
              try { ev = JSON.parse(line.slice(5).trim()); } catch (e) { continue; }
              if (ev.type === 'content_block_delta' && ev.delta && ev.delta.text) {
                full += ev.delta.text; buf += ev.delta.text;
                el.textContent = full.replace(GESTURE_RE, '').replace(/ {2,}/g, ' ');
                logEl.scrollTop = logEl.scrollHeight;
                /* 문장이 끝나면 바로 말하기 시작 */
                var m = buf.match(/^[\s\S]*?[.!?…。\n]["'”’)\]]?\s/);
                if (m) { enqueue(m[0]); buf = buf.slice(m[0].length); }
              }
              if (ev.type === 'error') throw new Error((ev.error && ev.error.message) || 'stream error');
            }
            return step();
          });
        }
        return step();
      }).then(function () {
        if (buf.trim()) enqueue(buf);
        S.history.push({ role: 'assistant', content: full || '(빈 응답)' });
      }).catch(function (err) {
        el.remove();
        bubble('sys', '오류: ' + err.message);
        S.history.pop();
      }).then(function () {
        if (S) setBusy(false);
      });
    }

    /* ---------- 이벤트 ---------- */
    $('j-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var inp = $('j-input'), v = inp.value.trim();
      if (!v) return;
      inp.value = ''; inp.style.height = 'auto';
      ensureAudio();                                     /* iOS 는 사용자 조작 시점에 오디오를 열어야 한다 */
      bubble('u', v); stopAll(); ask(v);
    });
    $('j-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        $('j-form').requestSubmit();
      }
    });
    $('j-input').addEventListener('input', function (e) {
      e.target.style.height = 'auto';
      e.target.style.height = Math.min(120, e.target.scrollHeight) + 'px';
    });
    var btnVoice = $('j-voice');
    function syncVoiceBtn() {
      btnVoice.textContent = '🔈';
      btnVoice.title = cfg.voiceOn ? '음성 끄기' : '음성 켜기 (지금 음소거)';
      btnVoice.classList.toggle('off', !cfg.voiceOn);   /* 꺼짐 = 회색 */
      btnVoice.classList.remove('on');
    }
    btnVoice.addEventListener('click', function () {
      cfg.voiceOn = !cfg.voiceOn; saveCfg(); syncVoiceBtn(); stopAll();
    });
    syncVoiceBtn();

    /* 로그 펼치기 (위로 열림) */
    function togglePanel(force) {
      var r = document.getElementById('jerry-root');
      var open = force === undefined ? !r.classList.contains('logopen') : force;
      r.classList.toggle('logopen', open);
      $('j-toggle').classList.toggle('on', open);
      if (open) setTimeout(function () { var l = $('j-log'); if (l) l.scrollTop = l.scrollHeight; }, 60);
    }
    $('j-toggle').addEventListener('click', function () { ensureAudio(); togglePanel(); });

    /* 닫기 → 캐릭터만 남기고, 캐릭터를 누르면 다시 열린다 */
    $('j-hide').addEventListener('click', function () {
      document.getElementById('jerry-root').classList.add('closed');
    });
    $('j-stage').addEventListener('click', function () {
      ensureAudio();
      document.getElementById('jerry-root').classList.remove('closed');
    });

    /* 마이크 (Chrome/Edge) */
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    var btnMic = $('j-mic');
    if (!SR) { btnMic.disabled = true; btnMic.title = '이 브라우저는 음성 인식을 지원하지 않습니다'; }
    btnMic.addEventListener('click', function () {
      if (!SR) return;
      if (S.listening) { S.rec.stop(); return; }
      var rec = new SR();
      S.rec = rec;
      rec.lang = 'ko-KR'; rec.interimResults = true; rec.continuous = false;
      rec.onstart = function () { S.listening = true; btnMic.classList.add('on'); stopAll(); };
      rec.onresult = function (e) {
        var s = '';
        for (var i = 0; i < e.results.length; i++) s += e.results[i][0].transcript;
        $('j-input').value = s;
        if (e.results[e.results.length - 1].isFinal) { rec.stop(); $('j-form').requestSubmit(); }
      };
      rec.onerror = function () {};
      rec.onend = function () { if (!S) return; S.listening = false; btnMic.classList.remove('on'); };
      rec.start();
    });

    /* 설정 모달 */
    function openCfg() {
      $('j-fkey').value = cfg.key;
      $('j-fmodel').value = cfg.model;
      $('j-frate').value = cfg.rate;
      $('j-fpitch').value = cfg.pitch;
      $('j-favatar').value = cfg.avatar;
      $('j-fsys').value = cfg.sys;
      $('j-fpreset').value = cfg.preset || 'custom';
      $('j-ftts').value = cfg.tts || 'browser';
      $('j-fgkey').value = cfg.gkey;
      $('j-fgrate').value = cfg.grate;
      $('j-fgpitch').value = cfg.gpitch;
      fillGoogleVoices(GOOGLE_MALE, cfg.gvoice);
      syncEngine();
      loadVoices();
      dlg.showModal();
    }
    /* 엔진에 따라 관련 없는 항목을 숨긴다 */
    function syncEngine() {
      var g = $('j-ftts').value === 'google';
      $('j-gwrap').style.display = g ? '' : 'none';
      $('j-bwrap').style.display = g ? 'none' : '';
      $('j-vlabel').style.display = g ? 'none' : '';
    }
    $('j-ftts').addEventListener('change', syncEngine);

    function fillGoogleVoices(names, selected) {
      var sel = $('j-fgvoice'); if (!sel) return;
      var h = '';
      for (var i = 0; i < names.length; i++) {
        h += '<option value="' + names[i] + '">' + names[i] + '</option>';
      }
      sel.innerHTML = h;
      if (selected && names.indexOf(selected) < 0) {
        sel.innerHTML = '<option value="' + selected + '">' + selected + '</option>' + h;
      }
      sel.value = selected || names[0];
    }
    /* 키가 있으면 실제 음성 목록을 받아 남성만 추린다 (이름이 바뀌어도 안전) */
    function loadGoogleVoices() {
      var note = $('j-gvnote'), key = ($('j-fgkey').value || '').trim();
      if (!key) { note.textContent = 'API 키를 먼저 입력하세요.'; return; }
      note.textContent = '목록 불러오는 중…';
      fetch('https://texttospeech.googleapis.com/v1/voices?languageCode=ko-KR&key=' + encodeURIComponent(key))
        .then(function (r) {
          return r.json().then(function (j) {
            if (!r.ok) throw new Error((j.error && j.error.message) || ('HTTP ' + r.status));
            return j;
          });
        })
        .then(function (j) {
          var male = (j.voices || [])
            .filter(function (v) { return v.ssmlGender === 'MALE'; })
            .map(function (v) { return v.name; })
            .sort();
          if (!male.length) { note.textContent = '남성 음성을 찾지 못했습니다.'; return; }
          fillGoogleVoices(male, $('j-fgvoice').value);
          note.textContent = '한국어 남성 음성 ' + male.length + '개를 불러왔습니다.';
        })
        .catch(function (e) { note.textContent = '불러오기 실패: ' + e.message; });
    }
    $('j-gload').addEventListener('click', loadGoogleVoices);
    /* 톤 프리셋을 고르면 음성·속도·음 높이를 한 번에 채운다 */
    $('j-fpreset').addEventListener('change', function () {
      var p = VOICE_PRESETS[this.value];
      if (!p) return;
      var v = findVoice(p.voice, true);
      if (v) $('j-fvoice').value = v.name;
      $('j-frate').value = p.rate;
      $('j-fpitch').value = p.pitch;
    });
    /* 설정 창을 닫지 않고 지금 값 그대로 들어본다 */
    $('j-vtest').addEventListener('click', function () {
      var sample = '안녕하세요, 저는 제리예요. 이 목소리 어때요?';
      if ($('j-ftts').value === 'google') {              /* 저장 전 값으로 바로 시험 */
        var back = { tts: cfg.tts, gkey: cfg.gkey, gvoice: cfg.gvoice, grate: cfg.grate, gpitch: cfg.gpitch };
        cfg.tts = 'google';
        cfg.gkey = $('j-fgkey').value.trim();
        cfg.gvoice = $('j-fgvoice').value;
        cfg.grate = parseFloat($('j-fgrate').value) || 1;
        cfg.gpitch = parseFloat($('j-fgpitch').value) || 0;
        if (!cfg.gkey) { $('j-gvnote').textContent = 'API 키를 먼저 입력하세요.'; Object.assign(cfg, back); return; }
        ensureAudio(); stopAll();
        S.qBusy = true; speakGoogle(sample);
        return;
      }
      if (!('speechSynthesis' in window)) return;
      try { speechSynthesis.cancel(); } catch (e) {}
      ensureAudio();
      var name = $('j-fvoice').value;
      var v = name ? findVoice(name, false) : pickVoice(sample);
      var u = new SpeechSynthesisUtterance(sample);
      if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'ko-KR';
      u.rate = parseFloat($('j-frate').value) || 1;
      u.pitch = parseFloat($('j-fpitch').value) || 1;
      var now = $('j-vnow');
      if (now && v) now.textContent = '실제 사용: ' + v.name + ' (' + v.lang + ')';
      speechSynthesis.speak(u);
    });
    /* 값을 직접 만지면 프리셋은 '직접 설정' 으로 */
    ['j-fvoice', 'j-frate', 'j-fpitch'].forEach(function (id) {
      $(id).addEventListener('change', function () { $('j-fpreset').value = 'custom'; });
    });
    $('j-setting').addEventListener('click', openCfg);
    $('j-close').addEventListener('click', function () { dlg.close(); });   /* 저장 없이 닫기 */
    dlg.addEventListener('click', function (e) {                            /* 바깥 클릭으로 닫기 */
      var r = dlg.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dlg.close();
    });
    $('j-save').addEventListener('click', function () {
      var prev = cfg.avatar;
      cfg.key = $('j-fkey').value.trim();
      cfg.model = $('j-fmodel').value;
      cfg.rate = parseFloat($('j-frate').value) || 1.05;
      cfg.pitch = parseFloat($('j-fpitch').value) || 1;
      var av = $('j-favatar').value.trim();
      /* RPM 주소에 립싱크용 모프 타깃 옵션이 없으면 자동으로 붙여준다 */
      if (av && /readyplayer\.me/.test(av) && av.indexOf('morphTargets') < 0) {
        av += (av.indexOf('?') < 0 ? '?' : '&') + 'morphTargets=Oculus%20Visemes,ARKit';
      }
      cfg.avatar = av;
      cfg.sys = $('j-fsys').value.trim() || DEFAULT_SYS;
      cfg.voice = $('j-fvoice').value;
      cfg.preset = $('j-fpreset').value;
      cfg.tts = $('j-ftts').value;
      cfg.gkey = $('j-fgkey').value.trim();
      cfg.gvoice = $('j-fgvoice').value;
      cfg.grate = parseFloat($('j-fgrate').value) || 1;
      cfg.gpitch = parseFloat($('j-fgpitch').value) || 0;
      saveCfg(); dlg.close();
      if (cfg.avatar !== prev) render($main);      /* 아바타가 바뀌면 씬을 다시 만든다 */
    });
    /* 같은 파일명으로 모델을 교체했을 때 등, 저장본을 버리고 다시 받게 한다 */
    $('j-cache').addEventListener('click', function () {
      var b = this;
      b.disabled = true; b.textContent = '지우는 중…';
      clearAvatarCache().then(function () { render($main); });
    });
    $('j-clear').addEventListener('click', function () {
      S.history.length = 0; logEl.innerHTML = ''; stopAll(); dlg.close();
      bubble('sys', '대화를 초기화했습니다.');
    });

    /* 페이지 안내용 대사: 대화 기록에도 남기고 소리 내어 말한다 (API 호출 없음) */
    S.say = function (line) {
      if (!S || !S.alive) return;
      var clean = String(line).replace(GESTURE_RE, ' ').replace(/\[[가-힣]{1,4}\]/g, ' ')
                              .replace(/\s+/g, ' ').trim();
      bubble('a', clean);
      stopAll();
      enqueue(line);
    };

    if (!cfg.key) {
      bubble('sys', '⚙ 설정에서 Anthropic API 키를 넣으면 대화할 수 있어요.');
    }

    /* ---------- 3D 씬 ---------- */
    loadMods().then(function () {
      if (!S || !S.alive || !document.getElementById('j-canvas')) return;

      var renderer = new THREE.WebGLRenderer({ canvas: $('j-canvas'), antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      var scene = new THREE.Scene();
      var camera = new THREE.PerspectiveCamera(30, 1, 0.05, 100);
      camera.position.set(0, 0.05, 3.15);
      var camTarget = new THREE.Vector3(0, 0.02, 0);

      scene.add(new THREE.HemisphereLight(0xfff1f2, 0x1a1418, 0.85));
      var key = new THREE.DirectionalLight(0xffffff, 2.1); key.position.set(1.6, 2.2, 2.6); scene.add(key);
      var fill = new THREE.DirectionalLight(0xffd9e0, 0.7); fill.position.set(-2, 0.4, 1.6); scene.add(fill);
      var rim = new THREE.PointLight(0xfb7185, 2.2, 12); rim.position.set(-1.2, 1.4, -2.2); scene.add(rim);

      var root = new THREE.Group(); scene.add(root);
      S.renderer = renderer; S.scene = scene; S.camera = camera;
      S.root = root; S.camTarget = camTarget;

      function resize() {
        var w = stage.clientWidth, h = stage.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h; camera.updateProjectionMatrix();
        /* mini ↔ stage 로 크기가 확 바뀌므로 카메라 구도를 다시 잡는다 */
        if (S && S.headPos) frameHead(S.frameObj, camera, camTarget, S.headPos);
      }
      S.resize = resize;
      S.ro = new ResizeObserver(resize); S.ro.observe(stage); resize();

      S.onMove = function (e) {
        var r = stage.getBoundingClientRect();
        S.lookT.x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2));
        S.lookT.y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2));
      };
      window.addEventListener('pointermove', S.onMove);

      var ready = Promise.resolve();
      var avUrl = avatarURL();
      if (avUrl) {
        hintEl.textContent = '아바타 불러오는 중…';
        var vrmMode = isVRM(avUrl);
        /* 진행 표시: 퍼센트가 아니라 받은 용량(MB)으로 보여준다.
           서버가 gzip 으로 보내면 loaded 는 압축 해제된 크기,
           total(Content-Length) 은 압축된 크기라서 비율이 100%를 넘어버린다.
           (이 모델은 16.7MB / 9.0MB = 1.85 배 → 최대 185% 로 표시됐음) */
        var fromCache = false;
        var onProg = function (e) {
          if (!e || !hintEl) return;
          if (e.cached) { fromCache = true; hintEl.textContent = '아바타 불러오는 중… (저장된 파일 사용)'; return; }
          if (!e.loaded) return;
          var mb = e.loaded / 1048576;
          var totalMB = (e.total && e.total >= e.loaded) ? ' / ' + (e.total / 1048576).toFixed(1) + 'MB' : 'MB';
          hintEl.textContent = '아바타 내려받는 중… ' + mb.toFixed(1) + totalMB;
        };
        ready = (vrmMode ? loadVRMAvatar : loadRPM)(avUrl, root, camera, camTarget, onProg)
          .then(function (r) {
            var tag = fromCache ? ' · 저장된 파일 사용 (통신 없음)' : ' · 다음부터는 저장된 파일 사용';
            if (vrmMode) { S.vrm = r; hintEl.textContent = 'VRM 아바타' + tag; }
            else { S.rpm = r; hintEl.textContent = 'GLB 아바타' + tag; }
          }).catch(function (e) {
            hintEl.textContent = '아바타 로드 실패 (' + (e.message || e) + ') — 기본 얼굴 사용';
            S.proc = buildHead(root);
          });
      } else {
        S.proc = buildHead(root);
        hintEl.textContent = cfg.key ? '기본 3D 얼굴' : '설정에서 API 키를 넣으면 대화가 시작됩니다';
      }

      ready.then(function () {
        if (!S || !S.alive) return;
        setTimeout(function () { if (hintEl) hintEl.style.opacity = '0'; }, 4000);
        var clock = new THREE.Clock();
        S.nextBlink = performance.now() + 2000;

        function setMorph(name, val) {
          if (!S.rpm) return;
          for (var i = 0; i < S.rpm.morphs.length; i++) {
            var m = S.rpm.morphs[i], idx = m.morphTargetDictionary[name];
            if (idx !== undefined) m.morphTargetInfluences[idx] = val;
          }
        }
        function currentViseme(now) {
          if (!S.tl) return 'sil';
          var e = now - S.tlStart;
          for (var i = 0; i < S.tl.length; i++) if (e < S.tl[i].t1) return S.tl[i].v;
          return 'sil';
        }

        function tick() {
          if (!S || !S.alive) return;
          S.raf = requestAnimationFrame(tick);
          var dt = Math.min(.05, clock.getDelta()), now = performance.now(), t = clock.elapsedTime;

          var cv = S.speaking ? currentViseme(now) : 'sil';
          var target = VIS[cv] || VIS.sil;
          var k = 1 - Math.pow(0.0016, dt);
          S.mOpen += (target[0] - S.mOpen) * k;
          S.mWide += (target[1] - S.mWide) * k;

          if (now > S.nextBlink) { S.blink = 1; S.nextBlink = now + 1800 + Math.random() * 3600; }
          S.blink = Math.max(0, S.blink - dt * 7);
          var bl = Math.sin(Math.min(1, S.blink) * Math.PI);

          S.look.x += (S.lookT.x - S.look.x) * Math.min(1, dt * 3);
          S.look.y += (S.lookT.y - S.look.y) * Math.min(1, dt * 3);
          var yaw = S.look.x * 0.22 + Math.sin(t * 0.34) * 0.05;
          var pit = S.look.y * 0.13 + Math.sin(t * 0.51) * 0.025 + (S.speaking ? Math.sin(t * 7.2) * 0.012 : 0);

          if (S.proc) {
            var P = S.proc;
            P.g.rotation.y = yaw; P.g.rotation.x = pit;
            P.g.position.y = Math.sin(t * 1.15) * 0.012;
            var w = 0.86 + S.mWide * 0.30;                 /* 가로 폭 */
            P.cavity.scale.set(.30 * w, .02 + S.mOpen * 0.15, .075);
            P.cavity.position.y = -S.mOpen * 0.02;
            P.upperLip.scale.set(.33 * w, .05, .09);
            P.upperLip.position.y = .035 + S.mOpen * 0.055;
            P.lowerLip.scale.set(.33 * w, .055, .09);
            P.lowerLip.position.y = -.04 - S.mOpen * 0.10;
            for (var i = 0; i < P.lids.length; i++) {
              P.lids[i].position.y = .245 - bl * 0.155;
              P.lids[i].scale.y = .62 + bl * 0.18;
            }
            for (var j = 0; j < P.irises.length; j++) {
              P.irises[j].position.x = P.irises[j].userData.baseX + S.look.x * 0.022;
              P.irises[j].position.y = .10 - S.look.y * 0.016;
            }
          }
          if (S.vrm) {
            var em = S.vrm.vrm.expressionManager;
            if (em) {
              em.setValue('aa', 0); em.setValue('ih', 0); em.setValue('ou', 0);
              em.setValue('ee', 0); em.setValue('oh', 0);
              var vname = VRM_VIS[cv];
              if (vname) em.setValue(vname, Math.min(1, 0.30 + S.mOpen * 0.9));
              em.setValue('blink', bl);
              /* 감정 표정: 목표값으로 천천히 수렴시켰다가 서서히 0으로 */
              for (var e in S.emo) {
                S.emo[e] = Math.max(0, S.emo[e] - dt * 0.35);
                em.setValue(e, S.emo[e]);
              }
            }

            var rig = S.vrm.rig, off = poseOffsets(now, rig);
            /* 숨쉬기 + 무게중심 이동: 가만히 있어도 살아있어 보이게 */
            var breath = Math.sin(t * 1.05) * 0.012;
            var sway = Math.sin(t * 0.27) * 0.022;
            addOff(off, 'spine', 'x', breath);
            addOff(off, 'spine', 'z', sway);
            addOff(off, 'chest', 'x', breath * 0.6);
            /* 말할 때는 입 벌린 정도에 맞춰 고개가 미세하게 끄덕인다 */
            if (S.speaking) {
              addOff(off, 'head', 'x', S.mOpen * 0.045 + Math.sin(t * 6.1) * 0.012);
              addOff(off, 'chest', 'y', Math.sin(t * 1.9) * 0.02);
            }
            addOff(off, 'head', 'y', yaw * 0.75);
            addOff(off, 'head', 'x', pit * 0.6);

            for (var bn in rig.base) {
              var node = rig.bones[bn]; if (!node) continue;
              var b = rig.base[bn], o = off[bn];
              if (o) node.rotation.set(b.x + o.x, b.y + o.y, b.z + o.z);
              else node.rotation.set(b.x, b.y, b.z);
            }
            S.vrm.vrm.update(dt);
          }
          if (S.rpm) {
            for (var v in VIS) setMorph('viseme_' + v, 0);
            setMorph('viseme_' + cv, Math.min(1, 0.35 + S.mOpen * 0.8));
            setMorph('jawOpen', S.mOpen * 0.62);
            setMorph('mouthSmile', 0.12);
            setMorph('eyeBlinkLeft', bl); setMorph('eyeBlinkRight', bl);
            if (S.rpm.headBone) { S.rpm.headBone.rotation.y = yaw * 0.7; S.rpm.headBone.rotation.x = pit * 0.6; }
          }

          camera.lookAt(camTarget);
          renderer.render(scene, camera);
        }
        tick();
      });
    }).catch(function (e) {
      if (hintEl) hintEl.textContent = '3D 엔진을 불러오지 못했습니다: ' + e.message;
    });
  }

  /* ===================== 정리 ===================== */
  function destroy() {
    if (!S) return;
    S.alive = false;
    if (S.raf) cancelAnimationFrame(S.raf);
    if (S.ro) { try { S.ro.disconnect(); } catch (e) {} }
    if (S.onMove) window.removeEventListener('pointermove', S.onMove);
    try { speechSynthesis.cancel(); } catch (e) {}
    if (S.rec) { try { S.rec.abort(); } catch (e) {} }
    if (S.vrm && VRM && VRM.VRMUtils && VRM.VRMUtils.deepDispose) {
      try { VRM.VRMUtils.deepDispose(S.vrm.vrm.scene); } catch (e) {}
    }
    if (S.renderer) {
      try {
        S.renderer.dispose();
        S.scene.traverse(function (n) {
          if (n.geometry) n.geometry.dispose();
          if (n.material) {
            (Array.isArray(n.material) ? n.material : [n.material]).forEach(function (m) { m.dispose(); });
          }
        });
      } catch (e) {}
    }
    if (S.dlg && S.dlg.parentNode) { try { S.dlg.close(); } catch (e) {} S.dlg.parentNode.removeChild(S.dlg); }
    S = null;
  }

  /* ===================== 전역 동작 ===================== */
  function setMode(next) {
    if (mode === next) return;
    mode = next;
    var r = document.getElementById('jerry-root');
    if (!r) return;
    var keep = [];
    if (mode === 'mini' && r.classList.contains('logopen')) keep.push('logopen');
    r.className = mode + (keep.length ? ' ' + keep.join(' ') : '');
    /* 레이아웃이 바뀐 뒤 카메라 구도를 다시 잡는다 */
    setTimeout(function () { if (S && S.resize) S.resize(); }, 60);
  }

  /* 페이지가 바뀌면 그 페이지에 맞는 한마디. 같은 페이지에서는 한 번만. */
  function greet() {
    if (!S || !S.alive || !S.say) return;
    var p = currentPage();
    if (greeted[p.id]) return;
    greeted[p.id] = true;
    S.say(p.hi());
  }

  var routeTimer = null;
  function onRoute() {
    /* 페이지를 넘어가면 대화 로그는 남기지 않는다 */
    if (S && S.history) {
      S.history.length = 0;
      var le = document.getElementById('j-log');
      if (le) le.innerHTML = '';
      var r0 = document.getElementById('jerry-root');
      if (r0) r0.classList.remove('logopen');
    }
    setMode(/^#\/jerry/.test(location.hash || '') ? 'stage' : 'mini');
    clearTimeout(routeTimer);
    /* 라우터가 본문을 그린 뒤에 읽어야 글 제목·개수를 알 수 있다 */
    routeTimer = setTimeout(greet, 700);
  }
  window.addEventListener('hashchange', onRoute);

  function boot() {
    if (document.getElementById('jerry-root')) return;
    mode = /^#\/jerry/.test(location.hash || '') ? 'stage' : 'mini';
    render();
    setTimeout(greet, 1400);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  /* index.html 라우터용: Jerry 메뉴에서는 크게 보여주고, 떠나면 다시 구석으로 */
  window.JerryPage = {
    render: function ($main) {
      $main.innerHTML = '<div class="status" style="padding:24px 0">제리는 항상 화면에 함께 있습니다. ' +
        '아래에서 대화해 보세요.</div>';
      setMode('stage');
      if (!document.getElementById('jerry-root')) render();
    },
    destroy: function () { setMode('mini'); },
    reload: function () { render(); }
  };
})();
