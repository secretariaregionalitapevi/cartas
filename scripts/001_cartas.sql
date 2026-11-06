-- Executar no SQL Editor do projeto Supabase usado para as cartas.
begin;
create table if not exists public.cartas_emissoes (
 id uuid primary key default gen_random_uuid(),
 duplicate_key text not null unique check(length(duplicate_key)=64),
 nome text not null, comum text not null, municipio text not null,
 tipo text not null check(tipo in ('musico','organista')),
 modalidade text not null, event_id text not null,
 event_snapshot jsonb not null, ministry_snapshot jsonb not null,
 payload jsonb not null,
 status text not null default 'processing' check(status in ('processing','ready','failed')),
 pdf_path text, pdf_sha256 text,
 created_by uuid references auth.users(id),
 owner_session uuid not null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.cartas_emissoes alter column created_by drop not null;
alter table public.cartas_emissoes add column if not exists owner_session uuid;
update public.cartas_emissoes set owner_session=created_by where owner_session is null;
alter table public.cartas_emissoes alter column owner_session set not null;
create index if not exists cartas_owner_date on public.cartas_emissoes(owner_session,created_at desc);
alter table public.cartas_emissoes enable row level security;
revoke all on public.cartas_emissoes from anon,authenticated;
grant all on public.cartas_emissoes to service_role;
-- Todo acesso passa pelo servidor, com sessão validada e restrição de proprietário.
create table if not exists public.cartas_auditoria (
 id bigint generated always as identity primary key,
 carta_id uuid not null, created_by uuid, owner_session uuid,
 action text not null, before_data jsonb, after_data jsonb,
 created_at timestamptz not null default now()
);
alter table public.cartas_auditoria alter column created_by drop not null;
alter table public.cartas_auditoria add column if not exists owner_session uuid;
alter table public.cartas_auditoria enable row level security;
revoke all on public.cartas_auditoria from anon,authenticated;
create or replace function public.cartas_audit_change() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if TG_OP='UPDATE' then NEW.updated_at=now(); end if;
 insert into public.cartas_auditoria(carta_id,created_by,owner_session,action,before_data,after_data)
 values(NEW.id,NEW.created_by,NEW.owner_session,TG_OP,case when TG_OP='UPDATE' then to_jsonb(OLD) else null end,to_jsonb(NEW));
 return NEW;
end $$;
revoke all on function public.cartas_audit_change() from public;
drop trigger if exists cartas_audit on public.cartas_emissoes;
create trigger cartas_audit before insert or update on public.cartas_emissoes for each row execute function public.cartas_audit_change();
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('cartas-musicais','cartas-musicais',false,5242880,array['application/pdf'])
on conflict(id) do nothing;
commit;
