begin;

create table if not exists public.users (
  id bigserial primary key,
  username text unique not null,
  email text unique not null,
  password text not null,
  role text check (role in ('admin','payroll','pettycash')) default 'payroll',
  full_name text not null,
  department text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  is_active boolean default true
);

insert into public.users (id, username, email, password, role, full_name, department, created_at, updated_at, is_active) values
  (1, 'admin', 'admin@kbc-office.com', 'admin123', 'admin', 'Administrator', 'Management', '2026-01-21 03:54:54', '2026-01-21 03:54:54', true),
  (2, 'payroll', 'payroll@kbc-office.com', 'payroll123', 'payroll', 'Payroll Manager', 'Finance', '2026-01-21 03:54:54', '2026-01-21 04:47:50', false),
  (3, 'pettycash', 'pettycash@kbc-office.com', 'petty123', 'pettycash', 'Petty Cash Handler', 'Finance', '2026-01-21 03:54:54', '2026-01-21 04:47:53', false),
  (4, 'anne', 'anne44@payroll.com', 'anne123', 'payroll', 'Rechelle Anne Padua', 'Accounting', '2026-01-21 04:44:48', '2026-01-21 04:44:48', true)
on conflict (id) do nothing;

create table if not exists public.employees (
  id bigserial primary key,
  employee_id text unique not null,
  name text not null,
  department text check (department in ('OFFICE','DRIVER','WAREHOUSE','SECURITY & CUSTODIAN','FARM')) not null,
  position text not null,
  password text,
  rate_type text check (rate_type in ('daily','fixed')) default 'daily',
  daily_rate numeric(10,2),
  fixed_rate numeric(10,2),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  is_active boolean default true
);

insert into public.employees (id, employee_id, name, department, position, password, rate_type, daily_rate, fixed_rate, created_at, updated_at, is_active) values
  (19, 'EMP-001', 'MJ', 'OFFICE', 'Information Technology', '$2b$10$1B4q5UxDO8e2E45n5GgVeeyKW8/8T6poSFRnHaxiV1j/ZItySEJiW', 'daily', 833.00, null, '2026-01-26 10:50:32', '2026-01-26 10:50:32', true),
  (20, 'EMP-002', 'Anne', 'OFFICE', 'Human Resource', '$2b$10$/4lMffOOEl4CTIDUybVOpeQADl6tpDbiJeGXek1XtKO2jRtYAv85O', 'daily', 500.00, null, '2026-01-27 05:14:26', '2026-01-27 05:14:26', true),
  (21, 'EMP-003', 'Lester', 'OFFICE', 'Accounting Head', '$2b$10$sl5k7mAdHZk.xTFTCL846.TflA6iAzrbL4qisAMawl4dRAlz.7/Rq', 'fixed', null, 10000.00, '2026-01-28 02:41:51', '2026-01-28 02:41:51', true),
  (22, 'EMP-004', 'pjtejada', 'OFFICE', 'Marketing', '$2b$10$nMmcHpr1N4JPwlIoCNWrVOoJVzCbYfTrGzapo7VQqNQRNeDV3M2O6', 'daily', 535.00, null, '2026-01-31 05:35:03', '2026-01-31 05:35:03', true)
on conflict (id) do nothing;

create table if not exists public.payroll_periods (
  id bigserial primary key,
  year integer not null,
  month text not null,
  start_day smallint not null,
  end_day smallint not null,
  period_name text not null,
  created_at timestamptz default now(),
  unique (year, month, start_day, end_day)
);

insert into public.payroll_periods (id, year, month, start_day, end_day, period_name, created_at) values
  (1, 2026, 'January', 1, 15, 'January 1-15', '2026-01-22 08:14:35'),
  (2, 2026, 'January', 16, 31, 'January 16-31', '2026-01-22 08:14:35'),
  (3, 2026, 'February', 1, 15, 'February 1-15', '2026-01-22 08:14:35'),
  (4, 2026, 'February', 16, 29, 'February 16-29', '2026-01-22 08:14:35'),
  (5, 2026, 'March', 1, 15, 'March 1-15', '2026-01-22 08:14:35'),
  (6, 2026, 'March', 16, 31, 'March 16-31', '2026-01-22 08:14:35'),
  (7, 2026, 'April', 1, 15, 'April 1-15', '2026-01-22 08:14:35'),
  (8, 2026, 'April', 16, 30, 'April 16-30', '2026-01-22 08:14:35'),
  (9, 2026, 'May', 1, 15, 'May 1-15', '2026-01-22 08:14:35'),
  (10, 2026, 'May', 16, 31, 'May 16-31', '2026-01-22 08:14:35'),
  (11, 2026, 'June', 1, 15, 'June 1-15', '2026-01-22 08:14:35'),
  (12, 2026, 'June', 16, 30, 'June 16-30', '2026-01-22 08:14:35'),
  (13, 2026, 'July', 1, 15, 'July 1-15', '2026-01-22 08:14:35'),
  (14, 2026, 'July', 16, 31, 'July 16-31', '2026-01-22 08:14:35'),
  (15, 2026, 'August', 1, 15, 'August 1-15', '2026-01-22 08:14:35'),
  (16, 2026, 'August', 16, 31, 'August 16-31', '2026-01-22 08:14:35'),
  (17, 2026, 'September', 1, 15, 'September 1-15', '2026-01-22 08:14:35'),
  (18, 2026, 'September', 16, 30, 'September 16-30', '2026-01-22 08:14:35'),
  (19, 2026, 'October', 1, 15, 'October 1-15', '2026-01-22 08:14:35'),
  (20, 2026, 'October', 16, 31, 'October 16-31', '2026-01-22 08:14:35'),
  (21, 2026, 'November', 1, 15, 'November 1-15', '2026-01-22 08:14:35'),
  (22, 2026, 'November', 16, 30, 'November 16-30', '2026-01-22 08:14:35'),
  (23, 2026, 'December', 1, 15, 'December 1-15', '2026-01-22 08:14:35'),
  (24, 2026, 'December', 16, 31, 'December 16-31', '2026-01-22 08:14:35')
