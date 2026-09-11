"""Render whole, unmodified source pages. Never reconstruct task text or figures."""
import argparse, hashlib, json, subprocess
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SPECS = [
 ('2025-var','Våren 2025','exam','19. mai 2025 · MAT1151','Utdanningsdirektoratet – vedlagt oppgavesett',[120,180],[(16,1,[1,2]),(17,1,[3]),(18,1,[4,5]),(19,1,[6]),(20,1,[7]),(21,1,[8]),(22,2,[1]),(23,2,[2,3]),(24,2,[4]),(25,2,[5]),(26,2,[6]),(27,2,[7])]),
 ('2024-host','Høsten 2024','exam','28. november 2024 · MAT1151','Utdanningsdirektoratet – vedlagt oppgavesett',[60,240],[(14,1,[1,2]),(15,1,[3]),(16,1,[4]),(17,1,[5]),(18,2,[1]),(19,2,[2]),(20,2,[3,4]),(21,2,[5]),(22,2,[6]),(23,2,[7,8])]),
 ('2023-var','Våren 2023','exam','MAT1151 · Oppgavesett fra NDLA','NDLA / Utdanningsdirektoratet',[60,240],[(1,1,[1,2,3]),(2,1,[4]),(3,2,[1,2,3]),(4,2,[4,5]),(5,2,[6]),(6,2,[7])]),
 ('2026-var','Våren 2026','exam','MAT1151','Vedlagt skannet utdrag, trykte sider 13–23',[180,120],[(2,1,[1,2]),(3,1,[3,4,5]),(4,1,[6,7,8]),(5,1,[9,10]),(6,1,[11,12]),(7,1,[13]),(8,2,[1]),(9,2,[2]),(10,2,[3]),(11,2,[4])]),
]

def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def main():
 parser=argparse.ArgumentParser(); parser.add_argument('--pdftoppm',default='pdftoppm'); args=parser.parse_args()
 checks=json.loads((ROOT/'docs/past-exam-checks.json').read_text())
 manifest=ROOT/'public/eksamener/manifest.json'
 previous={e['id']:e for e in json.loads(manifest.read_text())} if manifest.exists() else {}
 result=[]
 for id,title,kind,note,source,minutes,pages in sorted(SPECS, key=lambda spec: spec[0]):
  pdf=ROOT/f'public/eksamener/kilder/{id}.pdf'; dest=ROOT/f'public/eksamener/{id}';dest.mkdir(exist_ok=True)
  entry=dict(id=id,title=title,kind=kind,note=note,sourceLabel=source,pdf=f'/eksamener/kilder/{id}.pdf',sourceSha256=digest(pdf),minutes=minutes,pages=[])
  old=previous.get(id,{})
  old_pages={p['page']:p for p in old.get('pages',[])}
  if id.startswith('2023'): entry['sourceUrl']='https://ndla.no/en/r/matematikk-2p-y/eksamensoppgaver-og-losninger-i-2p-y/e016af8473'
  for page,part,tasks in pages:
   img=dest/f'side-{page}.png'
   if (not img.exists() or old.get('sourceSha256')!=entry['sourceSha256']
       or old_pages.get(page,{}).get('sha256')!=digest(img)):
    subprocess.run([args.pdftoppm,'-f',str(page),'-l',str(page),'-singlefile','-scale-to','2200','-png',str(pdf),str(img.with_suffix(''))],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
   with Image.open(img) as im: width,height=im.size
   pagechecks=[c for c in checks[id] if c['part']==part and c['task'] in tasks]
   assert {c['task'] for c in pagechecks}==set(tasks),(id,page,'missing check')
   entry['pages'].append(dict(page=page,printedPage=page+12 if id=='2026-var' else page,part=part,tasks=tasks,image=f'/eksamener/{id}/{img.name}',width=width,height=height,sha256=digest(img),checks=[{k:v for k,v in c.items() if k!='part'} for c in pagechecks]))
  result.append(entry)
 (ROOT/'public/eksamener/manifest.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
 print(f'{len(result)} sets, {sum(len(e["pages"]) for e in result)} source pages')
if __name__=='__main__': main()
