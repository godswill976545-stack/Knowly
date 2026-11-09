'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';

const EXAMPLES = [
  { key: 'question.ex1' },
  { key: 'question.ex2' },
  { key: 'question.ex3' },
];

export default function QuestionPage() {
  const { t } = useI18n();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(null);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const ask = async (text) => {
    const q = (text ?? question).trim();
    if (!q || loading) return;
    setLoading(true);
    setError(null);
    setAnswer(null);
    setSources([]);
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      if (res.status === 429) {
        setError('question.rateLimited');
      } else if (!res.ok) {
        setError('question.failed');
      } else if (!data.matched) {
        setAnswer(data.answer);
        setError('question.noMatch');
      } else {
        setAnswer(data.answer);
        setSources(data.sources || []);
      }
    } catch {
      setError('question.failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <Header />
      <h1>{t('question.title')}</h1>
      <p style={{ color: '#6f6553' }}>{t('question.subtitle')}</p>

      <div className="card">
        <div className="field mb-0">
          <label htmlFor="question">{t('question.title')}</label>
          <textarea
            id="question"
            className="input"
            placeholder={t('question.placeholder')}
            value={question}
            maxLength={300}
            onChange={(e) => setQuestion(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="btn btn-primary"
          style={{ marginTop: 12 }}
          onClick={() => ask()}
          disabled={loading || !question.trim()}
        >
          💬 {t('question.send')}
        </button>
      </div>

      <h2 className="section-title">{t('question.examples')}</h2>
      <div className="chip-row">
        {EXAMPLES.map((ex) => (
          <button key={ex.key} type="button" className="chip" onClick={() => ask(t(ex.key))}>
            {t(ex.key)}
          </button>
        ))}
      </div>

      {loading && (
        <div className="card center" style={{ color: '#6f6553' }}>
          <div className="spinner" style={{ marginBottom: 8 }} />
          {t('question.thinking')}
        </div>
      )}

      {!loading && error && (
        <div className="form-error" role="alert">
          {t(error)}
        </div>
      )}

      {!loading && answer && (
        <div className="card">
          <p className="answer mb-0">{answer}</p>
          {sources.length > 0 && (
            <>
              <h2 className="section-title">{t('question.sources')}</h2>
              <ul className="sources-list">
                {sources.map((s) => (
                  <li key={s.id}>
                    <span>📄</span>
                    <span>
                      <strong>{s.title}</strong> —{' '}
                      <a href={s.source_url} target="_blank" rel="noopener noreferrer">
                        {s.source_name}
                      </a>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <div className="disclaimer">{t('alerts.detail.disclaimer')}</div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
