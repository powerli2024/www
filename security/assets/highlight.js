/* 轻量本地语法高亮（无外部依赖），支持 c / asm / python / bash / text */
(function () {
  'use strict';

  var KW = {
    c: ['int', 'char', 'void', 'short', 'long', 'unsigned', 'signed', 'float', 'double', 'const', 'static',
        'struct', 'union', 'enum', 'typedef', 'return', 'if', 'else', 'while', 'for', 'do', 'switch', 'case',
        'break', 'continue', 'sizeof', 'goto', 'extern', 'volatile', 'register', 'default'],
    asm: ['pushl', 'popl', 'movl', 'movb', 'movzbl', 'movsbl', 'subl', 'addl', 'leal', 'cmpl', 'jmp', 'je', 'jne',
          'jle', 'call', 'ret', 'leave', 'xorl', 'andl', 'orl', 'incl', 'decl', 'rep', 'stosl', 'nop', 'sete'],
    python: ['import', 'from', 'def', 'return', 'if', 'else', 'elif', 'while', 'for', 'in', 'not', 'and', 'or',
             'print', 'open', 'range', 'len', 'bytearray', 'with', 'as', 'class', 'try', 'except'],
    bash: ['if', 'then', 'else', 'fi', 'while', 'do', 'done', 'for', 'in', 'echo', 'export', 'sudo', 'gcc'],
    text: []
  };

  var RE = {
    c: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|^\s*#[^\n]*)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(\b0x[0-9a-fA-F]+\b|\b\d+\b)|(\b[A-Za-z_]\w*\b)(?=\s*\()|(\b[A-Za-z_]\w*\b)/gm,
    asm: /(;|#)[^\n]*|("(?:\\.|[^"\\])*")|(\b0x[0-9a-fA-F]+\b|\b\d+\b)|(%[a-z]{2,3})|(\.[A-Za-z_]\w*)|(\b[A-Za-z_]\w*\b)/gm,
    python: /(#[^\n]*)|("""[\s\S]*?"""|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(\b0x[0-9a-fA-F]+\b|\b\d+\b)|(\b[A-Za-z_]\w*\b)(?=\s*\()|(\b[A-Za-z_]\w*\b)/gm,
    bash: /(#[^\n]*)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(\b\d+\b)|(\b[A-Za-z_]\w*\b)/gm,
    text: null
  };

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function highlight(code, lang) {
    lang = lang && KW[lang] ? lang : 'text';
    var re = RE[lang];
    if (!re) return esc(code);
    var kw = KW[lang];
    var out = '';
    var last = 0;
    var m;
    re.lastIndex = 0;
    while ((m = re.exec(code)) !== null) {
      out += esc(code.slice(last, m.index));
      var t = m[0];
      var cls = '';
      if (lang === 'asm') {
        if (/^[;#]/.test(t)) cls = 'tok-cmt';
        else if (t.charAt(0) === '"') cls = 'tok-str';
        else if (/^0x/i.test(t) || /^\d/.test(t)) cls = 'tok-num';
        else if (t.charAt(0) === '%') cls = 'tok-num';
        else if (t.charAt(0) === '.') cls = 'tok-kw';
        else if (kw.indexOf(t) >= 0) cls = 'tok-kw';
      } else if (lang === 'bash') {
        if (m[1]) cls = 'tok-cmt';
        else if (m[2]) cls = 'tok-str';
        else if (m[3]) cls = 'tok-num';
        else if (m[4] && kw.indexOf(t) >= 0) cls = 'tok-kw';
      } else {
        if (m[1]) {
          cls = /^\s*#/.test(t) && lang === 'c' ? 'tok-kw' : 'tok-cmt';
        } else if (m[2]) {
          cls = 'tok-str';
        } else if (m[3]) {
          cls = 'tok-num';
        } else if (m[4]) {
          cls = 'tok-fn';
        } else if (m[5] && kw.indexOf(t) >= 0) {
          cls = 'tok-kw';
        }
      }
      out += cls ? '<span class="' + cls + '">' + esc(t) + '</span>' : esc(t);
      last = m.index + t.length;
      if (t.length === 0) re.lastIndex++;
    }
    out += esc(code.slice(last));
    return out;
  }

  function run() {
    var blocks = document.querySelectorAll('pre[data-lang]');
    for (var i = 0; i < blocks.length; i++) {
      var pre = blocks[i];
      var code = pre.textContent;
      pre.innerHTML = highlight(code, pre.getAttribute('data-lang'));
    }
  }

  window.SysSecHighlight = { run: run, highlight: highlight };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
