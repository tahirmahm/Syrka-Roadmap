import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("Odyssey private imports, assertions, cloud snapshots and conservative AI quotas enforce ownership", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create schema auth;create role anon;create role authenticated;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`,
    );
    await db.exec(
      (
        await readFile("supabase/migrations/202610270001_roadmaps.sql", "utf8")
      ).replace("create extension if not exists pgcrypto;", ""),
    );
    await db.exec(
      await readFile("supabase/migrations/202610290001_odyssey.sql", "utf8"),
    );
    await db.exec(
      await readFile(
        "supabase/migrations/202610290002_qwen_token_plan.sql",
        "utf8",
      ),
    );
    const a = "00000000-0000-4000-8000-000000000001",
      b = "00000000-0000-4000-8000-000000000002",
      doc = "00000000-0000-4000-8000-000000000003";
    await db.exec(
      `insert into auth.users values('${a}'),('${b}');insert into profiles(id,display_name) values('${a}','Alice'),('${b}','Bob');insert into ontology_versions values('test','https://example.org',null,'en',null,now(),'{}');insert into catalogue_skills(id,label,version_id,source_url) values('skill','Skill','test','https://example.org');update roadmaps_private.ai_settings set daily_budget_micro_usd=100;set role authenticated;set request.jwt.claim.sub='${a}';insert into document_imports(id,owner_id,document_kind,state) values('${doc}','${a}','cv','review-required');insert into workspace_snapshots(owner_id,schema_version,state) values('${a}',2,'{"version":2}');`,
    );
    assert.equal(
      (await db.query("select * from document_imports")).rows.length,
      1,
    );
    await assert.rejects(
      db.exec(
        `insert into capability_assertions(owner_id,skill_id,verification,mapping_method,mapping_confidence,source_system,source_record_id) values('${a}','skill','institution-verified','exact','high','upload','1')`,
      ),
      /check constraint/,
    );
    const receipt = (
      await db.query<{ id: string }>(
        `select reserve_roadmaps_ai_budget('explain','test-model',40) as id`,
      )
    ).rows[0].id;
    await db.exec(
      `select record_roadmaps_ai_usage('${receipt}',0,0,'failed');set request.jwt.claim.sub='${b}';`,
    );
    assert.equal(
      (await db.query("select * from document_imports")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("select * from workspace_snapshots")).rows.length,
      0,
    );
    await assert.rejects(
      db.exec(
        `insert into parsed_claims(owner_id,import_id,claim_kind,claim_text,source_quote) values('${b}','${doc}','skill','Forged','Source')`,
      ),
      /foreign key/,
    );
    await db.exec(
      `select reserve_roadmaps_ai_budget('teach','test-model',40);`,
    );
    await assert.rejects(
      db.exec(`select reserve_roadmaps_ai_budget('teach','test-model',40)`),
      /Daily AI budget reached/,
    );
    await assert.rejects(
      db.exec(
        "update roadmaps_private.ai_settings set daily_budget_micro_usd=999999",
      ),
      /permission denied/,
    );
    await db.exec("reset role;");
    assert.equal(
      (
        await db.query<{ n: number }>(
          "select reserved_micro_usd as n from roadmaps_private.ai_daily_budget",
        )
      ).rows[0].n,
      80,
    );
    await db.exec(`set role authenticated;set request.jwt.claim.sub='${a}';`);
    await assert.rejects(
      db.query("select reserve_roadmaps_qwen_tokens('explain','test',40)"),
      /not enabled/,
    );
    await db.exec(
      "reset role;update roadmaps_private.qwen_token_settings set daily_token_limit=100;set role authenticated;",
    );
    const qr = (
      await db.query<{ id: string }>(
        "select reserve_roadmaps_qwen_tokens('explain','test',60) as id",
      )
    ).rows[0].id;
    await db.exec(`select record_roadmaps_qwen_usage('${qr}',0,0,'failed');`);
    await assert.rejects(
      db.query("select reserve_roadmaps_qwen_tokens('explain','test',50)"),
      /quota reached/,
    );
    await assert.rejects(
      db.query("select * from roadmaps_private.qwen_token_reservations"),
      /permission denied/,
    );
    await db.exec("reset role;");
    assert.equal(
      (
        await db.query<{ n: number }>(
          "select reserved_tokens as n from roadmaps_private.qwen_daily_tokens",
        )
      ).rows[0].n,
      60,
    );
    // Simulate two authenticated devices loading the same revision.
    await db.exec(`set role authenticated;set request.jwt.claim.sub='${a}';`);
    const revision = (
      await db.query<{ revision: string }>(
        "select updated_at::text as revision from workspace_snapshots",
      )
    ).rows[0].revision;
    const saved = await db.query(
      `update workspace_snapshots set state='{"version":2,"device":"first"}',updated_at='2026-10-31T12:00:00Z' where owner_id='${a}' and updated_at='${revision}' returning owner_id`,
    );
    assert.equal(saved.rows.length, 1);
    const stale = await db.query(
      `update workspace_snapshots set state='{"version":2,"device":"stale"}' where owner_id='${a}' and updated_at='${revision}' returning owner_id`,
    );
    assert.equal(stale.rows.length, 0);
    await db.exec(`set request.jwt.claim.sub='${b}';`);
    assert.equal(
      (
        await db.query(
          `select * from workspace_snapshots where owner_id='${a}'`,
        )
      ).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query(
          `update workspace_snapshots set state='{"version":2}' where owner_id='${a}' returning owner_id`,
        )
      ).rows.length,
      0,
    );
    await db.exec("set role anon;");
    await assert.rejects(
      db.query("select reserve_roadmaps_qwen_tokens('explain','test',1)"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select * from parsed_claims"),
      /permission denied/,
    );
    assert.equal(
      (await db.query("select * from catalogue_skills")).rows.length,
      1,
    );
  } finally {
    await db.close();
  }
});
