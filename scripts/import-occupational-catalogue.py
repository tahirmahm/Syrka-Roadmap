"""Build a bounded, resumable ESCO snapshot from verified official API responses.
Follow API next links rather than assuming offset means records. Never invent IDs.
"""
import concurrent.futures,datetime,json,pathlib,time,urllib.parse,urllib.request
ROOT=pathlib.Path(__file__).resolve().parents[1];CACHE=ROOT/'.cache/esco';CACHE.mkdir(parents=True,exist_ok=True)
BASE='https://ec.europa.eu/esco/api/'
def get(url):
 import hashlib
 p=CACHE/(hashlib.sha256(url.encode()).hexdigest()+'.json')
 if p.exists():return json.loads(p.read_text())
 for attempt in range(3):
  try:
   with urllib.request.urlopen(url,timeout=40) as r:data=json.load(r)
   p.write_text(json.dumps(data));return data
  except Exception:
   if attempt==2:raise
   time.sleep(attempt+1)
def search(kind):
 url=BASE+'search?'+urllib.parse.urlencode({'type':kind,'language':'en','limit':1000,'full':'true'})
 rows=[];seen=set()
 while url and url not in seen:
  seen.add(url);data=get(url);rows.extend(data.get('_embedded',{}).get('results',[]));url=(data.get('_links',{}).get('next') or {}).get('href');print(kind,len(rows),'of',data.get('total'),flush=True)
 return list({r['uri']:r for r in rows}.values())
def labels(obj):
 x=obj.get('alternativeLabel',{}).get('en',[])
 return x if isinstance(x,list) else [x] if x else []
def desc(obj):
 x=obj.get('description',{}).get('en','')
 return x.get('literal','') if isinstance(x,dict) else x
def links(obj,key):return [x['uri'] for x in obj.get('_links',{}).get(key,[]) if x.get('uri')]
def hydrate(r,kind):
 if kind=='occupation' and not r.get('_links',{}).get('hasEssentialSkill'):return get(BASE+'resource/'+kind+'?'+urllib.parse.urlencode({'uri':r['uri'],'language':'en'}))
 return r
if __name__=='__main__':
 now=datetime.datetime.now(datetime.timezone.utc).isoformat();occupations=search('occupation');skills=search('skill')
 with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:occupations=list(pool.map(lambda r:hydrate(r,'occupation'),occupations))
 domains={'11':'Leadership & public affairs','12':'Business management','13':'Operations management','14':'Service management','21':'Science & engineering','22':'Health','23':'Education','24':'Business & finance','25':'Technology','26':'Law, society & culture','31':'Science & technical services','32':'Health support','33':'Business services','34':'Social & cultural services','35':'ICT support','41':'Office & administration','51':'Personal services','52':'Sales','61':'Agriculture','71':'Construction','72':'Trades','81':'Manufacturing'}
 def source(r):return {'system':'ESCO','recordId':r['uri'],'url':BASE+'resource/'+('occupation' if r.get('className')=='Occupation' else 'skill')+'?'+urllib.parse.urlencode({'uri':r['uri'],'language':'en'}),'version':'official API default release (not asserted)','retrievedAt':now}
 output={'version':'esco-api-'+now[:10],'retrievedAt':now,'source':BASE,'coverage':'Official ESCO API catalogue; release identifier not supplied by endpoint','occupations':[{'id':r['uri'],'label':r.get('preferredLabel',{}).get('en',r['title']),'aliases':labels(r),'description':desc(r),'code':r.get('code',''),'domain':domains.get(r.get('code','')[:2],'Other occupations'),'essential':links(r,'hasEssentialSkill'),'optional':links(r,'hasOptionalSkill'),'broader':links(r,'broaderOccupation')+links(r,'broaderIscoGroup'),'labels':r.get('preferredLabel',{}),'source':source(r)} for r in occupations], 'skills':[{'id':r['uri'],'label':r.get('preferredLabel',{}).get('en',r['title']),'aliases':labels(r),'description':desc(r),'type':r.get('skillType','skill'),'broader':links(r,'broaderSkill')+links(r,'broaderConcept'),'source':source(r)} for r in skills]}
 # Fail closed on incomplete relationship endpoints or broken references.
 skill_ids={s['id'] for s in output['skills']}
 assert len(output['occupations'])>1000 and len(output['skills'])>5000,'Unexpectedly incomplete catalogue'
 assert all(s in skill_ids for o in output['occupations'] for s in o['essential']+o['optional']),'Missing skill records'
 out=ROOT/'src/data/catalogue.json';out.write_text(json.dumps(output,ensure_ascii=False,separators=(',',':'))+'\n');print('Saved',len(output['occupations']),'occupations',len(output['skills']),'skills',out.stat().st_size,'bytes')
