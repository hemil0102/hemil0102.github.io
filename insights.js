/* ============================================================================
   insights.js — Insights 목록/글 페이지  (Harry's Insights, #/insights, #/post/…)
   ----------------------------------------------------------------------------
   콘텐츠 저장소(hemil0102/insights)의 posts.json 을 읽어
   폴더(책) → 글 구조로 목록을 그리고, 마크다운 글을 렌더링합니다.

   index.html 의 SPA 라우터가 호출합니다:
       InsightsPage.load()               posts.json 읽기 (Promise)
       InsightsPage.renderList(el)       목록 화면
       InsightsPage.renderPost(el, path) 글 화면
       InsightsPage.counts()             카테고리별 글 수
       InsightsPage.total()              전체 글 수
       InsightsPage.category()           현재 선택된 카테고리
       InsightsPage.setCategory(cat)     카테고리 선택(폴더 상태 초기화)
   ========================================================================== */
(function () {
  'use strict';

  var OWNER = 'hemil0102';
  var REPO = 'insights';
  var BRANCH = 'main';
  var ROOT = 'Topics/';                 // 이 폴더 아래 .md 파일만 글로 취급

  var API_TREE = 'https://api.github.com/repos/' + OWNER + '/' + REPO +
                 '/git/trees/' + BRANCH + '?recursive=1';
  var RAW_BASE = 'https://raw.githubusercontent.com/' + OWNER + '/' + REPO + '/' + BRANCH + '/';
  var POSTS_URL = RAW_BASE + 'posts.json'; // Actions가 미리 생성 (API 제한 없음)

  var posts = [];
  var activeCategory = 'All';
  var activeGroup = null;               // 열려 있는 하위 폴더(책 등)

  /* ---------------------------------------------------------------- 스타일 */
  var CSS = ''
  + '.list-head{color:var(--muted);font-size:.9rem;margin-bottom:14px}'
  + '.crumb-back,.crumb-link{background:none;border:none;padding:0;cursor:pointer;font:inherit;'
    + 'color:var(--logo-accent,var(--accent));font-weight:600}'
  + '.crumb-back:hover,.crumb-link:hover{text-decoration:underline}'
  + '.post-card{background:var(--card);border:1px solid var(--border);border-radius:12px;'
    + 'padding:20px 24px;margin-bottom:14px;cursor:pointer;transition:box-shadow .15s,transform .15s}'
  + '.post-card:hover{box-shadow:0 4px 16px rgba(0,0,0,.08);transform:translateY(-1px)}'
  + '.post-card h3{font-size:1.1rem;margin-bottom:6px}'
  + '.post-card .meta{font-size:.82rem;color:var(--muted);display:flex;align-items:center;'
    + 'gap:10px;flex-wrap:wrap}'
  + '.post-card .meta .date{color:var(--muted);font-variant-numeric:tabular-nums;margin-left:auto}'
  + '.post-card .meta .cnt{color:var(--muted)}'
  + '.badge{display:inline-block;background:var(--header-glass,var(--accent-light));'
    + 'color:var(--logo-accent,var(--accent));border-radius:999px;padding:2px 10px;'
    + 'font-size:.75rem;font-weight:600}'
  /* 폴더(책) 카드 */
  + '.folder-ico{display:inline-block;width:15px;height:12px;margin-right:9px;vertical-align:-1px;'
    + 'border-radius:2px 3px 3px 3px;background:var(--logo-accent,var(--accent));opacity:.85;position:relative}'
  + '.folder-ico::before{content:"";position:absolute;left:0;top:-3px;width:7px;height:3px;'
    + 'border-radius:2px 2px 0 0;background:inherit}'
  /* 글 본문 */
  + '.article-meta{display:flex;align-items:center;gap:12px;margin-bottom:18px;font-size:.85rem}'
  + '.article-meta a{color:var(--muted)}'
  + 'article{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:36px 40px}'
  + '@media(max-width:768px){article{padding:24px 20px}}'
  + 'article h1{font-size:1.7rem;margin-bottom:16px;line-height:1.35}'
  + 'article h2{font-size:1.3rem;margin:28px 0 12px;padding-bottom:6px;border-bottom:1px solid var(--border)}'
  + 'article h3{font-size:1.1rem;margin:22px 0 10px}'
  + 'article p,article ul,article ol{margin-bottom:14px}'
  + 'article ul,article ol{padding-left:24px}'
  + 'article a{color:var(--accent)}'
  + 'article blockquote{border-left:3px solid var(--accent);padding-left:16px;color:var(--muted);margin:16px 0}'
  + 'article code{background:var(--code-bg);padding:2px 6px;border-radius:4px;font-size:.88em}'
  + 'article pre{background:var(--code-bg);padding:16px;border-radius:8px;overflow-x:auto;margin-bottom:16px}'
  + 'article pre code{background:none;padding:0}'
  + 'article img{max-width:100%;border-radius:8px}'
  + 'article table{border-collapse:collapse;width:100%;margin-bottom:16px}'
  + 'article th,article td{border:1px solid var(--border);padding:8px 12px;text-align:left}'
  + 'article span[style]{border-radius:4px;padding:1px 4px}'
  + '.back-btn{background:none;border:none;color:var(--accent);cursor:pointer;'
    + 'font-size:.9rem;margin-bottom:16px;padding:0;font-family:inherit}';

  function injectCss() {
    if (document.getElementById('insights-css')) return;
    var st = document.createElement('style');
    st.id = 'insights-css';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  /* ------------------------------------------------------------------ 유틸 */
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* path 에서 카테고리와 하위 폴더(group)를 추출 — 폴더가 더 깊어져도 자동 대응 */
  function normalizePost(p) {
    var rel = p.path.indexOf(ROOT) === 0 ? p.path.slice(ROOT.length) : p.path;
    var parts = rel.split('/');
    return {
      path: p.path,
      title: p.title,
      category: p.category || (parts.length > 1 ? parts[0] : '기타'),
      group: parts.length > 2 ? parts.slice(1, -1).join('/') : '',
      date: p.date || ''
    };
  }

  /* 등록 시각 표기: "2026-07-25 23:32" → "2026.07.25 23:32 (KST)" */
  function dateHtml(d) {
    if (!d) return '';
    var parts = String(d).split(' ');
    var text = parts[0].replace(/-/g, '.');
    if (parts[1]) text += ' ' + parts[1] + ' (KST)';
    return '<span class="date">' + escapeHtml(text) + '</span>';
  }

  /* 등록일 최신순 → 제목 */
  function sortPosts(list) {
    return list.sort(function (a, b) {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return a.title.localeCompare(b.title, 'ko');
    });
  }

  /* --------------------------------------------------------------- 데이터 */
  function fetchTree() {
    /* 예전에는 sessionStorage 에 트리를 저장해 재사용했는데,
       그 캐시가 남아 있으면 새 폴더가 영영 안 보이는 문제가 있어 제거했습니다. */
    try { sessionStorage.removeItem('tree-cache'); } catch (e) {}
    return fetch(API_TREE + '&t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('GitHub API 오류 (' + r.status + ')');
        return r.json();
      });
  }

  function buildPosts(tree) {
    return sortPosts(tree.tree
      .filter(function (n) {
        return n.type === 'blob' && n.path.indexOf(ROOT) === 0 && /\.md$/i.test(n.path);
      })
      .map(function (n) {
        var rel = n.path.slice(ROOT.length);
        var parts = rel.split('/');
        return {
          path: n.path,
          title: parts[parts.length - 1].replace(/\.md$/i, ''),
          category: parts.length > 1 ? parts[0] : '기타',
          group: parts.length > 2 ? parts.slice(1, -1).join('/') : '',
          date: ''
        };
      }));
  }

  function load() {
    /* CDN·브라우저 캐시를 우회해 새 글이 바로 반영되게 함 */
    return fetch(POSTS_URL + '?v=' + Date.now(), { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('posts.json 없음');
        return r.json();
      })
      .then(function (list) {
        return sortPosts(list
          .filter(function (p) { return p && p.path && p.title; })
          .map(normalizePost));
      })
      .catch(function () { return fetchTree().then(buildPosts); })
      .then(function (list) { posts = list; return list; });
  }

  function counts() {
    var c = {};
    posts.forEach(function (p) { c[p.category] = (c[p.category] || 0) + 1; });
    return c;
  }

  /* --------------------------------------------------------------- 목록 */
  function renderList($main) {
    injectCss();
    var scoped = posts.filter(function (p) {
      return activeCategory === 'All' || p.category === activeCategory;
    });

    /* 현재 보고 있는 폴더 경로. '' 이면 카테고리 최상위.
       폴더는 몇 단계든 중첩할 수 있고, 한 번에 한 단계씩 들어갑니다.
       예) WWDC → WWDC/2026 → WWDC/2026/Swift ...                       */
    var prefix = activeGroup || '';

    /* 이번 단계에 보여줄 하위 폴더와 글을 모읍니다 */
    var folders = [], folderIdx = {}, singles = [], deepCount = 0;
    scoped.forEach(function (p) {
      var g = p.group || '', rel;
      if (!prefix) rel = g;
      else if (g === prefix) rel = '';
      else if (g.indexOf(prefix + '/') === 0) rel = g.slice(prefix.length + 1);
      else return;                                  // 다른 가지의 글
      deepCount++;
      if (!rel) { singles.push(p); return; }        // 이 폴더에 바로 있는 글
      var name = rel.split('/')[0];                 // 바로 아래 폴더 이름만
      var full = prefix ? prefix + '/' + name : name;
      var key = p.category + '/' + full;
      if (!(key in folderIdx)) {
        folderIdx[key] = folders.length;
        folders.push({ name: name, group: full, category: p.category,
          count: 0, date: p.date || '' });
      }
      var f = folders[folderIdx[key]];
      f.count++;                                    // 하위 폴더 글까지 모두 합산
      if ((p.date || '') > f.date) f.date = p.date || ''; // 폴더는 가장 최근 글 기준
    });

    /* 폴더와 개별 글을 하나의 목록으로 합쳐 등록 시각 최신순 정렬 */
    var items = folders.map(function (f, i) {
      return { kind: 'folder', idx: i, date: f.date, name: f.name };
    }).concat(singles.map(function (p, i) {
      return { kind: 'post', idx: i, date: p.date, name: p.title };
    }));
    items.sort(function (a, b) {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return a.name.localeCompare(b.name, 'ko');
    });

    /* 빵부스러기: Insights › 카테고리 › 폴더 › 폴더 … (각 단계 클릭 가능) */
    var head = '';
    if (prefix) {
      var segs = prefix.split('/');
      var parent = segs.slice(0, -1).join('/');
      head = '<div class="list-head">' +
        '<button class="crumb-back" type="button" data-to="' + escapeHtml(parent) + '">&lsaquo;</button> ' +
        'Insights &rsaquo; ' +
        '<button class="crumb-link" type="button" data-to="">' + escapeHtml(activeCategory) + '</button>';
      var acc = '';
      segs.forEach(function (s, i) {
        acc = acc ? acc + '/' + s : s;
        head += ' &rsaquo; ' + (i === segs.length - 1
          ? escapeHtml(s)
          : '<button class="crumb-link" type="button" data-to="' + escapeHtml(acc) + '">' + escapeHtml(s) + '</button>');
      });
      head += ' (' + deepCount + ')</div>';
    } else if (activeCategory !== 'All') {
      head = '<div class="list-head">Insights &rsaquo; ' + escapeHtml(activeCategory) +
        ' (' + scoped.length + ')</div>';
    }

    if (!items.length) {
      $main.innerHTML = head + '<div class="status">해당하는 글이 없습니다.</div>';
      bindCrumbs($main);
      return;
    }

    var html = head;
    items.forEach(function (it) {
      if (it.kind === 'folder') {
        var f = folders[it.idx];
        html += '<div class="post-card folder-card" data-f="' + it.idx + '">' +
          '<h3><span class="folder-ico"></span>' + escapeHtml(f.name) + '</h3>' +
          '<div class="meta"><span class="badge">' + escapeHtml(f.category) + '</span>' +
          '<span class="cnt">글 ' + f.count + '개</span>' + dateHtml(f.date) + '</div></div>';
      } else {
        var p = singles[it.idx];
        html += '<div class="post-card" data-i="' + it.idx + '">' +
          '<h3>' + escapeHtml(p.title) + '</h3>' +
          '<div class="meta"><span class="badge">' + escapeHtml(p.category) + '</span>' +
          dateHtml(p.date) + '</div></div>';
      }
    });
    $main.innerHTML = html;

    bindCrumbs($main);
    Array.prototype.forEach.call($main.querySelectorAll('.folder-card'), function (card) {
      card.addEventListener('click', function () {
        var f = folders[parseInt(card.getAttribute('data-f'), 10)];
        activeCategory = f.category;
        activeGroup = f.group;
        renderList($main);
        if (typeof window.updateNav === 'function') window.updateNav();
        window.scrollTo(0, 0);
      });
    });
    Array.prototype.forEach.call($main.querySelectorAll('.post-card:not(.folder-card)'), function (card) {
      card.addEventListener('click', function () {
        location.hash = '#/post/' + encodeURIComponent(singles[parseInt(card.getAttribute('data-i'), 10)].path);
      });
    });

    function bindCrumbs($root) {
      Array.prototype.forEach.call($root.querySelectorAll('.crumb-back,.crumb-link'), function (b) {
        b.addEventListener('click', function () {
          activeGroup = b.getAttribute('data-to') || null;
          renderList($root);
          window.scrollTo(0, 0);
        });
      });
    }
  }

  /* ----------------------------------------------------------------- 글 */
  function renderPost($main, path) {
    injectCss();
    var post = posts.filter(function (p) { return p.path === path; })[0];
    $main.innerHTML = '<div class="status">글을 불러오는 중...</div>';
    fetch(RAW_BASE + path.split('/').map(encodeURIComponent).join('/'))
      .then(function (r) {
        if (!r.ok) throw new Error('파일을 불러올 수 없습니다 (' + r.status + ')');
        return r.text();
      })
      .then(function (md) {
        var html = DOMPurify.sanitize(marked.parse(md), { ADD_ATTR: ['style'] });
        var ghUrl = 'https://github.com/' + OWNER + '/' + REPO + '/blob/' + BRANCH + '/' +
          path.split('/').map(encodeURIComponent).join('/');
        $main.innerHTML =
          '<button class="back-btn" id="back">&larr; 목록으로</button>' +
          '<article>' +
          '<div class="article-meta">' +
          (post ? '<span class="badge">' + escapeHtml(post.category) + '</span>' : '') +
          '<a href="' + ghUrl + '" target="_blank" rel="noopener">GitHub에서 보기</a></div>' +
          html + '</article>';
        document.getElementById('back').addEventListener('click', function () {
          location.hash = '#/insights';
        });
        window.scrollTo(0, 0);
      })
      .catch(function (e) {
        $main.innerHTML = '<div class="status">오류: ' + escapeHtml(e.message) + '</div>';
      });
  }

  window.InsightsPage = {
    load: load,
    renderList: renderList,
    renderPost: renderPost,
    counts: counts,
    total: function () { return posts.length; },
    category: function () { return activeCategory; },
    setCategory: function (cat) { activeCategory = cat; activeGroup = null; }
  };
})();
