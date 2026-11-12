# POST each capture to its upload URL. Usage: post.py <ids.json: frame ids in order> <files.json: same order> <uploads.json: upload_assets' "uploads" array>
import json, sys, subprocess
from concurrent.futures import ThreadPoolExecutor
ids, files, ups = (json.load(open(a)) for a in sys.argv[1:4])
file_of = dict(zip(ids, files))
def go(u):
    f = file_of.get(u.get('targetNodeId'))
    if not f: return (u.get('targetNodeId'), 'no file')
    r = subprocess.run(['curl', '-sS', '--max-time', '120', '-X', 'POST', '-F', f'file=@{f};type=image/png', u['submitUrl']], capture_output=True, text=True)
    ok = '"success":true' in r.stdout
    return (u['targetNodeId'], 'ok' if ok else (r.stdout + r.stderr)[:200])
with ThreadPoolExecutor(8) as ex:
    res = list(ex.map(go, ups))
bad = [r for r in res if r[1] != 'ok']
print(f"{len(res) - len(bad)} of {len(res)} placed"); [print('FAIL', *b) for b in bad]
