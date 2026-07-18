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
  + '.eng-load{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:9px}'
  + '.eng-load input{flex:1;min-width:180px;background:var(--card);color:var(--text);'
    + 'border:1px solid var(--border);border-radius:8px;padding:5px 11px;font:inherit;font-size:.82rem}'
  /* 버튼과 셀렉트의 높이를 28px 로 통일 — 툴바가 들쭉날쭉해 보이지 않도록 */
  + '.eng-btn,.eng-sel{height:28px;box-sizing:border-box;display:inline-flex;'
    + 'align-items:center;font:inherit;font-size:.77rem;border-radius:7px;'
    + 'background:var(--card);color:var(--text);border:1px solid var(--border);cursor:pointer}'
  + '.eng-btn{padding:0 10px;font-weight:600;white-space:nowrap;'
    + 'transition:background .15s,color .15s}'
  + '.eng-btn:hover{background:var(--accent-light);color:var(--accent)}'
  + '.eng-btn.on{background:var(--accent);border-color:var(--accent);color:#fff}'
  /* 셀렉트는 기본 화살표를 없애고 직접 그려 버튼과 같은 모양으로 */
  + '.eng-sel{-webkit-appearance:none;appearance:none;padding:0 21px 0 9px}'
  + '.eng-selwrap{position:relative;display:inline-flex}'
  + '.eng-selwrap::after{content:"▾";position:absolute;right:8px;top:50%;'
    + 'transform:translateY(-50%);pointer-events:none;font-size:.68rem;opacity:.75}'
  /* 설정 팝업을 버튼 바로 아래에 붙이기 위한 기준점 */
  + '.eng-menu{position:relative;display:inline-flex}'
  /* 툴바 구분선 — 재생 / 학습 / 설정 그룹을 시각적으로 나눔 */
  + '.eng-sep{width:1px;height:15px;background:var(--border);margin:0 3px}'
  + '.eng-stick{position:sticky;top:calc(var(--header-h,52px) + 16px);z-index:5;'
    + 'background:var(--bg);padding-bottom:10px}'
  /* 영상 크기: 화면 높이(--engvh)와 가용 폭(--engw) 중 작은 쪽을 따름.
     → 세로/가로 어느 쪽에서도 자막 자리를 남겨둡니다. */
  + '.eng-vid{display:flex;justify-content:center}'
  + '.eng-ratio{position:relative;aspect-ratio:16/9;width:auto;max-width:100%;flex:0 0 auto;'
    + 'height:min(var(--engvh,46vh),calc(var(--engw,700px) * 0.5625));'
    + 'background:#000;border-radius:12px;overflow:hidden;border:1px solid var(--border)}'
  + '.eng-ratio iframe,.eng-ratio>div{position:absolute;inset:0;width:100%;height:100%}'
  + '.eng-bar{display:flex;gap:4px;flex-wrap:wrap;align-items:center;padding:7px 0 0;'
    + 'position:relative}'
  /* 설정 팝업 — 자주 안 쓰는 항목을 접어두어 툴바를 비웁니다 */
  + '.eng-pop{position:absolute;right:0;top:calc(100% + 6px);z-index:20;'
    + 'background:var(--card);border:1px solid var(--border);border-radius:10px;'
    + 'padding:8px;min-width:236px;box-shadow:0 10px 28px rgba(0,0,0,.22)}'
  + '.eng-row{display:flex;align-items:center;gap:8px;padding:5px 3px;font-size:.79rem}'
  + '.eng-row>span:first-child{flex:1;color:var(--muted);white-space:nowrap}'
  + '.eng-row select{flex:0 0 auto}'
  + '.eng-caret{font-size:.72rem;opacity:.85;margin-left:5px}'
  + '.eng-bar .sp{flex:1}'
  + '.eng-chip{font-size:.72rem;color:var(--muted);padding:0 2px}'
  /* 자막은 자기 영역 안에서만 스크롤 — 영상 뒤로 흘러가지 않도록.
     높이(--engtxh)는 JS 가 실제 여백을 재서 넣습니다.
     overscroll-behavior:contain → 끝까지 스크롤해도 페이지가 딸려 움직이지 않음 */
  + '.eng-tx{padding:12px 2px 30vh 0;max-height:var(--engtxh,52vh);'
    + 'overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}'
  + '.eng-tx::-webkit-scrollbar{width:8px}'
  + '.eng-tx::-webkit-scrollbar-thumb{background:var(--border);border-radius:4px}'
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
  /* 패널 머리말: 제목과 닫기를 한 줄에 두어 탭과 겹치지 않게 */
  + '.eng-pophead{display:flex;align-items:center;gap:8px;margin-bottom:9px}'
  + '.eng-pophead b{flex:1;font-size:.95rem}'
  /* 탭은 3등분 고정 — 글자가 길어도 줄바꿈되지 않도록 */
  + '.eng-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-bottom:10px}'
  + '.eng-tabs .eng-btn{padding:5px 3px;font-size:.71rem;text-align:center;overflow:hidden;'
    + 'text-overflow:ellipsis}'
  + '.eng-n{opacity:.65;font-weight:400}'
  /* 시제 카드: 시간과 문장을 한 줄에 (문장이 두 번 나오지 않게) */
  + '.eng-t{color:var(--accent);font-weight:700;cursor:pointer;font-size:.78rem;'
    + 'flex:0 0 auto;font-variant-numeric:tabular-nums}'
  + '.eng-t:hover{text-decoration:underline}'
  + '.eng-sent{font-size:.79rem;line-height:1.65;min-width:0;cursor:pointer;'
    + 'display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}'
  + '.eng-sent:hover{color:var(--accent)}'
  + '.eng-lv{display:inline-block;min-width:22px;text-align:center;font-size:.68rem;'
    + 'font-weight:700;padding:1px 5px;border-radius:4px;margin-right:6px;'
    + 'background:var(--accent-light);color:var(--accent)}'
  + '.eng-lv.c1{background:var(--accent);color:#fff}'
  + '.eng-pick{display:flex;align-items:center;gap:7px;cursor:pointer;user-select:none}'
  + '.eng-pick input{width:15px;height:15px;accent-color:var(--accent);cursor:pointer;flex:0 0 auto}'
  + '.eng-card.off{opacity:.4}'
  + '.eng-cnt{font-size:.72rem;color:var(--muted);margin-left:auto}'
  + '.eng-note{font-size:.78rem;color:var(--muted);line-height:1.7;margin:8px 0 14px}'
  + '.eng-card{background:var(--bg);border:1px solid var(--border);border-radius:10px;'
    + 'padding:11px;margin-bottom:9px;font-size:.83rem;line-height:1.7}'
  + '.eng-card b{color:var(--accent);font-size:.92rem}'
  /* 출처줄: 글자 수로 자르지 않고 2줄까지만 보이도록 */
  + '.eng-src{color:var(--muted);font-size:.76rem;line-height:1.6;margin-top:5px;cursor:pointer;'
    + 'display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}'
  + '.eng-src:hover{color:var(--accent)}'
  /* 추출된 부분 하이라이트 */
  + '.eng-hl{background:var(--accent);color:#fff;border-radius:3px;padding:0 2px;'
    + 'font-weight:600}'
  /* 여러 번 나온 구문·단어를 제자리에서 넘겨 보는 페이저 */
  + '.eng-pager{display:flex;align-items:center;gap:6px;margin-top:5px}'
  + '.eng-pgn{font-size:.7rem;color:var(--muted);font-variant-numeric:tabular-nums}'
  + '.eng-pg{width:20px;height:19px;padding:0;line-height:1;font-size:.8rem;'
    + 'border:1px solid var(--border);background:var(--bg);color:var(--text);'
    + 'border-radius:5px;cursor:pointer}'
  + '.eng-pg:hover:not(:disabled){background:var(--accent-light);color:var(--accent)}'
  + '.eng-pg:disabled{opacity:.3;cursor:default}'
  + '.eng-ex{margin-top:7px;padding-left:10px;border-left:2px solid var(--border);'
    + 'color:var(--muted);font-size:.78rem}'
  + '@media(max-width:768px){.eng-cue .t{flex-basis:42px}}'
  /* ---- 좌우 분할: 영상 왼쪽 / 자막 오른쪽 ----
     미디어쿼리로 화면을 추측하지 않고 JS 가 .split 클래스를 붙입니다.
     (기기별 실제 뷰포트가 제각각이라 고정 임계값은 빗나갑니다) */
  + '.eng.split .eng-body{display:flex;gap:16px;align-items:flex-start}'
  + '.eng.split .eng-stick{flex:0 0 var(--engcol,54%);min-width:0;padding-bottom:0}'
  + '.eng.split .eng-tx{flex:1;min-width:0;padding:0 2px 30vh 0}'
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
    'have to do with': ['It has to do with the timing.', 'What does that have to do with anything?'],

    /* --- be + 형용사/명사 + 전치사 --- */
    'be sort of': ['It\'s sort of a compromise.', 'I was sort of expecting that.'],
    'be kind of': ['That\'s kind of the point.', 'She was kind of surprised.'],
    'be able to': ['I wasn\'t able to reach him.', 'You\'ll be able to tell the difference.'],
    'be going to': ['It\'s going to rain later.', 'I was going to call you.'],
    'be supposed to': ['We\'re supposed to meet at six.', 'It was supposed to be simple.'],
    'be aware of': ['Are you aware of the risk?', 'She wasn\'t aware of the change.'],
    'be based on': ['The film is based on a true story.', 'It was based on old data.'],
    'be interested in': ['I\'m interested in the results.', 'He wasn\'t interested in arguing.'],
    'be worried about': ['She\'s worried about the deadline.', 'Don\'t be worried about it.'],
    'be responsible for': ['You\'re responsible for the budget.', 'Who was responsible for this?'],
    'be similar to': ['This is similar to the old model.', 'It was similar to what we expected.'],
    'be different from': ['That\'s different from what I heard.', 'It was different from the plan.'],
    'be full of': ['The room is full of people.', 'It was full of mistakes.'],
    'be tired of': ['I\'m tired of waiting.', 'She was tired of explaining it.'],
    'be afraid of': ['He\'s afraid of failing.', 'I was afraid of the answer.'],
    'be proud of': ['We\'re proud of the team.', 'She was proud of her work.'],
    'be good at': ['He\'s good at explaining things.', 'I was never good at math.'],
    'be known for': ['The city is known for its food.', 'He was known for his patience.'],
    'be made of': ['It\'s made of steel.', 'The frame was made of wood.'],
    'be filled with': ['The page is filled with notes.', 'It was filled with errors.'],
    'be involved in': ['She\'s involved in the project.', 'He was involved in the decision.'],
    'be related to': ['That\'s related to the earlier issue.', 'It was related to timing.'],
    'be due to': ['The delay is due to weather.', 'It was due to a misunderstanding.'],
    'be likely to': ['Prices are likely to rise.', 'He was likely to refuse.'],
    'be willing to': ['I\'m willing to try.', 'She was willing to help.'],
    'be capable of': ['The tool is capable of more.', 'He was capable of better work.'],
    'be famous for': ['The area is famous for its coffee.', 'She was famous for her speeches.'],
    'be excited about': ['We\'re excited about the launch.', 'He was excited about the trip.'],
    'be concerned about': ['They\'re concerned about costs.', 'I was concerned about safety.'],
    'be committed to': ['We\'re committed to the plan.', 'She was committed to finishing.'],
    'be exposed to': ['Students are exposed to real cases.', 'He was exposed to the idea early.'],
    'be used to': ['I\'m used to the noise now.', 'She wasn\'t used to the cold.'],
    'be out of': ['We\'re out of time.', 'The printer was out of paper.'],
    'be short of': ['We\'re short of volunteers.', 'They were short of cash.'],
    'be opposed to': ['He\'s opposed to the merger.', 'She was opposed to the idea.'],
    'be keen on': ['I\'m not keen on the design.', 'He was keen on the plan.'],
    'be fond of': ['She\'s fond of old films.', 'He was fond of that place.'],

    /* --- 동사 + 전치사 --- */
    'consist of': ['The course consists of six units.', 'It consisted of three parts.'],
    'belong to': ['That belongs to her.', 'The rights belonged to the studio.'],
    'refer to': ['He referred to an earlier study.', 'This refers to page ten.'],
    'apply for': ['She applied for the grant.', 'I\'m applying for a visa.'],
    'account for': ['That accounts for the gap.', 'Sales accounted for most of it.'],
    'believe in': ['I believe in the approach.', 'He believed in second chances.'],
    'insist on': ['She insisted on paying.', 'They insisted on a written reply.'],
    'participate in': ['Everyone participated in the vote.', 'He participates in the forum.'],
    'result in': ['The change resulted in delays.', 'It resulted in higher costs.'],
    'result from': ['The error resulted from bad input.', 'Damage resulted from the storm.'],
    'suffer from': ['He suffers from headaches.', 'The plan suffered from poor timing.'],
    'succeed in': ['She succeeded in persuading them.', 'We succeeded in cutting costs.'],
    'complain about': ['They complained about the noise.', 'He complained about the fee.'],
    'concentrate on': ['Concentrate on one thing.', 'She concentrated on the details.'],
    'benefit from': ['We benefited from the delay.', 'Students benefit from feedback.'],
    'contribute to': ['That contributed to the problem.', 'She contributed to the report.'],
    'lead to': ['This leads to confusion.', 'It led to a bigger change.'],
    'adapt to': ['You adapt to the pace quickly.', 'They adapted to the new rules.'],
    'react to': ['How did he react to the news?', 'Markets reacted to the report.'],
    'respond to': ['She responded to my email.', 'He responded to the criticism.'],
    'search for': ['I searched for an answer.', 'They\'re searching for a replacement.'],
    'prepare for': ['We prepared for the worst.', 'She\'s preparing for the exam.'],
    'stand for': ['What does that stand for?', 'He stood for fairness.'],
    'depend on': ['It depends on the weather.', 'They depended on donations.'],
    'agree with': ['I agree with you.', 'She agreed with the decision.'],
    'agree on': ['We agreed on a date.', 'They never agreed on the price.'],
    'argue with': ['Don\'t argue with the referee.', 'He argued with his editor.'],
    'differ from': ['This differs from the original.', 'Results differed from expectations.'],
    'object to': ['She objected to the wording.', 'They objected to the delay.'],
    'approve of': ['His parents approved of the plan.', 'I don\'t approve of that.'],

    /* --- 실제 강연·대화에서 자주 나오는데 빠져 있던 구동사 --- */
    'pop out': ['A window popped out of nowhere.', 'The name just popped out at me.'],
    'find out': ['I found out later that it was wrong.', 'Let me find out and call you back.'],
    'screw up': ['I screwed up the timing.', 'Everyone screws up sometimes.'],
    'fall out': ['They fell out over money.', 'The screw fell out of the hinge.'],
    'stumble into': ['I stumbled into this job by accident.', 'She stumbled into the answer.'],
    'stumble upon': ['We stumbled upon an old letter.', 'He stumbled upon the solution.'],
    'graduate from': ['She graduated from college last year.', 'He never graduated from high school.'],
    'drop out': ['He dropped out after one semester.', 'Two runners dropped out early.'],
    'learn about': ['I learned about it from a friend.', 'We learn about history in school.'],
    'think about': ['Let me think about it overnight.', 'She thought about quitting.'],
    'apologize for': ['He apologized for the delay.', 'I want to apologize for yesterday.'],
    'come back': ['She came back a week later.', 'The pain keeps coming back.'],
    'meet with': ['I met with the team this morning.', 'He met with resistance.'],
    'live with': ['You learn to live with it.', 'She lives with her sister.'],
    'spend on': ['We spent too much on the launch.', 'He spends hours on details.'],
    'side with': ['The board sided with the founder.', 'Don\'t side with either of them.'],
    'move on': ['It\'s time to move on.', 'She moved on to a bigger role.'],
    'start over': ['We had to start over from scratch.', 'You can always start over.'],
    'get through': ['I barely got through the week.', 'We got through it together.'],
    'run out of': ['We ran out of time.', 'They ran out of excuses.'],
    'take off': ['The plane took off late.', 'Her career really took off.'],
    'look back': ['Looking back, it makes sense.', 'She never looked back.'],
    'turn around': ['He turned the company around.', 'Turn around and look.'],
    'sign up': ['I signed up for the newsletter.', 'Sign up before Friday.'],
    'give back': ['He wanted to give something back.', 'Give back what you borrowed.'],
    'settle down': ['They settled down in Busan.', 'Settle down and listen.'],
    'grow up': ['I grew up near the sea.', 'Kids grow up fast.'],
    'get over': ['It took months to get over it.', 'She got over the loss.'],
    'hand over': ['He handed over the keys.', 'They handed over control.'],
    'pass away': ['His father passed away last spring.', 'She passed away peacefully.'],

    /* --- 목적어가 사이에 끼는 분리형 구동사 --- */
    'pick up': ['Can you pick it up on the way?', 'She picked up Spanish quickly.'],
    'put on': ['He put on his coat.', 'Put it on before you leave.'],
    'turn on': ['Turn on the light.', 'She turned it on by mistake.'],
    'turn off': ['Please turn off your phone.', 'I turned it off an hour ago.'],
    'put down': ['Put the box down here.', 'He put down the phone.'],
    'throw away': ['Don\'t throw it away.', 'She threw away the receipt.'],
    'write down': ['Write it down before you forget.', 'He wrote down the address.'],
    'fill out': ['Fill out the form first.', 'I filled it out yesterday.'],
    'hand in': ['Hand in your report by Friday.', 'She handed it in late.'],
    'wake up': ['Wake me up at six.', 'He woke up early.'],
    'clean up': ['Clean up the mess.', 'We cleaned it up together.'],
    'cut off': ['They cut off the power.', 'He cut me off mid-sentence.'],
    'break up': ['They broke up last year.', 'Break it up into smaller steps.'],
    'make up': ['He made up an excuse.', 'They made up after the argument.'],
    'pay off': ['The effort paid off.', 'She paid off her loan.'],
    'call off': ['They called off the meeting.', 'We had to call it off.'],
    'let down': ['I don\'t want to let you down.', 'The ending let me down.'],
    'take back': ['I take back what I said.', 'He took it back to the store.'],
    'set aside': ['Set aside an hour for this.', 'She set some money aside.'],
    'turn up': ['He turned up an hour late.', 'Turn up the volume.'],

    /* --- 명사구: 수량·정도 --- */
    'a couple of': ['I need a couple of days.', 'We met a couple of times.'],
    'a number of': ['A number of people complained.', 'There are a number of options.'],
    'a variety of': ['They offer a variety of courses.', 'It failed for a variety of reasons.'],
    'a range of': ['We tested a range of options.', 'It covers a range of topics.'],
    'a handful of': ['Only a handful of people showed up.', 'I have a handful of questions.'],
    'a great deal of': ['It took a great deal of effort.', 'She has a great deal of experience.'],
    'plenty of': ['There is plenty of time.', 'We had plenty of warning.'],
    'the majority of': ['The majority of users never notice.', 'The majority of it was fine.'],
    'the rest of': ['I will read the rest of it later.', 'The rest of the team agreed.'],
    'a series of': ['We ran a series of tests.', 'It was a series of small mistakes.'],
    'a piece of': ['That is a useful piece of advice.', 'He gave me a piece of paper.'],

    /* --- 명사구: 추상 --- */
    'a matter of': ['It is a matter of time.', 'That is a matter of opinion.'],
    'a sense of': ['She has a strong sense of purpose.', 'It gave me a sense of relief.'],
    'a lack of': ['The project failed from a lack of funding.', 'There is a lack of clarity.'],
    'a form of': ['Silence is a form of answer.', 'It is a form of self-defence.'],
    'a source of': ['Coffee is my main source of energy.', 'It became a source of conflict.'],
    'the point of': ['That is the whole point of the exercise.', 'What is the point of waiting?'],
    'the sake of': ['For the sake of clarity, I will repeat it.', 'Do it for the sake of the team.'],
    'the result of': ['It was the result of years of work.', 'This is the result of bad planning.'],
    'the impact of': ['We measured the impact of the change.', 'The impact of the delay was small.'],
    'the role of': ['She played the role of mediator.', 'The role of luck is underrated.'],
    'the value of': ['I learned the value of patience.', 'The value of the advice was clear.'],
    'the beginning of': ['That was the beginning of the end.', 'At the beginning of the year.'],
    'the end of': ['By the end of the day, it was done.', 'This is not the end of the story.'],

    /* --- 명사 + 전치사 (한국인이 자주 틀리는 짝) --- */
    'interest in': ['She showed real interest in the topic.', 'I lost interest in it quickly.'],
    'reason for': ['There is no reason for panic.', 'The reason for the delay was weather.'],
    'solution to': ['We found a solution to the problem.', 'There is no simple solution to it.'],
    'approach to': ['I like her approach to teaching.', 'We need a new approach to this.'],
    'effect on': ['It had no effect on the result.', 'Sleep has a big effect on focus.'],
    'impact on': ['The change had an impact on sales.', 'It made an impact on me.'],
    'increase in': ['We saw an increase in traffic.', 'There was an increase in costs.'],
    'demand for': ['Demand for the product grew.', 'There is little demand for it.'],
    'need for': ['There is no need for that.', 'The need for speed was obvious.'],
    'access to': ['Students have access to the library.', 'We lost access to the server.'],
    'response to': ['This is a response to your question.', 'His response to criticism was calm.'],
    'attention to': ['She pays close attention to detail.', 'It drew attention to the issue.'],
    'relationship with': ['He has a good relationship with his team.', 'Their relationship with risk changed.'],
    'difference between': ['The difference between them is small.', 'Know the difference between the two.'],
    'connection between': ['There is a connection between the two events.', 'I see no connection between them.'],
    'advantage of': ['The main advantage of this is speed.', 'It has the advantage of being cheap.'],
    'chance of': ['There is a good chance of rain.', 'The chance of failure is low.'],
    'risk of': ['It reduces the risk of injury.', 'There is a risk of losing data.'],
    'possibility of': ['We discussed the possibility of moving.', 'The possibility of error is real.']
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
    leave: ['leave','leaves','left','leaving'],
    lead: ['lead','leads','led','leading'],
    lose: ['lose','loses','lost','losing'],
    mean: ['mean','means','meant','meaning'],
    feel: ['feel','feels','felt','feeling'],
    send: ['send','sends','sent','sending'],
    spend: ['spend','spends','spent','spending'],
    build: ['build','builds','built','building'],
    sell: ['sell','sells','sold','selling'],
    buy: ['buy','buys','bought','buying'],
    teach: ['teach','teaches','taught','teaching'],
    seek: ['seek','seeks','sought','seeking'],
    win: ['win','wins','won','winning'],
    sit: ['sit','sits','sat','sitting'],
    cost: ['cost','costs','costing'],
    fall: ['fall','falls','fell','fallen','falling'],
    grow: ['grow','grows','grew','grown','growing'],
    meet: ['meet','meets','met','meeting'],
    eat: ['eat','eats','ate','eaten','eating'],
    drive: ['drive','drives','drove','driven','driving'],
    ride: ['ride','rides','rode','ridden','riding'],
    rise: ['rise','rises','rose','risen','rising'],
    shake: ['shake','shakes','shook','shaken','shaking'],
    steal: ['steal','steals','stole','stolen','stealing'],
    freeze: ['freeze','freezes','froze','frozen','freezing'],
    hide: ['hide','hides','hid','hidden','hiding'],
    blow: ['blow','blows','blew','blown','blowing'],
    fly: ['fly','flies','flew','flown','flying'],
    draw: ['draw','draws','drew','drawn','drawing'],
    sing: ['sing','sings','sang','sung','singing'],
    ring: ['ring','rings','rang','rung','ringing'],
    sleep: ['sleep','sleeps','slept','sleeping'],
    dig: ['dig','digs','dug','digging'],
    shoot: ['shoot','shoots','shot','shooting'],
    fight: ['fight','fights','fought','fighting']
  };

  /* 표제어의 첫 단어는 아래 목록에 없으면 전부 동사로 보고 활용형을 만듭니다.
     (표제어를 추가할 때 동사 목록을 따로 관리하지 않아도 되도록) */
  var NON_VERB_HEAD = {};
  'in as so at on for a an the kind no instead rather used supposed might plenty'
    .split(' ').forEach(function (w) { NON_VERB_HEAD[w] = 1; });

  /* ---- 분리형 구동사 ----
     "looked it up", "turned the offer down" 처럼 목적어가 동사와 불변화사 사이에
     끼는 형태. 아무 말이나 끼워 넣으면 오탐이 늘어나므로
     대명사이거나 관사로 시작하는 짧은 명사구만 허용합니다. */
  var SEP_PARTS = {};
  'up out off on in down over back away around through together'
    .split(' ').forEach(function (p) { SEP_PARTS[p] = 1; });

  var PRON = {}, DET = {};
  'it them him her me us you this that these those'
    .split(' ').forEach(function (w) { PRON[w] = 1; });
  'the a an my your his her its our their some any'
    .split(' ').forEach(function (w) { DET[w] = 1; });

  var OBJ = '(?:it|them|him|her|me|us|you|this|that|these|those|'
    + '(?:the|a|an|my|your|his|her|its|our|their|some|any)\\s+\\w+(?:\\s+\\w+)?)';

  /* 끝소리가 '자음+모음+자음'인 짧은 동사는 자음을 겹칩니다:
     pop→popped, drop→dropped, stop→stopped, plan→planned.
     이 규칙이 없어서 poped·droped 가 만들어졌고 pop out 이 통째로 누락됐습니다. */
  function dbl(v) {
    return /^[a-z]*[^aeiou][aeiou][bdgklmnprt]$/.test(v) && v.length <= 5
      ? v + v.slice(-1) : null;
  }

  function forms(v) {
    if (IRREG[v]) return IRREG[v];
    var f = {}, d = dbl(v);
    f[v] = 1;
    f[/[sxz]$|ch$|sh$|o$/.test(v) ? v + 'es'
      : /[^aeiou]y$/.test(v) ? v.slice(0, -1) + 'ies' : v + 's'] = 1;
    if (/[^aeiou]y$/.test(v)) f[v.slice(0, -1) + 'ied'] = 1;
    else if (/e$/.test(v)) f[v + 'd'] = 1;
    else if (d) f[d + 'ed'] = 1;
    else f[v + 'ed'] = 1;
    f[/e$/.test(v) ? v.slice(0, -1) + 'ing' : (d ? d + 'ing' : v + 'ing')] = 1;
    return Object.keys(f);
  }

  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  /* be·동사와 나머지 사이에 끼어드는 부정어·부사를 허용해야
     "was not able to", "is really interested in" 같은 형태가 잡힙니다. */
  var MID = '(?:\\s+(?:not|never|really|just|still|always|quite|very|so|too|also|only|'
    + 'already|probably|certainly|definitely|actually|generally|usually|often|sometimes|'
    + 'even|almost|rather|pretty|totally|completely|absolutely))*';

  /* 두 단어짜리 '동사 + 불변화사' 표제어는 목적어가 끼어드는 형태도 허용 */
  function sepSlot(w, isVerb) {
    return (isVerb && w.length === 2 && SEP_PARTS[w[1]]) ? '(?:' + OBJ + '\\s+)?' : '';
  }

  var PHRASE_RE = Object.keys(BOOK).map(function (key) {
    var w = key.split(' ');
    var isVerb = !NON_VERB_HEAD[w[0]];
    var head = isVerb ? '(?:' + forms(w[0]).map(esc).join('|') + ')' : esc(w[0]);
    var rest = w.slice(1).map(esc).join('\\s+');
    var body = rest ? (isVerb ? MID : '') + '\\s+' + sepSlot(w, isVerb) + rest : '';
    return { key: key, re: new RegExp('\\b' + head + body + '\\b') };
  });

  var VERBS = 'get|go|come|take|put|make|look|turn|bring|run|set|give|pick|hold|break|call|carry|'
    + 'cut|figure|find|keep|move|pass|pay|point|pull|push|show|sort|stand|throw|try|work|write|'
    + 'check|clear|close|deal|drop|end|fill|hand|head|leave|open|play|reach|save|send|settle|'
    + 'sign|speak|start|stay|step|stick|switch|talk|team|think|wake|walk|warm|wear|wind|wipe|wrap|'
    /* 실제 자막 점검에서 빠져 있던 동사들 */
    + 'pop|screw|stumble|graduate|apologize|apologise|learn|live|spend|side|grow|hang|jump|kick|'
    + 'knock|lay|let|lock|log|mess|note|pile|plug|point|print|read|ring|rip|roll|rule|rush|scale|'
    + 'seek|sell|shake|shut|sit|slow|sneak|sort|split|spread|stack|stare|storm|strike|swap|sweep|'
    + 'tear|tie|track|trade|type|use|wait|wash|watch|weigh|win|wipe|zoom|back|bail|bank|bear|beat|'
    + 'blow|boil|bounce|branch|brush|build|burn|buy|catch|cheer|chop|clean|climb|count|cover|cross|'
    + 'die|dig|dive|do|draw|dress|drive|eat|fade|fall|feel|fight|fit|fix|flip|float|fly|fold|'
    + 'follow|freeze|hurry|iron|join|land|laugh|lean|lie|lift|light|line|listen|load|mark|match|'
    + 'meet|melt|mix|order|pack|paint|park|phone|pin|plan|pour|press|pump|reply|rest|ride|rise|'
    + 'round|scratch|scream|search|see|seem|serve|shoot|sing|sink|sleep|slide|smooth|sound|spell|'
    + 'stir|stop|swing|tidy|touch|train|tune|wander|warn|wave|wear|wonder';

  /* 일반 패턴은 지금까지 규칙 활용(-ed/-ing)만 읽어서, found out·came back·met with 처럼
     불규칙 과거형이 통째로 누락됐습니다. 표면형 → 원형 표를 만들어 해결합니다. */
  var VERBSET = {}, PARTSET = {}, SURF2BASE = {};
  VERBS.split('|').forEach(function (v) { VERBSET[v] = 1; });
  /* PARTSET 은 PARTS 정의 뒤에서 채웁니다 (아래 참조) */

  Object.keys(IRREG).forEach(function (b) {
    IRREG[b].forEach(function (f) { if (!SURF2BASE[f]) SURF2BASE[f] = b; });
  });
  /* IRREG 에 없는 흔한 불규칙형 보강 */
  ('fell:fall fallen:fall grew:grow grown:grow blew:blow blown:blow drew:draw drawn:draw '
  + 'threw:throw thrown:throw flew:fly flown:fly ate:eat eaten:eat drove:drive driven:drive '
  + 'rode:ride ridden:ride rose:rise risen:rise sang:sing sung:sing sank:sink sunk:sink '
  + 'shook:shake shaken:shake shot:shoot slept:sleep slid:slide swept:sweep swung:swing '
  + 'tore:tear torn:tear woke:wake woken:wake wore:wear worn:wear wrote:write written:write '
  + 'dug:dig dove:dive froze:freeze frozen:freeze knelt:kneel lit:light laid:lay lay:lie '
  + 'beat:beat beaten:beat burnt:burn learnt:learn read:read fit:fit split:split spread:spread '
  + 'struck:strike stuck:stick swam:swim').split(' ').forEach(function (pair) {
    var kv = pair.split(':');
    if (!SURF2BASE[kv[0]]) SURF2BASE[kv[0]] = kv[1];
  });

  /* 표면형에서 원형 추정 — 불규칙표를 먼저 보고, 없으면 규칙 어미를 벗깁니다 */
  function verbBase(w) {
    if (VERBSET[w]) return w;
    if (SURF2BASE[w] && VERBSET[SURF2BASE[w]]) return SURF2BASE[w];
    var cand = [];
    if (/ied$/.test(w)) cand.push(w.slice(0, -3) + 'y');
    if (/ing$/.test(w)) cand.push(w.slice(0, -3), w.slice(0, -3) + 'e');
    if (/ed$/.test(w)) cand.push(w.slice(0, -2), w.slice(0, -1));
    if (/es$/.test(w)) cand.push(w.slice(0, -2));
    if (/s$/.test(w) && !/ss$/.test(w)) cand.push(w.slice(0, -1));
    var dbl = w.replace(/([bdgklmnprt])\1(ed|ing)$/, '$1');
    if (dbl !== w) cand.push(dbl);
    for (var i = 0; i < cand.length; i++) if (VERBSET[cand[i]]) return cand[i];
    return null;
  }
  /* 일반 패턴에 쓰는 불변화사는 '진짜 구동사를 만드는 것'으로 한정합니다.
     of·for·with·to 같은 전치사를 넣으면 "turn of the century", "cover of",
     "go to" 처럼 구동사가 아닌 명사구가 대량으로 딸려옵니다.
     "consist of", "belong to", "apply for" 등은 사전 표제어로 따로 있습니다. */
  var PARTS = 'up|out|off|on|in|down|over|through|away|back|around|into|along|apart|aside|'
    + 'forward|together|ahead';
  PARTS.split('|').forEach(function (p) { PARTSET[p] = 1; });

  /* 축약형을 풀어야 be 구문이 잡힙니다: "it's sort of" → "it is sort of" */
  function expand(s) {
    return s
      .replace(/\bcan't\b/g, 'can not').replace(/\bwon't\b/g, 'will not')
      .replace(/\bshan't\b/g, 'shall not').replace(/n't\b/g, ' not')
      .replace(/'re\b/g, ' are').replace(/'ve\b/g, ' have')
      .replace(/'ll\b/g, ' will').replace(/'m\b/g, ' am')
      .replace(/'s\b/g, ' is').replace(/'d\b/g, ' would');
  }

  function extractPhrases(cues) {
    var found = {};
    function add(key, i) {
      if (!found[key]) found[key] = { label: key, hits: [], n: 0 };
      var f = found[key];
      /* 같은 자막 줄에서 두 번 걸리는 경우는 한 번만 셉니다 */
      if (f.hits[f.hits.length - 1] === i) return;
      f.hits.push(i);
      f.n = f.hits.length;
    }

    cues.forEach(function (c, i) {
      var low = ' ' + expand(c.x.toLowerCase())
                        .replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ') + ' ';

      var hits = PHRASE_RE.filter(function (p) { return p.re.test(low); })
                          .map(function (p) { return p.key; });
      hits = hits.filter(function (k) {
        return !hits.some(function (o) { return o !== k && o.indexOf(k + ' ') === 0; });
      });
      hits.forEach(function (k) { add(k, i); });

      /* 사전에 없는 구동사도 포착.
         정규식 대신 토큰을 훑으며 원형을 되돌리므로, 규칙 활용뿐 아니라
         found out·came back·met with 같은 불규칙 과거형도 잡힙니다. */
      var toks = low.trim().split(' ');
      for (var t = 0; t < toks.length - 1; t++) {
        var vb = verbBase(toks[t]);
        if (!vb) continue;

        var base = null;
        if (PARTSET[toks[t + 1]]) {
          base = vb + ' ' + toks[t + 1];          /* 붙어 있는 형태 */
        } else {
          /* 분리형: 동사 + 목적어(1~3단어) + 불변화사 */
          for (var k = 2; k <= 4 && t + k < toks.length; k++) {
            if (!PARTSET[toks[t + k]]) continue;
            var obj = toks.slice(t + 1, t + k);
            var cand = vb + ' ' + toks[t + k];
            /* 대명사면 분리형 구동사가 거의 확실.
               일반 명사구는 사전에 있는 구동사일 때만 인정합니다
               ("walked the dog in the park" 이 "walk in" 이 되지 않도록) */
            if ((obj.length === 1 && PRON[obj[0]]) ||
                (DET[obj[0]] && obj.length <= 3 && BOOK[cand])) base = cand;
            break;
          }
        }
        if (!base) continue;
        /* 이 줄에서 이미 잡힌 표제어에 포함된 조합이면 건너뜁니다.
           BOOK 에 있다는 이유만으로 건너뛰지는 않습니다 — "spent too much on" 처럼
           사이에 목적어가 끼어 표제어 매칭이 실패한 경우를 여기서 건집니다. */
        if (hits.indexOf(base) < 0
            && !hits.some(function (k) { return k !== base && k.indexOf(base) >= 0; })) {
          add(base, i);
        }
      }
    });

    return Object.keys(found).map(function (k) { return found[k]; })
      .sort(function (a, b) { return b.n - a.n || a.label.localeCompare(b.label); })
      .slice(0, 60);
  }

  /* ==========================================================================
     단어 추출 — 빈도 기반 레벨 추정
     A1/A2 = 기초, B1 = 중급, B2 = 중상급, 목록에 없으면 C1(고급)으로 봅니다.
     CEFR 공식 등급이 아니라 빈도대 기반 추정치입니다.
     ========================================================================== */
  var LV_A = ('a about above across after again against all almost alone along already also '
  + 'although always am among amount an and angry animal another answer any anyone anything '
  + 'appear apple april are area arm around arrive art as ask at august aunt autumn away baby '
  + 'back bad bag ball bank bath be beach beautiful because become bed bedroom been before '
  + 'begin behind believe below beside best better between big bike bird birthday black blue '
  + 'board boat body book boot bored boring born borrow both bottle bottom box boy bread break '
  + 'breakfast bring brother brown build building bus business busy but buy by cake call camera '
  + 'can car card care careful carry case cat catch center centre century certain chair chance '
  + 'change cheap check cheese chicken child children chocolate choose church cinema city class '
  + 'classroom clean clear climb clock close clothes cloud club coat coffee cold college color '
  + 'colour come comfortable common company complete computer concert continue cook cool copy '
  + 'corner correct cost could country couple course cousin cover cow crazy cream create cross '
  + 'cry cup cut dad dance danger dangerous dark date daughter day dead dear december decide '
  + 'deep degree delicious depend describe desk detail dictionary die difference different '
  + 'difficult dinner direction dirty discuss dish do doctor dog dollar door double down draw '
  + 'dream dress drink drive driver drop dry during each ear early earth east easy eat egg eight '
  + 'either else email end enemy engine english enjoy enough enter equal especially even evening '
  + 'event ever every everybody everyone everything everywhere exactly example excellent except '
  + 'excited exciting excuse exercise expect expensive experience explain eye face fact factory '
  + 'fail fall false family famous fantastic far farm fashion fast fat father favorite favourite '
  + 'feel feeling female few field fight fill film final finally find fine finger finish fire '
  + 'first fish fit five fix flat floor flower fly follow food foot football for foreign forest '
  + 'forget fork form four free fresh friday friend friendly from front fruit full fun funny '
  + 'furniture future game garden gas gate general get gift girl give glad glass go goal gold '
  + 'good goodbye grandfather grandmother grass gray great green grey ground group grow guess '
  + 'guest guitar guy hair half hall hand happen happy hard hat hate have he head health healthy '
  + 'hear heart heat heavy hello help her here hers herself hi high hill him himself his history '
  + 'hit hobby hold holiday home homework hope horse hospital hot hotel hour house how however '
  + 'hundred hungry hurry hurt husband ice idea if ill important in include increase indeed '
  + 'inside instead interest interested interesting international internet into introduce invite '
  + 'is island it its itself jacket january job join joke journey juice july jump june just keep '
  + 'key kill kind king kitchen knife know lady lake lamp land language large last late later '
  + 'laugh law lazy lead learn leave left leg lemon lend length less lesson let letter level '
  + 'library lie life light like line lion lip list listen little live living local lock lonely '
  + 'long look lose lot loud love low lucky lunch machine magazine main make male man many map '
  + 'march mark market marry match may maybe me meal mean meat medicine meet member memory men '
  + 'menu message metal meter method middle might mile milk million mind mine minute mirror miss '
  + 'mistake mix mobile modern moment monday money monkey month moon more morning most mother '
  + 'mountain mouse mouth move movie much museum music must my myself name narrow national '
  + 'nature near nearly necessary neck need neighbor neighbour neither nervous never new news '
  + 'newspaper next nice night nine no noise none noon nor normal north nose not note nothing '
  + 'notice november now number nurse object ocean october of off offer office often oil old on '
  + 'once one onion only open opinion opposite or orange order other our ours ourselves out '
  + 'outside over own page pain paint pair paper parent park part particular partner party pass '
  + 'passenger past pay peace pen pencil people pepper perfect perhaps period person pet phone '
  + 'photo piano pick picture piece pig pink place plan plane plant plastic plate play player '
  + 'please pleasure pocket point police polite pool poor popular position possible post potato '
  + 'practice prefer prepare present president press pretty price print private probably problem '
  + 'produce product program project promise protect proud public pull purple purpose push put '
  + 'quality quarter queen question quick quiet quite radio rain raise reach read ready real '
  + 'realize really reason receive recent record red remember remove rent repeat reply report '
  + 'rest restaurant result return rice rich ride right ring rise river road rock room round rule '
  + 'run sad safe salad salt same sand saturday save say school science sea search season seat '
  + 'second secret see seem sell send sentence september serious serve service set seven several '
  + 'shall shape share sharp she sheep sheet shine ship shirt shoe shop short should shoulder '
  + 'shout show shower shut sick side sign silver simple since sing single sister sit situation '
  + 'six size skill skin skirt sky sleep slow small smell smile smoke snow so soap soccer social '
  + 'sock soft some somebody someone something sometimes son song soon sorry sound soup south '
  + 'space speak special speed spell spend spoon sport spring stand star start state station stay '
  + 'steal step stick still stone stop store storm story straight strange street strong student '
  + 'study stupid subject succeed such sudden sugar suggest suit summer sun sunday supermarket '
  + 'sure surprise sweet swim table take talk tall taste taxi tea teach teacher team telephone '
  + 'television tell temperature ten tennis terrible test than thank that the theater theatre '
  + 'their theirs them themselves then there these they thick thin thing think third thirsty '
  + 'this those though thought thousand three throat through throw thursday ticket tidy tie time '
  + 'tired to today together toilet tomato tomorrow tonight too tooth top total touch tour towel '
  + 'town toy traffic train travel tree trip trouble trousers true trust try tuesday turn twelve '
  + 'twenty twice two type ugly umbrella uncle under understand university until up upon us use '
  + 'useful usual usually vegetable very video view village visit voice wait wake walk wall want '
  + 'war warm wash watch water way we weak wear weather wednesday week weekend weight welcome '
  + 'well west wet what when where whether which while white who whole whom whose why wide wife '
  + 'wild will win wind window wine winter wish with without woman women wonder wonderful wood '
  + 'word work world worry worse worst would write wrong year yellow yes yesterday yet you young '
  + 'your yours yourself zero').split(' ');

  var LV_B1 = ('ability abroad absolutely accept accident according account achieve act action '
  + 'active activity actual actually add addition admire admit advance advantage adventure '
  + 'advertise advice affect afford afraid agency agree agreement ahead aim allow alternative '
  + 'amazing ambition announce annoy anxious apologize apparently apply appointment appreciate '
  + 'approach appropriate approve argue argument arrange arrest article ashamed aside aspect '
  + 'assist assume atmosphere attack attempt attend attention attitude attract audience author '
  + 'authority available average avoid award aware background balance ban basic basis battle '
  + 'behave behavior belief benefit besides beyond bill bit blame blood bother brain branch brave '
  + 'breath breathe brief brilliant broad budget burn bury calm campaign cancel candidate capable '
  + 'capacity capital career careless cash cause ceiling celebrate challenge championship '
  + 'character charge charity chase chat cheat cheer chemical chief circle citizen claim clerk '
  + 'client climate collect column combine comment commercial commit committee communicate '
  + 'community compare compete competition complain complex concentrate concern conclusion '
  + 'condition conference confidence confident confirm conflict confuse connect connection '
  + 'consider constant contact contain content contract contrast contribute control convenient '
  + 'conversation convince cope count courage crash creative credit crime criminal crisis '
  + 'criticize crowd cruel cultural culture curious current custom customer damage debate debt '
  + 'decade decision declare decorate decrease defeat defend define definitely delay deliver '
  + 'demand democracy demonstrate deny department deserve design desire despite destroy detect '
  + 'determine develop device devote diet differ digital direct director disagree disappear '
  + 'disappoint disaster discipline discount discover discovery disease dismiss display distance '
  + 'distant distinguish distribute district disturb divide divorce document domestic donate '
  + 'doubt drag drama dramatic due duty eager earn ease economic economy edge edit editor educate '
  + 'education effect effective efficient effort elect election electricity element emergency '
  + 'emotion emotional employ employee employer empty enable encourage engage engineer enormous '
  + 'ensure entertain enthusiasm entire environment episode equipment error escape essential '
  + 'establish estimate evaluate eventually evidence evil exact examine exchange exclude '
  + 'executive exist existence expand expense experiment expert explore export expose express '
  + 'expression extend extent external extra extreme fair faith fault favor fear feature fee '
  + 'figure finance financial firm flight focus force forecast formal former fortune forward '
  + 'frame frequent fuel function fund fundamental gain gather gender generation generous gentle '
  + 'genuine goods government grade grant guarantee guard guide habit handle hang harm hardly '
  + 'headline highlight hire honest honor horror host huge human humor ideal identify identity '
  + 'ignore illegal image imagine immediate impact impress improve incident income indicate '
  + 'individual industry influence inform initial injure innocent insist inspire install '
  + 'instance instruction insurance intelligent intend intense interpret invent invest '
  + 'investigate involve issue journal journalist judge junior justice knowledge label labor lack '
  + 'launch layer leader league legal license limit link literature loan locate logic loyal '
  + 'luxury maintain major manage manager manner manufacture margin mass master material '
  + 'mathematics matter mature meanwhile measure media medical mental mention merely military '
  + 'minor mission mixture mood moral motivate murder mutual native negative negotiate nerve '
  + 'network neutral nowhere obey observe obtain obvious occasion occupy occur odd offend '
  + 'operate opportunity oppose option organize origin original otherwise outcome output '
  + 'overcome owe pace pack panel participate particularly path patient pattern perform '
  + 'permanent permission persuade phase phenomenon physical pity plenty policy political '
  + 'politics pollution portion positive possess potential pour poverty powerful practical praise '
  + 'precise predict pregnant prejudice pressure prevent previous primary principle priority '
  + 'prison procedure process profession professional profit progress prohibit promote proper '
  + 'proportion propose prospect protest prove provide punish purchase pursue qualify quantity '
  + 'quote race range rank rapid rare rate rather ratio react reasonable recall recognize '
  + 'recommend recover reduce refer reflect reform refuse regard region register regret regular '
  + 'reject relate relation relationship relative relax release relevant reliable relief '
  + 'religion rely remain remark remind repair replace represent republic reputation request '
  + 'require rescue research reserve resident resist resolve resource respect respond response '
  + 'responsible restrict retain retire reveal review revolution reward risk role rough route '
  + 'routine row royal rural sacrifice sample satisfy scale scene schedule scheme scope score '
  + 'scream sector secure seek select senior sense sensitive separate sequence series settle '
  + 'severe shadow shake shame shelter shift shock shortage sight signal significant silence '
  + 'similar sincere site skilled slight slip smooth society software solution solve somewhat '
  + 'sort source spare species specific spirit split spot spread stable staff stage standard '
  + 'stare status steady steel stock strategy strengthen stress stretch strict strike structure '
  + 'struggle style submit substance succeed success sufficient suffer suggestion suitable supply '
  + 'support suppose surface surround survey survive suspect swear switch symbol sympathy system '
  + 'tackle talent target task tax technical technique technology temporary tend tension term '
  + 'terror theory therefore threat threaten thus tight tiny tone tool topic trace track trade '
  + 'tradition transfer transform translate transport treat treatment tremendous trend trial '
  + 'tribe trick trigger triumph tune typical ultimate unique unit unless unusual update upgrade '
  + 'urban urge urgent usage valid valuable value van variety various vary vast venture version '
  + 'via victim victory violence virtual virtue vision visual vital volume vote voyage wage '
  + 'wander warn waste wave wealth weapon welfare wheel whereas widespread willing wisdom '
  + 'withdraw witness worth wrap yield youth').split(' ');

  var LV_B2 = ('abandon absorb abstract accompany accomplish accurate accuse acknowledge acquire '
  + 'adapt adequate adjust administer adopt advocate aesthetic affair aggressive alter ambiguous '
  + 'amend ample analyze ancestor anticipate apparatus appeal arbitrary architecture arise '
  + 'articulate assemble assert assess asset assign assumption assure attain attribute autonomy '
  + 'awkward barrier bias bid bind bizarre blend bond boost bore bounce boundary breach breakdown '
  + 'brutal bulk bureaucracy burden capture carve cease chronic circulate cite civil clarify '
  + 'clash cluster coherent coincide collapse collateral colleague commence commission commodity '
  + 'compassion compel compensate compile complement compliment component comprehensive comprise '
  + 'compromise conceal concede conceive concept conclude concrete condemn conduct confer confine '
  + 'conform confront consensus consent consequence conserve considerable consistent constitute '
  + 'constrain consult consume contemplate contemporary contempt contend contest continuous '
  + 'contradict controversial convention converge convert convey conviction cooperate coordinate '
  + 'corrupt counsel counter crucial crude cue cultivate cumulative curb currency deceive decent '
  + 'decline dedicate deduce deem defect deficit definite deliberate delicate dense depict '
  + 'deploy deprive derive descend designate despair destiny detain deteriorate deviate diagnose '
  + 'diminish discard discourse discreet discrete discriminate disguise dispose dispute disrupt '
  + 'dissolve diverse doctrine domain dominate drain drastic dubious dwell dynamic elaborate '
  + 'elegant elevate eligible eloquent embrace emerge eminent empirical enact endeavor endorse '
  + 'endure enhance enrich entail enterprise entity entitle equivalent erode erupt essence '
  + 'esteem eternal ethic evident evoke evolve exaggerate exceed excerpt exclusive execute exempt '
  + 'exert exhaust exhibit exotic explicit exploit extract fabric facilitate faculty fade '
  + 'fascinate feasible federal fertile flaw flee flexible flourish fluctuate foster fragile '
  + 'fragment framework fraud friction fulfill furthermore fusion generate genuine glance gleam '
  + 'glimpse govern grasp grave grip gross halt hazard heritage hesitate hierarchy hollow hostile '
  + 'humble hypothesis illustrate imitate immense immune imply impose impulse inclined '
  + 'incorporate incur indigenous induce indulge inevitable infer inflict inherent inherit '
  + 'inhibit initiate innovate input inquiry insight inspect instinct institute integral '
  + 'integrate integrity intellectual intent interact interfere interim intermediate interval '
  + 'intervene intimate intricate intrinsic intuition invoke ironic isolate jargon jeopardy '
  + 'justify keen legacy legislate legitimate leverage liable liberal linger literal litigate '
  + 'magnitude mandate manifest manipulate marginal mediate medium merge merit metaphor migrate '
  + 'mimic minimal minimize modify momentum monitor monopoly morale motive mundane narrative '
  + 'negligible nominal norm notion notorious novel nuance nurture obligation obscure offset '
  + 'ongoing onset optimal orient outbreak outlook outset overlap overlook overwhelm paradigm '
  + 'paradox parallel parameter passive peculiar penalty perceive peripheral perpetual persist '
  + 'perspective pertinent pervasive plausible plunge poll ponder portray posture practitioner '
  + 'preach precede precedent precision preclude predominant preliminary premise prescribe '
  + 'preserve prestige presume prevail prevalent prime privilege probe proceed proclaim profound '
  + 'prolong prominent prompt propaganda prone prosper provoke prudent quest quota radical random '
  + 'ratify realm reap rebel recede reciprocal reckless reckon reconcile rectify redundant '
  + 'refine refrain refute regime reign reinforce reiterate reluctant remedy remnant render '
  + 'renew renowned repel replicate reproach resemble reside residual resilient resort restore '
  + 'restrain retrieve revenue reverse revise revive rhetoric rigid rigorous ripple rival robust '
  + 'sanction scarce scatter scenario sceptical scrutiny seize sequel setback shed shrink '
  + 'simulate simultaneous skeptical slump sophisticated sovereign span sparse spectrum '
  + 'speculate sphere spontaneous stagnant stake stark statute steer stem stimulate stipulate '
  + 'strain stringent subordinate subsequent subside subsidy substantial substitute subtle '
  + 'succession suffice summit superficial superior supplement suppress surge surpass surplus '
  + 'susceptible sustain swift symptom synthesis tackle tangible tedious temper tempt tentative '
  + 'terminate territory testify thereby thorough threshold thrive toll torment trait transcend '
  + 'transition transmit transparent traumatic treaty tribute trivial turbulent ubiquitous '
  + 'unanimous underlying undergo undermine undertake uniform unify unprecedented uphold utilize '
  + 'utter vague validate vanish vein venture verify versatile vessel veto viable vibrant '
  + 'vigorous vindicate violate virtually void volatile voluntary vulnerable warrant wary weary '
  + 'whereby widespread withhold withstand yearn zeal').split(' ');

  /* 위 목록에서 빠지기 쉬운 최빈출어 — be/have/do 변화형, 불규칙 과거형,
     기초 파생명사. 없으면 was·were·went 같은 단어가 C1 으로 잘못 올라갑니다. */
  var LV_A2 = ('was were been being am is are was had has have having do does did done doing '
  + 'said says say went gone going goes got gotten gets made makes making took taken takes '
  + 'came comes coming gave given gives knew known knows thought thinks told tells felt feels '
  + 'left leaves kept keeps put puts saw seen sees found finds ran runs sat sits stood stands '
  + 'brought brings bought buys sold sells paid pays read heard hears held holds lost loses '
  + 'won wins sent sends spent spends built builds began begun begins broke broken breaks '
  + 'chose chosen drove driven ate eaten fell fallen flew flown forgot forgotten grew grown '
  + 'led lit meant rose risen sang sung spoke spoken stole stolen swam taught tore torn '
  + 'understood wore worn wrote written became becomes drank drew drawn threw thrown woke '
  + 'slept shown showed lay laid sought fought caught bit hid rode shot sank struck swung '
  + 'death birth truth growth strength length depth youth wealth worth breath belief choice '
  + 'proof loss gift sight speech thief theft sale service safety silence ability beauty '
  + 'ago always never often sometimes usually perhaps however therefore thus otherwise '
  + 'besides within without throughout during unless whether although though since until '
  + 'while able unable much many more most less least own same other another such very quite '
  + 'rather almost enough even still yet only just about above across along around behind '
  + 'beyond down near off onto out over past through toward towards under upon these those '
  + 'himself herself itself themselves ourselves yourself yourselves whom whose whatever '
  + 'whenever wherever whoever anybody nobody everybody somewhere anywhere nowhere everywhere '
  + 'ok okay yeah yes no hey oh ah um uh wow please thanks thank sorry hello goodbye bye')
  .split(' ');

  var LEVEL = {};
  LV_A.forEach(function (w) { LEVEL[w] = 'A'; });
  LV_A2.forEach(function (w) { LEVEL[w] = 'A'; });
  LV_B1.forEach(function (w) { if (!LEVEL[w]) LEVEL[w] = 'B1'; });
  LV_B2.forEach(function (w) { if (!LEVEL[w]) LEVEL[w] = 'B2'; });

  var RANK = { A: 0, B1: 1, B2: 2, C1: 3 };

  /* 활용형 → 가능한 원형 후보들 */
  function baseForms(w) {
    var out = [w];
    if (/ies$/.test(w) && w.length > 4) out.push(w.slice(0, -3) + 'y');
    if (/es$/.test(w) && w.length > 3) out.push(w.slice(0, -2));
    if (/s$/.test(w) && !/ss$|us$|is$/.test(w) && w.length > 3) out.push(w.slice(0, -1));
    if (/ied$/.test(w) && w.length > 4) out.push(w.slice(0, -3) + 'y');
    if (/ed$/.test(w) && w.length > 3) { out.push(w.slice(0, -2), w.slice(0, -1)); }
    if (/ing$/.test(w) && w.length > 4) { out.push(w.slice(0, -3), w.slice(0, -3) + 'e'); }
    if (/ly$/.test(w) && w.length > 4) out.push(w.slice(0, -2));
    if (/ily$/.test(w) && w.length > 4) out.push(w.slice(0, -3) + 'y');   // happily → happy
    if (/iest$/.test(w) && w.length > 5) out.push(w.slice(0, -4) + 'y');  // happiest → happy
    if (/ier$/.test(w) && w.length > 4) out.push(w.slice(0, -3) + 'y');   // happier → happy
    if (/est$/.test(w) && w.length > 4) out.push(w.slice(0, -3), w.slice(0, -2));
    if (/er$/.test(w) && w.length > 4) out.push(w.slice(0, -2), w.slice(0, -1));
    var dbl = w.replace(/([bdgklmnprt])\1(ed|ing)$/, '$1');
    if (dbl !== w) out.push(dbl);
    return out;
  }

  function wordLevel(w) {
    var forms = baseForms(w), best = null;
    for (var i = 0; i < forms.length; i++) {
      var lv = LEVEL[forms[i]];
      if (lv && (best === null || RANK[lv] < RANK[best])) best = lv;
    }
    return best || 'C1';
  }

  /* 자막에서 중급 이상 단어 뽑기. minLevel 이상만 남깁니다. */
  function extractWords(cues, minLevel) {
    var min = RANK[minLevel] != null ? RANK[minLevel] : RANK.B2;
    var info = {};

    cues.forEach(function (c, i) {
      var toks = c.x.match(/[A-Za-z][A-Za-z'-]*/g) || [];
      toks.forEach(function (tok, ti) {
        var low = tok.toLowerCase().replace(/^'+|'+$/g, '');

        /* 축약형은 앞말로 되돌립니다: don't→do, didn't→did, won't→will, it's→it */
        var neg = low.match(/^([a-z]+)n't$/);
        if (neg) {
          low = neg[1] === 'wo' ? 'will' : neg[1] === 'ca' ? 'can' : neg[1];
        } else {
          low = low.replace(/'(s|re|ve|ll|d|m)$/, '');
        }
        if (low.indexOf("'") >= 0) return;      // 남은 아포스트로피는 단어로 안 봄

        if (low.length < 4) return;
        if (!/^[a-z][a-z-]*$/.test(low)) return;
        if (!info[low]) info[low] = { w: low, n: 0, cap: 0, mid: 0, first: i, hits: [] };
        var f = info[low];
        f.n++;
        if (f.hits[f.hits.length - 1] !== i) f.hits.push(i);   /* 나온 자막 줄 모두 기록 */
        if (/^[A-Z]/.test(tok)) { f.cap++; if (ti > 0) f.mid++; }
      });
    });

    var out = [];
    Object.keys(info).forEach(function (k) {
      var f = info[k];
      /* 문장 중간에서도 대문자로 자주 나오면 고유명사 */
      if (f.mid / f.n > 0.5) return;
      var lv = wordLevel(k);
      /* 사전에 없는데 늘 대문자로만 나오면 이름·지명으로 봄 (Stanford, Pixar …) */
      if (lv === 'C1' && f.cap === f.n) return;
      if (RANK[lv] < min) return;
      out.push({ word: k, level: lv, n: f.n, cue: f.first, hits: f.hits });
    });

    return out.sort(function (a, b) {
      return RANK[b.level] - RANK[a.level] || b.n - a.n || a.word.localeCompare(b.word);
    }).slice(0, 200);
  }

  /* ==========================================================================
     시제 추출
     문장을 정규식으로 훑어 시제를 판별합니다. 한 자막에 여러 절이 있으면
     해당하는 시제가 모두 잡힙니다.
     ========================================================================== */

  /* 불규칙 과거분사 — 완료·수동 판별에 필요 */
  var PP = ('been done gone seen taken given known thought told found made said come become '
  + 'written spoken broken chosen driven eaten fallen forgotten grown hidden held kept left '
  + 'lost meant met paid put read run sat sent shown shut sold sung stood stolen taught torn '
  + 'understood worn won begun drunk swum flown blown thrown drawn brought bought caught '
  + 'fought sought felt slept crept dealt built burnt learnt spent lent bent heard led fed '
  + 'gotten got had lain laid risen ridden rung sunk struck stuck swept wept wound bitten '
  + 'shot beaten hung sworn dug spun split spread set cut hurt let quit').split(' ');
  var PPSET = {};
  PP.forEach(function (w) { PPSET[w] = 1; });
  function isPP(w) { return !!PPSET[w] || /ed$/.test(w); }

  /* 불규칙 과거형 — 단순과거 판별용 */
  var PAST = ('was were went took came saw said made got gave knew thought told found left '
  + 'felt kept held brought bought caught taught ran sat stood spoke wrote drove ate fell '
  + 'flew grew began broke chose drank drew threw wore won sent spent built met paid read '
  + 'heard led lost sold sang swam rose rode rang sank struck stuck swept wept lay laid hid '
  + 'bit shot understood became did had put let cut set cost hurt beat dug hung swore spun '
  + 'slept crept dealt fought sought meant lent bent fed bled quit').split(' ');
  var PASTSET = {};
  PAST.forEach(function (w) { PASTSET[w] = 1; });

  var BE_PRES = 'is|are|am';
  var BE_PAST = 'was|were';
  var HAVE_PRES = 'has|have';

  /* 조동사와 분사 사이에 끼는 부사: "have ever made", "was never told" */
  var ADV = '(?:\\s+(?:ever|never|already|just|always|recently|finally|actually|really|'
    + 'still|not|barely|hardly|often|usually|probably|certainly|definitely|only|even|'
    + 'nearly|almost|simply|clearly|largely|widely|generally))*';

  /* 판별 순서가 중요합니다 — 긴 형태(완료진행)를 먼저 봅니다. */
  var TENSES = [
    ['future_perf_prog',  '미래완료진행',
      new RegExp('\\b(?:will|shall)' + ADV + '\\s+have' + ADV + '\\s+been\\s+\\w+ing\\b')],
    ['future_perf',       '미래완료',
      new RegExp('\\b(?:will|shall)' + ADV + '\\s+have' + ADV + '\\s+(\\w+)\\b'), 1],
    ['future_prog',       '미래진행',
      new RegExp('\\b(?:will|shall)' + ADV + '\\s+be\\s+\\w+ing\\b')],
    ['future',            '미래',
      new RegExp('\\b(?:will|shall)' + ADV + '\\s+\\w+|\\b(?:' + BE_PRES
        + ')\\s+going\\s+to\\s+\\w+')],
    ['past_perf_prog',    '과거완료진행',
      new RegExp('\\bhad' + ADV + '\\s+been\\s+\\w+ing\\b')],
    ['past_perf',         '과거완료',
      new RegExp('\\bhad' + ADV + '\\s+(\\w+)\\b'), 1],
    ['pres_perf_prog',    '현재완료진행',
      new RegExp('\\b(?:' + HAVE_PRES + ')' + ADV + '\\s+been\\s+\\w+ing\\b')],
    ['pres_perf',         '현재완료',
      new RegExp('\\b(?:' + HAVE_PRES + ')' + ADV + '\\s+(\\w+)\\b'), 1],
    ['past_prog',         '과거진행',
      new RegExp('\\b(?:' + BE_PAST + ')' + ADV + '\\s+\\w+ing\\b')],
    ['pres_prog',         '현재진행',
      new RegExp('\\b(?:' + BE_PRES + ')' + ADV + '\\s+\\w+ing\\b')],
    ['passive',           '수동태',
      new RegExp('\\b(?:' + BE_PRES + '|' + BE_PAST + '|be|been|being)' + ADV
        + '\\s+(\\w+)\\b'), 1],
    ['modal',             '조동사',
      /\b(?:would|could|should|might|may|must|can)\s+(?:not\s+)?\w+/],
    ['past',              '과거',         null],
    ['present',           '현재',         null]
  ];

  var TENSE_LABEL = {};
  TENSES.forEach(function (t) { TENSE_LABEL[t[0]] = t[1]; });

  function detectTenses(text) {
    var s = ' ' + expand(text.toLowerCase())
                    .replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ') + ' ';
    var found = {};

    TENSES.forEach(function (t) {
      var re = t[2];
      if (!re) return;
      var m = s.match(re);
      if (!m) return;
      /* 캡처가 있는 규칙(완료·수동)은 뒤에 오는 말이 과거분사여야 성립 */
      if (t[3] != null) {
        var w = m[t[3]];
        if (!w || !isPP(w) || /ing$/.test(w)) return;
      }
      found[t[0]] = 1;
    });

    /* 단순과거: 완료·수동으로 이미 설명된 형태는 제외하고 과거형 동사를 찾음 */
    if (!found.past_perf && !found.past_perf_prog) {
      var toks = s.trim().split(' ');
      for (var i = 0; i < toks.length; i++) {
        var w = toks[i], prev = toks[i - 1] || '';
        if (/^(has|have|had|is|are|am|was|were|be|been|being|will|would|could|should|might|may|must|can|to)$/.test(prev)) continue;
        if (PASTSET[w] || (/ed$/.test(w) && w.length > 3)) { found.past = 1; break; }
      }
    }
    /* 현재: 다른 시제가 하나도 없거나, 현재형 be/have 가 단독으로 쓰인 경우 */
    if (!Object.keys(found).length) found.present = 1;
    else if (!found.past && !found.future &&
             new RegExp('\\b(?:' + BE_PRES + '|' + HAVE_PRES + '|do|does)\\b').test(s) &&
             !found.pres_perf && !found.pres_prog) found.present = 1;

    return Object.keys(found);
  }

  /* 시제별로 해당 자막 줄 모으기 */
  function extractTenses(cues) {
    var by = {};
    cues.forEach(function (c, i) {
      detectTenses(c.x).forEach(function (t) {
        (by[t] = by[t] || []).push(i);
      });
    });
    return by;
  }

  /* ---------------------------------------------------------- CSV 내보내기 */
  function csvCell(v) {
    v = String(v == null ? '' : v);
    return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }

  function toCSV(header, rows) {
    /* BOM: Excel 에서 한글이 깨지지 않도록 */
    return '﻿' + [header].concat(rows).map(function (r) {
      return r.map(csvCell).join(',');
    }).join('\r\n') + '\r\n';
  }

  function download(name, text) {
    var blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 100);
  }

  /* ------------------------------------------------------------- 상태 */
  var player = null, timer = null, ready = false;
  var rawCues = [], cues = [], nodes = [], cur = -1;
  var merge = true, ab = null, abArm = false;
  var root = null, curVid = null;

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

  /* 자막 시각으로 점프할 때 앞에 두는 여백(초).
     자막 타임스탬프가 실제 발화보다 늦게 찍히는 데다 유튜브가 키프레임 단위로
     점프해서, 그대로 이동하면 문장 첫머리가 잘립니다. */
  function lead() {
    var v = parseFloat(store.get('lead', '2'));
    return isNaN(v) ? 2 : v;
  }

  function seekCue(sec, play) {
    if (!player || !player.seekTo) return;
    player.seekTo(Math.max(0, sec - lead()), true);
    if (play !== false) player.playVideo();
  }

  function loadVideo(id) {
    if (!ready || !id) return;
    var old = q('.eng-err');
    if (old) old.remove();
    curVid = id;
    player.loadVideoById(id);
    autoFetchSubs(id);
  }

  /* ---------------------------------------------- 자막 자동 추출
     같은 주소에서 subserver.py 가 돌고 있으면 yt-dlp 로 자막을 뽑아 바로 넣어줍니다.
     서버가 없으면(예: GitHub Pages 그대로 접속) 조용히 드래그 방식으로 돌아갑니다.
        200 → VTT 본문
        204 → 이 영상에 영어 자막 없음
        503 → 서버는 있는데 yt-dlp 가 없음
        그 외/실패 → 로컬 서버가 없음                                        */
  var fetching = false;

  function autoFetchSubs(id) {
    if (fetching) return;
    var st = q('#eng-status');
    if (!st) return;
    fetching = true;
    st.textContent = '자막 찾는 중…';

    fetch('api/subs?v=' + encodeURIComponent(id), { cache: 'no-store' })
      .then(function (r) {
        if (r.status === 204) throw new Error('no-subs');
        if (r.status === 503) throw new Error('no-ytdlp');
        if (!r.ok) throw new Error('no-server');
        return r.text();
      })
      .then(function (t) {
        fetching = false;
        useSubs(t);                       // 성공 → 상태줄은 useSubs 가 갱신
      })
      .catch(function (e) {
        fetching = false;
        st.textContent =
          e.message === 'no-subs'  ? '이 영상에는 영어 자막이 없습니다.' :
          e.message === 'no-ytdlp' ? 'yt-dlp 가 설치되어 있지 않습니다 (brew install yt-dlp)' :
                                     '자막 파일을 드래그하세요 — 자동 추출은 로컬 서버에서만 됩니다';
      });
  }

  /* ----------------------------------------------------------- 싱크 */
  function tick() {
    if (!ready || !cues.length || !player || !player.getCurrentTime) return;
    var t = player.getCurrentTime();

    if (ab && t >= ab.e) { seekCue(ab.s, false); return; }

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

  /* 자막 칸이 따로 스크롤될 때는 scrollTop 을 직접 계산합니다.
     scrollIntoView({block:'center'}) 는 첫 줄을 굳이 가운데로 보내려고 위로 밀어
     맨 앞 자막이 잘려 보였고, 창까지 함께 스크롤시켰습니다. */
  function autoScroll(n) {
    var box = q('#eng-tx');
    var inner = box && box.scrollHeight > box.clientHeight + 4 &&
                getComputedStyle(box).overflowY === 'auto';
    var nr = n.getBoundingClientRect();

    if (inner) {
      var br = box.getBoundingClientRect();
      var pad = br.height * 0.2;
      if (nr.top < br.top + pad || nr.bottom > br.bottom - pad) {
        var target = box.scrollTop + (nr.top - br.top) - (br.height / 2 - nr.height / 2);
        /* 0 아래로는 내려가지 않으므로 첫 줄이 잘리지 않습니다 */
        target = Math.max(0, Math.min(target, box.scrollHeight - box.clientHeight));
        if (box.scrollTo) box.scrollTo({ top: target, behavior: 'smooth' });
        else box.scrollTop = target;
      }
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
    syncHeight();
  }

  /* 자막 칸이 화면 아래 끝까지만 차지하도록 실제 높이를 계산.
     → 페이지 자체는 스크롤되지 않고, 자막만 자기 영역에서 움직입니다. */
  function syncHeight() {
    if (!root) return;
    var tx = q('#eng-tx');
    if (!tx) return;
    var top = tx.getBoundingClientRect().top;
    var h = Math.max(140, window.innerHeight - top - 14);
    root.style.setProperty('--engtxh', Math.round(h) + 'px');
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
        seekCue(c.s);
      });

      box.appendChild(d);
      nodes.push(d);
    });

    box.scrollTop = 0;          /* 새 자막은 항상 맨 앞부터 보이도록 */

    q('#eng-status').textContent =
      cues.length + '개 자막 · ' + S(cues.length ? cues[cues.length - 1].e : 0);
    buildPhrases();
    buildWords();
    buildTenses();
    requestAnimationFrame(syncHeight);
  }

  function setAB(i) {
    ab = (ab && ab.i0 === i) ? null : { i0: i, i1: i, s: cues[i].s, e: cues[i].e };
    abArm = false;
    paintAB();
    if (ab) { seekCue(ab.s); }
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
    if (!box) return;
    box.innerHTML = list.length ? '' : '<div class="eng-note">추출된 구문이 없습니다.</div>';
    list.forEach(function (f) {
      var ex = BOOK[f.label] || [];
      box.appendChild(makeCard('ph', f.label,
        '<b>' + esch(f.label) + '</b> <span style="color:var(--muted)">×' + f.n + '</span>',
        f.hits,
        ex.length ? '<div class="eng-ex">' + ex.map(function (s) {
          return '<div>· ' + esch(s) + '</div>';
        }).join('') + '</div>' : '',
        true, dispRe(f.label)));
    });
    updateCount('ph');
  }

  /* ------------------------------------------------------- 단어 패널 */
  function buildWords() {
    if (!root) return;
    var lvl = q('#eng-lvl') ? q('#eng-lvl').value : 'B2';
    var list = extractWords(cues, lvl);
    var box = q('#eng-wdlist');
    if (!box) return;

    box.innerHTML = list.length ? ''
      : '<div class="eng-note">해당 난이도의 단어가 없습니다. 기준을 낮춰보세요.</div>';

    list.forEach(function (f) {
      box.appendChild(makeCard('wd', f.word,
        '<span class="eng-lv' + (f.level === 'C1' ? ' c1' : '') + '">' + f.level + '</span>'
        + '<b>' + esch(f.word) + '</b> '
        + '<span style="color:var(--muted)">×' + f.n + '</span>',
        f.hits && f.hits.length ? f.hits : f.cue, '', true,
        new RegExp('\\b' + esc(f.word) + '\\b', 'gi')));
    });

    updateCount('wd');
  }

  /* ------------------------------------------------------- 시제 패널 */
  var tenseIdx = {};

  function buildTenses() {
    if (!root) return;
    tenseIdx = extractTenses(cues);

    /* 자막에 실제로 나온 시제만, 정의 순서대로 셀렉트에 채웁니다 */
    var sel = q('#eng-tn');
    if (!sel) return;
    var prev = sel.value;
    var opts = TENSES.filter(function (t) { return (tenseIdx[t[0]] || []).length; })
      .map(function (t) {
        return '<option value="' + t[0] + '">' + t[1]
             + ' (' + tenseIdx[t[0]].length + ')</option>';
      });
    sel.innerHTML = opts.length ? opts.join('') : '<option value="">— 없음 —</option>';
    if (prev && tenseIdx[prev]) sel.value = prev;

    renderTenseList();
  }

  function renderTenseList() {
    var box = q('#eng-tnlist');
    if (!box) return;
    var key = q('#eng-tn').value;
    var hits = tenseIdx[key] || [];
    box.innerHTML = hits.length ? ''
      : '<div class="eng-note">해당 시제의 문장이 없습니다.</div>';

    var hl = TENSE_HL[key];
    hits.forEach(function (i) {
      box.appendChild(makeCard('tn', String(i),
        '<span class="eng-t">' + S(cues[i].s) + '</span> '
        + '<span class="eng-sent">' + snippet(cues[i].x, hl) + '</span>',
        i, '', false));
    });
    updateCount('tn');
  }

  /* ------------------------------------------------------- CSV 내보내기 */
  function exportCSV() {
    if (!cues.length) { alert('먼저 자막을 불러오세요.'); return; }
    var tag = (curVid || 'subtitle');
    var tab = root.querySelector('.eng-tabs .on').getAttribute('data-tab');
    var keep = {};
    selectedKeys(tab).forEach(function (k) { keep[k] = 1; });

    if (!Object.keys(keep).length) {
      alert('내보낼 항목을 하나 이상 체크하세요.');
      return;
    }

    if (tab === 'tn') {
      var key = q('#eng-tn').value;
      var label = TENSE_LABEL[key] || key;
      var trows = (tenseIdx[key] || [])
        .filter(function (i) { return keep[String(i)]; })
        .map(function (i) {
          return [label, S(cues[i].s), cues[i].s.toFixed(2), cues[i].x,
                  detectTenses(cues[i].x).map(function (t) { return TENSE_LABEL[t]; }).join(' / ')];
        });
      download('tense_' + tag + '_' + key + '.csv',
        toCSV(['tense', 'timestamp', 'seconds', 'sentence', 'all_tenses_in_line'], trows));
      return;
    }

    if (tab === 'wd') {
      var lvl = q('#eng-lvl').value;
      var rows = extractWords(cues, lvl)
        .filter(function (f) { return keep[f.word]; })
        .map(function (f) {
          return [f.word, f.level, f.n, S(cues[f.cue].s),
                  cues[f.cue].s.toFixed(2), cues[f.cue].x];
        });
      download('words_' + tag + '_' + lvl + '.csv',
        toCSV(['word', 'level', 'count', 'timestamp', 'seconds', 'context'], rows));
    } else {
      var prs = extractPhrases(cues)
        .filter(function (f) { return keep[f.label]; })
        .map(function (f) {
          var i = f.hits[0];
          var ex = BOOK[f.label] || [];
          return [f.label, f.n, S(cues[i].s), cues[i].s.toFixed(2),
                  cues[i].x, ex[0] || '', ex[1] || ''];
        });
      download('phrases_' + tag + '.csv',
        toCSV(['phrase', 'count', 'timestamp', 'seconds', 'context', 'example_1', 'example_2'],
              prs));
    }
  }

  /* ==========================================================================
     추출된 부분 하이라이트
     원문(자막 그대로)에서 일치 구간을 찾아 <mark> 로 감싸고,
     그 주변만 잘라 보여줍니다. 앞뒤로 2줄 정도면 충분하다는 요청에 맞춰
     일치 지점을 가운데 두고 창을 잡습니다.
     ========================================================================== */

  /* 원문에는 축약형이 그대로 있으므로 be·have 는 '(s|re|m|ve|ll) 형태도 허용 */
  var CONTR = "['’](?:s|re|m|ve|ll|d)";

  function dispRe(key) {
    var w = key.split(' ');
    var rest = w.slice(1).map(esc).join('\\s+');
    if (!rest) return new RegExp('\\b' + esc(w[0]) + '\\b', 'gi');

    var headAlt;
    if (NON_VERB_HEAD[w[0]]) {
      headAlt = '\\b' + esc(w[0]) + '\\b';
    } else {
      headAlt = '(?:\\b(?:' + forms(w[0]).map(esc).join('|') + ')\\b|' + CONTR + ')';
    }
    /* 머리(be동사 등)는 없을 수도 있게 — 최소한 나머지 구문은 표시됩니다.
       분리형이면 목적어까지 통째로 하이라이트됩니다 ("looked it up") */
    var sep = (!NON_VERB_HEAD[w[0]] && w.length === 2 && SEP_PARTS[w[1]])
      ? '(?:' + OBJ + '\\s+)?' : '';
    return new RegExp('(?:' + headAlt + "\\s*(?:n['’]?t)?" + MID + '\\s+)?' + sep + rest, 'gi');
  }

  var PPRE = '(?:\\w+ed|' + PP.join('|') + ')';
  var HADV = "(?:\\s+(?:not|n['’]t|ever|never|already|just|really|still|always|recently|"
    + 'finally|actually|only|even|probably|certainly|definitely))?';

  var TENSE_HL = {
    future_perf_prog: new RegExp("\\b(?:will|shall)\\s+have\\s+been\\s+\\w+ing\\b|" + CONTR + "l?\\s+have\\s+been\\s+\\w+ing\\b", 'gi'),
    future_perf:      new RegExp('\\b(?:will|shall)' + HADV + '\\s+have' + HADV + '\\s+' + PPRE + '\\b', 'gi'),
    future_prog:      /\b(?:will|shall)\s+be\s+\w+ing\b/gi,
    future:           new RegExp("\\b(?:will|shall|won['’]t)" + HADV + '\\s+\\w+|\\b(?:is|are|am)\\s+going\\s+to\\s+\\w+|' + CONTR + '\\s+going\\s+to\\s+\\w+', 'gi'),
    past_perf_prog:   /\bhad\s+been\s+\w+ing\b/gi,
    past_perf:        new RegExp('\\bhad' + HADV + '\\s+' + PPRE + '\\b', 'gi'),
    pres_perf_prog:   new RegExp('\\b(?:has|have)\\s+been\\s+\\w+ing\\b|' + CONTR + '\\s+been\\s+\\w+ing\\b', 'gi'),
    pres_perf:        new RegExp('\\b(?:has|have)' + HADV + '\\s+' + PPRE + '\\b|' + CONTR + HADV + '\\s+' + PPRE + '\\b', 'gi'),
    past_prog:        /\b(?:was|were)\s+(?:\w+\s+)?\w+ing\b/gi,
    pres_prog:        new RegExp('\\b(?:is|are|am)\\s+(?:\\w+\\s+)?\\w+ing\\b|' + CONTR + '\\s+\\w+ing\\b', 'gi'),
    passive:          new RegExp('\\b(?:is|are|am|was|were|be|been|being)' + HADV + '\\s+' + PPRE + '\\b', 'gi'),
    modal:            /\b(?:would|could|should|might|may|must|can)\s+(?:not\s+)?\w+/gi,
    past:             null,
    present:          null
  };

  /* 일치 지점을 가운데 두고 앞뒤를 잘라 하이라이트한 HTML 을 돌려줍니다 */
  function snippet(text, re, before, after) {
    before = before == null ? 55 : before;
    after = after == null ? 85 : after;

    var m = null;
    if (re) { re.lastIndex = 0; m = re.exec(text); }
    if (!m || !m[0]) {
      return esch(text.length > 150 ? text.slice(0, 150) + '…' : text);
    }

    var hitS = m.index, hitE = m.index + m[0].length;
    var s = Math.max(0, hitS - before);
    var e = Math.min(text.length, hitE + after);

    /* 단어 중간에서 잘리지 않도록 공백까지 밀어줍니다 */
    if (s > 0) {
      var sp = text.indexOf(' ', s);
      if (sp > -1 && sp < hitS) s = sp + 1;
    }
    if (e < text.length) {
      var sp2 = text.lastIndexOf(' ', e);
      if (sp2 > hitE) e = sp2;
    }

    return (s > 0 ? '… ' : '')
      + esch(text.slice(s, hitS))
      + '<mark class="eng-hl">' + esch(text.slice(hitS, hitE)) + '</mark>'
      + esch(text.slice(hitE, e))
      + (e < text.length ? ' …' : '');
  }

  /* ------------------------------------------------- 항목 선택 (구문·단어 공용) */
  function listBox(pane) {
    return q(pane === 'wd' ? '#eng-wdlist' : pane === 'tn' ? '#eng-tnlist' : '#eng-phlist');
  }

  function picks(pane) {
    var box = listBox(pane);
    return box ? Array.prototype.slice.call(box.querySelectorAll('input[type=checkbox]')) : [];
  }

  function selectedKeys(pane) {
    return picks(pane).filter(function (c) { return c.checked; })
                      .map(function (c) { return c.getAttribute('data-k'); });
  }

  function updateCount(pane) {
    var all = picks(pane), on = all.filter(function (c) { return c.checked; }).length;
    var el = q('#eng-cnt-' + pane);
    if (el) el.textContent = all.length ? '선택 ' + on + ' / ' + all.length : '';
    all.forEach(function (c) {
      c.closest('.eng-card').classList.toggle('off', !c.checked);
    });
    var tab = q('#eng-tab-' + pane);
    var name = pane === 'wd' ? '단어 추출' : pane === 'tn' ? '시제 추출' : '구문 추출';
    if (tab) {
      tab.innerHTML = esch(name)
        + (all.length ? ' <span class="eng-n">' + on + '</span>' : '');
    }
  }

  function setAll(pane, on) {
    picks(pane).forEach(function (c) { c.checked = on; });
    updateCount(pane);
  }

  /* 카드 한 장 만들기.
     showSrc=false 면 출처줄을 생략합니다 — 시제 탭처럼 제목이 이미 문장인 경우,
     같은 문장이 두 번 나오는 것을 막습니다. */
  function makeCard(pane, key, titleHTML, cueIdx, extraHTML, showSrc, hlRe) {
    /* cueIdx 는 자막 줄 번호 하나 또는 여러 개.
       여러 번 나오는 구문·단어는 카드 높이를 늘리지 않고 제자리에서 넘겨 봅니다. */
    var idxs = Array.isArray(cueIdx) ? cueIdx : [cueIdx];
    var pos = 0;

    var d = document.createElement('div');
    d.className = 'eng-card';
    d.innerHTML =
      '<label class="eng-pick"><input type="checkbox" checked data-k="' + esch(key) + '">'
      + '<span>' + titleHTML + '</span></label>'
      + (showSrc === false ? ''
          : '<div class="eng-src"></div>'
            + (idxs.length > 1
                ? '<div class="eng-pager">'
                  + '<button class="eng-pg" data-d="-1" title="이전">‹</button>'
                  + '<span class="eng-pgn"></span>'
                  + '<button class="eng-pg" data-d="1" title="다음">›</button>'
                  + '</div>'
                : ''))
      + (extraHTML || '');

    function paint() {
      var i = idxs[pos];
      var src = d.querySelector('.eng-src');
      if (src) src.innerHTML = '▸ ' + S(cues[i].s) + ' ' + snippet(cues[i].x, hlRe);
      var n = d.querySelector('.eng-pgn');
      if (n) n.textContent = (pos + 1) + ' / ' + idxs.length;
      Array.prototype.forEach.call(d.querySelectorAll('.eng-pg'), function (b) {
        var dir = +b.getAttribute('data-d');
        b.disabled = dir < 0 ? pos === 0 : pos === idxs.length - 1;
      });
    }
    if (showSrc !== false) paint();

    d.querySelector('input').addEventListener('change', function () { updateCount(pane); });

    Array.prototype.forEach.call(d.querySelectorAll('.eng-pg'), function (b) {
      b.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        pos = Math.min(idxs.length - 1, Math.max(0, pos + (+b.getAttribute('data-d'))));
        paint();
      });
    });

    function jump(e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      var cueIdx = idxs[pos];
      seekCue(cues[cueIdx].s);
      if (nodes[cueIdx]) nodes[cueIdx].scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    /* 구문·단어 탭과 동일하게, 스크립트를 클릭하면 그 장면으로 이동합니다.
       (.eng-sent 는 label 안에 있으므로 jump 에서 기본동작을 막아
        체크박스가 같이 토글되지 않도록 합니다) */
    Array.prototype.forEach.call(
      d.querySelectorAll('.eng-src, .eng-t, .eng-sent'),
      function (el) { el.addEventListener('click', jump); });
    return d;
  }

  function showTab(tab) {
    Array.prototype.forEach.call(root.querySelectorAll('.eng-tabs .eng-btn'), function (b) {
      b.classList.toggle('on', b.getAttribute('data-tab') === tab);
    });
    q('#eng-pane-ph').hidden = tab !== 'ph';
    q('#eng-pane-wd').hidden = tab !== 'wd';
    q('#eng-pane-tn').hidden = tab !== 'tn';
    store.set('tab', tab);
  }

  function openPanel(tab) {
    showTab(tab);
    q('#eng-ph').classList.add('open');
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
  +     '<button class="eng-btn" id="eng-play" title="재생 / 일시정지 (Space)">▶︎❚❚</button>'
  +     '<button class="eng-btn" data-seek="-5" title="5초 뒤로 (←)">↺5</button>'
  +     '<button class="eng-btn" data-seek="5" title="5초 앞으로 (→)">5↻</button>'
  +     '<span class="eng-selwrap"><select class="eng-sel" id="eng-rate" title="재생 속도">'
  +       '<option value="0.5">0.5x</option><option value="0.75">0.75x</option>'
  +       '<option value="1" selected>1x</option><option value="1.25">1.25x</option>'
  +       '<option value="1.5">1.5x</option></select></span>'
  +     '<span class="eng-sep"></span>'
  +     '<button class="eng-btn" id="eng-ab" title="한 문장 무한 반복 (r)">A-B 반복</button>'
  +     '<button class="eng-btn" id="eng-hide" title="받아쓰기 연습 (h)">자막 가리기</button>'
  +     '<span class="eng-sep"></span>'
  /* 펼침 메뉴 두 개는 나란히 — 사이에 다른 것이 끼지 않게 */
  +     '<button class="eng-btn" id="eng-extract" title="구문·단어·시제 추출">'
  +       '추출<span class="eng-caret">▾</span></button>'
  +     '<span class="eng-menu">'
  +       '<button class="eng-btn" id="eng-setbtn" title="표시 설정">'
  +         '설정<span class="eng-caret">▾</span></button>'
  /* ---- 설정 팝업 ---- */
  +     '<div class="eng-pop" id="eng-pop" hidden>'
  +       '<div class="eng-row"><span>자막 글자 크기</span>'
  +         '<button class="eng-btn" data-fs="-1">A−</button>'
  +         '<button class="eng-btn" data-fs="1">A+</button></div>'
  +       '<div class="eng-row"><span>자막 클릭 시 시작점</span>'
  +         '<span class="eng-selwrap"><select class="eng-sel" id="eng-lead">'
  +           '<option value="0">그 지점부터</option>'
  +           '<option value="1">1초 앞부터</option>'
  +           '<option value="2" selected>2초 앞부터</option>'
  +           '<option value="3">3초 앞부터</option>'
  +           '<option value="4">4초 앞부터</option>'
  +         '</select></span></div>'
  +       '<div class="eng-row"><span>영상 크기</span>'
  +         '<span class="eng-selwrap"><select class="eng-sel" id="eng-size">'
  +           '<option value="s">작게</option>'
  +           '<option value="m" selected>보통</option>'
  +           '<option value="l">크게</option>'
  +         '</select></span></div>'
  +       '<div class="eng-row"><span>영상·자막 배치</span>'
  +         '<span class="eng-selwrap"><select class="eng-sel" id="eng-layout">'
  +           '<option value="auto" selected>자동</option>'
  +           '<option value="split">좌우 분할</option>'
  +           '<option value="stack">위아래</option>'
  +         '</select></span></div>'
  +       '<div class="eng-row"><span>단어 클릭 시 사전</span>'
  +         '<span class="eng-selwrap"><select class="eng-sel" id="eng-dict">'
  +           '<option value="https://en.dictionary.cambridge.org/dictionary/english-korean/">Cambridge</option>'
  +           '<option value="https://dict.naver.com/dict.search?query=">네이버</option>'
  +           '<option value="https://www.merriam-webster.com/dictionary/">M-W</option>'
  +           '<option value="https://www.ldoceonline.com/dictionary/">Longman</option>'
  +         '</select></span></div>'
  +       '<div class="eng-row"><span>잘린 자막 문장으로 합치기</span>'
  +         '<button class="eng-btn on" id="eng-merge">켬</button></div>'
  +     '</div>'
  +     '</span>'
  +     '<span class="sp"></span>'
  +     '<span class="eng-chip" id="eng-status">자막을 불러오세요</span>'
  +   '</div>'
  + '</div>'
  + '<div id="eng-tx" class="eng-tx">'
  +   '<div class="eng-empty">'
  +     '유튜브 URL 을 넣고 <b>영상 로드</b> — 자막 파일(<b>.srt</b>/<b>.vtt</b>)을 여기에 드래그해도 됩니다.<br>'
  +     '<span style="font-size:.85em">저장소 폴더에서 <code>python3 subserver.py</code> 를 켜고 '
  +     '<b>localhost:8787</b> 로 접속하면 자막이 <b>자동으로</b> 붙습니다.</span>'
  +   '</div>'
  + '</div>'
  + '</div>'   /* .eng-body 닫기 */
  + '<div class="eng-ph" id="eng-ph">'
  +   '<div class="eng-pophead"><b>추출</b>'
  +     '<button class="eng-btn" id="eng-phclose">닫기</button></div>'
  +   '<div class="eng-tabs">'
  +     '<button class="eng-btn on" id="eng-tab-ph" data-tab="ph">구문 추출</button>'
  +     '<button class="eng-btn" id="eng-tab-wd" data-tab="wd">단어 추출</button>'
  +     '<button class="eng-btn" id="eng-tab-tn" data-tab="tn">시제 추출</button>'
  +   '</div>'
  /* --- 구문 탭 --- */
  +   '<div id="eng-pane-ph">'
  +     '<div class="eng-note">체크한 항목만 CSV 로 나갑니다. '
  +       '시간표시를 클릭하면 해당 장면으로 이동합니다.</div>'
  +     '<div class="eng-bar" style="padding:0 0 8px">'
  +       '<button class="eng-btn" data-all="ph">전체 선택</button>'
  +       '<button class="eng-btn" data-none="ph">전체 해제</button>'
  +       '<span class="eng-cnt" id="eng-cnt-ph"></span>'
  +     '</div>'
  +     '<div id="eng-phlist"></div>'
  +   '</div>'
  /* --- 단어 탭 --- */
  +   '<div id="eng-pane-wd" hidden>'
  +     '<div class="eng-bar" style="padding:0 0 8px">'
  +       '<span class="eng-chip">난이도</span>'
  +       '<span class="eng-selwrap"><select class="eng-sel" id="eng-lvl" title="이 수준 이상만 추출">'
  +         '<option value="B1">B1 이상 (중급)</option>'
  +         '<option value="B2" selected>B2 이상 (중상급)</option>'
  +         '<option value="C1">C1만 (고급)</option>'
  +       '</select></span>'
  +     '</div>'
  +     '<div class="eng-note">기초 어휘(A1·A2)와 고유명사는 제외합니다. '
  +       '레벨은 빈도 기반 <b>추정치</b>이고, 체크한 항목만 CSV 로 나갑니다.</div>'
  +     '<div class="eng-bar" style="padding:0 0 8px">'
  +       '<button class="eng-btn" data-all="wd">전체 선택</button>'
  +       '<button class="eng-btn" data-none="wd">전체 해제</button>'
  +       '<span class="eng-cnt" id="eng-cnt-wd"></span>'
  +     '</div>'
  +     '<div id="eng-wdlist"></div>'
  +   '</div>'
  /* --- 시제 탭 --- */
  +   '<div id="eng-pane-tn" hidden>'
  +     '<div class="eng-bar" style="padding:0 0 8px">'
  +       '<span class="eng-chip">시제</span>'
  +       '<span class="eng-selwrap"><select class="eng-sel" id="eng-tn"></select></span>'
  +     '</div>'
  +     '<div class="eng-note">해당 시제가 쓰인 문장만 모아 보여줍니다. '
  +       '문장을 클릭하면 그 장면으로 이동합니다.</div>'
  +     '<div class="eng-bar" style="padding:0 0 8px">'
  +       '<button class="eng-btn" data-all="tn">전체 선택</button>'
  +       '<button class="eng-btn" data-none="tn">전체 해제</button>'
  +       '<span class="eng-cnt" id="eng-cnt-tn"></span>'
  +     '</div>'
  +     '<div id="eng-tnlist"></div>'
  +   '</div>'
  +   '<div class="eng-note" style="margin-top:12px;padding-top:10px;'
  +     'border-top:1px solid var(--border)">내보내기</div>'
  +   '<div class="eng-bar" style="padding:0">'
  +     '<button class="eng-btn" id="eng-csv">CSV 내려받기</button>'
  +     '<button class="eng-btn" id="eng-prompt">자막 + 프롬프트 복사</button>'
  +   '</div>'
  +   '<div class="eng-note">CSV 는 구문·단어가 각각 별도 파일로 나옵니다. '
  +     '프롬프트는 Claude 에 붙여넣으면 해설과 예문을 받을 수 있습니다.</div>'
  + '</div>'
  + '<input type="file" id="eng-fileinput" accept=".srt,.vtt,.txt" hidden>';

  var dragHandlers = [];
  var onResize = null, onDocClick = null;

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
      e.target.textContent = merge ? '켬' : '끔';
      if (rawCues.length) renderCues();
    });
    q('#eng-ab').addEventListener('click', function () {
      if (ab) { ab = null; abArm = false; }
      else abArm = !abArm;
      paintAB();
      if (abArm) q('#eng-status').textContent = '반복할 자막 줄을 클릭하세요';
    });
    /* 추출: 하나의 버튼으로 묶고, 마지막에 보던 탭으로 엽니다 */
    q('#eng-extract').addEventListener('click', function () {
      var p = q('#eng-ph');
      if (p.classList.contains('open')) p.classList.remove('open');
      else openPanel(store.get('tab', 'ph'));
    });
    q('#eng-tn').addEventListener('change', renderTenseList);

    /* 설정 팝업 */
    q('#eng-setbtn').addEventListener('click', function (e) {
      e.stopPropagation();
      var pop = q('#eng-pop');
      pop.hidden = !pop.hidden;
      q('#eng-setbtn').classList.toggle('on', !pop.hidden);
    });
    q('#eng-pop').addEventListener('click', function (e) { e.stopPropagation(); });
    onDocClick = function () {
      var pop = q('#eng-pop');
      if (pop && !pop.hidden) {
        pop.hidden = true;
        q('#eng-setbtn').classList.remove('on');
      }
    };
    document.addEventListener('click', onDocClick);
    q('#eng-phclose').addEventListener('click', function () { q('#eng-ph').classList.remove('open'); });
    Array.prototype.forEach.call(root.querySelectorAll('.eng-tabs .eng-btn'), function (b) {
      b.addEventListener('click', function () { showTab(b.getAttribute('data-tab')); });
    });
    q('#eng-lvl').addEventListener('change', function (e) {
      store.set('lvl', e.target.value);
      buildWords();
    });
    q('#eng-csv').addEventListener('click', exportCSV);
    Array.prototype.forEach.call(root.querySelectorAll('[data-all],[data-none]'), function (b) {
      var on = b.hasAttribute('data-all');
      b.addEventListener('click', function () {
        setAll(b.getAttribute(on ? 'data-all' : 'data-none'), on);
      });
    });
    q('#eng-lvl').value = store.get('lvl', 'B2');
    q('#eng-lead').value = store.get('lead', '2');
    q('#eng-lead').addEventListener('change', function (e) { store.set('lead', e.target.value); });
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
    if (onDocClick) {
      document.removeEventListener('click', onDocClick);
      onDocClick = null;
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
