import { NextResponse } from 'next/server';
import { hasSupabase, supabaseAdmin, supabaseServer } from '@/lib/supabase-server';
import bundled from '@/lib/bundled-alerts.json';

async function isAdmin(request) {
  if (!hasSupabase) return true; // demo mode: anyone (local preview only)
  const sb = supabaseServer(request.cookies);
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return false;
  const admin = supabaseAdmin();
  if (!admin) return false;
  const { data: profile } = await admin
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();
  return Boolean(profile?.is_admin);
}

/** Draft alerts waiting for review before publishing. */
export async function GET(request) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  if (!hasSupabase) {
    const drafts = bundled.filter((a) => a.status === 'draft');
    return NextResponse.json({ drafts });
  }
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from('alerts')
    .select('*')
    .eq('status', 'draft')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'db' }, { status: 500 });
  return NextResponse.json({ drafts: data || [] });
}

/** Publish one draft. */
export async function POST(request) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

  if (!hasSupabase) return NextResponse.json({ ok: true }); // demo: bundled file is static

  const admin = supabaseAdmin();
  const { error } = await admin
    .from('alerts')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'draft');
  if (error) return NextResponse.json({ error: 'db' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
