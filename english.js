/* ============================================================================
   english.js — YouTube 자막 싱크 학습 페이지  (Harry's Insights, #/english)
   ----------------------------------------------------------------------------
   index.html 의 SPA 라우터가 호출합니다:
       EnglishPage.render(container)   화면 그리기
       EnglishPage.destroy()           다른 메뉴로 떠날 때 정리
   사이트의 CSS 변수(--card/--border/--text/--muted/--accent)를 그대로 쓰므로
   라이트/다크 모드가 자동으로 따라옵니다.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------------------------------------------------------------- 스타일 */
  var CSS = ''
  + '.eng{--efs:17px}'
  + '.eng-load{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}'
  + '.eng-load input{flex:1;min-width:200px;background:var(--card);color:var(--text);'
    + 'border:1px solid var(--border);border-radius:999px;padding:9px 16px;font:inherit;font-size:.92rem}'
  + '.eng-btn{background:var(--card);color:var(--text);border:1px solid var(--border);'
    + 'border-radius:999px;padding:7px 15px;font:inherit;font-size:.85rem;font-weight:600;'
    + 'cursor:pointer;white-space:nowrap;transition:background .15s,color .15s}'
  + '.eng-btn:hover{background:var(--accent-light);color:var(--accent)}'
  + '.eng-btn.on{background:var(--accent);border-color:var(--accent);color:#fff}'
  + '.eng-sel{background:var(--card);color:var(--text);border:1px solid var(--border);'
    + 'border-radius:999px;padding:7px 12px;font:inherit;font-size:.85rem;cursor:pointer}'
  + '.eng-stick{position:sticky;top:calc(var(--header-h,52px) + 16px);z-index:5;'
    + 'background:var(--bg);padding-bottom:10px}'
  /* 영상 크기: 화면 높이(--engvh)와 가용 폭(--engw) 중 작은 쪽을 따름.
     → 세로/가로 어느 쪽에서도 자막 자리를 남겨둡니다. */
  + '.eng-vid{display:flex;justify-content:center}'
  + '.eng-ratio{position:relative;aspect-ratio:16/9;width:auto;max-width:100%;flex:0 0 auto;'
    + 'height:min(var(--engvh,46vh),calc(var(--engw,700px) * 0.5625));'
    + 'background:#000;border-radius:12px;overflow:hidden;border:1px solid var(--border)}'
  + '.eng-ratio iframe,.eng-ratio>div{position:absolute;inset:0;width:100%;height:100%}'
  + '.eng-bar{display:flex;gap:6px;flex-wrap:wrap;align-items:center;padding:10px 0 0}'
  + '.eng-bar .sp{flex:1}'
  + '.eng-chip{font-size:.78rem;color:var(--muted);padding:0 4px}'
  + '.eng-tx{padding:16px 0 60vh}'
  + '.eng-cue{display:flex;gap:12px;padding:10px 12px;border-radius:10px;line-height:1.7;'
    + 'font-size:var(--efs);cursor:pointer;border-left:3px solid transparent;transition:background .12s}'
  + '.eng-cue:hover{background:var(--card)}'
  + '.eng-cue .t{flex:0 0 48px;font-size:.75rem;color:var(--muted);'
    + 'font-variant-numeric:tabular-nums;padding-top:5px;user-select:none}'
  + '.eng-cue .x{flex:1}'
  + '.eng-cue.act{background:var(--accent-light);border-left-color:var(--accent)}'
  + '.eng-cue.ab{background:var(--code-bg);border-left-color:var(--muted)}'
  + '.eng.hide .eng-cue .x{filter:blur(5px);transition:filter .15s}'
  + '.eng.hide .eng-cue.act .x,.eng.hide .eng-cue.rv .x{filter:none}'
  + '.eng-w{cursor:pointer;border-radius:3px;padding:0 1px}'
  + '.eng-w:hover{background:var(--accent);color:#fff}'
  + '.eng-empty{color:var(--muted);text-align:center;padding:44px 20px;line-height:1.9;'
    + 'border:1px dashed var(--border);border-radius:12px;font-size:.9rem;background:var(--card)}'
  + '.eng.drag .eng-empty{border-color:var(--accent);background:var(--accent-light)}'
  + '.eng-err{position:absolute;inset:0;background:var(--card);color:var(--text);display:flex;'
    + 'align-items:center;justify-content:center;text-align:center;padding:24px;'
    + 'font-size:.88rem;line-height:1.9;z-index:2}'
  + '.eng-err code{background:var(--code-bg);padding:4px 9px;border-radius:6px}'
  + '.eng-ph{position:fixed;right:0;top:0;bottom:0;width:340px;max-width:88vw;'
    + 'background:var(--card);border-left:1px solid var(--border);overflow:auto;padding:18px;'
    + 'z-index:12;transform:translateX(100%);transition:transform .25s}'
  + '.eng-ph.open{transform:none}'
  + '.eng-ph h3{font-size:1rem;margin-bottom:6px}'
  + '.eng-note{font-size:.78rem;color:var(--muted);line-height:1.7;margin:8px 0 14px}'
  + '.eng-card{background:var(--bg);border:1px solid var(--border);border-radius:10px;'
    + 'padding:11px;margin-bottom:9px;font-size:.83rem;line-height:1.7}'
  + '.eng-card b{color:var(--accent);font-size:.92rem}'
  + '.eng-src{color:var(--muted);font-size:.76rem;margin-top:5px;cursor:pointer}'
  + '.eng-src:hover{color:var(--accent)}'
  + '.eng-ex{margin-top:7px;padding-left:10px;border-left:2px solid var(--border);'
    + 'color:var(--muted);font-size:.78rem}'
  + '@media(max-width:768px){.eng-cue .t{flex-basis:42px}}'
  /* ---- 좌우 분할: 영상 왼쪽 / 자막 오른쪽 ----
     미디어쿼리로 화면을 추측하지 않고 JS 가 .split 클래스를 붙입니다.
     (기기별 실제 뷰포트가 제각각이라 고정 임계값은 빗나갑니다) */
  + '.eng.split .eng-body{display:flex;gap:16px;align-items:flex-start}'
  + '.eng.split .eng-stick{flex:0 0 var(--engcol,54%);min-width:0;padding-bottom:0}'
  + '.eng.split .eng-tx{flex:1;min-width:0;padding:0 0 20px;'
  +   'max-height:calc(100dvh - var(--header-h,52px) - 46px);'
  +   'overflow-y:auto;-webkit-overflow-scrolling:touch}'
  /* 분할일 때 영상 크기는 칸 너비가 결정 (화면 밖으로 나가지 않게 상한만 둠) */
  + '.eng.split .eng-ratio{height:calc(var(--engw,400px) * 0.5625);'
  +   'max-height:calc(100dvh - var(--header-h,52px) - 130px)}'
  + '.eng.split .eng-cue{padding:8px 10px;line-height:1.6}'
  + '.eng.split .eng-load{margin-bottom:10px}';

  function injectCSS() {
    if (document.getElementById('eng-css')) return;
    var s = document.createElement('style');
    s.id = 'eng-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* 유튜브는 임베드에 유효한 Referer 를 요구합니다(없으면 Error 153) */
  function ensureReferrerMeta() {
    if (document.querySelector('meta[name="referrer"]')) return;
    var m = document.createElement('meta');
    m.name = 'referrer';
    m.content = 'strict-origin-when-cross-origin';
    document.head.appendChild(m);
  }

  /* ------------------------------------------------------------ 자막 파서 */
  function tc(s) {
    var p = s.trim().replace(',', '.').split(':').map(parseFloat);
    if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
    if (p.length === 2) return p[0] * 60 + p[1];
    return p[0] || 0;
  }

  function stripTags(t) {
    return t
      .replace(/<\d\d:\d\d:\d\d[.,]\d{3}>/g, '')
      .replace(/<\/?c[^>]*>/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\{\\an?\d\}/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function parseSubs(raw) {
    var text = raw.replace(/\r\n/g, '\n').replace(/^﻿/, '');
    var RE = /(\d{1,2}:)?\d{1,2}:\d{2}[.,]\d{1,3}\s*-->\s*(\d{1,2}:)?\d{1,2}:\d{2}[.,]\d{1,3}/;
    var cues = [];

    text.split(/\n\s*\n/).forEach(function (block) {
      var lines = block.split('\n');
      var idx = -1;
      for (var i = 0; i < lines.length; i++) { if (RE.test(lines[i])) { idx = i; break; } }
      if (idx === -1) return;
      var m = lines[idx].match(
        /((?:\d{1,2}:)?\d{1,2}:\d{2}[.,]\d{1,3})\s*-->\s*((?:\d{1,2}:)?\d{1,2}:\d{2}[.,]\d{1,3})/);
      if (!m) return;
      var body = stripTags(lines.slice(idx + 1).join(' '));
      if (body) cues.push({ s: tc(m[1]), e: tc(m[2]), x: body });
    });

    cues.sort(function (a, b) { return a.s - b.s; });

    /* 자동 자막은 같은 줄이 굴러가며 반복됨 → 중복/포함 관계 정리 */
    var out = [];
    cues.forEach(function (c) {
      var prev = out[out.length - 1];
      if (!prev) { out.push(c); return; }
      if (prev.x === c.x) { prev.e = Math.max(prev.e, c.e); return; }
      if (c.x.indexOf(prev.x) === 0 && c.x.length > prev.x.length) {
        prev.x = c.x; prev.e = Math.max(prev.e, c.e); return;
      }
      if (prev.x.length >= c.x.length &&
          prev.x.lastIndexOf(c.x) === prev.x.length - c.x.length) return;
      out.push(c);
    });
    return out;
  }

  function mergeCues(cues, maxSec, maxWords) {
    maxSec = maxSec || 9; maxWords = maxWords || 26;
    var out = [];
    cues.forEach(function (c) {
      var p = out[out.length - 1];
      var ends = p && /[.!?…]["')\]]?$/.test(p.x);
      if (p && !ends && (c.e - p.s) <= maxSec &&
          (p.x + ' ' + c.x).split(/\s+/).length <= maxWords && (c.s - p.e) < 2) {
        p.x += ' ' + c.x; p.e = c.e;
      } else {
        out.push({ s: c.s, e: c.e, x: c.x });
      }
    });
    return out;
  }

  /* --------------------------------------------------------- 구문 추출 */
  var BOOK = {
    'figure out': ['I couldn\'t figure out why the build kept failing.', 'Give me a minute to figure out the schedule.'],
    'come up with': ['She came up with a much simpler approach.', 'We need to come up with a name by Friday.'],
    'end up': ['We ended up rewriting the whole thing.', 'He ended up staying an extra week.'],
    'point out': ['She pointed out a flaw in my reasoning.', 'Let me point out one important detail.'],
    'carry out': ['The team carried out a series of tests.', 'They carried out the plan exactly as written.'],
    'turn out': ['It turned out to be much easier than expected.', 'The numbers turned out wrong.'],
    'set up': ['It only takes a minute to set up.', 'We set up a meeting for Monday.'],
    'keep track of': ['I use a spreadsheet to keep track of expenses.', 'It\'s hard to keep track of every change.'],
    'take advantage of': ['You should take advantage of the free trial.', 'They took advantage of the delay to rehearse.'],
    'make sure': ['Make sure you save before closing.', 'I want to make sure everyone agrees.'],
    'look into': ['I\'ll look into it this afternoon.', 'The team is looking into the outage.'],
    'bring up': ['Don\'t bring that up at dinner.', 'She brought up a good point.'],
    'get rid of': ['We got rid of the old server.', 'It\'s time to get rid of these files.'],
    'run into': ['I ran into an old classmate downtown.', 'We ran into a few problems early on.'],
    'work out': ['I\'m sure it\'ll work out.', 'Let\'s work out the details later.'],
    'go through': ['Let\'s go through the list one more time.', 'She went through a difficult year.'],
    'hold on': ['Hold on, I\'m not finished.', 'Hold on to the receipt.'],
    'come across': ['I came across an interesting article.', 'He comes across as confident.'],
    'rely on': ['We rely on volunteers for most of the work.', 'You can\'t rely on memory alone.'],
    'focus on': ['Let\'s focus on what we can control.', 'The report focuses on three regions.'],
    'deal with': ['I\'ll deal with it tomorrow.', 'How do you deal with that much noise?'],
    'sort out': ['We need to sort out the billing issue.', 'Give me a day to sort things out.'],
    'break down': ['The car broke down on the highway.', 'Let me break down the cost for you.'],
    'give up': ['Don\'t give up so early.', 'He gave up trying to convince them.'],
    'put together': ['I put together a short summary.', 'She put together a great team.'],
    'look forward to': ['I\'m looking forward to the trip.', 'We look forward to hearing from you.'],
    'take care of': ['Can you take care of the booking?', 'He takes care of his parents.'],
    'in terms of': ['In terms of cost, it\'s the better option.', 'In terms of speed, nothing comes close.'],
    'as long as': ['You can borrow it as long as you return it.', 'As long as it works, I don\'t mind.'],
    'so far': ['So far, everything is on schedule.', 'That\'s the best result so far.'],
    'at least': ['It\'ll take at least two hours.', 'At least we learned something.'],
    'on purpose': ['I didn\'t do it on purpose.', 'She left it blank on purpose.'],
    'keep in mind': ['Keep in mind that prices change.', 'One thing to keep in mind: it\'s not refundable.'],
    'make a difference': ['Small habits make a difference.', 'Your feedback really made a difference.'],
    'pay attention to': ['Pay attention to the units.', 'Nobody paid attention to the warning.'],
    'get used to': ['It takes a while to get used to it.', 'I never got used to the cold.'],
    'be about to': ['I was about to call you.', 'The meeting is about to start.'],
    'as well as': ['He speaks French as well as German.', 'It\'s fast as well as cheap.'],
    'instead of': ['Walk instead of driving.', 'Instead of guessing, measure it.'],
    'rather than': ['I\'d call rather than email.', 'Fix it rather than replace it.'],
    'come down to': ['It comes down to budget.', 'Everything comes down to timing.'],
    'stand out': ['Her essay really stood out.', 'Use color to make it stand out.'],
    'catch up': ['Let\'s catch up next week.', 'I need to catch up on email.'],
    'wind up': ['We wound up leaving early.', 'He wound up in the wrong terminal.'],
    'look up': ['Look up the word if you\'re unsure.', 'I looked up the address online.'],
    'turn down': ['She turned down the offer.', 'Can you turn down the music?'],
    'put off': ['Don\'t put it off any longer.', 'They put off the launch by a month.'],
    'back up': ['Back up your files weekly.', 'Can you back up that claim?'],
    'check out': ['Check out this new tool.', 'We check out at eleven.'],
    'hang out': ['We hung out at the café.', 'They hang out after class.'],
    'show up': ['Only half the group showed up.', 'He showed up an hour late.'],
    'go ahead': ['Go ahead and start without me.', 'They went ahead with the plan.'],
    'take place': ['The event takes place in June.', 'Where did the meeting take place?'],
    'on top of that': ['On top of that, it\'s free.', 'It rained, and on top of that, we got lost.'],
    'for the most part': ['For the most part, it works well.', 'The reviews were, for the most part, positive.'],
    'a bunch of': ['I have a bunch of questions.', 'She brought a bunch of snacks.'],
    'kind of': ['It\'s kind of complicated.', 'I kind of expected that.'],
    'as a result': ['As a result, sales dropped.', 'He studied hard and, as a result, passed.'],
    'in the long run': ['It\'s cheaper in the long run.', 'In the long run, habits matter more.'],
    'no matter': ['No matter what happens, call me.', 'No matter how hard I try, it fails.'],
    'used to': ['I used to live in Busan.', 'There used to be a bakery here.'],
    'supposed to': ['You\'re supposed to sign here.', 'It was supposed to arrive yesterday.'],
    'might as well': ['We might as well start now.', 'You might as well ask.'],
    'have to do with': ['It has to do with the timing.', 'What does that have to do with anything?']
  };

  var IRREG = {
    be: ['be','am','is','are','was','were','been','being'],
    have: ['have','has','had','having'],
    come: ['come','comes','came','coming'],
    take: ['take','takes','took','taken','taking'],
    make: ['make','makes','made','making'],
    get: ['get','gets','got','gotten','getting'],
    go: ['go','goes','went','gone','going'],
    run: ['run','runs','ran','running'],
    give: ['give','gives','gave','given','giving'],
    bring: ['bring','brings','brought','bringing'],
    put: ['put','puts','putting'],
    set: ['set','sets','setting'],
    hold: ['hold','holds','held','holding'],
    stand: ['stand','stands','stood','standing'],
    'break': ['break','breaks','broke','broken','breaking'],
    find: ['find','finds','found','finding'],
    keep: ['keep','keeps','kept','keeping'],
    pay: ['pay','pays','paid','paying'],
    wind: ['wind','winds','wound','winding'],
    'catch': ['catch','catches','caught','catching'],
    hang: ['hang','hangs','hung','hanging'],
    deal: ['deal','deals','dealt','dealing'],
    think: ['think','thinks','thought','thinking'],
    leave: ['leave','leaves','left','leaving']
  };

  var VERB_HEADS = {};
  ('be have come take make get go run give bring put set hold stand break find keep pay wind '
   + 'catch hang deal end figure point carry turn look work sort show check focus rely back')
    .split(' ').forEach(function (v) { VERB_HEADS[v] = 1; });

  function forms(v) {
    if (IRREG[v]) return IRREG[v];
    var f = {};
    f[v] = 1;
    f[/[sxz]$|ch$|sh$|o$/.test(v) ? v + 'es'
      : /[^aeiou]y$/.test(v) ? v.slice(0, -1) + 'ies' : v + 's'] = 1;
    if (/[^aeiou]y$/.test(v)) f[v.slice(0, -1) + 'ied'] = 1;
    else if (/e$/.test(v)) f[v + 'd'] = 1;
    else f[v + 'ed'] = 1;
    f[/e$/.test(v) ? v.slice(0, -1) + 'ing' : v + 'ing'] = 1;
    return Object.keys(f);
  }

  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  var PHRASE_RE = Object.keys(BOOK).map(function (key) {
    var w = key.split(' ');
    var head = VERB_HEADS[w[0]]
      ? '(?:' + forms(w[0]).map(esc).join('|') + ')'
      : esc(w[0]);
    var rest = w.slice(1).map(esc).join('\\s+');
    return { key: key, re: new RegExp('\\b' + head + (rest ? '\\s+' + rest : '') + '\\b') };
  });

  var VERBS = 'get|go|come|take|put|make|look|turn|bring|run|set|give|pick|hold|break|call|carry|'
    + 'cut|figure|find|keep|move|pass|pay|point|pull|push|show|sort|stand|throw|try|work|write|'
    + 'check|clear|close|deal|drop|end|fill|hand|head|leave|open|play|reach|save|send|settle|'
    + 'sign|speak|start|stay|step|stick|switch|talk|team|think|wake|walk|warm|wear|wind|wipe|wrap';
  var PARTS = 'up|out|off|on|in|down|over|through|away|back|around|about|into|along|apart|aside|'
    + 'forward|together|by|for|with|to|at|after|ahead';

  function extractPhrases(cues) {
    var found = {};
    function add(key, i) {
      if (!found[key]) found[key] = { label: key, hits: [], n: 0 };
      found[key].n++;
      if (found[key].hits.length < 3) found[key].hits.push(i);
    }

    cues.forEach(function (c, i) {
      var low = ' ' + c.x.toLowerCase().replace(/[^a-z' ]/g, ' ').replace(/\s+/g, ' ') + ' ';

      var hits = PHRASE_RE.filter(function (p) { return p.re.test(low); })
                          .map(function (p) { return p.key; });
      hits = hits.filter(function (k) {
        return !hits.some(function (o) { return o !== k && o.indexOf(k + ' ') === 0; });
      });
      hits.forEach(function (k) { add(k, i); });

      var re = new RegExp('\\b(' + VERBS + ')(|s|ed|ing|d|es)?\\s+(' + PARTS + ')\\b', 'g');
      var m;
      while ((m = re.exec(low))) {
        var base = m[1] + ' ' + m[3];
        if (!BOOK[base] && !hits.some(function (k) { return k.indexOf(base) === 0; })) add(base, i);
      }
    });

    return Object.keys(found).map(function (k) { return found[k]; })
      .sort(function (a, b) { return b.n - a.n || a.label.localeCompare(b.label); })
      .slice(0, 60);
  }

  /* ------------------------------------------------------------- 상태 */
  var player = null, timer = null, ready = false;
  var rawCues = [], cues = [], nodes = [], cur = -1;
  var merge = true, ab = null, abArm = false;
  var root = null;

  function S(t) {
    return Math.floor(t / 60) + ':' + ('0' + Math.floor(t % 60)).slice(-2);
  }
  function esch(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function vid(u) {
    u = (u || '').trim();
    if (/^[\w-]{11}$/.test(u)) return u;
    var m = u.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([\w-]{11})/);
    return m ? m[1] : null;
  }
  function q(sel) { return root ? root.querySelector(sel) : null; }

  var store = {
    get: function (k, d) { try { return localStorage.getItem('eng-' + k) || d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('eng-' + k, v); } catch (e) {} }
  };

  /* --------------------------------------------------- 유튜브 플레이어 */
  function loadYT(cb) {
    if (window.YT && window.YT.Player) return cb();
    var prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () {
      if (typeof prev === 'function') prev();
      cb();
    };
    if (!document.getElementById('yt-api')) {
      var s = document.createElement('script');
      s.id = 'yt-api';
      s.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(s);
    }
  }

  var YT_ERR = {
    2: '영상 ID가 올바르지 않습니다.',
    5: 'HTML5 플레이어 오류입니다. 새로고침해 보세요.',
    100: '삭제되었거나 비공개인 영상입니다.',
    101: '이 영상은 소유자가 외부 임베드를 막아두었습니다. 유튜브에서 직접 보셔야 합니다.',
    150: '이 영상은 소유자가 외부 임베드를 막아두었습니다. 유튜브에서 직접 보셔야 합니다.'
  };

  function showErr(code) {
    var wrap = q('.eng-ratio');
    if (!wrap) return;
    var old = wrap.querySelector('.eng-err');
    if (old) old.remove();
    var box = document.createElement('div');
    box.className = 'eng-err';
    box.innerHTML = (code === 153)
      ? '<div><b>Error 153 — Referer 헤더가 없습니다</b><br><br>'
        + (location.protocol === 'file:'
            ? '이 페이지를 <code>file://</code> 로 열었습니다.<br>'
              + '<code>python3 -m http.server 8000</code> 으로 서버를 띄워 접속하세요.'
            : '광고 차단기가 Referer 를 막고 있을 수 있습니다.<br>'
              + '이 사이트에서 차단기를 끄고 새로고침해 보세요.')
        + '</div>'
      : '<div>' + (YT_ERR[code] || '영상을 불러오지 못했습니다. (코드 ' + code + ')') + '</div>';
    wrap.appendChild(box);
  }

  function initPlayer(cb) {
    var pv = { rel: 0, modestbranding: 1, cc_load_policy: 0, playsinline: 1 };
    if (location.protocol.indexOf('http') === 0) pv.origin = location.origin;

    player = new YT.Player(q('#eng-player'), {
      host: 'https://www.youtube-nocookie.com',
      videoId: '',
      playerVars: pv,
      events: {
        onReady: function () {
          ready = true;
          var f = q('#eng-player');
          if (f && f.tagName === 'IFRAME')
            f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
          clearInterval(timer);
          timer = setInterval(tick, 100);
          if (cb) cb();
        },
        onError: function (e) { showErr(e.data); }
      }
    });
  }

  function loadVideo(id) {
    if (!ready || !id) return;
    var old = q('.eng-err');
    if (old) old.remove();
    player.loadVideoById(id);
  }

  /* ----------------------------------------------------------- 싱크 */
  function tick() {
    if (!ready || !cues.length || !player || !player.getCurrentTime) return;
    var t = player.getCurrentTime();

    if (ab && t >= ab.e) { player.seekTo(ab.s, true); return; }

    var lo = 0, hi = cues.length - 1, hit = -1;
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      if (t < cues[mid].s) hi = mid - 1;
      else if (t > cues[mid].e) lo = mid + 1;
      else { hit = mid; break; }
    }
    if (hit === -1) hit = Math.max(0, lo - 1);
    if (hit === cur) return;

    if (nodes[cur]) nodes[cur].classList.remove('act');
    cur = hit;
    var n = nodes[cur];
    if (!n) return;
    n.classList.add('act');
    autoScroll(n);
  }

  /* 가로 분할에서는 자막 칸이 따로 스크롤되므로, 기준 영역을 구분해서 판단 */
  function autoScroll(n) {
    var box = q('#eng-tx');
    var inner = box && box.scrollHeight > box.clientHeight + 4 &&
                getComputedStyle(box).overflowY === 'auto';
    var nr = n.getBoundingClientRect();
    if (inner) {
      var br = box.getBoundingClientRect();
      var pad = br.height * 0.2;
      if (nr.top < br.top + pad || nr.bottom > br.bottom - pad)
        n.scrollIntoView({ block: 'center', behavior: 'smooth' });
    } else {
      if (nr.top < window.innerHeight * 0.5 || nr.bottom > window.innerHeight - 40)
        n.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }

  /* 영상 크기: 가용 폭을 재서 --engw 에 반영 (높이 상한 계산에 사용) */
  function syncWidth() {
    if (!root) return;
    var v = root.querySelector('.eng-vid');
    if (v && v.clientWidth) root.style.setProperty('--engw', v.clientWidth + 'px');
  }

  var SIZES = {
    s: { vh: '32vh', col: '44%' },
    m: { vh: '46vh', col: '54%' },
    l: { vh: '62vh', col: '66%' }
  };

  function applySize(key) {
    var z = SIZES[key] || SIZES.m;
    root.style.setProperty('--engvh', z.vh);
    root.style.setProperty('--engcol', z.col);
    requestAnimationFrame(syncWidth);
  }

  /* 좌우 분할 여부를 실제 뷰포트로 판단.
     고정 임계값 미디어쿼리는 기기마다 빗나가므로 JS 로 계산합니다. */
  function shouldSplit() {
    var w = window.innerWidth, h = window.innerHeight;
    if (!h) return false;
    var wide = w / h >= 1.3;              // 폭이 높이보다 확실히 넓을 때
    return wide && (w >= 760 || w > h);   // 데스크톱 가로창 · 폰/태블릿 가로
  }

  function updateLayout() {
    if (!root) return;
    var mode = q('#eng-layout') ? q('#eng-layout').value : 'auto';
    var split = mode === 'split' ? true
              : mode === 'stack' ? false
              : shouldSplit();
    root.classList.toggle('split', split);
    requestAnimationFrame(syncWidth);
  }

  /* --------------------------------------------------------- 렌더 */
  function renderCues() {
    cues = merge ? mergeCues(rawCues)
                 : rawCues.map(function (c) { return { s: c.s, e: c.e, x: c.x }; });
    var box = q('#eng-tx');
    box.innerHTML = '';
    nodes = []; cur = -1; ab = null; abArm = false;

    cues.forEach(function (c, i) {
      var d = document.createElement('div');
      d.className = 'eng-cue';
      d.innerHTML = '<div class="t">' + S(c.s) + '</div><div class="x">'
        + c.x.split(/(\s+)/).map(function (w) {
            return /\S/.test(w) ? '<span class="eng-w">' + esch(w) + '</span>' : w;
          }).join('')
        + '</div>';

      d.addEventListener('click', function (e) {
        if (e.target.classList.contains('eng-w') && (e.metaKey || e.ctrlKey)) {
          var word = e.target.textContent.replace(/[^A-Za-z'-]/g, '');
          if (word) window.open(q('#eng-dict').value + encodeURIComponent(word.toLowerCase()),
                                '_blank', 'noopener');
          return;
        }
        if (e.shiftKey && ab) {
          if (i > ab.i0) { ab.i1 = i; ab.e = cues[i].e; paintAB(); }
          return;
        }
        if (root.classList.contains('hide')) d.classList.toggle('rv');
        if (abArm) { setAB(i); return; }
        player.seekTo(c.s, true);
        player.playVideo();
      });

      box.appendChild(d);
      nodes.push(d);
    });

    q('#eng-status').textContent =
      cues.length + '개 자막 · ' + S(cues.length ? cues[cues.length - 1].e : 0);
    buildPhrases();
  }

  function setAB(i) {
    ab = (ab && ab.i0 === i) ? null : { i0: i, i1: i, s: cues[i].s, e: cues[i].e };
    abArm = false;
    paintAB();
    if (ab) { player.seekTo(ab.s, true); player.playVideo(); }
  }

  function paintAB() {
    nodes.forEach(function (n) { n.classList.remove('ab'); });
    q('#eng-ab').classList.toggle('on', !!ab || abArm);
    if (!ab) { q('#eng-status').textContent = cues.length + '개 자막'; return; }
    for (var i = ab.i0; i <= ab.i1; i++) if (nodes[i]) nodes[i].classList.add('ab');
    q('#eng-status').textContent =
      'A-B 반복: ' + S(ab.s) + ' – ' + S(ab.e) + ' (Shift+클릭으로 구간 확장)';
  }

  function buildPhrases() {
    var list = extractPhrases(cues);
    var box = q('#eng-phlist');
    box.innerHTML = list.length ? '' : '<div class="eng-note">추출된 구문이 없습니다.</div>';
    list.forEach(function (f) {
      var ex = BOOK[f.label];
      var d = document.createElement('div');
      d.className = 'eng-card';
      d.innerHTML = '<b>' + esch(f.label) + '</b> <span style="color:var(--muted)">×' + f.n + '</span>'
        + f.hits.map(function (i) {
            return '<div class="eng-src" data-i="' + i + '">▸ ' + S(cues[i].s) + ' '
              + esch(cues[i].x.slice(0, 60)) + '…</div>';
          }).join('')
        + (ex ? '<div class="eng-ex">' + ex.map(function (s) {
            return '<div>· ' + esch(s) + '</div>'; }).join('') + '</div>' : '');
      Array.prototype.forEach.call(d.querySelectorAll('.eng-src'), function (s) {
        s.addEventListener('click', function () {
          var i = +s.getAttribute('data-i');
          player.seekTo(cues[i].s, true);
          player.playVideo();
          nodes[i].scrollIntoView({ block: 'center', behavior: 'smooth' });
        });
      });
      box.appendChild(d);
    });
  }

  function useSubs(text) {
    rawCues = parseSubs(text);
    if (!rawCues.length) {
      alert('자막을 인식하지 못했습니다. .srt 또는 .vtt 파일인지 확인하세요.');
      return;
    }
    renderCues();
  }

  /* --------------------------------------------------------- 화면 구성 */
  var HTML = ''
  + '<div class="eng-load">'
  +   '<input type="text" id="eng-url" placeholder="YouTube URL 또는 영상 ID 붙여넣기">'
  +   '<button class="eng-btn" id="eng-go">영상 로드</button>'
  +   '<button class="eng-btn" id="eng-file">자막 파일…</button>'
  + '</div>'
  + '<div class="eng-body">'
  + '<div class="eng-stick">'
  +   '<div class="eng-vid"><div class="eng-ratio"><div id="eng-player"></div></div></div>'
  +   '<div class="eng-bar">'
  +     '<button class="eng-btn" id="eng-play">▶︎ / ❚❚</button>'
  +     '<button class="eng-btn" data-seek="-5">↺ 5s</button>'
  +     '<button class="eng-btn" data-seek="5">5s ↻</button>'
  +     '<select class="eng-sel" id="eng-rate">'
  +       '<option value="0.5">0.5x</option><option value="0.75">0.75x</option>'
  +       '<option value="1" selected>1x</option><option value="1.25">1.25x</option>'
  +       '<option value="1.5">1.5x</option></select>'
  +     '<span class="sp"></span>'
  +     '<button class="eng-btn" id="eng-ab">A-B 반복</button>'
  +     '<button class="eng-btn" id="eng-hide">자막 가리기</button>'
  +     '<button class="eng-btn on" id="eng-merge">문장 병합</button>'
  +     '<button class="eng-btn" id="eng-phbtn">구문 추출</button>'
  +   '</div>'
  +   '<div class="eng-bar">'
  +     '<span class="eng-chip" id="eng-status">자막을 불러오세요</span>'
  +     '<span class="sp"></span>'
  +     '<button class="eng-btn" data-fs="-1">A−</button>'
  +     '<button class="eng-btn" data-fs="1">A+</button>'
  +     '<span class="eng-chip">영상</span>'
  +     '<select class="eng-sel" id="eng-size">'
  +       '<option value="s">작게</option>'
  +       '<option value="m" selected>보통</option>'
  +       '<option value="l">크게</option>'
  +     '</select>'
  +     '<span class="eng-chip">배치</span>'
  +     '<select class="eng-sel" id="eng-layout">'
  +       '<option value="auto" selected>자동</option>'
  +       '<option value="split">좌우 분할</option>'
  +       '<option value="stack">상하</option>'
  +     '</select>'
  +     '<select class="eng-sel" id="eng-dict">'
  +       '<option value="https://en.dictionary.cambridge.org/dictionary/english-korean/">Cambridge 영한</option>'
  +       '<option value="https://dict.naver.com/dict.search?query=">네이버 사전</option>'
  +       '<option value="https://www.merriam-webster.com/dictionary/">Merriam-Webster</option>'
  +       '<option value="https://www.ldoceonline.com/dictionary/">Longman</option>'
  +     '</select>'
  +   '</div>'
  + '</div>'
  + '<div id="eng-tx" class="eng-tx">'
  +   '<div class="eng-empty">'
  +     '유튜브 URL 을 넣고 <b>영상 로드</b> → 자막 파일(<b>.srt</b>/<b>.vtt</b>)을 여기에 드래그하세요.<br>'
  +     '<span style="font-size:.85em">터미널에서 <code>yt-dlp --write-auto-sub --sub-langs en '
  +     '--skip-download --convert-subs vtt &lt;URL&gt;</code> 로 자막을 뽑을 수 있습니다.</span>'
  +   '</div>'
  + '</div>'
  + '</div>'   /* .eng-body 닫기 */
  + '<div class="eng-ph" id="eng-ph">'
  +   '<button class="eng-btn" id="eng-phclose" style="float:right">닫기</button>'
  +   '<h3>학습할 구문</h3>'
  +   '<div class="eng-note">자막에 나온 구동사·연어를 빈도순으로 정리합니다. '
  +     '항목을 클릭하면 해당 장면으로 이동합니다.</div>'
  +   '<div id="eng-phlist"></div>'
  +   '<button class="eng-btn" id="eng-prompt" style="width:100%;margin-top:10px">'
  +     '전체 자막 + 분석 프롬프트 복사</button>'
  +   '<div class="eng-note">복사한 내용을 Claude 에 붙여넣으면 더 깊은 해설과 예문을 받을 수 있습니다.</div>'
  + '</div>'
  + '<input type="file" id="eng-fileinput" accept=".srt,.vtt,.txt" hidden>';

  var dragHandlers = [];
  var onResize = null;

  function render(container) {
    injectCSS();
    ensureReferrerMeta();

    container.innerHTML = '<div class="eng">' + HTML + '</div>';
    root = container.querySelector('.eng');

    rawCues = []; cues = []; nodes = []; cur = -1;
    merge = true; ab = null; abArm = false; ready = false;

    root.style.setProperty('--efs', store.get('fs', '17') + 'px');
    q('#eng-dict').value = store.get('dict', q('#eng-dict').options[0].value);

    var sz = store.get('size', 'm');
    q('#eng-size').value = SIZES[sz] ? sz : 'm';
    applySize(q('#eng-size').value);

    q('#eng-layout').value = store.get('layout', 'auto');
    updateLayout();
    syncWidth();

    onResize = function () { updateLayout(); };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);

    /* --- 입력 --- */
    q('#eng-go').addEventListener('click', function () {
      var id = vid(q('#eng-url').value);
      if (!id) { alert('유튜브 URL 을 인식하지 못했습니다.'); return; }
      loadVideo(id);
    });
    q('#eng-url').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') q('#eng-go').click();
    });
    q('#eng-file').addEventListener('click', function () { q('#eng-fileinput').click(); });
    q('#eng-fileinput').addEventListener('change', function (e) {
      var f = e.target.files[0];
      if (f) f.text().then(useSubs);
    });

    /* --- 드래그 앤 드롭 (라우트 떠날 때 해제) --- */
    function onOver(e) { e.preventDefault(); root.classList.add('drag'); }
    function onLeave(e) { e.preventDefault(); root.classList.remove('drag'); }
    function onDrop(e) {
      e.preventDefault();
      root.classList.remove('drag');
      var f = e.dataTransfer.files[0];
      if (f) f.text().then(useSubs);
    }
    dragHandlers = [
      ['dragover', onOver], ['dragenter', onOver],
      ['dragleave', onLeave], ['drop', onDrop]
    ];
    dragHandlers.forEach(function (h) { document.addEventListener(h[0], h[1]); });

    /* --- 툴바 --- */
    q('#eng-play').addEventListener('click', function () {
      if (!player) return;
      if (player.getPlayerState() === 1) player.pauseVideo(); else player.playVideo();
    });
    Array.prototype.forEach.call(root.querySelectorAll('[data-seek]'), function (b) {
      b.addEventListener('click', function () {
        if (player) player.seekTo(player.getCurrentTime() + (+b.getAttribute('data-seek')), true);
      });
    });
    q('#eng-rate').addEventListener('change', function (e) {
      if (player) player.setPlaybackRate(+e.target.value);
    });
    Array.prototype.forEach.call(root.querySelectorAll('[data-fs]'), function (b) {
      b.addEventListener('click', function () {
        var v = parseFloat(root.style.getPropertyValue('--efs')) || 17;
        v = Math.min(28, Math.max(13, v + (+b.getAttribute('data-fs'))));
        root.style.setProperty('--efs', v + 'px');
        store.set('fs', String(v));
      });
    });
    q('#eng-dict').addEventListener('change', function (e) { store.set('dict', e.target.value); });
    q('#eng-size').addEventListener('change', function (e) {
      applySize(e.target.value);
      store.set('size', e.target.value);
    });
    q('#eng-layout').addEventListener('change', function (e) {
      store.set('layout', e.target.value);
      updateLayout();
    });
    q('#eng-hide').addEventListener('click', function (e) {
      root.classList.toggle('hide');
      e.target.classList.toggle('on', root.classList.contains('hide'));
      nodes.forEach(function (n) { n.classList.remove('rv'); });
    });
    q('#eng-merge').addEventListener('click', function (e) {
      merge = !merge;
      e.target.classList.toggle('on', merge);
      if (rawCues.length) renderCues();
    });
    q('#eng-ab').addEventListener('click', function () {
      if (ab) { ab = null; abArm = false; }
      else abArm = !abArm;
      paintAB();
      if (abArm) q('#eng-status').textContent = '반복할 자막 줄을 클릭하세요';
    });
    q('#eng-phbtn').addEventListener('click', function () { q('#eng-ph').classList.toggle('open'); });
    q('#eng-phclose').addEventListener('click', function () { q('#eng-ph').classList.remove('open'); });
    q('#eng-prompt').addEventListener('click', function () {
      var body = cues.map(function (c) { return '[' + S(c.s) + '] ' + c.x; }).join('\n');
      var prompt = '아래는 영어 영상의 자막입니다. 영어 학습자(중급)를 위해 정리해 주세요.\n\n'
        + '1. 원어민이 자주 쓰는 표현 10개를 고르고, 의미와 뉘앙스를 한국어로 설명\n'
        + '2. 각 표현마다 다른 상황의 예문 2개씩\n'
        + '3. 한국인이 자주 틀리는 포인트가 있으면 지적\n'
        + '4. 마지막에 이 자막에서 꼭 외울 문장 5개\n\n--- 자막 ---\n' + body;
      navigator.clipboard.writeText(prompt).then(function () {
        var b = q('#eng-prompt');
        b.textContent = '복사됨 ✓';
        setTimeout(function () { b.textContent = '전체 자막 + 분석 프롬프트 복사'; }, 1500);
      });
    });

    /* --- 플레이어 --- */
    loadYT(function () {
      if (!root || !root.isConnected) return;   // 이미 다른 메뉴로 이동함
      initPlayer(function () {
        var pre = new URLSearchParams(location.hash.split('?')[1] || '').get('v');
        if (pre) { q('#eng-url').value = pre; loadVideo(vid(pre)); }
      });
    });

    window.scrollTo(0, 0);
  }

  function destroy() {
    clearInterval(timer);
    timer = null;
    dragHandlers.forEach(function (h) { document.removeEventListener(h[0], h[1]); });
    dragHandlers = [];
    if (onResize) {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      onResize = null;
    }
    if (player && player.destroy) { try { player.destroy(); } catch (e) {} }
    player = null; ready = false;
    rawCues = []; cues = []; nodes = []; cur = -1; ab = null; abArm = false;
    root = null;
  }

  window.EnglishPage = {
    render: render,
    destroy: destroy,
    /* 테스트용 */
    _parse: parseSubs, _merge: mergeCues, _phrases: extractPhrases, _tc: tc
  };
})();
