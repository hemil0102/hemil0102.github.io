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

  /* ---------- 가독성 보정: 대비 4.5:1 이상이 되도록 명도 조절 ---------- */
  function fitContrast(h, s, l, bgRgb, dir) {
    while (contrast(hslToRgb(h, s, l), bgRgb) < 4.5 && l > 8 && l < 92) l += dir;
    return l;
  }

  /* ---------- 기본 색상 하나로 라이트/다크 팔레트 파생 ---------- */
  function derive(base) {
    var hsl = rgbToHsl(hexToRgb(base));
    var h = hsl.h;
    var white = [255, 255, 255];
    var darkBg = hslToRgb(h, 12, 8);

    var accS = Math.min(hsl.s, 80);
    var accL = fitContrast(h, accS, Math.min(hsl.l, 45), white, -1);   // 흰 배경 위 텍스트용
    var dAccS = Math.min(hsl.s, 85);
    var dAccL = fitContrast(h, dAccS, Math.max(hsl.l, 55), darkBg, 1); // 어두운 배경 위 텍스트용

    return {
      light: {
        '--bg':           css(h, 30, 98),
        '--card':         '#ffffff',
        '--text':         css(h, 22, 14),
        '--muted':        css(h, 8, 45),
        '--sub-text':     css(h, 12, 33),
        '--accent':       css(h, accS, accL),
        '--accent-light': css(h, 70, 96),
        '--border':       css(h, 16, 90),
        '--code-bg':      css(h, 18, 95),
        '--glass-fill':   'linear-gradient(135deg, rgba(255,255,255,0.9), ' + css(h, 45, 93, 0.55) + ')'
      },
      dark: {
        '--bg':           css(h, 12, 8),
        '--card':         css(h, 10, 12),
        '--text':         css(h, 14, 92),
        '--muted':        css(h, 6, 64),
        '--sub-text':     css(h, 8, 80),
        '--accent':       css(h, dAccS, dAccL),
        '--accent-light': css(h, 20, 16),
        '--border':       css(h, 8, 19),
        '--code-bg':      css(h, 8, 15),
        '--header-glass': css(h, 14, 8, 0.72)
      },
      always: { /* 헤더는 항상 어두운 톤 */
        '--header-bg':        css(h, 16, 9, 0.92),
        '--header-bg-solid':  css(h, 16, 9),
        '--header-bg-strong': css(h, 16, 9, 0.95),
        '--logo-accent':      css(h, Math.min(hsl.s, 75), 74)
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
      '.theme-palette { display: flex; align-items: center; gap: 8px; flex: 0 0 auto; }',
      '.theme-dot { width: 15px; height: 15px; border-radius: 50%; border: none; padding: 0;',
      '  cursor: pointer; flex: 0 0 auto; -webkit-appearance: none; appearance: none;',
      '  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.12);',
      '  transition: transform .15s ease, box-shadow .15s ease; }',
      '.theme-dot:hover { transform: scale(1.2); }',
      '.theme-dot.selected { box-shadow: 0 0 0 2px #ffffff, 0 0 0 3px rgba(0,0,0,0.25); }',
      '@media (max-width: 640px) { .theme-palette { gap: 6px; } .theme-dot { width: 13px; height: 13px; } }'
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
  function applyTheme(id) {
    document.documentElement.setAttribute('data-theme', id);
    try { localStorage.setItem(STORAGE_KEY, id); } catch (e) {}
    document.querySelectorAll('.theme-dot').forEach(function (dot) {
      var on = dot.getAttribute('data-theme-id') === id;
      dot.classList.toggle('selected', on);
      dot.setAttribute('aria-checked', on ? 'true' : 'false');
    });
  }

  /* ---------- 팔레트 UI 렌더링 ---------- */
  function renderPalette() {
    var logo = document.querySelector('.header-inner .logo');
    if (!logo || document.querySelector('.theme-palette')) return;
    var wrap = document.createElement('div');
    wrap.className = 'theme-palette';
    wrap.setAttribute('role', 'radiogroup');
    wrap.setAttribute('aria-label', '색상 테마 선택');
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
      wrap.appendChild(b);
    });
    logo.insertAdjacentElement('afterend', wrap);
    applyTheme(currentTheme());
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
