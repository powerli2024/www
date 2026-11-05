"""下载固定版本公式排版资源；页面运行时不请求网络。"""
from pathlib import Path
import io, tarfile, urllib.request, hashlib, json, shutil

root=Path(__file__).resolve().parents[1]
vendor=root/'assets/vendor'
vendor.mkdir(parents=True,exist_ok=True)
url='https://registry.npmjs.org/katex/-/katex-0.19.0.tgz'
data=urllib.request.urlopen(url,timeout=60).read()
with tarfile.open(fileobj=io.BytesIO(data),mode='r:gz') as archive:
    for member in archive.getmembers():
        if member.isfile() and (member.name.startswith('package/dist/') or member.name=='package/LICENSE'):
            rel=Path(member.name).relative_to('package')
            dest=vendor/'katex'/rel
            dest.parent.mkdir(parents=True,exist_ok=True)
            dest.write_bytes(archive.extractfile(member).read())
marked=Path(r'C:\Users\powerli\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\marked')
shutil.copy2(marked/'lib/marked.esm.js',vendor/'marked.mjs')
shutil.copy2(marked/'LICENSE.md',vendor/'MARKED-LICENSE.md')
manifest={'katex':{'version':'0.19.0','url':url,'sha256_archive':hashlib.sha256(data).hexdigest()},'marked':{'version':json.loads((marked/'package.json').read_text())['version'],'source':'bundled runtime; local copy'},'runtime_network_requests':False}
(vendor/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(manifest,ensure_ascii=False))
