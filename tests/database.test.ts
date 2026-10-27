import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("PostgreSQL RLS prevents cross-user reads, writes, child injection and forged verification", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create schema auth; create role anon; create role authenticated; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`,
    );
    const sql = (
      await readFile("supabase/migrations/202610270001_roadmaps.sql", "utf8")
    ).replace("create extension if not exists pgcrypto;", "");
    await db.exec(sql);
    const seed = await readFile("supabase/seed.sql", "utf8");
    await db.exec(seed);
    await db.exec(seed);
    assert.equal(
      (
        await db.query(
          "select * from ontology_relationships where relation='REQUIRES'",
        )
      ).rows.length,
      73,
    );
    const alice = "00000000-0000-4000-8000-000000000001",
      bob = "00000000-0000-4000-8000-000000000002",
      road = "00000000-0000-4000-8000-000000000003";
    await db.exec(
      `insert into auth.users values('${alice}'),('${bob}'); insert into public.ontology_entities(id,kind,label) values('demo','occupation','Demo'); set role authenticated; set request.jwt.claim.sub='${alice}'; insert into profiles(id,display_name) values('${alice}','Alice'); insert into roadmaps(id,owner_id,destination_id,title) values('${road}','${alice}','demo','Private');`,
    );
    assert.equal((await db.query("select * from roadmaps")).rows.length, 1);
    assert.equal((await db.query("select * from audit_logs")).rows.length, 1);
    await db.exec(
      `set request.jwt.claim.sub='${bob}'; insert into profiles(id,display_name) values('${bob}','Bob');`,
    );
    assert.equal((await db.query("select * from roadmaps")).rows.length, 0);
    assert.equal((await db.query("select * from audit_logs")).rows.length, 0);
    await assert.rejects(
      db.exec(
        `insert into roadmaps(owner_id,destination_id,title) values('${alice}','demo','attack')`,
      ),
      /row-level security/,
    );
    await assert.rejects(
      db.exec(
        `insert into roadmap_nodes(owner_id,roadmap_id,status) values('${bob}','${road}','completed')`,
      ),
      /foreign key/,
    );
    await assert.rejects(
      db.exec(
        `insert into evidence_records(owner_id,source_system,source_record_id,source_timestamp,verification) values('${bob}','upload','1',now(),'institution-verified')`,
      ),
      /check constraint/,
    );
    await assert.rejects(
      db.exec(`update ontology_entities set label='hijacked' where id='demo'`),
      /permission denied/,
    );
    await db.exec("reset role; set role anon;");
    await assert.rejects(
      db.query("select * from roadmaps"),
      /permission denied/,
    );
    assert.equal(
      (await db.query("select * from ontology_entities where id='demo'")).rows
        .length,
      1,
    );
  } finally {
    await db.close();
  }
});
