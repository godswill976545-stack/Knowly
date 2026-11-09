'use client';

import { useEffect } from 'react';

/** Registers the service worker once the app has loaded (never blocks paint). */
export default function SWRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // SW unavailable (dev, private mode) — the app still works online.
      });
    }
  }, []);
  return null;
}
