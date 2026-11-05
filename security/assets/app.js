/* 系统安全学习站 —— 交互脚本（本地，无外部依赖） */
(function () {
  'use strict';

  var STORE_THEME = 'syssec-theme-v1';
  var STORE_PROGRESS = 'syssec-progress-v1';

  /* ---------------- 主题 ---------------- */
  var root = document.documentElement;
  var themeBtn = document.getElementById('theme-toggle');

  function applyTheme(t) {
    root.setAttribute('data-theme', t);
    if (themeBtn) {
      themeBtn.textContent = t === 'dark' ? '浅色' : '深色';
      themeBtn.setAttribute('aria-label', t === 'dark' ? '切换到浅色模式' : '切换到深色模式');
    }
  }

  var savedTheme = null;
  try { savedTheme = localStorage.getItem(STORE_THEME); } catch (e) {}
  if (!savedTheme) {
    savedTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  applyTheme(savedTheme);

  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try { localStorage.setItem(STORE_THEME, next); } catch (e) {}
    });
  }

  /* ---------------- 侧栏 / 移动端 ---------------- */
  var sidebar = document.getElementById('sidebar');
  var navToggle = document.getElementById('nav-toggle');
  if (navToggle) {
    navToggle.addEventListener('click', function () {
      sidebar.classList.toggle('open');
    });
  }
  document.addEventListener('click', function (e) {
    if (!sidebar.classList.contains('open')) return;
    if (sidebar.contains(e.target) || (navToggle && navToggle.contains(e.target))) return;
    sidebar.classList.remove('open');
  });

  /* 为章节内 h2/h3 生成锚点 */
  var chapters = Array.prototype.slice.call(document.querySelectorAll('.chapter'));
  chapters.forEach(function (ch, ci) {
    var hs = ch.querySelectorAll('h2, h3');
    Array.prototype.forEach.call(hs, function (h, hi) {
      if (!h.id) h.id = ch.id + '-s' + (hi + 1);
    });
  });

  /* ---------------- 进度 ---------------- */
  var progress = {};
  try { progress = JSON.parse(localStorage.getItem(STORE_PROGRESS) || '{}') || {}; } catch (e) { progress = {}; }

  function saveProgress() {
    try { localStorage.setItem(STORE_PROGRESS, JSON.stringify(progress)); } catch (e) {}
  }

  function refreshProgressUI() {
    var tracked = chapters.filter(function (ch) { return !!ch.querySelector('[data-mark-read]'); });
    var done = 0;
    tracked.forEach(function (ch) { if (progress[ch.id]) done++; });
    chapters.forEach(function (ch) {
      var isDone = !!progress[ch.id];
      var navLink = document.querySelector('.nav-list a[href="#' + ch.id + '"]');
      if (navLink) navLink.classList.toggle('is-done', isDone);
      var btn = ch.querySelector('[data-mark-read]');
      if (btn) {
        btn.textContent = isDone ? '✓ 已读（点击取消）' : '标记本章已读';
        btn.classList.toggle('primary', !isDone);
        btn.classList.toggle('ghost', isDone);
      }
    });
    var pct = tracked.length ? Math.round(done / tracked.length * 100) : 0;
    var fill = document.getElementById('progress-fill');
    var txt = document.getElementById('progress-text');
    if (fill) fill.style.width = pct + '%';
    if (txt) txt.textContent = done + ' / ' + tracked.length;
  }

  chapters.forEach(function (ch) {
    var btn = ch.querySelector('[data-mark-read]');
    if (!btn) return;
    btn.addEventListener('click', function () {
      if (progress[ch.id]) delete progress[ch.id];
      else progress[ch.id] = true;
      saveProgress();
      refreshProgressUI();
    });
  });

  var resetBtn = document.getElementById('progress-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      if (!window.confirm('清除所有章节的已读标记？')) return;
      progress = {};
      saveProgress();
      refreshProgressUI();
    });
  }
  refreshProgressUI();

  /* ---------------- 侧栏高亮当前章节 ---------------- */
  var navLinks = {};
  Array.prototype.forEach.call(document.querySelectorAll('.nav-list a'), function (a) {
    navLinks[a.getAttribute('href').slice(1)] = a;
  });

  if ('IntersectionObserver' in window) {
    var visible = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        visible[en.target.id] = en.isIntersecting ? en.intersectionRatio : 0;
      });
      var bestId = null, best = 0;
      Object.keys(visible).forEach(function (id) {
        if (visible[id] > best) { best = visible[id]; bestId = id; }
      });
      if (bestId) setActive(bestId);
    }, { rootMargin: '-70px 0px -60% 0px', threshold: [0, 0.1, 0.5] });
    chapters.forEach(function (ch) { io.observe(ch); });
  }

  function setActive(id) {
    Object.keys(navLinks).forEach(function (k) { navLinks[k].classList.remove('active'); });
    if (navLinks[id]) navLinks[id].classList.add('active');
  }

  /* ---------------- 自测题 ---------------- */
  function setupQuiz(q) {
    var checkBtn = q.querySelector('[data-check]');
    var resetQ = q.querySelector('[data-reset]');
    var exp = q.querySelector('.q-explain');
    var answer = (q.getAttribute('data-answer') || '').split('');
    var isMulti = q.getAttribute('data-multi') === 'true';

    function selected() {
      return Array.prototype.slice.call(q.querySelectorAll('input:checked')).map(function (i) { return i.value; }).sort();
    }

    checkBtn.addEventListener('click', function () {
      var sel = selected();
      if (!sel.length) {
        exp.innerHTML = '<span class="verdict no">未作答</span>请先选择一个选项。';
        exp.classList.add('show');
        return;
      }
      var right = sel.join('') === answer.slice().sort().join('');
      // 标记选项
      Array.prototype.forEach.call(q.querySelectorAll('.opt'), function (lab) {
        lab.classList.remove('right', 'wrong');
        var inp = lab.querySelector('input');
        if (!inp) return;
        if (answer.indexOf(inp.value) >= 0) lab.classList.add('right');
        if (inp.checked && answer.indexOf(inp.value) < 0) lab.classList.add('wrong');
      });
      var why = q.getAttribute('data-explain') || '';
      exp.innerHTML = '<span class="verdict ' + (right ? 'ok' : 'no') + '">' +
        (right ? '回答正确' : '回答不正确') + '</span>' + why;
      exp.classList.add('show');
      Array.prototype.forEach.call(q.querySelectorAll('input'), function (i) { i.disabled = true; });
      checkBtn.disabled = true;
    });

    if (resetQ) {
      resetQ.addEventListener('click', function () {
        Array.prototype.forEach.call(q.querySelectorAll('input'), function (i) { i.checked = false; i.disabled = false; });
        Array.prototype.forEach.call(q.querySelectorAll('.opt'), function (l) { l.classList.remove('right', 'wrong'); });
        exp.classList.remove('show');
        exp.innerHTML = '';
        checkBtn.disabled = false;
      });
    }

    if (!isMulti) {
      Array.prototype.forEach.call(q.querySelectorAll('input'), function (i) {
        i.addEventListener('change', function () {
          if (i.type === 'radio') {
            // 单选：换选项时清理旧标记
            Array.prototype.forEach.call(q.querySelectorAll('.opt'), function (l) { l.classList.remove('right', 'wrong'); });
          }
        });
      });
    }
  }
  Array.prototype.forEach.call(document.querySelectorAll('.q'), setupQuiz);

  /* ---------------- 全站搜索 ---------------- */
  var index = [];
  chapters.forEach(function (ch) {
    var chTitle = (ch.querySelector('h1') || {}).textContent || '';
    var heading = chTitle;
    var buf = [];
    var headingNode = ch.querySelector('h1');
    function flush() {
      if (!buf.length) return;
      index.push({
        ch: chTitle,
        id: headingNode ? headingNode.id : ch.id,
        heading: heading,
        text: buf.join(' ').replace(/\s+/g, ' ').trim()
      });
      buf = [];
    }
    Array.prototype.forEach.call(ch.children, function (node) {
      if (node.tagName === 'H2' || node.tagName === 'H3') {
        flush();
        heading = node.textContent.replace(/^\d+(\.\d+)*\s*/, '').trim();
        headingNode = node;
        return;
      }
      if (node.classList.contains('quiz')) { buf.push('自测题 '); return; }
      if (node.tagName === 'SCRIPT' || node.tagName === 'STYLE') return;
      var t = node.textContent || '';
      if (t.trim()) buf.push(t);
    });
    flush();
  });

  var input = document.getElementById('search-input');
  var results = document.getElementById('search-results');
  var timer = null;

  function escHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function snippet(text, q) {
    var i = text.toLowerCase().indexOf(q);
    if (i < 0) return escHtml(text.slice(0, 70)) + '…';
    var start = Math.max(0, i - 30);
    var end = Math.min(text.length, i + q.length + 50);
    var pre = (start > 0 ? '…' : '') + text.slice(start, i);
    var hit = text.slice(i, i + q.length);
    var post = text.slice(i + q.length, end) + (end < text.length ? '…' : '');
    return escHtml(pre) + '<mark>' + escHtml(hit) + '</mark>' + escHtml(post);
  }

  function runSearch() {
    var q = (input.value || '').trim();
    if (!q) {
      results.classList.remove('show');
      results.innerHTML = '';
      return;
    }
    var ql = q.toLowerCase();
    var hits = [];
    index.forEach(function (e) {
      var hay = (e.heading + ' ' + e.text).toLowerCase();
      if (hay.indexOf(ql) >= 0) {
        var score = (e.heading.toLowerCase().indexOf(ql) >= 0 ? 10 : 0) + (e.text.toLowerCase().split(ql).length - 1);
        hits.push({ e: e, score: score });
      }
    });
    hits.sort(function (a, b) { return b.score - a.score; });
    var top = hits.slice(0, 12);
    if (!top.length) {
      results.innerHTML = '<div class="sr-empty">没有找到匹配内容，试试更短的关键词（如“栈帧”“%n”“ASLR”）。</div>';
    } else {
      results.innerHTML = top.map(function (h) {
        return '<a href="#' + h.e.id + '"><span class="sr-ch">' + escHtml(h.e.ch) + ' · ' + escHtml(h.e.heading) + '</span>' +
          '<span class="sr-snip">' + snippet(h.e.text, ql) + '</span></a>';
      }).join('');
    }
    results.classList.add('show');
  }

  if (input && results) {
    input.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(runSearch, 120);
    });
    input.addEventListener('focus', function () {
      if (input.value.trim()) runSearch();
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        results.classList.remove('show');
      }
    });
    results.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a') : null;
      if (a) {
        results.classList.remove('show');
        if (sidebar) sidebar.classList.remove('open');
      }
    });
    document.addEventListener('click', function (e) {
      if (!input.contains(e.target) && !results.contains(e.target)) results.classList.remove('show');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === '/' && document.activeElement !== input) {
        var tag = (document.activeElement.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea') return;
        e.preventDefault();
        input.focus();
      }
    });
  }

  /* 点击侧栏后关闭移动端抽屉 */
  Array.prototype.forEach.call(document.querySelectorAll('.nav-list a, .chapter a[href^="#"]'), function (a) {
    a.addEventListener('click', function () {
      if (sidebar) sidebar.classList.remove('open');
    });
  });

  /* ---------------- 术语表与术语气泡 ---------------- */
  var gloss = window.SYS_SEC_GLOSSARY || [];
  var glossById = {};
  gloss.forEach(function (g) { glossById[g.id] = g; });

  var list = document.getElementById('glossary-list');
  if (list && gloss.length) {
    list.innerHTML = gloss.map(function (g) {
      return '<div class="gloss-card" id="' + g.id + '"><h4>' + escHtml(g.zh) +
        ' <span class="en">' + escHtml(g.en) + '</span></h4><p>' +
        escHtml(g.def) + (g.ctx ? ' <span class="term-ctx">→ 42.c：' + escHtml(g.ctx) + '</span>' : '') +
        '</p></div>';
    }).join('');
  }

  var tip = null;
  function showTip(target) {
    var g = glossById[target.getAttribute('data-term')];
    if (!g) return;
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'term-tip';
      document.body.appendChild(tip);
    }
    tip.innerHTML = '<b>' + escHtml(g.zh) + '</b> <span class="en">' + escHtml(g.en) +
      '</span><br>' + escHtml(g.def);
    tip.classList.add('show');
    var r = target.getBoundingClientRect();
    var top = r.bottom + 8;
    if (top + tip.offsetHeight > window.innerHeight - 8) top = r.top - tip.offsetHeight - 8;
    if (top < 8) top = 8;
    var left = Math.min(r.left, window.innerWidth - tip.offsetWidth - 10);
    if (left < 6) left = 6;
    tip.style.top = top + 'px';
    tip.style.left = left + 'px';
  }
  function hideTip() { if (tip) tip.classList.remove('show'); }

  Array.prototype.forEach.call(document.querySelectorAll('[data-term]'), function (el) {
    el.addEventListener('mouseenter', function () { showTip(el); });
    el.addEventListener('mouseleave', hideTip);
    el.addEventListener('focus', function () { showTip(el); });
    el.addEventListener('blur', hideTip);
  });
  document.addEventListener('scroll', hideTip, true);
})();
