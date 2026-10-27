-- Run only in a dedicated Syrka Roadmaps Supabase project.
-- Never apply this migration to Campus or Workspace.
create extension if not exists pgcrypto;
create table public.sources (
 id uuid primary key default gen_random_uuid(), label text not null, url text not null,
 version text, licence text, retrieved_at timestamptz, metadata jsonb not null default '{}'
);
create table public.ontology_entities (
 id text primary key, kind text not null check (kind in ('institution','programme','course','learning-outcome','skill','competency','proficiency','qualification','credential','assessment','project','experience','occupation','industry','prerequisite','opportunity','requirement','eligibility-rule')),
 label text not null, source_id uuid references public.sources(id), source_record_id text,
 metadata jsonb not null default '{}', unique(source_id,source_record_id)
);
create index ontology_entities_kind_idx on public.ontology_entities(kind);
create table public.ontology_relationships (
 id uuid primary key default gen_random_uuid(), from_id text not null references public.ontology_entities(id),
 relation text not null check (relation in ('HAS_CREDENTIAL','DEMONSTRATES','TEACHES','PROVIDES_EVIDENCE_FOR','REQUIRES','SATISFIES','ISSUED_BY')),
 to_id text not null references public.ontology_entities(id), source_id uuid references public.sources(id),
 unique(from_id,relation,to_id), check(from_id<>to_id)
);
create index ontology_relationships_from_idx on public.ontology_relationships(from_id,relation);
create index ontology_relationships_to_idx on public.ontology_relationships(to_id,relation);
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade, display_name text not null,
 preferences jsonb not null default '{}', created_at timestamptz not null default now()
);
create table public.consent_records (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade,
 purpose text not null, granted boolean not null, recorded_at timestamptz not null default now()
);
create table public.evidence_records (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade,
 entity_id text references public.ontology_entities(id), source_system text not null, source_record_id text not null,
 issuer text, evidence_reference text, source_timestamp timestamptz not null,
 -- Browser-created records can never assert issuer verification.
 verification text not null check (verification in ('document-supported','self-reported','inferred','unverified')),
 consent boolean not null default false, metadata jsonb not null default '{}', unique(owner_id,source_system,source_record_id)
);
create index evidence_records_owner_idx on public.evidence_records(owner_id);
create table public.roadmaps (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade,
 destination_id text not null references public.ontology_entities(id), title text not null,
 state jsonb not null default '{}', updated_at timestamptz not null default now(), unique(id,owner_id)
);
create index roadmaps_owner_idx on public.roadmaps(owner_id);
create table public.roadmap_nodes (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade,
 roadmap_id uuid not null, entity_id text references public.ontology_entities(id), status text not null,
 metadata jsonb not null default '{}', foreign key(roadmap_id,owner_id) references public.roadmaps(id,owner_id) on delete cascade,
 unique(id,roadmap_id,owner_id)
);
create table public.roadmap_edges (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade,
 roadmap_id uuid not null, source_node uuid not null, target_node uuid not null,
 foreign key(roadmap_id,owner_id) references public.roadmaps(id,owner_id) on delete cascade,
 foreign key(source_node,roadmap_id,owner_id) references public.roadmap_nodes(id,roadmap_id,owner_id) on delete cascade,
 foreign key(target_node,roadmap_id,owner_id) references public.roadmap_nodes(id,roadmap_id,owner_id) on delete cascade,
 check(source_node<>target_node)
);
create table public.milestone_states (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade,
 roadmap_id uuid not null, node_id uuid not null, status text not null check(status in ('not-started','in-progress','completed')),
 updated_at timestamptz not null default now(), verification text not null default 'self-reported' check(verification='self-reported'),
 foreign key(node_id,roadmap_id,owner_id) references public.roadmap_nodes(id,roadmap_id,owner_id) on delete cascade,
 unique(owner_id,roadmap_id,node_id)
);
create table public.opportunity_requirements (
 id uuid primary key default gen_random_uuid(), opportunity_id text not null references public.ontology_entities(id),
 requirement_id text not null references public.ontology_entities(id), source_id uuid not null references public.sources(id),
 jurisdiction text, verified_at timestamptz, rule jsonb not null default '{}'
);
create table public.audit_logs (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade,
 event text not null, occurred_at timestamptz not null default now(), metadata jsonb not null default '{}'
);
-- Public catalogue is readable; only trusted database migrations can mutate it.
alter table public.sources enable row level security;
alter table public.ontology_entities enable row level security;
alter table public.ontology_relationships enable row level security;
alter table public.opportunity_requirements enable row level security;
create policy sources_read on public.sources for select using(true);
create policy entities_read on public.ontology_entities for select using(true);
create policy relationships_read on public.ontology_relationships for select using(true);
create policy requirements_read on public.opportunity_requirements for select using(true);
alter table public.profiles enable row level security;
create policy profiles_own on public.profiles for all to authenticated using(id=auth.uid()) with check(id=auth.uid());
do $$ declare t text; begin
 foreach t in array array['consent_records','evidence_records','roadmaps','roadmap_nodes','roadmap_edges','milestone_states'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy owner_access on public.%I for all to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid())',t);
 execute format('create index %I on public.%I(owner_id)',t||'_owner_access_idx',t);
 end loop;
end $$;
alter table public.audit_logs enable row level security;
create policy audit_read_own on public.audit_logs for select to authenticated using(owner_id=auth.uid());
-- Audit records are inserted by a trusted trigger, not editable by end users.
create function public.audit_roadmap_change() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin insert into public.audit_logs(owner_id,event,metadata) values(new.owner_id,'roadmap.'||lower(TG_OP),jsonb_build_object('roadmap_id',new.id)); return new; end $$;
create trigger roadmap_audit after insert or update on public.roadmaps for each row execute function public.audit_roadmap_change();
revoke all on function public.audit_roadmap_change() from public;
grant usage on schema public to anon,authenticated;
grant select on public.sources,public.ontology_entities,public.ontology_relationships,public.opportunity_requirements to anon,authenticated;
grant select,insert,update,delete on public.profiles,public.consent_records,public.evidence_records,public.roadmaps,public.roadmap_nodes,public.roadmap_edges,public.milestone_states to authenticated;
grant select on public.audit_logs to authenticated;
