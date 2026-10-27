"""Refresh a bounded official ESCO occupation/essential-skill snapshot over verified HTTPS.
No authenticated data or local profile records are used. Review changes before committing.
"""
import concurrent.futures, datetime, hashlib, json, pathlib, urllib.parse, urllib.request
ROOT=pathlib.Path(__file__).resolve().parents[1]
API='https://ec.europa.eu/esco/api/resource/'
occupations={'product-designer':'96e20037-0a25-4bf6-a25e-808d1605d890','frontend-developer':'c40a2919-48a9-40ea-b506-1f34f693496d','data-analyst':'d3edb8f8-3a06-47a0-8fb9-9b212c006aa2'}
def fetch(kind,uri):
 url=API+kind+'?'+urllib.parse.urlencode({'uri':uri,'language':'en'})
 with urllib.request.urlopen(url,timeout=30) as response: data=json.load(response)
 return data,url
records=[];skill_refs={}
for app_id,uid in occupations.items():
 data,url=fetch('occupation','http://data.europa.eu/esco/occupation/'+uid)
 links=data.get('_links',{}).get('hasEssentialSkill',[])
 records.append({'destinationId':app_id,'uri':data['uri'],'label':data['title'],'description':data.get('description',{}).get('en',{}),'sourceUrl':url,'essentialSkills':[s['uri'] for s in links]})
 skill_refs.update({s['uri']:s['title'] for s in links})
def skill_record(uri):
 data,url=fetch('skill',uri)
 desc=data.get('description',{}).get('en',{})
 if isinstance(desc,dict):desc=desc.get('literal','')
 return {'uri':uri,'label':data['title'],'description':desc,'sourceUrl':url}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool: skills=list(pool.map(skill_record,sorted(skill_refs)))
output={'source':'European Commission ESCO public API','retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'release':'API default; explicit release not returned, not asserted','licenceNotice':'European Commission reuse policy; attribution retained. See https://commission.europa.eu/legal-notice_en','occupations':records,'skills':skills}
path=ROOT/'src/data/esco.json';path.write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n')
print(f'Imported {len(records)} occupations, {len(skills)} essential skills, {sum(len(r["essentialSkills"]) for r in records)} relationships. SHA256 {hashlib.sha256(path.read_bytes()).hexdigest()}')