on conflict (id) do nothing;

create table if not exists public.attendance (
  id bigserial primary key,
  employee_id bigint references public.employees(id),
  payroll_period_id bigint references public.payroll_periods(id),
  date date,
  day_index integer,
  time_in text,
  time_out text,
  working_hours numeric(4,1),
  amount numeric(10,2),
  status text check (status in ('present','absent','partial','fixed')),
  is_approved boolean default false,
  approved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (employee_id, payroll_period_id, date)
);

insert into public.attendance (id, employee_id, payroll_period_id, date, day_index, time_in, time_out, working_hours, amount, status, is_approved, approved_at, created_at, updated_at) values
  (73, 20, 3, to_date('05-Feb-2026','DD-Mon-YYYY'), 5, '01:19 PM', '01:19 PM', null, null, 'present', false, null, '2026-02-05 05:19:44', '2026-02-05 05:19:55')
on conflict (id) do nothing;

create table if not exists public.payroll_summary (
  id bigserial primary key,
  employee_id bigint references public.employees(id),
  payroll_period_id bigint references public.payroll_periods(id),
  day_index integer,
  date date,
  amount numeric(10,2),
  status text check (status in ('present','absent','partial','fixed','no_out','no_in')),
  is_approved boolean default false,
  approved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (employee_id, payroll_period_id, day_index)
);

create table if not exists public.petty_cash (
  id bigserial primary key,
  user_id bigint references public.users(id) on delete set null,
  amount numeric(10,2) not null,
  description text not null,
  category text,
  date date not null,
  status text check (status in ('pending','approved','rejected')) default 'pending',
  created_at timestamptz default now()
);

create table if not exists public.timesheets (
  id bigserial primary key,
  employee_id bigint,
  employee_name text not null,
  date date not null,
  hours_worked numeric(4,2) not null,
  overtime_hours numeric(4,2) default 0.00,
  status text check (status in ('pending','approved','rejected')) default 'pending',
  approved_by bigint references public.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.attendance_records (
  id bigserial primary key,
  employee_id bigint not null references public.employees(id) on delete cascade,
  payroll_period_id bigint not null references public.payroll_periods(id) on delete cascade,
  date date not null,
  day_index smallint not null,
  status text,
  amount numeric(10,2),
  is_weekend boolean default false,
  created_by bigint,
  updated_at timestamptz default now(),
  created_at timestamptz default now(),
  unique (employee_id, payroll_period_id, date)
);

insert into public.attendance_records (id, employee_id, payroll_period_id, date, day_index, status, amount, is_weekend, created_by, updated_at, created_at) values
  (175, 20, 3, date '0202-02-04', 4, 'present', 0.00, false, null, '2026-02-04 07:51:57', '2026-02-04 07:51:57')
on conflict (id) do nothing;

create table if not exists public.payroll (
  id bigserial primary key,
  employee_id bigint,
  employee_name text not null,
  basic_salary numeric(10,2) not null,
  allowances numeric(10,2) default 0.00,
  deductions numeric(10,2) default 0.00,
  net_salary numeric(10,2) not null,
  month_year date not null,
  status text check (status in ('pending','processed','paid')) default 'pending',
  processed_by bigint references public.users(id) on delete set null,
  processed_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_payroll_month_year on public.payroll (month_year);
create index if not exists idx_timesheets_date on public.timesheets (date);
create index if not exists idx_timesheets_employee_date on public.timesheets (employee_id, date);
create index if not exists idx_attendance_records_period on public.attendance_records (payroll_period_id);
create index if not exists idx_attendance_records_employee on public.attendance_records (employee_id);

commit;
