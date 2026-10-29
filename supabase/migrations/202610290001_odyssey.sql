-- Additive Roadmaps 2.0 schema. Apply only to the existing dedicated Roadmaps DB.
-- Never apply to Campus, Workspace or another Syrka application's database.
create table public.ontology_versions(id text primary key,source_url text not null,release_label text,language text not null,snapshot_sha256 text,retrieved_at timestamptz not null,manifest jsonb not null default '{}');
create table public.catalogue_occupations(id text primary key,label text not null,description text not null default '',isco_code text,domain text,version_id text not null references public.ontology_versions(id),source_url text not null,metadata jsonb not null default '{}');
create table public.catalogue_skills(id text primary key,label text not null,description text not null default '',skill_type text,version_id text not null references public.ontology_versions(id),source_url text not null,metadata jsonb not null default '{}');
create table public.occupation_aliases(occupation_id text not null references public.catalogue_occupations(id) on delete cascade,language text not null,label text not null,primary key(occupation_id,language,label));
create table public.skill_aliases(skill_id text not null references public.catalogue_skills(id) on delete cascade,language text not null,label text not null,primary key(skill_id,language,label));
create index occupation_label_search on public.catalogue_occupations using gin(to_tsvector('simple',label||' '||description));
create index occupation_alias_search on public.occupation_aliases using gin(to_tsvector('simple',label));
create index skill_alias_search on public.skill_aliases using gin(to_tsvector('simple',label));
create table public.occupation_requirements(occupation_id text not null references public.catalogue_occupations(id) on delete cascade,skill_id text not null references public.catalogue_skills(id),relation_type text not null check(relation_type in('essential','optional')),version_id text not null references public.ontology_versions(id),primary key(occupation_id,skill_id,relation_type));
create index occupation_requirements_skill on public.occupation_requirements(skill_id,relation_type);
create table public.learning_topics(id text primary key,label text not null,family text not null,summary text not null,source_url text not null,version_id text not null references public.ontology_versions(id));
create table public.skill_prerequisites(from_topic text not null references public.learning_topics(id),to_topic text not null references public.learning_topics(id),provenance text not null check(provenance in('authoritative-curriculum','expert-reviewed','resource-derived','ai-awaiting-validation')),source_url text not null,reason text not null,primary key(from_topic,to_topic),check(from_topic<>to_topic));
create table public.career_transitions(from_occupation text not null references public.catalogue_occupations(id),to_occupation text not null references public.catalogue_occupations(id),relation_type text not null check(relation_type in('shared-requirements','source-hierarchy','source-specialization')),provenance text not null,source_url text,primary key(from_occupation,to_occupation,relation_type),check(from_occupation<>to_occupation));
create table public.opportunity_sources(id uuid primary key default gen_random_uuid(),organization text not null,url text not null,jurisdiction text,verified_at timestamptz,availability text not null default 'unknown' check(availability in('unknown','available','outdated','unavailable')),metadata jsonb not null default '{}');
create table public.workspace_snapshots(owner_id uuid primary key references public.profiles(id) on delete cascade,schema_version integer not null check(schema_version=2),state jsonb not null check(jsonb_typeof(state)='object' and state->>'version'='2'),updated_at timestamptz not null default now());
create table public.document_imports(id uuid primary key default gen_random_uuid(),owner_id uuid not null references public.profiles(id) on delete cascade,document_kind text not null,state text not null check(state in('queued','processing','review-required','completed','failed')),source_name text,original_retained boolean not null default false check(original_retained=false),error_code text,attempt_count integer not null default 0,created_at timestamptz not null default now(),unique(id,owner_id));
create table public.parsed_claims(id uuid primary key default gen_random_uuid(),owner_id uuid not null references public.profiles(id) on delete cascade,import_id uuid not null,claim_kind text not null,claim_text text not null,source_quote text not null,page integer check(page>0),approved boolean not null default false,verification text not null default 'document-supported' check(verification in('document-supported','self-reported','unverified')),foreign key(import_id,owner_id) references public.document_imports(id,owner_id) on delete cascade,unique(id,owner_id));
create table public.educational_programmes(id uuid primary key default gen_random_uuid(),owner_id uuid not null references public.profiles(id) on delete cascade,institution text not null,title text not null,source_system text not null,source_record_id text not null,unique(id,owner_id));
create table public.academic_courses(id uuid primary key default gen_random_uuid(),owner_id uuid not null references public.profiles(id) on delete cascade,programme_id uuid,code text,title text not null,completion_status text not null check(completion_status in('reported-complete','in-progress','unknown')),verification text not null check(verification in('document-supported','self-reported')),source_system text not null,source_record_id text not null,foreign key(programme_id,owner_id) references public.educational_programmes(id,owner_id),unique(id,owner_id));
create table public.learning_outcomes(id uuid primary key default gen_random_uuid(),owner_id uuid not null references public.profiles(id) on delete cascade,course_id uuid not null,outcome_text text not null,source_quote text not null,foreign key(course_id,owner_id) references public.academic_courses(id,owner_id) on delete cascade,unique(id,owner_id));
create table public.academic_assessments(id uuid primary key default gen_random_uuid(),owner_id uuid not null references public.profiles(id) on delete cascade,course_id uuid not null,title text not null,evidence_reference text not null,source_system text not null,source_record_id text not null,foreign key(course_id,owner_id) references public.academic_courses(id,owner_id) on delete cascade,unique(id,owner_id));
create table public.capability_assertions(id uuid primary key default gen_random_uuid(),owner_id uuid not null references public.profiles(id) on delete cascade,skill_id text not null references public.catalogue_skills(id),claim_id uuid,outcome_id uuid,assessment_id uuid,verification text not null check(verification in('document-supported','self-reported','inferred')),mapping_method text not null check(mapping_method in('exact','alias','lexical-candidate','user-confirmed','ai-candidate')),mapping_confidence text not null check(mapping_confidence in('high','medium','low')),user_confirmed boolean not null default false,consent boolean not null default false,source_system text not null,source_record_id text not null,foreign key(claim_id,owner_id) references public.parsed_claims(id,owner_id) on delete cascade,foreign key(outcome_id,owner_id) references public.learning_outcomes(id,owner_id) on delete cascade,foreign key(assessment_id,owner_id) references public.academic_assessments(id,owner_id) on delete cascade);
create index capability_assertions_owner_skill on public.capability_assertions(owner_id,skill_id);
-- Read-only shared catalogue; trusted migrations/import tools own updates.
do $$ declare t text;begin foreach t in array array['ontology_versions','catalogue_occupations','catalogue_skills','occupation_aliases','skill_aliases','occupation_requirements','learning_topics','skill_prerequisites','career_transitions','opportunity_sources'] loop
execute format('alter table public.%I enable row level security',t);
execute format('create policy catalogue_read on public.%I for select using(true)',t);
execute format('grant select on public.%I to anon,authenticated',t);end loop;end $$;
-- Private application records. No public CV, transcript, evidence or profile API.
do $$ declare t text;begin foreach t in array array['workspace_snapshots','document_imports','parsed_claims','educational_programmes','academic_courses','learning_outcomes','academic_assessments','capability_assertions'] loop
execute format('alter table public.%I enable row level security',t);
execute format('create policy private_owner on public.%I for all to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid())',t);
execute format('grant select,insert,update,delete on public.%I to authenticated',t);
execute format('create index %I on public.%I(owner_id)',t||'_owner_idx',t);end loop;end $$;
-- Durable, conservative global budget. No provider keys or prompts live here.
create schema roadmaps_private;
revoke all on schema roadmaps_private from public;
create table roadmaps_private.ai_settings(id boolean primary key default true check(id),daily_budget_micro_usd bigint not null default 0 check(daily_budget_micro_usd>=0),max_requests_per_user integer not null default 30 check(max_requests_per_user between 1 and 1000));
insert into roadmaps_private.ai_settings(id) values(true);
create table roadmaps_private.ai_daily_budget(day date primary key,reserved_micro_usd bigint not null default 0);
create table roadmaps_private.ai_reservations(id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,action text not null,model text not null,max_cost_micro_usd bigint not null check(max_cost_micro_usd>0),input_tokens integer,output_tokens integer,status text not null default 'reserved',created_at timestamptz not null default now());
create index ai_reservations_owner_time on roadmaps_private.ai_reservations(owner_id,created_at);
create function public.reserve_roadmaps_ai_budget(p_action text,p_model text,p_max_cost_micro_usd bigint) returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();budget bigint;max_requests integer;spent bigint;receipt uuid;begin
if uid is null then raise exception 'Authentication required';end if;
if p_action not in('explain','teach','quiz','gap','learn','possibilities','cv-interpret') or length(p_model)>120 or p_max_cost_micro_usd<1 then raise exception 'Invalid request';end if;
select daily_budget_micro_usd,max_requests_per_user into budget,max_requests from roadmaps_private.ai_settings where id=true;
if budget is null or budget=0 then raise exception 'AI budget is not enabled';end if;
-- Serialize reservations globally, including per-user rate checks.
insert into roadmaps_private.ai_daily_budget(day) values(current_date) on conflict do nothing;
select reserved_micro_usd into spent from roadmaps_private.ai_daily_budget where day=current_date for update;
if (select count(*) from roadmaps_private.ai_reservations where owner_id=uid and created_at>=current_date)>=max_requests then raise exception 'Daily request limit reached';end if;
if (select count(*) from roadmaps_private.ai_reservations where owner_id=uid and created_at>=now()-interval '1 minute')>=6 then raise exception 'Rate limit reached';end if;
if spent+p_max_cost_micro_usd>budget then raise exception 'Daily AI budget reached';end if;
update roadmaps_private.ai_daily_budget set reserved_micro_usd=reserved_micro_usd+p_max_cost_micro_usd where day=current_date;
insert into roadmaps_private.ai_reservations(owner_id,action,model,max_cost_micro_usd) values(uid,p_action,p_model,p_max_cost_micro_usd) returning id into receipt;return receipt;
end $$;
revoke all on function public.reserve_roadmaps_ai_budget(text,text,bigint) from public;
grant execute on function public.reserve_roadmaps_ai_budget(text,text,bigint) to authenticated;
-- Reported provider token usage is metadata, never a refund of reserved budget.
create function public.record_roadmaps_ai_usage(p_id uuid,p_input_tokens integer,p_output_tokens integer,p_status text) returns void language plpgsql security definer set search_path='' as $$
begin if auth.uid() is null or p_input_tokens<0 or p_output_tokens<0 or p_status not in('succeeded','failed','invalid-output','timeout') then raise exception 'Invalid usage record';end if;
update roadmaps_private.ai_reservations set input_tokens=p_input_tokens,output_tokens=p_output_tokens,status=p_status where id=p_id and owner_id=auth.uid() and status='reserved';
end $$;
revoke all on function public.record_roadmaps_ai_usage(uuid,integer,integer,text) from public;
grant execute on function public.record_roadmaps_ai_usage(uuid,integer,integer,text) to authenticated;
