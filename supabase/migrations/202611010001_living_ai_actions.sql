-- Extend operation names only. Existing ownership, quota settings, locks and non-refund policy remain unchanged.
create or replace function public.reserve_roadmaps_qwen_tokens(p_action text,p_model text,p_reserved_tokens bigint) returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();budget bigint;max_requests integer;spent bigint;receipt uuid;begin
if uid is null then raise exception 'Authentication required';end if;
if p_action not in('explain','teach','quiz','gap','learn','possibilities','cv-interpret','living-guide','living-embedding','relationship-inference') or length(p_model)>120 or p_reserved_tokens<1 then raise exception 'Invalid request';end if;
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
