declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authorization = request.headers.get('Authorization');
  const token = authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Authentication required' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: 'Server is not configured' }, 500);

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: callerData, error: callerError } = await callerClient.auth.getUser(token);
  if (callerError || !callerData.user) return json({ error: 'Invalid session' }, 401);

  const { data: callerProfile, error: profileError } = await adminClient
    .from('profiles')
    .select('farm_id, role, status')
    .eq('id', callerData.user.id)
    .single();
  if (profileError || callerProfile?.role !== 'admin' || callerProfile.status !== 'active') {
    return json({ error: 'Only an active farm admin can manage users' }, 403);
  }

  let payload: {
    action?: 'list_pending' | 'assign_pending';
    email?: string;
    full_name?: string;
    role?: 'manager' | 'worker';
    user_id?: string;
    status?: 'active' | 'disabled';
  };
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  if (payload.role && !['manager', 'worker'].includes(payload.role)) {
    return json({ error: 'Only manager and worker roles may be assigned here' }, 400);
  }

  if (payload.action === 'list_pending') {
    const { data: pending, error: pendingError } = await adminClient
      .from('profiles')
      .select('id, farm_id, full_name, email, role, status, phone, created_at, updated_at')
      .is('farm_id', null)
      .eq('role', 'worker')
      .order('created_at', { ascending: true });
    if (pendingError) return json({ error: pendingError.message }, 400);
    return json({ users: pending || [] });
  }

  if (payload.action === 'assign_pending') {
    if (!payload.user_id) return json({ error: 'user_id is required' }, 400);
    const { data: target, error: targetError } = await adminClient
      .from('profiles')
      .select('id, farm_id, role')
      .eq('id', payload.user_id)
      .single();
    if (targetError || !target) return json({ error: 'Pending user was not found' }, 404);
    if (target.farm_id) return json({ error: 'This user is already assigned to a farm' }, 409);
    if (target.role !== 'worker') return json({ error: 'Only pending worker accounts can be assigned' }, 400);

    const { error: assignPendingError } = await adminClient
      .from('profiles')
      .update({ farm_id: callerProfile.farm_id, status: 'active', updated_at: new Date().toISOString() })
      .eq('id', target.id)
      .is('farm_id', null);
    if (assignPendingError) return json({ error: assignPendingError.message }, 400);
    return json({ ok: true, user_id: target.id, farm_id: callerProfile.farm_id });
  }

  if (payload.user_id && payload.status) {
    const { data: target } = await adminClient.from('profiles').select('id, farm_id').eq('id', payload.user_id).single();
    if (!target || target.farm_id !== callerProfile.farm_id) return json({ error: 'User is outside your farm' }, 404);
    const { error } = await adminClient.from('profiles').update({ status: payload.status, updated_at: new Date().toISOString() }).eq('id', target.id);
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true });
  }

  if (!payload.email || !payload.full_name || !payload.role) {
    return json({ error: 'email, full_name, and role are required' }, 400);
  }

  const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(payload.email.trim(), {
    data: { full_name: payload.full_name.trim() },
  });
  if (inviteError || !invited.user) return json({ error: inviteError?.message || 'Unable to invite user' }, 400);

  const { error: assignError } = await adminClient
    .from('profiles')
    .update({
      farm_id: callerProfile.farm_id,
      full_name: payload.full_name.trim(),
      email: payload.email.trim(),
      role: payload.role,
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', invited.user.id);
  if (assignError) {
    await adminClient.auth.admin.deleteUser(invited.user.id);
    return json({ error: 'Unable to assign the invited user to this farm' }, 400);
  }

  return json({ ok: true, user_id: invited.user.id });
});
