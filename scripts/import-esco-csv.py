"""Normalize an unmodified ESCO English CSV distribution, with pinned mirror provenance.
Usage: python3 scripts/import-esco-csv.py /path/to/data/raw MIRROR_COMMIT
The source snapshot is not asserted to be the latest ESCO release.
"""
import csv,datetime,hashlib,json,pathlib,subprocess,sys,collections
root=pathlib.Path(__file__).resolve().parents[1];raw=pathlib.Path(sys.argv[1]);commit=sys.argv[2]
assert len(commit)==40 and all(c in '0123456789abcdef' for c in commit)
def rows(name):
 with (raw/name).open(encoding='utf-8-sig',newline='') as f:return list(csv.DictReader(f))
now=datetime.datetime.now(datetime.timezone.utc).isoformat();version='esco-english-mirror-'+commit[:12]
occ=rows('occupations_en.csv');skills=rows('skills_en.csv');rels=rows('occupationSkillRelations_en.csv');hier=rows('broaderRelationsOccPillar_en.csv');skill_hier=rows('broaderRelationsSkillPillar_en.csv')
ess=collections.defaultdict(list);opt=collections.defaultdict(list);broader=collections.defaultdict(list);sb=collections.defaultdict(list)
for r in rels:(ess if r['relationType']=='essential' else opt)[r['occupationUri']].append(r['skillUri'])
for r in hier:broader[r['conceptUri']].append(r['broaderUri'])
for r in skill_hier:sb[r['conceptUri']].append(r['broaderUri'])
domains={'11':'Leadership & public affairs','12':'Business management','13':'Operations management','14':'Service management','21':'Science & engineering','22':'Health','23':'Education','24':'Business & finance','25':'Technology','26':'Law, society & culture','31':'Science & technical services','32':'Health support','33':'Business services','34':'Social & cultural services','35':'ICT support','41':'Office & administration','51':'Personal services','52':'Sales','61':'Agriculture','71':'Construction','72':'Trades','81':'Manufacturing'}
def source(r,kind):return {'system':'ESCO mirrored CSV','recordId':r['conceptUri'],'url':'https://ec.europa.eu/esco/api/resource/'+kind+'?uri='+r['conceptUri']+'&language=en','version':version,'retrievedAt':now}
output={'version':version,'retrievedAt':now,'source':'European Commission ESCO, English CSV distribution mirrored at https://github.com/Y4SSERk/ESCO-csv2Graph/tree/'+commit+'/data/raw','coverage':'English mirrored snapshot; official release number not established. Current official API refresh is a separate importer.','occupations':[{'id':r['conceptUri'],'label':r['preferredLabel'],'aliases':r['altLabels'].splitlines(),'description':r['description'],'code':r['code'],'domain':domains.get(r['iscoGroup'][:2],'Other occupations'),'essential':ess[r['conceptUri']],'optional':opt[r['conceptUri']],'broader':broader[r['conceptUri']],'labels':{'en':r['preferredLabel']},'modifiedDate':r['modifiedDate'],'regulatedProfessionNote':r['regulatedProfessionNote'],'source':source(r,'occupation')} for r in occ if r['status']=='released'], 'skills':[{'id':r['conceptUri'],'label':r['preferredLabel'],'aliases':r['altLabels'].splitlines(),'description':r['description'],'type':r['skillType'],'broader':sb[r['conceptUri']],'modifiedDate':r['modifiedDate'],'source':source(r,'skill')} for r in skills if r['status']=='released']}
ids={s['id'] for s in output['skills']};missing={s for o in output['occupations'] for s in o['essential']+o['optional'] if s not in ids};assert not missing,missing
old=json.loads((root/'src/data/esco.json').read_text());lookup={s['id']:s for s in output['skills']};agree=sum(lookup.get(s['uri'],{}).get('label')==s['label'] for s in old['skills']);assert agree>=len(old['skills'])*.95,'Existing official sample mismatch'
(root/'src/data/catalogue.json').write_text(json.dumps(output,ensure_ascii=False,separators=(',',':'))+'\n')
files=['occupations_en.csv','skills_en.csv','occupationSkillRelations_en.csv','broaderRelationsOccPillar_en.csv','broaderRelationsSkillPillar_en.csv']
manifest={'version':version,'mirrorCommit':commit,'retrievedAt':now,'occupations':len(output['occupations']),'skills':len(output['skills']),'essentialRelations':sum(len(o['essential']) for o in output['occupations']),'optionalRelations':sum(len(o['optional']) for o in output['occupations']),'officialSampleLabelMatches':agree,'officialSampleSize':len(old['skills']),'files':{n:hashlib.sha256((raw/n).read_bytes()).hexdigest() for n in files},'attribution':'European Commission ESCO. CSVs normalized into an application index; neither mirror software licence nor this transformation changes underlying data rights. See https://commission.europa.eu/legal-notice_en and https://esco.ec.europa.eu/en/use-esco.'}
(root/'src/data/catalogue-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print(json.dumps(manifest,indent=2))
