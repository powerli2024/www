#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""操作系统原理讲义 · 内容构建脚本（Python 3 标准库即可，无第三方依赖）

用法：在本目录运行  python build.py

职责：
  1. 结构与配置校验（id 唯一、答案下标与多选数量、关键概念字段、演示引用的表格、素材位置）；
  2. 把 content/meta.json 与 content/chN.json 合并成 content/course.js，供 file:// 直接加载；
  3. 生成 backup.html —— 无脚本的纯文本 / 打印备份，含全部正文、题目、答案与解析。

维护约定：改内容只改 content/*.json；不要直接改 course.js 或 backup.html。
新增章节时，把文件名加入下面的 CHAPTER_FILES 即可。
"""
import os
import re
import json
import html
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
CONTENT = os.path.join(ROOT, 'content')
CHAPTER_FILES = ['ch1.json', 'ch2.json']

CONCEPT_KEYS = ('name', 'one', 'boundary', 'notThis', 'reps', 'action', 'later')
BODY_TYPES = {'p', 'ul', 'ol', 'table', 'note', 'code', 'tree', 'html'}
QUIZ_TYPES = {'single', 'multi'}
errors = []
warnings = []


def err(msg):
    errors.append(msg)


def warn(msg):
    warnings.append(msg)


def load(name):
    path = os.path.join(CONTENT, name)
    if not os.path.isfile(path):
        err('缺少文件：content/' + name)
        return {}
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        err('content/%s 解析失败：%s' % (name, e))
        return {}


def strip_tags(s):
    return html.unescape(re.sub(r'<[^>]+>', '', str(s))).strip()


def validate(meta, chapters):
    # meta
    m = meta.get('meta', {})
    for key in ('title', 'subtitle', 'version', 'date', 'lang', 'contentSource',
                'usage', 'paths', 'interactivityNote', 'scope', 'materials',
                'changelog', 'maintenance'):
        if key not in m:
            err('meta.json 缺少 meta.%s' % key)
    sc = m.get('scope', {})
    for key in ('covers', 'notCovered', 'assumptions'):
        if key not in sc:
            err('meta.json 缺少 meta.scope.%s' % key)
    for i, g in enumerate(meta.get('glossary', [])):
        for key in ('en', 'zh', 'one', 'bound', 'ref'):
            if key not in g:
                err('术语表第 %d 条缺少 %s' % (i + 1, key))

    all_ids = {}
    table_ids = set()
    demos = []
    quiz_count = 0
    concept_count = 0
    flow_count = 0

    def claim(kind, value, where):
        if not value:
            err('%s 缺少 %s' % (where, kind))
            return
        if value in all_ids:
            err('%s 重复：%s（另见 %s）' % (kind, value, all_ids[value]))
        all_ids[value] = where

    def check_quiz(q, where):
        nonlocal quiz_count
        quiz_count += 1
        claim('题目 id', q.get('id'), where)
        if q.get('type') not in QUIZ_TYPES:
            err('%s 题目类型非法：%s' % (where, q.get('type')))
        opts = q.get('options', [])
        ans = q.get('answer', [])
        if not opts:
            err('%s 没有选项' % where)
        if not ans:
            err('%s 没有答案' % where)
        if not q.get('q') or not q.get('explain'):
            err('%s 题干或解析为空' % where)
        for a in ans:
            if not isinstance(a, int) or a < 0 or a >= len(opts):
                err('%s 答案下标越界：%r（选项 %d 个）' % (where, a, len(opts)))
        if ans != sorted(ans):
            err('%s 答案下标未升序（app.js 按排序后字符串比对）' % where)
        if len(set(ans)) != len(ans):
            err('%s 答案下标重复' % where)
        if q.get('type') == 'multi' and len(ans) < 2:
            err('%s 标为多选但只有 %d 个答案' % (where, len(ans)))
        if q.get('type') == 'single' and len(ans) != 1:
            err('%s 标为单选但有 %d 个答案' % (where, len(ans)))

    for ch in chapters:
        where = ch.get('id', '<无 id 章>')
        claim('章节 id', ch.get('id'), where)
        for key in ('num', 'title', 'intro', 'sections', 'quiz'):
            if key not in ch:
                err('%s 缺少 %s' % (where, key))
        for s in ch.get('sections', []):
            sw = s.get('id', where + '/<无 id 节>')
            claim('小节 id', s.get('id'), sw)
            for key in ('num', 'title', 'src', 'body'):
                if not s.get(key):
                    err('%s 缺少 %s' % (sw, key))
            c = s.get('concept')
            if c:
                concept_count += 1
                for key in CONCEPT_KEYS:
                    if key not in c:
                        err('%s 关键概念缺少 %s' % (sw, key))
                if len(c.get('reps', [])) < 2:
                    err('%s 关键概念表征少于两种' % sw)
                if not c.get('boundary'):
                    err('%s 关键概念缺边界' % sw)
            for b in s.get('body', []):
                t = b.get('t')
                if t not in BODY_TYPES:
                    err('%s 正文块类型非法：%s' % (sw, t))
                if t == 'table':
                    if b.get('id'):
                        claim('表格 id', b['id'], sw)
                        table_ids.add(b['id'])
                    n = len(b.get('head', []))
                    for ri, row in enumerate(b.get('rows', [])):
                        if len(row) != n:
                            err('%s 表格第 %d 行列数(%d)与表头(%d)不一致' % (sw, ri + 1, len(row), n))
                if t == 'html' and b.get('h'):
                    flow_count += 1
            if s.get('demo'):
                d = s['demo']
                if d.get('type') != 'pipeline':
                    warn('%s 使用了非 pipeline 演示，app.js 仅内置 pipeline/dfa' % sw)
                demos.append((sw, d.get('table')))
            for q in s.get('quiz', []):
                check_quiz(q, sw + ' 节内自测')
        cq = ch.get('quiz', {})
        if not cq.get('title') or not cq.get('questions'):
            err('%s 章末综合自测不完整' % where)
        for q in cq.get('questions', []):
            check_quiz(q, where + ' 综合自测')

    for sw, tid in demos:
        if tid not in table_ids:
            err('%s 的演示引用了不存在的表格 id：%s' % (sw, tid))
    return {
        'chapters': len(chapters), 'sections': sum(len(c.get('sections', [])) for c in chapters),
        'concepts': concept_count, 'questions': quiz_count, 'flows': flow_count,
        'demos': len(demos), 'glossary': len(meta.get('glossary', []))
    }


def write_course(meta, chapters):
    course = {
        'meta': meta['meta'],
        'glossary': meta['glossary'],
        'chapters': chapters
    }
    text = 'window.COURSE = ' + json.dumps(course, ensure_ascii=False, indent=1) + ';\n'
    path = os.path.join(CONTENT, 'course.js')
    with open(path, 'w', encoding='utf-8', newline='') as f:
        f.write(text)
    return path, len(text.encode('utf-8'))


# ---------------------------------------------------------------- backup.html
CSS = """
:root{color-scheme:light dark}
*{box-sizing:border-box}
body{margin:0;background:#fbfaf6;color:#1b1c1a;
 font:16px/1.8 system-ui,-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}
main{max-width:58rem;margin:0 auto;padding:2rem 1.2rem 5rem}
h1{font-size:1.7rem;line-height:1.35;margin:0 0 .4rem}
h2{margin-top:2.6rem;padding-bottom:.3rem;border-bottom:1px solid #d8d5ca;font-size:1.35rem}
h3{margin-top:2rem;font-size:1.12rem}
h4{margin:1.1rem 0 .3rem;font-size:1rem}
p,li{ max-width:76ch }
.meta,.src{font-size:.85rem;color:#54564f}
a{color:#1f5c46}
table{border-collapse:collapse;width:100%;margin:.8rem 0;font-size:.9rem}
th,td{border:1px solid #d8d5ca;padding:.4rem .55rem;text-align:left;vertical-align:top}
th{background:#f1eee6}
caption{text-align:left;font-size:.85rem;color:#54564f;padding:.3rem 0}
code{font-family:Consolas,Menlo,monospace;background:#f1eee6;padding:.05rem .25rem;border-radius:3px}
pre{background:#f1eee6;border:1px solid #d8d5ca;border-radius:6px;padding:.8rem;
 overflow-x:auto;font-size:.85rem;white-space:pre-wrap}
.concept{border-left:3px solid #1f5c46;padding:.2rem .8rem;margin:1rem 0;background:#f5f6f2}
.note{background:#f1eee6;padding:.4rem .7rem;border-left:3px solid #8a7a50;margin:.7rem 0;font-size:.92rem}
.q{border-top:1px dashed #d8d5ca;padding-top:.6rem;margin-top:1rem}
.ans{font-size:.9rem;color:#1f5c46;font-weight:600}
.exp{font-size:.92rem;background:#f1eee6;padding:.4rem .6rem;border-left:3px solid #1f5c46}
.flow{font-size:.92rem;background:#f5f6f2;border:1px solid #d8d5ca;border-radius:6px;padding:.6rem .8rem;margin:.8rem 0}
.bar{display:flex;flex-wrap:wrap;gap:.8rem;font-size:.88rem;margin:1rem 0;padding:.6rem 0;border-top:1px solid #d8d5ca}
.bar a{display:inline-flex;align-items:center;min-height:44px}
@media (prefers-color-scheme:dark){
 body{background:#161a17;color:#e2e7e1}
 th{background:#232a25}code,.exp,pre,.note{background:#202722;border-color:#39443c}
 .concept,.flow{background:#1d2420;border-color:#39443c}
 h2{border-color:#39443c}.q{border-color:#39443c}
 a{color:#8fd0ae}th,td,table,pre{border-color:#39443c}
 .ans{color:#8fd0ae}.meta,.src,caption{color:#b9c0ba}
}
@media (max-width:699px){
 body{font-size:15px}main{padding:1.2rem 1rem 3rem}
 table{display:block;overflow-x:auto;max-width:100%}
}
@media print{.bar{display:none}body{background:#fff;color:#000}a{color:#000;text-decoration:none}
 h2{break-after:avoid}.q,.concept{break-inside:avoid}}
"""


def flow_to_text(h):
    cap = re.search(r'<figcaption[^>]*>(.*?)</figcaption>', h, re.S)
    title = strip_tags(cap.group(1)) if cap else '流程示意'
    nodes = re.findall(r'<b>(.*?)</b><small>(.*?)</small>', h, re.S)
    if nodes:
        chain = ' → '.join('%s（%s）' % (strip_tags(a), strip_tags(b)) for a, b in nodes)
    else:
        chain = strip_tags(h)
    return '<div class="flow"><b>%s</b><br>%s</div>' % (html.escape(title), html.escape(chain))


def block_html(b):
    t = b.get('t')
    if t == 'p':
        return '<p>%s</p>' % b.get('h', '')
    if t in ('ul', 'ol'):
        tag = 'ul' if t == 'ul' else 'ol'
        return '<%s>%s</%s>' % (tag, ''.join('<li>%s</li>' % x for x in b.get('items', [])), tag)
    if t == 'table':
        out = ['<table><caption>%s</caption><thead><tr>' % html.escape(b.get('caption', ''))]
        out += ['<th>%s</th>' % h for h in b.get('head', [])]
        out.append('</tr></thead><tbody>')
        for row in b.get('rows', []):
            out.append('<tr>' + ''.join('<td>%s</td>' % c for c in row) + '</tr>')
        out.append('</tbody></table>')
        if b.get('note'):
            out.append('<p class="src">%s</p>' % html.escape(strip_tags(b['note'])))
        return ''.join(out)
    if t == 'note':
        return '<div class="note"><b>%s</b><p>%s</p></div>' % (html.escape(b.get('title', '')), b.get('h', ''))
    if t == 'code':
        return '<figure><figcaption>%s</figcaption><pre>%s</pre></figure>' % (
            html.escape(b.get('caption', '')), html.escape(b.get('code', '')))
    if t == 'html':
        return flow_to_text(b.get('h', ''))
    if t == 'tree':
        return '<p class="src">［树形图示，见交互版］</p>'
    return ''


def concept_html(c):
    out = ['<div class="concept"><h4>关键概念：%s</h4>' % html.escape(c.get('name', ''))]
    out.append('<p><b>一句话定义</b>：%s</p>' % c.get('one', ''))
    out.append('<p><b>边界与适用条件</b></p><ul>%s</ul>' % ''.join('<li>%s</li>' % x for x in c.get('boundary', [])))
    out.append('<p><b>不是什么</b>：%s</p>' % c.get('notThis', ''))
    out.append('<p><b>两种表征</b></p><ul>%s</ul>' % ''.join(
        '<li><b>%s</b>：%s</li>' % (r.get('title', ''), r.get('h', '')) for r in c.get('reps', [])))
    out.append('<p><b>可检验动作</b>：%s</p>' % c.get('action', ''))
    out.append('<p><b>复现</b>：%s</p></div>' % c.get('later', ''))
    return ''.join(out)


def quiz_html(questions, title):
    out = ['<h3>%s</h3>' % html.escape(title)]
    for i, q in enumerate(questions, 1):
        letters = [chr(65 + j) for j in range(len(q.get('options', [])))]
        ans = '、'.join(letters[a] for a in q.get('answer', []) if 0 <= a < len(letters))
        out.append('<div class="q"><p><b>%d. %s</b>%s</p><ol type="A">%s</ol>' % (
            i, q.get('q', ''), '（多选）' if q.get('type') == 'multi' else '',
            ''.join('<li>%s</li>' % o for o in q.get('options', []))))
        out.append('<p class="ans">答案：%s</p><p class="exp">解析：%s</p></div>' % (ans, q.get('explain', '')))
    return ''.join(out)


def write_backup(meta, chapters):
    m = meta['meta']
    out = ['<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">',
           '<meta name="viewport" content="width=device-width, initial-scale=1">',
           '<meta name="color-scheme" content="light dark">',
           '<title>%s · 纯文本备份</title><style>%s</style></head><body><main>' % (
               html.escape(m['title']), CSS)]
    out.append('<div class="bar"><a href="index.html">← 返回交互版</a>'
               '<span>纯静态 · 零脚本 · 可打印 · 含全部答案与解析</span>'
               '<span>打印请用浏览器菜单或 Ctrl / ⌘ + P</span></div>')
    out.append('<h1>%s（纯文本备份）</h1>' % html.escape(m['title']))
    out.append('<p class="meta">%s ｜ 版本 %s（%s） ｜ 内容源：%s</p>' % (
        html.escape(m['subtitle']), html.escape(m['version']), html.escape(m['date']),
        html.escape(strip_tags(m['contentSource']))))
    out.append('<h2>怎么用这份讲义 / 阅读路径</h2><p>%s</p><dl>' % m['usage'])
    for p in m['paths']:
        out.append('<dt><b>%s</b></dt><dd>%s</dd>' % (p['name'], p['desc']))
    out.append('</dl><p>%s</p>' % m['interactivityNote'])

    out.append('<h2>内容边界与素材说明</h2>')
    for title, key in (('覆盖范围', 'covers'), ('未覆盖 / 素材未展开', 'notCovered'), ('推断与口径', 'assumptions')):
        out.append('<h3>%s</h3><ul>%s</ul>' % (title, ''.join('<li>%s</li>' % x for x in m['scope'][key])))

    for ch in chapters:
        out.append('<h2 id="%s">%s　%s</h2><p>%s</p>' % (ch['id'], ch['num'], ch['title'], ch['intro']))
        for s in ch['sections']:
            out.append('<h3 id="%s">%s　%s</h3><p class="src">素材位置：%s</p>' % (
                s['id'], s['num'], s['title'], s['src']))
            if s.get('concept'):
                out.append(concept_html(s['concept']))
            for b in s['body']:
                out.append(block_html(b))
            if s.get('demo'):
                out.append('<p class="src">［交互版此处有「%s」步进演示；本备份已用上方表格给出全部步骤］</p>' % (
                    html.escape(s['demo'].get('label', ''))))
            if s.get('quiz'):
                out.append(quiz_html(s['quiz'], '本节自测'))
            out.append('<p class="src">本小节来源：%s</p>' % s['src'])
        out.append(quiz_html(ch['quiz']['questions'], ch['quiz']['title']))

    out.append('<h2>术语表</h2><table><caption>共 %d 条</caption><thead><tr>'
               '<th>术语</th><th>一句话释义与作用</th><th>边界 / 易混点</th><th>来源</th>'
               '</tr></thead><tbody>' % len(meta['glossary']))
    for g in meta['glossary']:
        out.append('<tr><td>%s（%s）</td><td>%s</td><td>%s</td><td>%s</td></tr>' % (
            g['zh'], g['en'], g['one'], g['bound'], g['ref']))
    out.append('</tbody></table>')

    out.append('<h2>素材清单、版本与维护</h2><table><caption>本站使用的课程素材</caption>'
               '<thead><tr><th>文件</th><th>页数</th><th>用途</th></tr></thead><tbody>')
    for x in m['materials']:
        out.append('<tr><td>%s</td><td>%s</td><td>%s</td></tr>' % (x['file'], x['pages'], x['use']))
    out.append('</tbody></table><h3>变更记录</h3><ul>')
    for x in m['changelog']:
        out.append('<li>%s：%s</li>' % (x['date'], x['note']))
    out.append('</ul><h3>维护说明</h3><ul>')
    for x in m['maintenance']:
        out.append('<li>%s</li>' % x)
    out.append('</ul></main></body></html>')

    path = os.path.join(ROOT, 'backup.html')
    with open(path, 'w', encoding='utf-8', newline='') as f:
        f.write(''.join(out))
    return path, os.path.getsize(path)


def main():
    meta = load('meta.json')
    chapters = [load(n) for n in CHAPTER_FILES]
    chapters = [c for c in chapters if c]
    if errors:
        print('校验失败，未生成任何产物：')
        for e in errors:
            print('  ×', e)
        return 1
    stats = validate(meta, chapters)
    if errors:
        print('校验失败，未生成任何产物：')
        for e in errors:
            print('  ×', e)
        return 1
    for w in warnings:
        print('  !', w)
    p1, n1 = write_course(meta, chapters)
    p2, n2 = write_backup(meta, chapters)
    print('校验通过：%d 章 / %d 节 / %d 个关键概念 / %d 道自测题 / %d 张流程示意 / %d 处演示 / %d 条术语' % (
        stats['chapters'], stats['sections'], stats['concepts'], stats['questions'],
        stats['flows'], stats['demos'], stats['glossary']))
    print('已生成 %s（%d 字节）' % (os.path.relpath(p1, ROOT), n1))
    print('已生成 %s（%d 字节）' % (os.path.relpath(p2, ROOT), n2))
    return 0


if __name__ == '__main__':
    sys.exit(main())
