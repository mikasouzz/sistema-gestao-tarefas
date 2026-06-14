-- ============================================================
-- Schema: sistema-gestao-tarefas
-- Tabelas: tb_super_tasks, tb_super_projects
-- IDs gerados no cliente (base36 + random), portanto text
-- ============================================================

-- ------------------------------------------------------------
-- Projetos
-- ------------------------------------------------------------
create table if not exists tb_super_projects (
  id           text        primary key,
  user_id      uuid        not null references auth.users(id) on delete cascade,

  title        text        not null,
  description  text        not null default '',
  term         text        not null check (term in ('Curto Prazo', 'Longo Prazo')),
  status       text        not null default 'plan' check (status in ('plan', 'prog', 'done')),

  -- subtasks armazenadas como JSONB: [{id, title, done}, ...]
  subtasks     jsonb       not null default '[]'::jsonb,

  completed_at timestamptz,
  updated_at   timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Tarefas
-- ------------------------------------------------------------
create table if not exists tb_super_tasks (
  id                  text        primary key,
  user_id             uuid        not null references auth.users(id) on delete cascade,

  text                text        not null,
  done                boolean     not null default false,
  archived            boolean     not null default false,

  -- Triagem
  type                text,
  category            text,
  fonte               text,
  score               numeric,
  quadrant            text        check (quadrant in ('q1', 'q2', 'q3', 'q4')),

  -- Vínculo com projeto/subtarefa
  project_id          text        references tb_super_projects(id) on delete set null,
  subtask_id          text,

  -- Execução
  exec_date           text,   -- "YYYY-MM-DD"
  exec_day            text,
  exec_time           text,
  exec_status         text,
  exec_completed_at   timestamptz,

  -- Delegação
  responsavel         text,
  deleg_status        text,
  deleg_completed_at  timestamptz,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ------------------------------------------------------------
-- RLS (Row Level Security) — cada usuário vê apenas seus dados
-- ------------------------------------------------------------
alter table tb_super_projects enable row level security;
alter table tb_super_tasks    enable row level security;

create policy "projects: acesso próprio"
  on tb_super_projects
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "tasks: acesso próprio"
  on tb_super_tasks
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- Índices para queries frequentes
-- ------------------------------------------------------------
create index if not exists idx_tasks_user_id     on tb_super_tasks    (user_id);
create index if not exists idx_tasks_project_id  on tb_super_tasks    (project_id);
create index if not exists idx_tasks_archived    on tb_super_tasks    (user_id, archived);
create index if not exists idx_projects_user_id  on tb_super_projects (user_id);
create index if not exists idx_projects_status   on tb_super_projects (user_id, status);
