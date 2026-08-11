'use client';
import { useEffect } from 'react';

export default function GlobalError({ reset }) {
  useEffect(() => {
    const timer = setTimeout(() => { window.location.href = '/kiosk'; }, 12000);
    return () => clearTimeout(timer);
  }, []);
  return <html><body><main className="fatal-screen"><section><h1>GoCreate OS needs to reload</h1><p>This browser will return to the kiosk automatically. The Windows watchdog also restarts it if the heartbeat stops.</p><button className="btn primary" onClick={() => reset()}>Reload GoCreate OS</button></section></main></body></html>;
}
