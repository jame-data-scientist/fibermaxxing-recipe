/**
 * The one schema definition, as executable SQLite statements.
 *
 * D1's HTTP API runs one statement per request, so the schema is exported as a
 * list rather than a single script. It is idempotent: running it twice is safe.
 */

export const SCHEMA_STATEMENTS: string[] = [
  `create table if not exists foods (
    fdc_id text primary key,
    description text not null,
    common_name text,
    category text,
    data_type text,
    kcal real,
    protein_g real,
    carbs_g real,
    fat_g real,
    fiber_g real,
    sugar_g real,
    sodium_mg real,
    search_text text not null,
    source text not null default 'usda',
    use_count integer not null default 0,
    created_at integer not null default (unixepoch() * 1000)
  )`,
  `create index if not exists foods_search_idx on foods (search_text)`,
  `create index if not exists foods_use_count_idx on foods (use_count)`,

  `create table if not exists food_portions (
    id integer primary key autoincrement,
    fdc_id text not null references foods (fdc_id) on delete cascade,
    label text not null,
    amount real not null,
    unit text not null,
    gram_weight real not null
  )`,
  `create index if not exists food_portions_food_idx on food_portions (fdc_id)`,

  `create table if not exists recipes (
    id text primary key,
    slug text not null,
    title text not null,
    summary text,
    status text not null default 'pending',
    author_name text not null,
    author_country_code text not null,
    author_country_name text not null,
    author_handle text,
    servings integer not null,
    serving_note text,
    serving_grams real,
    prep_minutes integer,
    cook_minutes integer,
    tips text,
    image_url text,
    image_alt text,
    image_sha256 text,
    image_rights_attested_at integer,
    terms_version text not null,
    submitted_at integer not null default (unixepoch() * 1000),
    reviewed_at integer,
    published_at integer,
    featured_at integer,
    review_note text,
    submitter_token text not null,
    ip_hash text
  )`,
  `create unique index if not exists recipes_slug_idx on recipes (slug)`,
  `create unique index if not exists recipes_token_idx on recipes (submitter_token)`,
  `create index if not exists recipes_published_idx on recipes (status, published_at)`,
  `create index if not exists recipes_featured_idx on recipes (featured_at)`,

  `create table if not exists recipe_nutrition (
    recipe_id text primary key references recipes (id) on delete cascade,
    kcal real not null default 0,
    protein_g real not null default 0,
    carbs_g real not null default 0,
    fat_g real not null default 0,
    fiber_g real not null default 0,
    sugar_g real not null default 0,
    sodium_mg real not null default 0,
    confidence text not null default 'incomplete',
    computed_at integer not null default (unixepoch() * 1000)
  )`,

  `create table if not exists recipe_ingredients (
    id text primary key,
    recipe_id text not null references recipes (id) on delete cascade,
    position integer not null,
    raw_text text not null,
    amount real not null,
    unit text not null,
    food_fdc_id text references foods (fdc_id) on delete set null,
    grams real,
    note text,
    mapping_status text not null default 'unmapped'
  )`,
  `create index if not exists recipe_ingredients_recipe_idx on recipe_ingredients (recipe_id)`,
  `create index if not exists recipe_ingredients_food_idx on recipe_ingredients (food_fdc_id)`,
  `create index if not exists recipe_ingredients_status_idx on recipe_ingredients (mapping_status)`,

  `create table if not exists recipe_steps (
    id text primary key,
    recipe_id text not null references recipes (id) on delete cascade,
    position integer not null,
    text text not null
  )`,
  `create index if not exists recipe_steps_recipe_idx on recipe_steps (recipe_id)`,

  `create table if not exists recipe_tags (
    recipe_id text not null references recipes (id) on delete cascade,
    tag text not null,
    primary key (recipe_id, tag)
  )`,
  `create index if not exists recipe_tags_tag_idx on recipe_tags (tag)`,

  `create table if not exists recipe_reports (
    id text primary key,
    recipe_id text not null references recipes (id) on delete cascade,
    kind text not null,
    note text,
    created_at integer not null default (unixepoch() * 1000),
    resolved_at integer,
    resolution_note text
  )`,
  `create index if not exists recipe_reports_recipe_idx on recipe_reports (recipe_id)`,

  `create table if not exists dmca_notices (
    id text primary key,
    recipe_id text references recipes (id) on delete set null,
    claimant_name text not null,
    claimant_email text not null,
    work_description text not null,
    infringing_url text not null,
    good_faith integer not null,
    accuracy integer not null,
    signature text not null,
    status text not null default 'received',
    notes text,
    received_at integer not null default (unixepoch() * 1000),
    actioned_at integer
  )`,
  `create index if not exists dmca_notices_recipe_idx on dmca_notices (recipe_id)`,

  `create table if not exists infringement_strikes (
    id text primary key,
    ip_hash text,
    handle text,
    recipe_id text references recipes (id) on delete set null,
    reason text not null,
    created_at integer not null default (unixepoch() * 1000)
  )`,
  `create index if not exists infringement_strikes_ip_idx on infringement_strikes (ip_hash)`,
  `create index if not exists infringement_strikes_handle_idx on infringement_strikes (handle)`,

  `create table if not exists submission_events (
    id text primary key,
    ip_hash text not null,
    kind text not null,
    created_at integer not null default (unixepoch() * 1000)
  )`,
  `create index if not exists submission_events_ip_idx on submission_events (ip_hash, created_at)`,

  `create table if not exists app_clicks (
    id text primary key,
    source text not null default 'unknown',
    recipe_slug text,
    created_at integer not null default (unixepoch() * 1000)
  )`,
  `create index if not exists app_clicks_created_idx on app_clicks (created_at)`,
];
