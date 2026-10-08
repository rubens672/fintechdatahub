import React from 'react';
import { AlertTriangle, Shield, ArrowRight } from 'lucide-react';

export function SafeHavenAlert({ marketRegime }) {
  const vix = marketRegime?.vix || 15.4;
  if (vix <= 20) return null;

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(239, 68, 68, 0.1))',
      border: '1px solid rgba(245, 158, 11, 0.4)',
      borderRadius: 'var(--radius-lg)',
      padding: '16px 24px',
      marginBottom: '24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          background: 'rgba(245, 158, 11, 0.2)',
          padding: '10px',
          borderRadius: 'var(--radius-md)',
          color: 'var(--amber-gold)',
          display: 'flex',
        }}>
          <AlertTriangle size={22} />
        </div>
        <div>
          <div style={{ fontWeight: 700, color: 'var(--amber-gold)', fontSize: '15px' }}>
            ALLERTA REGIME DI MERCATO: VIX A {vix.toFixed(1)} (MODALITÀ RISK_OFF ATTIVA)
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Elevata volatilità sistemica. L'algoritmo attiva la protezione del capitale sui titoli ciclici e favorisce la rotazione sui <strong>Beni Rifugio Antifragili</strong>:
            <span style={{ color: '#ffffff', marginLeft: '6px' }}>
              🥇 Oro (GLD, NEM), 🛢️ Energia (XOM), 🚀 Difesa (LMT), 💵 T-Bills (BIL).
            </span>
          </div>
        </div>
      </div>
      <div style={{
        background: 'rgba(245, 158, 11, 0.2)',
        border: '1px solid var(--amber-gold)',
        padding: '6px 14px',
        borderRadius: 'var(--radius-sm)',
        fontSize: '12px',
        fontWeight: 700,
        color: 'var(--amber-gold)',
        whiteSpace: 'nowrap',
      }}>
        Safe-Haven Shield Attivo
      </div>
    </div>
  );
}
