/* 操作系统原理讲义 · 渲染与交互。正文与题目全部来自 content/course.js。 */
(function () {
  "use strict";

  var D = window.COURSE;
  if (!D) { return; }

  var doc = document;
  var root = doc.documentElement;
  var $ = function (sel, ctx) { return (ctx || doc).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); };

  var esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  };

  /* ---------------- 主题 ---------------- */
  var themeBtn = $("#theme");
  var mqDark = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  function effectiveDark() {
    var t = root.getAttribute("data-theme");
    if (t === "dark") { return true; }
    if (t === "light") { return false; }
    return !!(mqDark && mqDark.matches);
  }
  function paintThemeBtn() {
    if (!themeBtn) { return; }
    var dark = effectiveDark();
    themeBtn.textContent = dark ? "浅色模式" : "深色模式";
    themeBtn.setAttribute("aria-pressed", dark ? "true" : "false");
    themeBtn.setAttribute("aria-label", dark ? "切换到浅色模式" : "切换到深色模式");
  }
  try {
    var saved = localStorage.getItem("bj-theme");
    if (saved === "dark" || saved === "light") { root.setAttribute("data-theme", saved); }
  } catch (e) { /* 本地存储不可用时忽略 */ }
  paintThemeBtn();
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var next = effectiveDark() ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("bj-theme", next); } catch (e) { /* 忽略 */ }
      paintThemeBtn();
    });
  }
  if (mqDark && mqDark.addEventListener) {
    mqDark.addEventListener("change", function () { if (!root.getAttribute("data-theme")) { paintThemeBtn(); } });
  }

  /* ---------------- 页头 ---------------- */
  $("#site-title").textContent = D.meta.title;
  $("#site-sub").textContent = D.meta.subtitle;
  doc.title = D.meta.title;

  /* ---------------- 通用块渲染 ---------------- */
  function noteBlock(b) {
    var kind = b.kind ? " k-" + b.kind : "";
    return "<div class='note" + kind + "'><h4>" + b.title + "</h4><p>" + b.h + "</p></div>";
  }

  function tableBlock(b) {
    var idAttr = b.id ? " id='" + b.id + "'" : "";
    var html = "<div class='tw'><table" + idAttr + "><caption>" + b.caption + "</caption><thead><tr>";
    b.head.forEach(function (h) { html += "<th scope='col'>" + h + "</th>"; });
    html += "</tr></thead><tbody>";
    b.rows.forEach(function (r) {
      html += "<tr>";
      r.forEach(function (c) { html += "<td>" + c + "</td>"; });
      html += "</tr>";
    });
    html += "</tbody></table>";
    if (b.note) { html += "<p class='tnote'>" + b.note + "</p>"; }
    html += "</div>";
    return html;
  }

  function codeBlock(b) {
    return "<figure class='codefig'><figcaption>" + b.caption + "</figcaption><pre class='code'><code>" +
      esc(b.code) + "</code></pre></figure>";
  }

  function treeSVG(t) {
    function norm(n) {
      if (typeof n === "string") { return { v: n }; }
      return { v: n.v, c: n.c ? n.c.map(norm) : undefined };
    }
    t = norm(t);

    var leaves = [];
    var maxDepth = 0;
    (function walk(n, d) {
      n._d = d;
      if (d > maxDepth) { maxDepth = d; }
      if (!n.c || !n.c.length) {
        n._x = leaves.length;
        leaves.push(n);
      } else {
        n.c.forEach(function (ch) { walk(ch, d + 1); });
        n._x = (n.c[0]._x + n.c[n.c.length - 1]._x) / 2;
      }
    })(t, 0);

    var gapX = 60, gapY = 60, padX = 38, padY = 30, r = 16;
    var w = Math.max(1, leaves.length - 1) * gapX + padX * 2;
    var h = maxDepth * gapY + padY * 2 + 8;
    var px = function (n) { return padX + n._x * gapX; };
    var py = function (n) { return padY + n._d * gapY; };

    var lines = "";
    var nodes = "";
    (function draw(n) {
      if (!n.c) { return; }
      n.c.forEach(function (ch) {
        lines += "<line x1='" + px(n) + "' y1='" + py(n) + "' x2='" + px(ch) + "' y2='" + py(ch) + "' stroke-width='1.4'></line>";
        draw(ch);
      });
    })(t);
    (function drawNodes(n) {
      nodes += "<circle cx='" + px(n) + "' cy='" + py(n) + "' r='" + r + "' stroke-width='1.4'></circle>" +
        "<text x='" + px(n) + "' y='" + py(n) + "' text-anchor='middle' dominant-baseline='central' font-size='14'>" + esc(n.v) + "</text>";
      if (n.c) { n.c.forEach(drawNodes); }
    })(t);

    var leafStr = leaves.map(function (n) { return n.v; }).join(" ");
    return "<svg viewBox='0 0 " + w + " " + h + "' role='img' aria-label='语法树，叶子结点依次为：" + esc(leafStr) + "' preserveAspectRatio='xMidYMid meet'>" +
      lines + nodes + "</svg>";
  }

  function treeBlock(b) {
    return "<figure class='tree'><figcaption>" + b.caption + "</figcaption>" + treeSVG(b.root) +
      (b.note ? "<p class='tnote'>" + b.note + "</p>" : "") + "</figure>";
  }

  function renderBlocks(blocks) {
    if (!blocks || !blocks.length) { return ""; }
    var out = "";
    blocks.forEach(function (b) {
      switch (b.t) {
        case "p": out += "<p>" + b.h + "</p>"; break;
        case "ul": out += "<ul>" + b.items.map(function (i) { return "<li>" + i + "</li>"; }).join("") + "</ul>"; break;
        case "ol": out += "<ol>" + b.items.map(function (i) { return "<li>" + i + "</li>"; }).join("") + "</ol>"; break;
        case "table": out += tableBlock(b); break;
        case "note": out += noteBlock(b); break;
        case "code": out += codeBlock(b); break;
        case "tree": out += treeBlock(b); break;
        case "html": out += b.h; break;
        default: break;
      }
    });
    return out;
  }

  function conceptCard(c) {
    var reps = c.reps.map(function (r) {
      return "<li><b>" + r.title + "</b>：" + r.h + "</li>";
    }).join("");
    var bound = c.boundary.map(function (x) { return "<li>" + x + "</li>"; }).join("");
    return "<div class='concept'>" +
      "<div class='concept-head'><span class='badge'>关键概念</span><p class='concept-name'>" + c.name + "</p></div>" +
      "<ol class='chain'>" +
      "<li><b>一句话定义</b><p>" + c.one + "</p></li>" +
      "<li><b>边界与适用条件</b><ul>" + bound + "</ul></li>" +
      "<li><b>不是什么</b><p>" + c.notThis + "</p></li>" +
      "<li><b>表征（至少两种）</b><ul class='reps'>" + reps + "</ul></li>" +
      "<li><b>可检验动作与即时反馈</b><p>" + c.action + "</p></li>" +
      "<li><b>复现</b><p>" + c.later + "</p></li>" +
      "</ol></div>";
  }

  /* ---------------- 自测 ---------------- */
  var quizMeta = {};        // qid -> { chapter, answer, type }
  var chapterStats = {};    // chapter -> { total, answered, correct }
  var chapterSum = {};      // chapter -> DOM element

  function registerChapter(chId) {
    if (!chapterStats[chId]) { chapterStats[chId] = { total: 0, answered: 0, correct: 0 }; }
    if (!chapterSum[chId]) { chapterSum[chId] = []; }
  }

  function updateSum(chId) {
    var s = chapterStats[chId];
    if (!s) { return; }
    var txt = "本章自测：共 " + s.total + " 题，已提交 " + s.answered + " 题，答对 " + s.correct + " 题。";
    (chapterSum[chId] || []).forEach(function (el) {
      if (el) { el.textContent = txt; }
    });
  }

  function findQuestion(qid, chId) {
    var found = null;
    D.chapters.forEach(function (c) {
      if (c.id !== chId) { return; }
      c.sections.forEach(function (s) {
        (s.quiz || []).forEach(function (q) { if (q.id === qid) { found = q; } });
      });
      (c.quiz.questions || []).forEach(function (q) { if (q.id === qid) { found = q; } });
    });
    return found;
  }

  function renderQuiz(questions, chId, titleText, withSum) {
    registerChapter(chId);
    var total = questions.length;
    var html = "<div class='quiz'><h4>" + titleText + "</h4>" +
      "<p class='quiz-legend'>单选题选一项，多选题按题目标注选多项；点「提交答案」立即判分并显示解析，可随时「重新作答」。</p>";

    questions.forEach(function (q, idx) {
      var qid = q.id;
      quizMeta[qid] = { chapter: chId, answer: q.answer.slice().sort().join(","), type: q.type || "single" };
      chapterStats[chId].total += 1;

      html += "<div class='q' id='" + qid + "' data-qid='" + qid + "'>" +
        "<p class='q-stem'><span class='q-num'>第 " + (idx + 1) + " 题</span>" + q.q +
        (q.type === "multi" ? "<span class='q-type'>多选</span>" : "") + "</p>" +
        "<ul class='q-opts'>";
      q.options.forEach(function (op, oi) {
        var inputType = q.type === "multi" ? "checkbox" : "radio";
        html += "<li><label for='" + qid + "-o" + oi + "'><input type='" + inputType + "' id='" + qid + "-o" + oi +
          "' name='" + qid + "' value='" + oi + "'><span>" + op + "</span></label></li>";
      });
      html += "</ul><div class='q-actions'>" +
        "<button type='button' class='primary' data-act='submit'>提交答案</button>" +
        "<button type='button' class='ghost' data-act='reset' hidden>重新作答</button>" +
        "</div><div class='fb' hidden aria-live='polite'></div></div>";
    });

    if (withSum) {
      html += "<p class='quiz-sum' role='status'></p>";
    }
    html += "</div>";
    return { html: html, total: total };
  }

  function handleQuizClick(e) {
    var btn = e.target.closest("button[data-act]");
    if (!btn) { return; }
    var qEl = btn.closest(".q");
    if (!qEl) { return; }
    var qid = qEl.getAttribute("data-qid");
    var meta = quizMeta[qid];
    if (!meta) { return; }

    var fb = $(".fb", qEl);
    var opts = $$("input", qEl);

    if (btn.getAttribute("data-act") === "reset") {
      opts.forEach(function (inp) {
        inp.checked = false;
        inp.disabled = false;
      });
      $$("li", $(".q-opts", qEl)).forEach(function (li) {
        li.classList.remove("is-answer", "is-picked-wrong");
        var tag = $(".op-tag", li);
        if (tag) { tag.remove(); }
      });
      fb.hidden = true;
      fb.className = "fb";
      fb.innerHTML = "";
      btn.hidden = true;
      $("button[data-act='submit']", qEl).disabled = false;
      if (qEl._done) {
        chapterStats[meta.chapter].answered -= 1;
        if (qEl._correct) { chapterStats[meta.chapter].correct -= 1; }
        qEl._done = false;
        qEl._correct = false;
        updateSum(meta.chapter);
      }
      return;
    }

    /* 提交 */
    var picked = opts.filter(function (inp) { return inp.checked; }).map(function (inp) { return inp.value; });
    if (!picked.length) {
      fb.hidden = false;
      fb.className = "fb";
      fb.innerHTML = "请先选择一个选项再提交。";
      return;
    }
    picked.sort();
    var correct = picked.join(",") === meta.answer;

    var lis = $$("li", $(".q-opts", qEl));
    var answerIdx = meta.answer.split(",");
    lis.forEach(function (li) {
      var inp = $("input", li);
      var oi = inp.value;
      li.classList.remove("is-answer", "is-picked-wrong");
      var tag = $(".op-tag", li);
      if (tag) { tag.remove(); }
      if (answerIdx.indexOf(oi) !== -1) {
        li.classList.add("is-answer");
        var t1 = doc.createElement("span");
        t1.className = "op-tag";
        t1.textContent = "正确答案";
        $("label", li).appendChild(t1);
      } else if (inp.checked) {
        li.classList.add("is-picked-wrong");
        var t2 = doc.createElement("span");
        t2.className = "op-tag wrong";
        t2.textContent = "你的选择（错）";
        $("label", li).appendChild(t2);
      }
    });

    fb.hidden = false;
    fb.className = "fb " + (correct ? "ok" : "bad");
    var qInfo = findQuestion(qid, meta.chapter);
    fb.innerHTML = "<b class='verdict'>" + (correct ? "正确" : "错误") + "</b>　" +
      (qInfo ? qInfo.explain : "解析暂缺。");

    opts.forEach(function (inp) { inp.disabled = true; });
    btn.disabled = true;
    $("button[data-act='reset']", qEl).hidden = false;

    if (!qEl._done) {
      qEl._done = true;
      qEl._correct = correct;
      chapterStats[meta.chapter].answered += 1;
      if (correct) { chapterStats[meta.chapter].correct += 1; }
      updateSum(meta.chapter);
    } else if (qEl._correct !== correct) {
      /* 重新提交（理论上不会发生，因为提交后按钮被禁用） */
      chapterStats[meta.chapter].correct += correct ? 1 : -1;
      qEl._correct = correct;
      updateSum(meta.chapter);
    }
  }

  /* ---------------- 演示 ---------------- */
  function mountDemos() {
    $$(".demo[data-demo]").forEach(function (box) {
      var type = box.getAttribute("data-demo");
      if (type === "pipeline") { mountPipeline(box); }
      if (type === "dfa") { mountDFA(box); }
    });
  }

  function mountPipeline(box) {
    var tableId = box.getAttribute("data-table");
    var table = doc.getElementById(tableId);
    var rows = table ? $$("tbody tr", table) : [];
    var heads = table ? $$("thead th", table).map(function (c) { return c.textContent.trim(); }) : [];
    var status = $(".demo-status", box);
    var idx = -1;

    function paint() {
      rows.forEach(function (r, i) { r.classList.toggle("row-hl", i === idx); });
      if (idx < 0) {
        status.textContent = "未开始。点「下一步」逐步查看：" + heads.join(" → ") + "。";
      } else {
        var cells = $$("td", rows[idx]).map(function (c) { return c.textContent.trim(); });
        var rest = cells.slice(2).map(function (v, i) {
          return v ? ((heads[i + 2] || "") + "：" + v) : "";
        }).filter(Boolean);
        status.textContent = "第 " + (idx + 1) + " / " + rows.length + " 步：" + (cells[0] || "") +
          "（" + (cells[1] || "") + "）" + (rest.length ? "；" + rest.join("；") : "") + "。";
      }
      $("[data-act='prev']", box).disabled = idx <= 0;
      $("[data-act='next']", box).disabled = idx >= rows.length - 1;
    }

    $("[data-act='next']", box).addEventListener("click", function () {
      if (idx < rows.length - 1) { idx += 1; paint(); }
    });
    $("[data-act='prev']", box).addEventListener("click", function () {
      if (idx > 0) { idx -= 1; paint(); }
    });
    $("[data-act='reset']", box).addEventListener("click", function () {
      idx = -1; paint();
    });
    paint();
  }

  function mountDFA(box) {
    var start = box.getAttribute("data-start");
    var finals = (box.getAttribute("data-final") || "").split(",");
    var alphabet = box.getAttribute("data-alphabet") || "";
    var trans = JSON.parse(box.getAttribute("data-trans"));
    var input = $("input[type='text']", box);
    var status = $(".demo-status", box);
    var pathBox = $(".path", box);
    var pos = 0, cur = start, done = false, lastVerdict = null;

    function reset() {
      var s = (input.value || "").replace(/\s+/g, "");
      pos = 0; cur = start; done = false; lastVerdict = null;
      status.className = "demo-status";
      if (!s) {
        status.textContent = "输入由 a、b 组成的串（例如 baa），再点「单步」或「运行到底」。";
      } else if (!/^[ab]+$/.test(s)) {
        status.textContent = "输入只允许字母表中的符号 a、b；请修改输入。";
        status.className = "demo-status err";
        done = true;
      } else {
        status.textContent = "初态 " + start + "；待读 " + s.length + " 个字符。";
      }
      paintPath(s, []);
    }

    function paintPath(s, steps) {
      if (!pathBox) { return; }
      var html = "<span" + (pos === 0 ? " class='cur'" : "") + ">" + esc(cur) + "</span>";
      steps.forEach(function (st) {
        html += "<span>--" + esc(st.ch) + "--&gt;</span><span" + (st.cur ? " class='cur fin'" : "") + ">" + esc(st.to) + "</span>";
      });
      pathBox.innerHTML = html;
    }

    function step() {
      var s = (input.value || "").replace(/\s+/g, "");
      if (!s || !/^[ab]+$/.test(s) || done) { return; }
      var ch = s.charAt(pos);
      var next = trans[cur] ? trans[cur][ch] : undefined;
      if (!next) {
        done = true;
        status.className = "demo-status err";
        status.textContent = "状态 " + cur + " 没有读入 " + ch + " 的转移，串被拒绝。";
        paintPath(s, [{ ch: ch, to: "无转移" }]);
        return;
      }
      cur = next;
      pos += 1;
      var steps = [];
      var tmp = start;
      for (var i = 0; i < pos; i++) {
        var sym = s.charAt(i);
        var nxt = trans[tmp][sym];
        steps.push({ ch: sym, to: nxt, cur: i === pos - 1 });
        tmp = nxt;
      }
      paintPath(s, steps);
      if (pos >= s.length) {
        done = true;
        var ok = finals.indexOf(cur) !== -1;
        status.className = "demo-status " + (ok ? "accept" : "");
        status.textContent = ok
          ? "读完整个串，停在终态 " + cur + "：" + s + " 被接受（属于 L(M)）。"
          : "读完整个串，停在非终态 " + cur + "：" + s + " 不被接受。";
      } else {
        status.className = "demo-status";
        status.textContent = "当前状态 " + cur + "；已读 " + pos + " / " + s.length + " 个字符，下一个是 " + s.charAt(pos) + "。";
      }
    }

    $("[data-act='step']", box).addEventListener("click", function () {
      if (done || !(input.value || "").trim()) { reset(); if (done) { return; } }
      step();
    });
    $("[data-act='run']", box).addEventListener("click", function () {
      reset();
      if (done) { return; }
      var guard = 0;
      while (!done && guard < 100) { step(); guard += 1; }
    });
    $("[data-act='reset']", box).addEventListener("click", reset);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); reset(); if (!done) { var g = 0; while (!done && g < 100) { step(); g += 1; } } }
    });
    input.addEventListener("input", function () { reset(); });
    reset();
  }

  /* ---------------- 渲染整页 ---------------- */
  function renderLede() {
    var m = D.meta;
    var html = "<h2>怎么用这份讲义</h2><p>" + m.usage + "</p>" +
      "<dl>";
    m.paths.forEach(function (p) {
      html += "<dt>" + p.name + "</dt><dd>" + p.desc + "</dd>";
    });
    html += "</dl><div class='note k-source'><h4>关于交互</h4><p>" + m.interactivityNote + "</p></div>";
    $("#lede").innerHTML = html;
  }

  function renderScope() {
    var s = D.meta.scope;
    var html = "<h2>内容边界与素材说明</h2>" +
      "<p>本站只整理素材实际讲到的内容。以下三类信息请对照阅读：</p>" +
      "<div class='note k-source'><h4>覆盖范围</h4><ul>" +
      s.covers.map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ul></div>" +
      "<div class='note k-missing'><h4>未覆盖 / 素材未展开</h4><ul>" +
      s.notCovered.map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ul></div>" +
      "<div class='note k-infer'><h4>推断与口径</h4><ul>" +
      s.assumptions.map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ul></div>";
    $("#scope").innerHTML = html;
  }

  function renderChapters() {
    var out = "";
    D.chapters.forEach(function (ch) {
      out += "<section class='chapter' id='" + ch.id + "' aria-labelledby='" + ch.id + "-t'>" +
        "<header class='chapter-head'><h2 id='" + ch.id + "-t'>" + ch.num + "　" + ch.title + "</h2>" +
        "<p class='ch-intro'>" + ch.intro + "</p></header>";

      ch.sections.forEach(function (s) {
        out += "<article class='sec' id='" + s.id + "' data-search aria-labelledby='" + s.id + "-t'>" +
          "<h3 id='" + s.id + "-t'>" + s.num + "　" + s.title + "</h3>" +
          "<p class='sec-meta'>素材位置：" + s.src + "</p>";
        if (s.concept) { out += conceptCard(s.concept); }
        out += "<div class='body'>" + renderBlocks(s.body) + "</div>";
        if (s.demo) {
          var demoAttr = "";
          if (s.demo.type === "pipeline") {
            demoAttr = "data-demo='pipeline' data-table='" + s.demo.table + "'";
          } else if (s.demo.type === "dfa") {
            demoAttr = "data-demo='dfa' data-start='" + s.demo.start + "' data-final='" + s.demo.final.join(",") +
              "' data-alphabet='" + s.demo.alphabet + "' data-trans='" + esc(JSON.stringify(s.demo.transitions)) + "'";
          }
          out += "<div class='demo' " + demoAttr + "><h4>" + s.demo.label + "</h4>" +
            "<p class='demo-note'>交互只做高亮与逐步演示；同一份信息在正文表格与文字中已完整给出，不依赖本控件。</p>";
          if (s.demo.type === "pipeline") {
            out += "<div class='demo-row'><button type='button' data-act='prev'>上一步</button>" +
              "<button type='button' data-act='next' class='primary'>下一步</button>" +
              "<button type='button' data-act='reset' class='ghost'>重置</button></div>";
          } else {
            out += "<div class='demo-row'><label for='" + s.id + "-dfa-input' class='sr-only'>输入串（字母表 a、b）</label>" +
              "<input type='text' id='" + s.id + "-dfa-input' maxlength='24' placeholder='例如 baa' autocomplete='off'>" +
              "<button type='button' data-act='step'>单步</button>" +
              "<button type='button' data-act='run' class='primary'>运行到底</button>" +
              "<button type='button' data-act='reset' class='ghost'>重置</button>" +
              "<div class='path' aria-hidden='true'></div></div>";
          }
          out += "<div class='demo-status' aria-live='polite'></div></div>";
        }
        if (s.quiz && s.quiz.length) {
          out += renderQuiz(s.quiz, ch.id, "本节自测", false).html;
        }
        out += "<p class='sec-src'>本小节来源：" + s.src + "；文中方括号内的页码均指讲义 PDF 页。</p></article>";
      });

      out += renderQuiz(ch.quiz.questions, ch.id, ch.quiz.title, true).html;
      /* 把综合自测的计数提示换成可更新节点：renderQuiz 已生成 .quiz-sum，这里记录 */
      out += "</section>";
    });
    $("#chapters").innerHTML = out;

    /* 记录章节汇总节点（章节测验的 quiz-sum 同时反映全章） */
    $$(".chapter").forEach(function (sec) {
      var chId = sec.id;
      chapterSum[chId] = $$(".quiz-sum", sec);
    });
    Object.keys(chapterStats).forEach(updateSum);
  }

  function renderTOC() {
    var html = "<ol><li><a class='ch-link' href='#lede'>阅读说明与路径</a></li>" +
      "<li><a class='ch-link' href='#scope'>内容边界</a></li>";
    D.chapters.forEach(function (ch) {
      html += "<li><a class='ch-link' href='#" + ch.id + "'>" + ch.num + "　" + ch.title + "</a><ol>";
      ch.sections.forEach(function (s) {
        html += "<li class='sub-q'><a href='#" + s.id + "'>" + s.num + "　" + s.title + "</a></li>";
      });
      html += "<li class='sub-q'><a href='#" + ch.id + "-quiz'>综合自测</a></li></ol></li>";
    });
    html += "<li><a class='ch-link' href='#glossary'>术语表</a></li>" +
      "<li><a class='ch-link' href='#sources'>素材、版本与维护</a></li></ol>";
    $("#toc").innerHTML = html;
  }

  function renderGlossary() {
    var rows = D.glossary.map(function (g) {
      return "<tr><td><span class='gterm'>" + g.zh + "</span><span class='gen'>" + g.en + "</span></td>" +
        "<td>" + g.one + "</td><td>" + g.bound + "</td><td>" + g.ref + "</td></tr>";
    }).join("");
    $("#glossary-body").innerHTML = "<div class='tw'><table><caption>附表 1　术语表（按素材出现顺序整理，共 " + D.glossary.length + " 条）</caption>" +
      "<thead><tr><th scope='col'>术语</th><th scope='col'>一句话释义与作用</th><th scope='col'>边界 / 易混点</th><th scope='col'>来源</th></tr></thead>" +
      "<tbody>" + rows + "</tbody></table></div>";
  }

  function renderSources() {
    var m = D.meta;
    var mat = m.materials.map(function (x) {
      return "<tr><td>" + x.file + "</td><td>" + x.pages + "</td><td>" + x.use + "</td></tr>";
    }).join("");
    var logs = m.changelog.map(function (x) { return "<li>" + x.date + "：" + x.note + "</li>"; }).join("");
    var mant = m.maintenance.map(function (x) { return "<li>" + x + "</li>"; }).join("");

    $("#sources").innerHTML = "<h2>素材清单、版本与维护</h2>" +
      "<div class='tw'><table><caption>附表 2　本站使用的课程素材</caption><thead><tr><th scope='col'>文件</th><th scope='col'>页数</th><th scope='col'>用途</th></tr></thead><tbody>" + mat + "</tbody></table></div>" +
      "<dl class='foot-meta'>" +
      "<dt>版本</dt><dd>" + m.version + "（" + m.date + "）</dd>" +
      "<dt>内容源</dt><dd>" + m.contentSource + "</dd>" +
      "<dt>离线状态</dt><dd>无外部字体、无 CDN、无远程脚本；断网可完整打开。交互与检索全部由本地 assets/app.js 完成。</dd>" +
      "<dt>备份</dt><dd><a href='backup.html'>纯文本 / 打印备份（无脚本，含全部题目答案与解析）</a>；也可点页头「打印」直接输出 PDF。</dd>" +
      "<dt>变更记录</dt><dd><ul>" + logs + "</ul></dd>" +
      "<dt>维护说明</dt><dd><ul>" + mant + "</ul></dd>" +
      "</dl>";
  }

  /* ---------------- 检索 ---------------- */
  var searchIndex = [];
  function buildSearchIndex() {
    searchIndex.push({ href: "#lede", title: "阅读说明与阅读路径", text: $("#lede").textContent });
    $$("article.sec").forEach(function (sec) {
      searchIndex.push({
        href: "#" + sec.id,
        title: $("h3", sec).textContent,
        text: sec.textContent.replace(/\s+/g, " ")
      });
    });
    D.glossary.forEach(function (g) {
      searchIndex.push({
        href: "#glossary",
        title: "术语：" + g.zh + "（" + g.en + "）",
        text: (g.one + " " + g.bound).replace(/\s+/g, " ")
      });
    });
    searchIndex.push({ href: "#scope", title: "内容边界与素材说明", text: $("#scope").textContent });
    searchIndex.push({ href: "#sources", title: "素材清单、版本与维护", text: $("#sources").textContent });
  }

  function mountSearch() {
    var input = $("#q");
    var panel = $("#results");
    var countEl = $("#search-count");
    if (!input || !panel) { return; }

    function close() {
      panel.hidden = true;
      input.setAttribute("aria-expanded", "false");
    }

    function snippet(text, q) {
      var low = text.toLowerCase();
      var at = low.indexOf(q);
      if (at < 0) { at = 0; }
      var start = Math.max(0, at - 34);
      var end = Math.min(text.length, at + q.length + 60);
      var raw = (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
      var safe = esc(raw);
      var re = new RegExp("(" + q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi");
      return safe.replace(re, "<mark>$1</mark>");
    }

    function run() {
      var q = input.value.trim().toLowerCase();
      if (!q) {
        close();
        countEl.textContent = "";
        return;
      }
      var hits = searchIndex.filter(function (item) {
        return (item.title + " " + item.text).toLowerCase().indexOf(q) !== -1;
      }).slice(0, 12);

      panel.hidden = false;
      input.setAttribute("aria-expanded", "true");
      if (!hits.length) {
        panel.innerHTML = "<p class='sr-empty'>没有匹配「" + esc(q) + "」的内容。可换用更短的关键词，例如「中断」「内核」「态转换」。</p>";
        countEl.textContent = "没有找到结果";
        return;
      }
      panel.innerHTML = "<ul>" + hits.map(function (h) {
        return "<li><a href='" + h.href + "' data-search-link><span class='sr-title'>" + esc(h.title) + "</span>" +
          "<span class='sr-snip'>" + snippet(h.text, q) + "</span></a></li>";
      }).join("") + "</ul>";
      countEl.textContent = "找到 " + hits.length + " 条结果";
    }

    input.addEventListener("input", run);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { input.value = ""; close(); input.blur(); }
      if (e.key === "Enter") {
        var first = $("a[data-search-link]", panel);
        if (first) { first.click(); }
      }
    });
    panel.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        close();
        input.value = "";
      }
    });
    doc.addEventListener("click", function (e) {
      if (!e.target.closest(".search")) { close(); }
    });
  }

  /* ---------------- 目录、移动端、回到顶部 ---------------- */
  function mountNav() {
    var menu = $("#menu");
    var side = $("#side");
    var small = window.matchMedia ? window.matchMedia("(max-width: 980px)") : null;

    function syncMenu() {
      if (!menu || !side) { return; }
      if (small && small.matches) {
        side.classList.add("is-collapsed");
        menu.setAttribute("aria-expanded", "false");
      } else {
        side.classList.remove("is-collapsed");
      }
    }
    syncMenu();
    if (small && small.addEventListener) { small.addEventListener("change", syncMenu); }
    if (menu && side) {
      menu.addEventListener("click", function () {
        var open = side.classList.toggle("is-collapsed");
        menu.setAttribute("aria-expanded", open ? "false" : "true");
      });
    }

    /* 目录点击后收起（移动端） */
    $$("a", $("#toc")).forEach(function (a) {
      a.addEventListener("click", function () {
        if (small && small.matches) {
          side.classList.add("is-collapsed");
          if (menu) { menu.setAttribute("aria-expanded", "false"); }
        }
      });
    });

    /* 当前小节高亮 */
    var links = {};
    $$("a[href^='#']", $("#toc")).forEach(function (a) { links[a.getAttribute("href").slice(1)] = a; });
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            Object.keys(links).forEach(function (k) { links[k].classList.remove("active"); });
            var a = links[en.target.id];
            if (a) {
              a.classList.add("active");
              a.setAttribute("aria-current", "location");
            }
          }
        });
      }, { rootMargin: "-15% 0px -70% 0px", threshold: 0 });
      $$("article.sec, .chapter").forEach(function (sec) { io.observe(sec); });
    }

    var topBtn = $("#top-btn");
    if (topBtn) {
      topBtn.addEventListener("click", function () {
        window.scrollTo({ top: 0, behavior: "smooth" });
        var main = $("#main");
        if (main) { main.focus({ preventScroll: true }); }
      });
    }

    var printBtn = $("#print");
    if (printBtn) { printBtn.addEventListener("click", function () { window.print(); }); }
  }

  /* ---------------- 启动 ---------------- */
  renderLede();
  renderScope();
  renderChapters();
  renderTOC();
  renderGlossary();
  renderSources();
  buildSearchIndex();
  mountSearch();
  mountNav();
  mountDemos();

  $$(".quiz").forEach(function (q) { q.addEventListener("click", handleQuizClick); });

  /* 章节综合自测的 id 用于目录锚点 */
  $$(".chapter").forEach(function (ch) {
    var lastQuiz = $$(".quiz", ch).pop();
    if (lastQuiz) { lastQuiz.id = ch.id + "-quiz"; lastQuiz.setAttribute("aria-label", ch.num + " 综合自测"); }
  });
})();
