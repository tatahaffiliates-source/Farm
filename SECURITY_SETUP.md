# Production authentication setup

## Environment

Set these Vercel variables for the browser:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Only the Supabase Edge Function may receive `SUPABASE_SERVICE_ROLE_KEY`. Never prefix that key with `VITE_` and never put it in frontend code.

## Apply the database migrations

Run `001_initial_schema.sql`, then `002_security_hardening.sql` in the Supabase SQL editor or with the Supabase CLI. The second migration:

- creates a worker-only profile trigger for new Auth users;
- rejects missing, disabled, or invalid profiles in the app;
- scopes every farm table by the authenticated profile's `farm_id`;
- restricts writes and role changes to the appropriate roles;
- prevents users from updating their own profile role or farm assignment;
- fixes the `SECURITY DEFINER` helper search path.

## One-time owner bootstrap

Do not use public signup to create the owner.

1. In Supabase Dashboard, create the first Auth user manually with email confirmation enabled.
2. Create the farm row in the SQL editor and record its UUID.
3. Run this statement with the Auth user's UUID and farm UUID substituted:

```sql
INSERT INTO public.profiles (id, farm_id, full_name, email, role, status)
VALUES ('AUTH_USER_UUID', 'FARM_UUID', 'Farm Owner', 'owner@example.com', 'admin', 'active');
```

This is an administrative one-time operation. The application never accepts `admin` from a browser request.

## Manager and worker invitations

Deploy `supabase/functions/manage-user` with the Supabase CLI. The function receives the caller's access token, verifies an active `admin` profile in the database, invites the Auth user, and assigns only `manager` or `worker` in the caller's farm. Keep `SUPABASE_SERVICE_ROLE_KEY` configured only as a server-side function secret.

Public worker registrations are handled in the application's **Settings -> Manage Users** screen. The admin sees a **Pending worker accounts** section and clicks **Assign to this farm**. This calls the protected `assign_pending` action in the Edge Function; the browser never writes `farm_id` directly.

The current UI intentionally does not expose role simulation or demo credentials. The existing local-storage mode is for offline/demo development only; production must have Supabase configured.

## Verification checklist

Use separate real Supabase accounts for an owner, manager, worker, and a user assigned to another farm. Verify:

- a public signup creates a worker profile with no farm assignment;
- changing signup metadata or request payload cannot create an admin/manager;
- missing/disabled profiles are rejected by the app;
- workers cannot select, navigate to, or query admin/manager data;
- managers cannot update profiles or assign roles;
- direct REST updates to `profiles.role` fail under RLS;
- an admin can invite a manager/worker only in the admin's farm;
- cross-farm selects and writes return no rows or an RLS error;
- sign-out removes the session and refresh restores only a valid profile.

The legacy `src/services/db.ts` local adapter is still used by the farm feature screens. Before production data is used, those screens must be migrated to Supabase queries; RLS protects direct Supabase access, but localStorage is not a production datastore.
