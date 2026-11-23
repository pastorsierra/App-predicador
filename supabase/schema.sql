-- Escudriñad — esquema de base de datos en la nube (PostgreSQL / Supabase)
-- Estado: DISEÑADO, aún no desplegado (requiere crear un proyecto Supabase; ver docs/ROADMAP.md, Fase 1b).
-- Principios:
--   * Cada registro pertenece a un usuario (user_id) y está protegido con Row Level Security.
--   * Los identificadores (uuid) se generan en el dispositivo: el mismo id vive en IndexedDB y en la nube.
--   * Borrado lógico (deleted_at) y updated_at para sincronizar sin perder datos ("gana el cambio más reciente").
--   * Las referencias bíblicas se guardan normalizadas (libro USFM + capítulo + verso inicial/final) para poder
--     consultar «todo lo vinculado a Juan 3» desde cualquier módulo.

create extension if not exists "pgcrypto";

-- ---------- Utilidades ----------
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- Referencia bíblica normalizada (tipo compuesto reutilizable)
-- book: código USFM (GEN…REV); verse_end null = un solo verso; verse_start null = capítulo completo
create table if not exists passages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  book char(3) not null,
  chapter int not null check (chapter > 0),
  verse_start int,
  verse_end int,
  chapter_end int,
  created_at timestamptz not null default now()
);
create index on passages (user_id, book, chapter);

-- ---------- Perfil y preferencias ----------
create table if not exists profiles (
  user_id uuid primary key references auth.users on delete cascade,
  display_name text,
  doctrinal_profile text not null default 'ipuc',   -- ipuc | ninguno | personalizado
  doctrinal_notes text,                              -- marco doctrinal personal (contexto para la IA)
  settings jsonb not null default '{}'::jsonb,       -- tema, tamaño de letra, etc.
  updated_at timestamptz not null default now()
);

