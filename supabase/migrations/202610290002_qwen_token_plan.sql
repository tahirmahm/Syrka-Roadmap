-- Prepaid Token Plan quotas are tokens, not USD. Disabled until configured by a database operator.
-- No automatic recharge, paid fallback or refunds from client-reported usage.
create table roadmaps_private.qwen_token_settings(id boolean primary key default true check(id),daily_token_limit bigint not null default 0 check(daily_token_limit>=0),max_requests_per_user integer not null default 30 check(max_requests_per_user between 1 and 1000));
insert into roadmaps_private.qwen_token_settings(id) values(true);
create table roadmaps_private.qwen_daily_tokens(day date primary key,reserved_tokens bigint not null default 0);
create table roadmaps_private.qwen_token_reservations(id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,action text not null,model text not null,reserved_tokens bigint not null check(reserved_tokens>0),input_tokens integer,output_tokens integer,status text not null default 'reserved',created_at timestamptz not null default now());
create index qwen_token_reservations_owner_time on roadmaps_private.qwen_token_reservations(owner_id,created_at);
create function public.reserve_roadmaps_qwen_tokens(p_action text,p_model text,p_reserved_tokens bigint) returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();budget bigint;max_requests integer;spent bigint;receipt uuid;begin
if uid is null then raise exception 'Authentication required';end if;
if p_action not in('explain','teach','quiz','gap','learn','possibilities','cv-interpret') or length(p_model)>120 or p_reserved_tokens<1 then raise exception 'Invalid request';end if;
select daily_token_limit,max_requests_per_user into budget,max_requests from roadmaps_private.qwen_token_settings where id=true;
if budget is null or budget=0 then raise exception 'Qwen token quota is not enabled';end if;
-- Serialize reservations globally, including per-user rate checks.
insert into roadmaps_private.qwen_daily_tokens(day) values(current_date) on conflict do nothing;
select reserved_tokens into spent from roadmaps_private.qwen_daily_tokens where day=current_date for update;
if (select count(*) from roadmaps_private.qwen_token_reservations where owner_id=uid and created_at>=current_date)>=max_requests then raise exception 'Daily request limit reached';end if;
if (select count(*) from roadmaps_private.qwen_token_reservations where owner_id=uid and created_at>=now()-interval '1 minute')>=6 then raise exception 'Rate limit reached';end if;
if spent+p_reserved_tokens>budget then raise exception 'Daily Qwen token quota reached';end if;
update roadmaps_private.qwen_daily_tokens set reserved_tokens=reserved_tokens+p_reserved_tokens where day=current_date;
insert into roadmaps_private.qwen_token_reservations(owner_id,action,model,reserved_tokens) values(uid,p_action,p_model,p_reserved_tokens) returning id into receipt;return receipt;
end $$;
revoke all on function public.reserve_roadmaps_qwen_tokens(text,text,bigint) from public;
grant execute on function public.reserve_roadmaps_qwen_tokens(text,text,bigint) to authenticated;
-- Reported provider token usage is metadata, never a refund of reserved budget.
create function public.record_roadmaps_qwen_usage(p_id uuid,p_input_tokens integer,p_output_tokens integer,p_status text) returns void language plpgsql security definer set search_path='' as $$
begin if auth.uid() is null or p_input_tokens<0 or p_output_tokens<0 or p_status not in('succeeded','failed','invalid-output','timeout') then raise exception 'Invalid usage record';end if;
update roadmaps_private.qwen_token_reservations set input_tokens=p_input_tokens,output_tokens=p_output_tokens,status=p_status where id=p_id and owner_id=auth.uid() and status='reserved';
end $$;
revoke all on function public.record_roadmaps_qwen_usage(uuid,integer,integer,text) from public;
grant execute on function public.record_roadmaps_qwen_usage(uuid,integer,integer,text) to authenticated;
