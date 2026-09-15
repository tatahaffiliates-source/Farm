declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface InvitePayload {
  email?: string;
  fullName?: string;
  role?: 'admin' | 'manager' | 'worker';
  phone?: string;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Server is not configured' }, 500);

  const authorization = request.headers.get('Authorization');
  if (!authorization) return json({ error: 'Missing authorization header.' }, 401);

  const callerClient = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: callerData, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !callerData.user) return json({ error: 'Could not verify caller identity.' }, 401);

  const { data: callerProfile, error: profileError } = await adminClient
    .from('profiles')
    .select('farm_id, role, status')
    .eq('id', callerData.user.id)
    .maybeSingle();
  if (profileError || !callerProfile) return json({ error: 'Could not load your profile.' }, 403);
  if (callerProfile.status !== 'active') return json({ error: 'Your account is not active.' }, 403);
  if (!['admin', 'manager'].includes(callerProfile.role)) {
    return json({ error: 'Only admins or managers can invite farm users.' }, 403);
  }

  let body: InvitePayload;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }

  const email = body.email?.trim().toLowerCase();
  const fullName = body.fullName?.trim();
  const role = body.role || 'worker';
  if (!email) return json({ error: 'Email is required.' }, 400);
  if (!fullName) return json({ error: 'Full name is required.' }, 400);
  if (!['admin', 'manager', 'worker'].includes(role)) return json({ error: 'Invalid role.' }, 400);
  if (callerProfile.role === 'manager' && role !== 'worker') {
    return json({ error: 'Managers can only invite workers.' }, 403);
  }
  if (!callerProfile.farm_id) return json({ error: 'Your profile is not assigned to a farm.' }, 403);

  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
    redirectTo: Deno.env.get('INVITE_REDIRECT_URL') || undefined,
  });
  if (inviteError || !inviteData.user) {
    return json({ error: inviteError?.message || 'Unable to send invitation.' }, 409);
  }

  const { error: profileUpsertError } = await adminClient.from('profiles').upsert(
    {
      id: inviteData.user.id,
      farm_id: callerProfile.farm_id,
      full_name: fullName,
      email,
      role,
      status: 'active',
      phone: body.phone?.trim() || null,
    },
    { onConflict: 'id' },
  );

  if (profileUpsertError) {
    await adminClient.auth.admin.deleteUser(inviteData.user.id);
    return json({ error: `Could not create profile: ${profileUpsertError.message}` }, 500);
  }

  return json({ success: true, userId: inviteData.user.id });
});
