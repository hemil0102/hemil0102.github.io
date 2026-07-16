/* =========================================================
 * Harry's Insights — 색상 테마(스킨) 시스템
 *
 * 새 색상 추가 방법: 아래 THEMES 배열에 한 줄만 추가하면
 * 팔레트 동그라미와 전체 색상 톤이 자동으로 생성됩니다.
 *   { id: 'teal', name: '청록', base: '#0D9488' }
 * 필요하면 overrides로 자동 파생값을 개별 수정할 수 있습니다.
 *   { id:'teal', name:'청록', base:'#0D9488',
 *     overrides: { light: { '--accent': '#0f766e' } } }
 * ========================================================= */
(function () {
  'use strict';

  var THEMES = [
    { id: 'green',  name: '초록', base: '#61BB46' },
    { id: 'yellow', name: '노랑', base: '#FDB827' },
    { id: 'orange', name: '주황', base: '#F5821F' },
    { id: 'red',    name: '빨강', base: '#E03A3E' },
    { id: 'purple', name: '보라', base: '#963D97' },
    { id: 'blue',   name: '파랑', base: '#009DDC' }
  ];
  var DEFAULT_THEME = 'orange';
  var STORAGE_KEY = 'harrys-color-theme';

  /* ---------- 색상 유틸 ---------- */
  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.replace(/./g, function (c) { return c + c; });
    var n = parseInt(hex, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgbToHsl(rgb) {
    var r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h = 0, s = 0, l = (max + min) / 2, d = max - min;
    if (d !== 0) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
  }
  function hslToRgb(h, s, l) {
    s /= 100; l /= 100;
    var c = (1 - Math.abs(2 * l - 1)) * s;
    var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    var m = l - c / 2, r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
  }
  function luminance(rgb) {
    var a = rgb.map(function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  }
  function contrast(rgb1, rgb2) {
    var l1 = luminance(rgb1), l2 = luminance(rgb2);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }
  function css(h, s, l, a) {
    return a === undefined
      ? 'hsl(' + h + ', ' + s + '%, ' + l + '%)'
      : 'hsla(' + h + ', ' + s + '%, ' + l + '%, ' + a + ')';
  }

  /* ---------- 가독성 보정: 목표 대비(기본 4.5:1) 이상이 되도록 명도 조절 ---------- */
  function fitContrast(h, s, l, bgRgb, dir, target) {
    target = target || 4.5;
    while (contrast(hslToRgb(h, s, l), bgRgb) < target && l > 8 && l < 92) l += dir;
    return l;
  }

  /* ---------- 기본 색상 하나로 라이트/다크 팔레트 파생 ---------- */
  function derive(base) {
    var hsl = rgbToHsl(hexToRgb(base));
    var h = hsl.h;
    var white = [255, 255, 255];
    var darkBg = hslToRgb(h, 12, 8);

    var accS = Math.min(hsl.s, 88);
    var accL = fitContrast(h, accS, Math.min(hsl.l, 46), white, -1);   // 흰 배경 위 텍스트용
    var dAccS = Math.min(hsl.s, 90);
    var dAccL = fitContrast(h, dAccS, Math.max(hsl.l, 55), darkBg, 1); // 어두운 배경 위 텍스트용

    /* 헤더: 모든 테마 공통 — 흰색에 가까운 밝은 파스텔 톤 + 반투명(스크롤 시 콘텐츠가 살짝 비침) */
    var hdrS = 80, hdrL = 90;
    var pastelBg = hslToRgb(h, hdrS, hdrL);
    var txtL = fitContrast(h, 55, 32, pastelBg, -1);
    var hdrText = css(h, 55, txtL);
    var hdrMuted = css(h, 30, 44);
    var logoAccent = base; /* 로고 포인트 = 팔레트 원색 그대로 */
    var btnTextL = fitContrast(h, hsl.s, hsl.l, pastelBg, -1, 3);

    return {
      light: {
        '--bg':           css(h, 50, 97),
        '--card':         '#ffffff',
        '--text':         css(h, 28, 15),
        '--muted':        css(h, 12, 44),
        '--sub-text':     css(h, 16, 32),
        '--accent':       css(h, accS, accL),
        '--border':       css(h, 30, 88),
        '--code-bg':      css(h, 32, 94),
        '--glass-fill':   'linear-gradient(135deg, rgba(255,255,255,0.9), ' + css(h, 55, 91, 0.55) + ')'
      },
      dark: {
        '--bg':           css(h, 18, 9),
        '--card':         css(h, 16, 13),
        '--text':         css(h, 16, 92),
        '--muted':        css(h, 10, 66),
        '--sub-text':     css(h, 10, 80),
        '--accent':       css(h, dAccS, dAccL),
        '--border':       css(h, 14, 21),
        '--code-bg':      css(h, 14, 16)
      },
      always: { /* 헤더·버튼은 라이트/다크 공통 */
        '--header-bg':        css(h, hdrS, hdrL, 0.72),
        '--header-bg-solid':  css(h, hdrS, hdrL),
        '--header-bg-strong': css(h, hdrS, hdrL, 0.78),
        '--header-glass':     css(h, hdrS, hdrL, 0.6),
        '--header-text':      hdrText,
        '--header-muted':     hdrMuted,
        '--logo-accent':      logoAccent,
        '--nav-pill-fill':    'rgba(255, 255, 255, 0.55)',
        '--nav-pill-border':  css(h, 45, 40, 0.28),
        '--accent-light':     css(h, hdrS, hdrL), /* 버튼 배경 = 헤더 배경색 */
        '--btn-text':         css(h, hsl.s, btnTextL) /* 버튼 글자 = 팔레트 색(가독성 보정) */
      }
    };
  }

  /* ---------- 테마 CSS 생성/주입 ---------- */
  function varsToCss(vars) {
    return Object.keys(vars).map(function (k) { return k + ': ' + vars[k] + ';'; }).join(' ');
  }
  function buildThemeCss() {
    var out = '';
    THEMES.forEach(function (t) {
      var p = derive(t.base);
      var o = t.overrides || {};
      var light = Object.assign({}, p.light, p.always, o.light || {});
      var dark = Object.assign({}, p.dark, p.always, o.dark || {});
      out += 'html[data-theme="' + t.id + '"] { ' + varsToCss(light) + ' }\n';
      out += '@media (prefers-color-scheme: dark) { html[data-theme="' + t.id + '"] { ' + varsToCss(dark) + ' } }\n';
    });
    /* 팔레트 UI */
    out += [
      '.theme-palette { display: flex; align-items: center; gap: 8px; flex: 0 0 auto; position: relative; }',
      '.theme-dot { width: 11px; height: 11px; border-radius: 50%; border: none; padding: 0;',
      '  cursor: pointer; flex: 0 0 auto; -webkit-appearance: none; appearance: none;',
      '  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.12); position: relative; z-index: 1;',
      '  transition: transform .15s ease; }',
      '.theme-dot:hover { transform: scale(1.2); }',
      /* 리퀴드 글래스 캡슐 선택 표시 */
      '.theme-pill { position: absolute; top: 50%; z-index: 0; border-radius: 999px;',
      '  background: linear-gradient(160deg, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.05) 55%, rgba(255,255,255,0.14) 100%);',
      '  -webkit-backdrop-filter: blur(6px) saturate(170%);',
      '  backdrop-filter: blur(6px) saturate(170%);',
      '  box-shadow: inset 0 1px 1.5px rgba(255,255,255,0.45), inset 0 -1px 1px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.18);',
      '  transform: translateY(-50%); pointer-events: none; opacity: 0;',
      '  transition: left .55s cubic-bezier(.32,1.18,.36,1), width .4s ease, height .4s ease, opacity .25s ease; }',
      '.theme-pill::after { content: ""; position: absolute; inset: 0; border-radius: inherit; padding: 1px;',
      '  background: linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.06) 40%, rgba(255,255,255,0.03) 62%, rgba(255,255,255,0.28) 100%);',
      '  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);',
      '  -webkit-mask-composite: xor;',
      '  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);',
      '  mask-composite: exclude; pointer-events: none; }',
      '.theme-pill.on { opacity: 1; }',
      '.theme-pill.no-anim { transition: none; }',
      /* 이동 시 젤리처럼 울렁이는 효과 */
      '@keyframes theme-pill-jelly {',
      '  0% { transform: translateY(-50%) scale(1, 1); }',
      '  35% { transform: translateY(-50%) scale(1.22, 0.82); }',
      '  65% { transform: translateY(-50%) scale(0.9, 1.1); }',
      '  100% { transform: translateY(-50%) scale(1, 1); }',
      '}',
      '@media (max-width: 640px) { .theme-palette { gap: 6px; } .theme-dot { width: 10px; height: 10px; } }'
    ].join('\n');
    var style = document.createElement('style');
    style.id = 'theme-css';
    style.textContent = out;
    document.head.appendChild(style);
  }

  /* ---------- 적용/저장 ---------- */
  function currentTheme() {
    var saved = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) {}
    return THEMES.some(function (t) { return t.id === saved; }) ? saved : DEFAULT_THEME;
  }
  function movePillTo(dot, instant) {
    var pill = document.querySelector('.theme-pill');
    if (!pill || !dot) return;
    var pad = 3; /* 점 주변 여백 → 캡슐 크기 */
    var size = dot.offsetWidth + pad * 2;
    var left = (dot.offsetLeft + dot.offsetWidth / 2 - size / 2) + 'px';
    if (instant) pill.classList.add('no-anim');
    var moved = pill.style.left !== left;
    pill.style.width = size + 'px';
    pill.style.height = size + 'px';
    pill.style.left = left;
    pill.classList.add('on');
    if (instant) {
      void pill.offsetWidth; /* reflow 후 애니메이션 복원 */
      pill.classList.remove('no-anim');
    } else if (moved) {
      pill.style.animation = 'none';
      void pill.offsetWidth;
      pill.style.animation = 'theme-pill-jelly .55s ease .12s';
    }
  }
  function movePill(instant) {
    movePillTo(document.querySelector('.theme-dot[aria-checked="true"]'), instant);
  }
  function applyTheme(id, instant) {
    document.documentElement.setAttribute('data-theme', id);
    try { localStorage.setItem(STORAGE_KEY, id); } catch (e) {}
    document.querySelectorAll('.theme-dot').forEach(function (dot) {
      dot.setAttribute('aria-checked', dot.getAttribute('data-theme-id') === id ? 'true' : 'false');
    });
    movePill(instant);
  }

  /* ---------- 팔레트 UI 렌더링 ---------- */
  function renderPalette() {
    var logo = document.querySelector('.header-inner .logo');
    if (!logo || document.querySelector('.theme-palette')) return;
    var wrap = document.createElement('div');
    wrap.className = 'theme-palette';
    wrap.setAttribute('role', 'radiogroup');
    wrap.setAttribute('aria-label', '색상 테마 선택');
    var pill = document.createElement('div');
    pill.className = 'theme-pill';
    wrap.appendChild(pill);
    THEMES.forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'theme-dot';
      b.setAttribute('role', 'radio');
      b.setAttribute('data-theme-id', t.id);
      b.title = t.name + ' 테마';
      b.setAttribute('aria-label', t.name + ' 테마');
      b.style.background = t.base;
      b.addEventListener('click', function () { applyTheme(t.id); });
      b.addEventListener('mouseenter', function () { movePillTo(b); }); /* 호버를 따라 캡슐이 이동 */
      wrap.appendChild(b);
    });
    wrap.addEventListener('mouseleave', function () { movePill(); }); /* 벗어나면 선택된 색으로 복귀 */
    logo.insertAdjacentElement('afterend', wrap);
    applyTheme(currentTheme(), true);
    window.addEventListener('resize', function () { movePill(true); });
  }

  /* ---------- 초기화 ---------- */
  buildThemeCss();
  document.documentElement.setAttribute('data-theme', currentTheme());
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderPalette);
  } else {
    renderPalette();
  }
})();
