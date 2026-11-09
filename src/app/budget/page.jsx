'use client';

import { useCallback, useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { formatFCFA, monthKey, todayISO, currentMonthLabel } from '@/lib/format';
import { listMonth, addEntry, updateEntry, deleteEntry, flushQueue, queuedCount } from '@/lib/budget';
import { CATEGORIES, categoryById } from '@/lib/categories';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';

function EntryForm({ open, initial, onClose, onSaved }) {
  const { t } = useI18n();
  const [type, setType] = useState('depense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setType(initial?.type || 'depense');
      setAmount(initial ? String(initial.amount_xof) : '');
      setCategory(initial?.category || null);
      setNote(initial?.note || '');
      setError(null);
    }
  }, [open, initial]);

  if (!open) return null;

  const save = async () => {
    const value = Math.round(Number(amount.replace(/\s/g, '')));
    if (!value || value <= 0) {
      setError('budget.invalidAmount');
      return;
    }
    if (!category) return; // category is required; button stays disabled

    setSaving(true);
    const row = {
      type,
      category,
      amount_xof: value,
      date: todayISO(),
      note: note.trim() || null,
    };
    if (initial?.id) await updateEntry(initial.id, row);
    else await addEntry(row);
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(43, 33, 24, 0.55)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
      role="dialog"
      aria-modal="true"
      aria-label={initial ? t('budget.editTitle') : t('budget.addTitle')}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 560,
          margin: 0,
          borderRadius: '20px 20px 0 0',
          padding: 20,
          maxHeight: '92dvh',
          overflowY: 'auto',
        }}
      >
        <h2 className="mt-0">{initial ? t('budget.editTitle') : t('budget.addTitle')}</h2>

        {/* Tap 1: Revenu / Dépense */}
        <div className="seg" role="tablist">
          <button
            type="button"
            className={type === 'revenu' ? 'active' : ''}
            onClick={() => setType('revenu')}
          >
            ➕ {t('budget.type.income')}
          </button>
          <button
            type="button"
            className={type === 'depense' ? 'active' : ''}
            onClick={() => setType('depense')}
          >
            ➖ {t('budget.type.expense')}
          </button>
        </div>

        {/* Tap 2: amount */}
        <div className="field">
          <label htmlFor="amount">{t('budget.amountLabel')}</label>
          <input
            id="amount"
            className="input input--lg"
            type="tel"
            inputMode="numeric"
            placeholder={t('budget.amountPlaceholder')}
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d\s]/g, ''))}
          />
        </div>

        {/* Tap 3: category + save */}
        <div className="field">
          <label>{t('budget.categoryLabel')}</label>
          <div className="cat-grid">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`cat-chip${category === c.id ? ' active' : ''}`}
                onClick={() => setCategory(c.id)}
              >
                {c.emoji} {t(c.key)}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="note">{t('budget.noteLabel')}</label>
          <input
            id="note"
            className="input"
            placeholder={t('budget.notePlaceholder')}
            value={note}
            maxLength={80}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {error && (
          <div className="form-error" role="alert">
            {t(error)}
          </div>
        )}

        <div className="stack">
          <button
            type="button"
            className="btn btn-primary"
            onClick={save}
            disabled={saving || !category || !amount}
          >
            {t('budget.saveEntry')}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BudgetPage() {
  const { t } = useI18n();
  const [entries, setEntries] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [syncedNote, setSyncedNote] = useState('');
  const [queued, setQueued] = useState(0);

  const month = monthKey(todayISO());

  const reload = useCallback(async () => {
    const list = await listMonth(month);
    setEntries(list);
    setQueued(queuedCount());
  }, [month]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    const onBackOnline = async () => {
      const synced = await flushQueue();
      if (synced > 0) {
        setSyncedNote(t('budget.synced'));
        setTimeout(() => setSyncedNote(''), 5000);
      }
      reload();
    };
    window.addEventListener('online', onBackOnline);
    return () => window.removeEventListener('online', onBackOnline);
  }, [reload, t]);

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (entry) => {
    setEditing(entry);
    setFormOpen(true);
  };

  const onDelete = async (entry) => {
    if (!window.confirm(t('budget.deleteConfirm'))) return;
    await deleteEntry(entry.id);
    reload();
  };

  const income = (entries || []).filter((e) => e.type === 'revenu').reduce((s, e) => s + e.amount_xof, 0);
  const expense = (entries || []).filter((e) => e.type === 'depense').reduce((s, e) => s + e.amount_xof, 0);
  const rest = income - expense;

  const totals = (type) => {
    const map = new Map();
    for (const e of entries || []) {
      if (e.type !== type) continue;
      map.set(e.category, (map.get(e.category) || 0) + e.amount_xof);
    }
    const rows = [...map.entries()].map(([category, total]) => ({ category, total }));
    rows.sort((a, b) => b.total - a.total);
    return rows;
  };
  const expenseTotals = totals('depense');
  const incomeTotals = totals('revenu');
  const maxTotal = Math.max(...expenseTotals.map((r) => r.total), ...incomeTotals.map((r) => r.total), 1);

  const sorted = [...(entries || [])].sort((a, b) =>
    (b.date + String(b.created_at || '')).localeCompare(a.date + String(a.created_at || ''))
  );

  return (
    <div className="page">
      <Header />
      <h1>{t('budget.title')}</h1>
      <p style={{ color: '#6f6553' }}>{t('budget.subtitle')}</p>

      <div className="stats-row">
        <div className="stat stat--green">
          <span className="stat-num">{formatFCFA(income)}</span>
          <span className="stat-label">{t('budget.income')}</span>
        </div>
        <div className="stat stat--red">
          <span className="stat-num">{formatFCFA(expense)}</span>
          <span className="stat-label">{t('budget.expenses')}</span>
        </div>
        <div className={`stat ${rest >= 0 ? 'stat--green' : 'stat--red'}`}>
          <span className="stat-num">{formatFCFA(rest)}</span>
          <span className="stat-label">{t('budget.rest')}</span>
        </div>
      </div>

      <button type="button" className="btn btn-primary" onClick={openAdd}>
        ➕ {t('budget.add')}
      </button>

      {queued > 0 && <p className="form-hint" style={{ marginTop: 8 }}>📴 {t('budget.offlineNote')}</p>}
      {syncedNote && <p className="form-hint" style={{ marginTop: 8, color: '#14572a' }}>✅ {syncedNote}</p>}

      {/* This month's entries */}
      <h2 className="section-title">{t('budget.entries')}</h2>
      {entries === null && (
        <div className="center" style={{ padding: 20 }}>
          <div className="spinner" />
        </div>
      )}
      {entries !== null && sorted.length === 0 && (
        <div className="card center" style={{ color: '#6f6553' }}>
          {t('budget.entriesEmpty')}
        </div>
      )}
      {sorted.map((entry) => {
        const cat = categoryById(entry.category);
        return (
          <div key={entry.id} className="entry-row">
            <span className="entry-emoji" aria-hidden="true">
              {cat.emoji}
            </span>
            <div className="entry-info">
              <div className="entry-cat">{t(cat.key)}</div>
              {entry.note && <div className="entry-note">{entry.note}</div>}
              {entry._offline && <div className="entry-note">📴</div>}
            </div>
            <div className={`entry-amount ${entry.type === 'revenu' ? 'in' : 'out'}`}>
              {entry.type === 'revenu' ? '+' : '−'} {formatFCFA(entry.amount_xof)}
            </div>
            <div className="entry-actions">
              <button type="button" onClick={() => openEdit(entry)} aria-label={t('common.edit')}>
                ✏️
              </button>
              <button type="button" onClick={() => onDelete(entry)} aria-label={t('common.delete')}>
                🗑️
              </button>
            </div>
          </div>
        );
      })}

      {/* Totals per category (simple bars, no chart library) */}
      {(expenseTotals.length > 0 || incomeTotals.length > 0) && (
        <>
          <h2 className="section-title">{t('budget.byCategory')}</h2>
          {[
            { rows: expenseTotals, color: '#c0392e' },
            { rows: incomeTotals, color: '#18803d' },
          ].map(
            ({ rows, color }) =>
              rows.length > 0 && (
                <div key={color} style={{ marginBottom: 14 }}>
                  {rows.map((row) => {
                    const cat = categoryById(row.category);
                    return (
                      <div key={row.category} className="cat-total">
                        <div className="ct-head">
                          <span>
                            {cat.emoji} {t(cat.key)}
                          </span>
                          <span>{formatFCFA(row.total)}</span>
                        </div>
                        <div className="ct-bar">
                          <div
                            className="ct-fill"
                            style={{ width: `${Math.max((row.total / maxTotal) * 100, 4)}%`, background: color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
          )}
        </>
      )}

      <p className="center form-hint" style={{ marginTop: 16 }}>
        {currentMonthLabel()}
      </p>

      <EntryForm
        open={formOpen}
        initial={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => reload()}
      />
      <BottomNav />
    </div>
  );
}
