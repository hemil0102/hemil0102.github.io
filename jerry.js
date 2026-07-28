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

  var cfg = Object.assign({
    key: '', model: 'claude-sonnet-5', voice: '', rate: 1.05, pitch: 1,
    avatar: '', sys: DEFAULT_SYS, voiceOn: true
  }, readCfg());

  function readCfg() {
    try { return JSON.parse(localStorage.getItem(LS) || '{}'); } catch (e) { return {}; }
  }
  function saveCfg() {
    try { localStorage.setItem(LS, JSON.stringify(cfg)); } catch (e) {}
  }

  /* ===================== 스타일 (1회 주입) ===================== */
  var CSS = '' +
  '#jerry-wrap{display:flex;flex-direction:column;gap:12px}' +
  '#jerry-wrap .j-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap}' +
  '#jerry-wrap .j-head h1{font-size:1.35rem;font-weight:700;letter-spacing:-.01em}' +
  '#jerry-wrap .j-head .j-sub{color:var(--muted);font-size:.85rem}' +
  '#jerry-wrap .j-head .sp{margin-left:auto}' +
  '.j-btn{background:var(--header-glass,rgba(255,255,255,.06));border:1px solid var(--border);' +
    'color:var(--text);border-radius:999px;padding:7px 14px;font:inherit;font-size:.84rem;' +
    'font-weight:600;cursor:pointer;transition:.18s;white-space:nowrap}' +
  '.j-btn:hover{background:var(--accent-light)}' +
  '.j-btn.on{background:var(--accent);border-color:transparent;color:#1a0d10}' +
  '.j-btn.primary{background:var(--accent);border-color:transparent;color:#1a0d10}' +
  '.j-btn:disabled{opacity:.45;cursor:default}' +
  '#j-stage{position:relative;height:clamp(260px,50vh,470px);border-radius:14px;overflow:hidden;' +
    'border:1px solid var(--border);background:radial-gradient(120% 90% at 50% 0%,' +
    'var(--accent-light) 0%,var(--card) 55%,var(--bg) 100%)}' +
  '#j-stage canvas{display:block;width:100%;height:100%}' +
  '#j-hint{position:absolute;left:12px;top:10px;font-size:.76rem;color:var(--muted);' +
    'background:rgba(0,0,0,.35);padding:4px 10px;border-radius:999px;transition:opacity .6s}' +
  /* 자막은 얼굴 아래(화면 하단)에 고정. 밝은 아바타 위에서도 읽히도록 어두운 알약 배경 */
  '#j-cap{position:absolute;left:50%;transform:translateX(-50%);bottom:12px;max-width:90%;' +
    'text-align:center;font-size:.95rem;line-height:1.45;pointer-events:none;' +
    'background:rgba(0,0,0,.5);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);' +
    'padding:7px 16px;border-radius:14px;text-shadow:0 1px 6px rgba(0,0,0,.6)}' +
  '#j-cap:empty{display:none}' +
  '#j-log{display:flex;flex-direction:column;gap:8px;max-height:32vh;overflow-y:auto;padding:2px}' +
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
  '@media(max-width:700px){#j-log{max-height:28vh}#j-cap{bottom:40px;font-size:.88rem}}';

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

  /* 모델 크기에 맞춰 얼굴을 화면에 채운다.
     머리 높이 = (모델 최상단 - head 본) 을 기준으로 거리를 잡으므로
     SD(2등신)든 실사 비율이든 같은 코드로 얼굴 클로즈업이 나온다. */
  function frameHead(obj, camera, camTarget, headPos) {
    var box = new THREE.Box3().setFromObject(obj);
    var headH = box.max.y - headPos.y;
    if (!(headH > 0.01)) headH = (box.max.y - box.min.y) * 0.25;
    /* 세로 1.5배로 잡으면 얼굴이 화면 위쪽 70%를 차지하고
       아래 30%는 몸통/여백이 되어 자막이 얼굴을 가리지 않는다 */
    var t = Math.tan(camera.fov * Math.PI / 360);
    var distV = (headH * 1.50) / (2 * t);
    var distH = (headH * 1.35) / (2 * t * Math.max(0.5, camera.aspect));   /* 좁은 화면에서 잘리지 않게 */
    camTarget.set(headPos.x, headPos.y + headH * 0.30, headPos.z);
    camera.position.set(camTarget.x, camTarget.y, headPos.z + Math.max(distV, distH));
  }

  /* T포즈(양팔 수평)를 자연스럽게 내린 자세로 바꾼다.
     좌우 방향·좌표계 규약을 가정하지 않고, 본의 부모 로컬 공간에서
     현재 팔이 향한 방향을 직접 재서 회전 부호를 정한다. */
  function relaxArms(hum) {
    if (!hum || !hum.getNormalizedBoneNode) return;
    var DROP = 1.18;                       /* 수평에서 약 68도 아래 */
    ['left', 'right'].forEach(function (side) {
      var up = hum.getNormalizedBoneNode(side + 'UpperArm');
      var lo = hum.getNormalizedBoneNode(side + 'LowerArm');
      var hand = hum.getNormalizedBoneNode(side + 'Hand') || lo;
      if (!up || !hand || !up.parent) return;
      up.parent.updateWorldMatrix(true, false);
      var inv = new THREE.Matrix4().copy(up.parent.matrixWorld).invert();
      var a = up.getWorldPosition(new THREE.Vector3()).applyMatrix4(inv);
      var b = hand.getWorldPosition(new THREE.Vector3()).applyMatrix4(inv);
      var dx = b.x - a.x, dy = b.y - a.y;
      if (Math.abs(dx) < 1e-5) return;
      var cur = Math.atan2(-dy, Math.abs(dx));   /* 0 = T포즈, + = 이미 내려간 각도 */
      var sign = dx > 0 ? -1 : 1;                /* +X 로 뻗은 팔은 -Z 회전이 아래 */
      up.rotation.z = sign * (DROP - cur);
      if (lo) lo.rotation.z = sign * 0.16;       /* 팔꿈치 살짝 굽힘 */
    });
  }

  /* ===================== 3D : VRM (VRoid 등 애니메 스타일) ===================== */
  function loadVRMAvatar(url, root, camera, camTarget, onProg) {
    return loadVRMMod().then(function () {
      var loader = new GLTFLoader();
      loader.register(function (parser) { return new VRM.VRMLoaderPlugin(parser); });
      return loader.loadAsync(url, onProg);
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

      relaxArms(hum);                          /* T포즈 → 팔 내린 자세 */
      if (hum && hum.update) hum.update();     /* 정규화 본 → 실제 본에 반영 */
      vrm.scene.updateMatrixWorld(true);

      var v = new THREE.Vector3(0, 1.35, 0);
      if (rawHead) rawHead.getWorldPosition(v);
      frameHead(vrm.scene, camera, camTarget, v);
      return { vrm: vrm, head: normHead };
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
    return new GLTFLoader().loadAsync(url, onProg).then(function (gltf) {
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
  function render($main) {
    destroy();
    injectCSS();

    $main.innerHTML =
      '<div id="jerry-wrap">' +
        '<div class="j-head">' +
          '<h1>Jerry</h1>' +
          '<span class="j-sub">3D AI Human</span>' +
          '<div class="sp"></div>' +
          '<button class="j-btn" id="j-test">입 테스트</button>' +
          '<button class="j-btn" id="j-voice">🔊 음성 ON</button>' +
          '<button class="j-btn" id="j-setting">설정</button>' +
        '</div>' +
        '<div id="j-stage"><canvas id="j-canvas"></canvas>' +
          '<div id="j-cap"></div><div id="j-hint">3D 엔진 불러오는 중…</div></div>' +
        '<div id="j-log"></div>' +
        '<form id="j-form">' +
          '<textarea id="j-input" rows="1" placeholder="Jerry에게 말 걸기…  (Enter 전송 / Shift+Enter 줄바꿈)"></textarea>' +
          '<button type="button" class="j-btn j-icon" id="j-mic" title="음성 입력">🎙</button>' +
          '<button type="submit" class="j-btn primary j-icon" id="j-send" title="전송">↑</button>' +
        '</form>' +
      '</div>';

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
        '<label>음성<select id="j-fvoice"></select></label>' +
      '</div>' +
      '<div class="row">' +
        '<label>말 속도<span class="h">0.7 ~ 1.4</span><input type="text" id="j-frate"></label>' +
        '<label>음 높이<span class="h">0.7 ~ 1.3</span><input type="text" id="j-fpitch"></label>' +
      '</div>' +
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
      '<div class="actions"><button class="j-btn" id="j-clear">대화 초기화</button>' +
        '<button class="j-btn primary" id="j-save">저장</button></div>';
    document.body.appendChild(dlg);

    var $ = function (id) { return document.getElementById(id); };
    var stage = $('j-stage'), logEl = $('j-log'), capEl = $('j-cap'), hintEl = $('j-hint');

    S = {
      raf: 0, alive: true, dlg: dlg, ro: null, onMove: null,
      renderer: null, scene: null, camera: null, root: null,
      proc: null, rpm: null, vrm: null, camTarget: null,
      speaking: false, tl: null, tlStart: 0,
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
      var html = '<option value="">(자동 · 한국어 우선)</option>';
      for (var i = 0; i < S.voices.length; i++) {
        var v = S.voices[i];
        html += '<option value="' + v.name.replace(/"/g, '&quot;') + '">' + v.name + ' — ' + v.lang + '</option>';
      }
      sel.innerHTML = html;
      sel.value = cfg.voice || '';
    }
    if ('speechSynthesis' in window) {
      speechSynthesis.onvoiceschanged = loadVoices;
      setTimeout(loadVoices, 250);
    }
    function pickVoice() {
      var i, v;
      if (cfg.voice) { for (i = 0; i < S.voices.length; i++) if (S.voices[i].name === cfg.voice) return S.voices[i]; }
      for (i = 0; i < S.voices.length; i++) { v = S.voices[i]; if (/^ko/i.test(v.lang)) return v; }
      for (i = 0; i < S.voices.length; i++) { v = S.voices[i]; if (/^en/i.test(v.lang)) return v; }
      return S.voices[0] || null;
    }
    function startMouth(text, rate) {
      S.tl = buildTimeline(text, rate); S.tlStart = performance.now();
      S.speaking = true; capEl.textContent = text;
    }
    function stopMouth() {
      S.speaking = false; S.tl = null;
      setTimeout(function () { if (S && !S.speaking && !S.queue.length) capEl.textContent = ''; }, 1200);
    }
    function enqueue(text) {
      var s = String(text).replace(/\s+/g, ' ').trim();
      if (!s) return;
      S.queue.push(s); pump();
    }
    function pump() {
      if (!S || S.qBusy || !S.queue.length) return;
      var s = S.queue.shift();
      if (!cfg.voiceOn || !('speechSynthesis' in window)) {   /* 음성 OFF → 입만 움직임 */
        S.qBusy = true; startMouth(s, cfg.rate);
        var dur = S.tl ? S.tl[S.tl.length - 1].t1 : 600;
        setTimeout(function () { if (!S) return; stopMouth(); S.qBusy = false; pump(); }, dur);
        return;
      }
      S.qBusy = true;
      var u = new SpeechSynthesisUtterance(s);
      var v = pickVoice();
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
          system: cfg.sys || DEFAULT_SYS,
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
                el.textContent = full; logEl.scrollTop = logEl.scrollHeight;
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
    $('j-test').addEventListener('click', function () {
      stopAll();
      enqueue('안녕하세요, 저는 제리입니다. 입 모양이 잘 맞는지 확인해 보세요.');
    });

    var btnVoice = $('j-voice');
    function syncVoiceBtn() {
      btnVoice.textContent = cfg.voiceOn ? '🔊 음성 ON' : '🔇 음성 OFF';
      btnVoice.classList.toggle('on', cfg.voiceOn);
    }
    btnVoice.addEventListener('click', function () {
      cfg.voiceOn = !cfg.voiceOn; saveCfg(); syncVoiceBtn(); stopAll();
    });
    syncVoiceBtn();

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
      loadVoices();
      dlg.showModal();
    }
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
      saveCfg(); dlg.close();
      if (cfg.avatar !== prev) render($main);      /* 아바타가 바뀌면 씬을 다시 만든다 */
    });
    $('j-clear').addEventListener('click', function () {
      S.history.length = 0; logEl.innerHTML = ''; stopAll(); dlg.close();
      bubble('sys', '대화를 초기화했습니다.');
    });

    bubble('sys', 'Jerry — 3D AI Human');
    if (!cfg.key) {
      bubble('a', '안녕하세요, 저는 제리예요. 오른쪽 위 설정에서 API 키를 넣어주시면 바로 대화할 수 있어요. ' +
        '그전에 "입 테스트"로 제 입이 잘 움직이는지 보셔도 좋아요.');
    }
    window.scrollTo(0, 0);

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
      }
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
        var onProg = function (e) {
          if (!e || !hintEl || !e.loaded) return;
          var mb = e.loaded / 1048576;
          var totalMB = (e.total && e.total >= e.loaded) ? ' / ' + (e.total / 1048576).toFixed(1) + 'MB' : 'MB';
          hintEl.textContent = '아바타 불러오는 중… ' + mb.toFixed(1) + totalMB;
        };
        ready = (vrmMode ? loadVRMAvatar : loadRPM)(avUrl, root, camera, camTarget, onProg)
          .then(function (r) {
            if (vrmMode) { S.vrm = r; hintEl.textContent = 'VRM 아바타'; }
            else { S.rpm = r; hintEl.textContent = 'GLB 아바타'; }
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
            }
            if (S.vrm.head) {
              S.vrm.head.rotation.y = yaw * 0.75;
              S.vrm.head.rotation.x = pit * 0.6;
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

  window.JerryPage = { render: render, destroy: destroy };
})();
