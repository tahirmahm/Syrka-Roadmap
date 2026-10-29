import {NextRequest,NextResponse} from 'next/server';
import {catalogue,occupationById} from '@/odyssey/server/data';
import {searchOccupations,relatedOccupations,normalize} from '@/odyssey/catalogue';
export async function GET(request:NextRequest){
 const p=request.nextUrl.searchParams;const id=p.get('id');
 if(id){const occupation=occupationById.get(id);if(!occupation)return NextResponse.json({error:'Occupation not found'},{status:404});const ids=new Set([...occupation.essential,...occupation.optional]);return NextResponse.json({occupation,skills:catalogue.skills.filter(s=>ids.has(s.id)),related:relatedOccupations(catalogue,id),version:catalogue.version});}
 if(p.get('mode')==='skills')return NextResponse.json({version:catalogue.version,skills:(p.get('q')?catalogue.skills.filter(s=>normalize(s.label+' '+s.aliases.join(' ')).includes(normalize(p.get('q')!))).slice(0,30):catalogue.skills).map(({id,label,aliases})=>({id,label,aliases}))},{headers:{'Cache-Control':'public, max-age=3600'}});
 const q=(p.get('q')||'').slice(0,200),domain=(p.get('domain')||'').slice(0,100),limit=Math.min(100,Math.max(1,Number(p.get('limit'))||40));
 const found=searchOccupations(catalogue,q,domain,Number.MAX_SAFE_INTEGER).filter(o=>!p.get('skill')||o.essential.includes(p.get('skill')!)||o.optional.includes(p.get('skill')!));const offset=Math.min(100000,Math.max(0,Number(p.get('offset'))||0));const occupations=found.slice(offset,offset+limit);return NextResponse.json({occupations,matchedCount:found.length,offset,total:catalogue.occupations.length,skillCount:catalogue.skills.length,domains:[...new Set(catalogue.occupations.map(o=>o.domain))].sort(),version:catalogue.version,coverage:catalogue.coverage},{headers:{'Cache-Control':'public, max-age=300'}});
}
