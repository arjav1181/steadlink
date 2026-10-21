-- ============================================================================
--  The default plan.
--
--  The plan catalogue is part of the product, not sample data. A fresh
--  install has no rows in it, and the plan is read by the usage screen, by
--  the quota checks and by the sign-up flow, so an install without one
--  fails on the first screen that asks what the workspace is on.
--
--  The seed puts the same plan in, so the two agree.
-- ============================================================================
insert into plans (id, code, name, limits, features)
values (
  gen_random_uuid(),
  'community',
  'Community',
  '{"links": 1000, "qrCodes": 50, "pages": 20, "backHalves": 100, "customDomains": 5}'::jsonb,
  '{"dynamicRouting": true, "customDomains": true, "webhooks": true, "pages": true, "sso": false}'::jsonb
)
on conflict (code) do nothing;