-- ---------- Cuaderno ----------
create table if not exists notes (
  id uuid primary key,
  user_id uuid not null references auth.users on delete cascade,
  ref text,                 -- clave interna: "JHN.3.16", "JHN.3.16-18", "JHN.3" o null (nota general)
  chap text,                -- "JHN.3" para consultas rápidas por capítulo
  ref_label text,
  kind text not null default 'nota',  -- nota | pregunta | conclusión | idea para sermón | frase | observación
  title text, body text, folder text, tags text[] not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create index on notes (user_id, chap);

create table if not exists highlights (
  id text primary key,       -- "hl:JHN.3.16" (uno por verso)
  user_id uuid not null references auth.users on delete cascade,
  ref text not null, chap text not null, color text not null, ref_label text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists favorites (
  id text primary key,       -- "fav:JHN.3.16"
  user_id uuid not null references auth.users on delete cascade,
  ref text not null, chap text not null, ref_label text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists bookmarks (
  id uuid primary key,
  user_id uuid not null references auth.users on delete cascade,
  ref text not null, chap text, ref_label text, title text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists history (
  id text primary key,       -- "lectura:JHN.3", "pasaje:JHN.3.16", "estudio:ACT.2.36-41"
  user_id uuid not null references auth.users on delete cascade,
  kind text not null, key text not null, title text, at timestamptz not null,
  updated_at timestamptz not null default now(), deleted_at timestamptz
);

-- ---------- Estudios (Módulos 2 y 3) ----------
create table if not exists studies (
  id uuid primary key,
  user_id uuid not null references auth.users on delete cascade,
  kind text not null default 'pasaje',       -- pasaje | temático | doctrinal | exegético | personaje
  title text not null,
  passage text,                               -- clave principal "ACT.2.36-41"
  passage_label text, book char(3),
  status text not null default 'borrador',
  tags text[] not null default '{}',
  sections jsonb not null default '{}'::jsonb, -- {seccion: {text, claims:[{type,text}]}}
  related text[] not null default '{}',        -- otras claves de pasajes
  doctrinal_profile text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create index on studies (user_id, updated_at desc);

-- ---------- Doctrina (Módulo 5) ----------
create table if not exists doctrines (
  id uuid primary key,
  user_id uuid not null references auth.users on delete cascade,
  category text not null,          -- Dios, Unicidad de Dios, Jesucristo, Salvación, Bautismo en agua…
  title text not null,
  definition text, development text, conclusions text,
  sections jsonb not null default '{}'::jsonb,   -- fundamento, objeciones, respuestas, preguntas frecuentes…
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

-- ---------- Biblioteca (Módulo 7) ----------
create table if not exists documents (
  id uuid primary key,
  user_id uuid not null references auth.users on delete cascade,
  title text not null, author text, publisher text, year int, source text,
  category text,                    -- comentario, diccionario, teología sistemática…
  license_note text,                -- de dónde proviene y bajo qué derechos lo usa el usuario
  storage_path text,                -- archivo en Supabase Storage (bucket privado)
  mime text, pages int, tags text[] not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
-- Fragmentos para búsqueda y para que la IA cite páginas exactas
create table if not exists document_chunks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  document_id uuid not null references documents on delete cascade,
  page int, ord int, content text not null,
  tsv tsvector generated always as (to_tsvector('spanish', content)) stored
  -- embedding vector(1024)  -- se activará con la extensión pgvector en la Fase 4
);
create index on document_chunks using gin (tsv);

-- ---------- Predicación (Módulo 11) ----------
create table if not exists series (
  id uuid primary key, user_id uuid not null references auth.users on delete cascade,
  title text not null, description text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists sermons (
  id uuid primary key, user_id uuid not null references auth.users on delete cascade,
  kind text not null default 'sermón',   -- sermón, enseñanza, bosquejo, devocional…
  title text not null, base_text text, theme text, audience text,
  outline jsonb not null default '[]'::jsonb,    -- puntos, subpuntos, citas, ilustraciones (ordenables)
  body jsonb not null default '{}'::jsonb,       -- introducción, contexto, desarrollo, conclusión, llamado, frases…
  preacher_notes text, duration_min int, preached_on date, place text,
  series_id uuid references series on delete set null, tags text[] not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

-- ---------- Personajes, lugares, cronología (Módulos 8–10) ----------
-- Datos de referencia (compartidos, solo lectura para usuarios) + notas personales por usuario
create table if not exists ref_people (id text primary key, name text not null, variants text[], data jsonb not null default '{}'::jsonb, source text not null);
create table if not exists ref_places (id text primary key, name text not null, certainty text check (certainty in ('confirmada','probable','debatida','desconocida')), lat double precision, lon double precision, data jsonb not null default '{}'::jsonb, source text not null);
create table if not exists ref_events (id text primary key, title text not null, date_from int, date_to int, date_note text, data jsonb not null default '{}'::jsonb, source text not null);

-- ---------- Vínculos entre cualquier entidad y pasajes/otras entidades ----------
create table if not exists links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  from_type text not null, from_id text not null,   -- note | study | doctrine | sermon | document | person | place
  to_type text not null, to_id text not null,       -- passage (clave "JHN.3.16") o cualquiera de los anteriores
  created_at timestamptz not null default now(), deleted_at timestamptz
);
create index on links (user_id, to_type, to_id);
create index on links (user_id, from_type, from_id);

-- ---------- Asistente de IA (Fase 4) ----------
create table if not exists ai_conversations (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
  mode text not null,        -- exegeta | hermeneuta | teologo | investigador | predicador | preguntas | biblioteca | estudio
  depth text not null,       -- breve | explicativa | profunda | investigacion
  title text, created_at timestamptz not null default now()
);
create table if not exists ai_messages (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
  conversation_id uuid not null references ai_conversations on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  sources jsonb not null default '[]'::jsonb,  -- [{type:'passage', key:'ACT.2.38'}, {type:'document', id, page}] verificables
  tokens_in int, tokens_out int, created_at timestamptz not null default now()
);

-- ---------- Seguridad: Row Level Security ----------
do $$
declare t text;
begin
  foreach t in array array['passages','notes','highlights','favorites','bookmarks','history','studies','doctrines','documents','document_chunks','series','sermons','links','ai_conversations','ai_messages']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "propio_%1$s" on %1$I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;
alter table profiles enable row level security;
create policy "propio_profiles" on profiles for all using (user_id = auth.uid()) with check (user_id = auth.uid());
alter table ref_people enable row level security; create policy "lectura_people" on ref_people for select using (true);
alter table ref_places enable row level security; create policy "lectura_places" on ref_places for select using (true);
alter table ref_events enable row level security; create policy "lectura_events" on ref_events for select using (true);

-- updated_at: en las tablas sincronizadas lo fija el DISPOSITIVO (es la marca que decide qué cambio gana).
-- Solo el perfil usa la hora del servidor.
create trigger trg_profiles_upd before update on profiles for each row execute function set_updated_at();
