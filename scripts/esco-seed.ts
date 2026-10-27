import { writeFileSync } from "node:fs";
import esco from "../src/data/esco.json";
const quote = (x: string) => `'${x.replaceAll("'", "''")}'`;
const source = "00000000-0000-4000-9000-000000000001";
const rows = [
  `-- Generated from the checked-in ESCO snapshot. Dedicated Roadmaps database only.`,
  `insert into public.sources(id,label,url,version,licence,retrieved_at) values('${source}','European Commission ESCO','https://ec.europa.eu/esco/api',${quote(esco.release)},'European Commission reuse policy',${quote(esco.retrievedAt)}) on conflict(id) do update set retrieved_at=excluded.retrieved_at;`,
];
for (const s of esco.skills)
  rows.push(
    `insert into public.ontology_entities(id,kind,label,source_id,source_record_id) values(${quote(s.uri)},'skill',${quote(s.label)},'${source}',${quote(s.uri)}) on conflict(id) do nothing;`,
  );
for (const o of esco.occupations) {
  rows.push(
    `insert into public.ontology_entities(id,kind,label,source_id,source_record_id) values(${quote(o.uri)},'occupation',${quote(o.label)},'${source}',${quote(o.uri)}) on conflict(id) do nothing;`,
  );
  for (const s of o.essentialSkills)
    rows.push(
      `insert into public.ontology_relationships(from_id,relation,to_id,source_id) values(${quote(o.uri)},'REQUIRES',${quote(s)},'${source}') on conflict(from_id,relation,to_id) do nothing;`,
    );
}
writeFileSync("supabase/seed.sql", rows.join("\n") + "\n");
console.log(
  `${esco.occupations.length} occupations, ${esco.skills.length} skills seeded.`,
);
