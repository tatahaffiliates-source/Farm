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

Do not use public signup or a client-side role selector to create the owner. Google OAuth only authenticates the Google identity; it does not grant admin access.

1. Enable Google under Supabase **Authentication -> Providers -> Google** and configure the Google callback URL.
2. Have the owner sign in once with Google. Supabase creates the Auth user and the worker-default profile trigger creates a profile row.
3. Create the farm row in the SQL editor and record its UUID.
4. Find the owner's Auth user UUID under **Authentication -> Users**.
5. Run this statement with the Auth user's UUID and farm UUID substituted:

```sql
INSERT INTO public.profiles (id, farm_id, full_name, email, role, status)
VALUES ('AUTH_USER_UUID', 'FARM_UUID', 'Farm Owner', 'owner@example.com', 'admin', 'active');
```

This is an administrative one-time operation. The application never accepts `admin` from a browser request. After this update, the owner can use Google Sign-In and will enter the admin dashboard.

## Manager and worker invitations

Deploy `supabase/functions/manage-user` with the Supabase CLI. The function receives the caller's access token, verifies an active `admin` profile in the database, invites the Auth user, and assigns only `manager` or `worker` in the caller's farm. Keep `SUPABASE_SERVICE_ROLE_KEY` configured only as a server-side function secret.

Workers and managers should be invited from **Team & Roles**. The invited user's Google email must match the invited email so Supabase can associate the OAuth identity with the invited account. The profile's stored role and farm assignment determine the dashboard; users never choose their role at login.

The current UI intentionally does not expose role simulation or demo credentials. The existing local-storage mode is for offline/demo development only; production must have Supabase configured.

## Verification checklist

Use separate real Supabase accounts for an owner, manager, worker, and a user assigned to another farm. Verify:

- an uninvited Google account is signed out because it has no assigned farm profile;
- changing OAuth claims or request payload cannot create an admin/manager;
- missing/disabled profiles are rejected by the app;
- workers cannot select, navigate to, or query admin/manager data;
- managers cannot update profiles or assign roles;
- direct REST updates to `profiles.role` fail under RLS;
- an admin can invite a manager/worker only in the admin's farm;
- cross-farm selects and writes return no rows or an RLS error;
- sign-out removes the session and refresh restores only a valid profile.

The legacy `src/services/db.ts` local adapter is still used by the farm feature screens. Before production data is used, those screens must be migrated to Supabase queries; RLS protects direct Supabase access, but localStorage is not a production datastore.
