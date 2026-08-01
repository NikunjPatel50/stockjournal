-- Allow InsForge project_admin (API key / admin client) to read app tables for /admin.

GRANT SELECT ON public.feedback_submissions TO project_admin;
GRANT SELECT ON public.user_settings TO project_admin;
GRANT SELECT ON public.goals TO project_admin;
