import { NextResponse } from 'next/server';
import { hasSupabase, supabaseAdmin, supabaseServer } from '@/lib/supabase-server';
import { getPublishedAlerts } from '@/lib/alerts-server';
import { matchAlerts, composeAnswer } from '@/lib/ask';

const HOURLY_LIMIT = 10;

// Demo-mode rate limit (in-memory, per server instance — demo only).
const demoHits = [];

/** Answers strictly from the stored official alerts, with sources and a
 *  per-user rate limit. Never guesses. */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const question = String(body.question || '').trim().slice(0, 300);
  if (!question) {
    return NextResponse.json({ error: 'empty_question' }, { status: 400 });
  }

  let userId = 'demo';

  if (hasSupabase) {
    const sb = supabaseServer(request.cookies);
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: 'auth' }, { status: 401 });
    userId = user.id;

    const admin = supabaseAdmin();
    if (admin) {
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count } = await admin
        .from('question_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', hourAgo);
      if ((count || 0) >= HOURLY_LIMIT) {
        return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
      }
    }
  } else {
    const now = Date.now();
    while (demoHits.length && now - demoHits[0] > 60 * 60 * 1000) demoHits.shift();
    if (demoHits.length >= HOURLY_LIMIT) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    }
    demoHits.push(now);
  }

  const alerts = await getPublishedAlerts();
  const matches = matchAlerts(question, alerts);
  const { answer, sources } = composeAnswer(question, matches);

  // Log for rate limiting + audit (service role, not exposed to the client).
  const admin = supabaseAdmin();
  if (admin && userId !== 'demo') {
    await admin.from('question_logs').insert({ user_id: userId, question });
  }

  return NextResponse.json({ answer, sources, matched: matches.length > 0 });
}
