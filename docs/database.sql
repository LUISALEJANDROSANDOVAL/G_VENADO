-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.spatial_ref_sys (
  srid integer NOT NULL CHECK (srid > 0 AND srid <= 998999),
  auth_name character varying,
  auth_srid integer,
  srtext character varying,
  proj4text character varying,
  CONSTRAINT spatial_ref_sys_pkey PRIMARY KEY (srid)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  email character varying NOT NULL UNIQUE,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  departamento text,
  role_id smallint,
  role text,
  password text,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.role(id)
);
CREATE TABLE public.points_of_sale (
  id character varying NOT NULL,
  name character varying NOT NULL,
  market character varying NOT NULL,
  category USER-DEFINED NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  geom USER-DEFINED,
  base_duration_minutes integer NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT points_of_sale_pkey PRIMARY KEY (id)
);
CREATE TABLE public.daily_routes_plan (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  reponedor_id uuid,
  date date NOT NULL DEFAULT CURRENT_DATE,
  optimized_pos_sequence ARRAY NOT NULL,
  status USER-DEFINED DEFAULT 'ASIGNADA'::route_status,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  sequence_executed_ids ARRAY DEFAULT '{}'::character varying[],
  route_path_optimal USER-DEFINED,
  CONSTRAINT daily_routes_plan_pkey PRIMARY KEY (id),
  CONSTRAINT daily_routes_plan_reponedor_id_fkey FOREIGN KEY (reponedor_id) REFERENCES public.users(id)
);
CREATE TABLE public.reponedor_routes_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  route_plan_id uuid UNIQUE,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  travel_time_minutes integer,
  distance_meters numeric,
  route_coverage_polygon USER-DEFINED,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  route_path_executed USER-DEFINED,
  CONSTRAINT reponedor_routes_history_pkey PRIMARY KEY (id),
  CONSTRAINT reponedor_routes_history_route_plan_id_fkey FOREIGN KEY (route_plan_id) REFERENCES public.daily_routes_plan(id)
);
CREATE TABLE public.micro_tasks (
  id integer NOT NULL DEFAULT nextval('micro_tasks_id_seq'::regclass),
  task_name character varying NOT NULL,
  client_category character varying NOT NULL CHECK (client_category::text = ANY (ARRAY['PARETO'::character varying, 'MAYORISTA'::character varying, 'MINORISTA'::character varying, 'DETALLISTA'::character varying, 'TODOS'::character varying]::text[])),
  is_active boolean DEFAULT true,
  CONSTRAINT micro_tasks_pkey PRIMARY KEY (id)
);
CREATE TABLE public.task_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  route_plan_id uuid,
  pos_id character varying,
  task_id integer,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone,
  duration_seconds integer,
  photo_url text,
  is_offline boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT task_logs_pkey PRIMARY KEY (id),
  CONSTRAINT task_logs_pos_id_fkey FOREIGN KEY (pos_id) REFERENCES public.points_of_sale(id),
  CONSTRAINT task_logs_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.micro_tasks(id),
  CONSTRAINT task_logs_route_plan_id_fkey FOREIGN KEY (route_plan_id) REFERENCES public.daily_routes_plan(id)
);
CREATE TABLE public.route_execution_proofs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  route_plan_id uuid NOT NULL,
  pos_id character varying NOT NULL,
  optimal_sequence_index integer NOT NULL,
  executed_sequence_index integer NOT NULL,
  is_deviation boolean DEFAULT false,
  deviation_justification text,
  incidency_photo_url text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  is_closed_incidency boolean DEFAULT false,
  CONSTRAINT route_execution_proofs_pkey PRIMARY KEY (id),
  CONSTRAINT route_execution_proofs_route_plan_id_fkey FOREIGN KEY (route_plan_id) REFERENCES public.daily_routes_plan(id),
  CONSTRAINT route_execution_proofs_pos_id_fkey FOREIGN KEY (pos_id) REFERENCES public.points_of_sale(id)
);
CREATE TABLE public.reponedor_locations (
  reponedor_id uuid NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  geom USER-DEFINED,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT reponedor_locations_pkey PRIMARY KEY (reponedor_id),
  CONSTRAINT reponedor_locations_reponedor_id_fkey FOREIGN KEY (reponedor_id) REFERENCES public.users(id)
);
CREATE TABLE public.role (
  id smallint NOT NULL DEFAULT nextval('role_id_seq'::regclass),
  name text NOT NULL UNIQUE,
  CONSTRAINT role_pkey PRIMARY KEY (id)
);