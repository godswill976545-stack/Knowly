import { NextResponse } from 'next/server';
import { hasSupabase, supabaseAdmin } from '@/lib/supabase-server';
import { getPublishedAlert } from '@/lib/alerts-server';
import { generateExplanation, templateExplanation } from '@/lib/ai';

// Plain-French explanation for one alert, generated once and cached in the
// database (alert_explanations), then reused for everyone.
export async function GET(request, { params }) {
  const { id } = await params;

  const alert = await getPublishedAlert(id);
  if (!alert) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // Cached explanation?
  if (hasSupabase) {
    const admin = supabaseAdmin();
    if (admin) {
      const { data: cached } = await admin
        .from('alert_explanations')
        .select('explanation')
        .eq('alert_id', id)
        .maybeSingle();
      if (cached?.explanation) {
        return NextResponse.json({ explanation: cached.explanation, cached: true });
      }
    }
  }

  // Generate (AI when a key is configured), then cache the AI result.
  const generated = await generateExplanation(alert);
  if (generated) {
    const admin = supabaseAdmin();
    if (admin) {
      await admin.from('alert_explanations').upsert(
        { alert_id: id, explanation: generated.explanation, model: generated.model },
        { onConflict: 'alert_id' }
      );
    }
    return NextResponse.json({ explanation: generated.explanation, cached: false });
  }

  // No AI key: the alert text itself is the plain-French explanation.
  return NextResponse.json({ explanation: templateExplanation(alert), cached: true });
}
