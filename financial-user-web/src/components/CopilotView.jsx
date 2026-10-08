import React, { useState } from 'react';
import { Bot, RefreshCw, ExternalLink, Sparkles } from 'lucide-react';

export function CopilotView({ chainlitPort = 8000 }) {
  const [iframeKey, setIframeKey] = useState(0);
  const chainlitUrl = `${window.location.protocol}//${window.location.hostname}:${chainlitPort}`;

  return (
    <main className="main-content copilot-main" style={{ height: 'calc(100vh - 100px)', padding: '0 24px 24px', display: 'flex', flexDirection: 'column' }}>
      <div
        className="glass-panel"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
          overflow: 'hidden',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          background: 'rgba(15, 23, 42, 0.75)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Copilot Header Toolbar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(15, 23, 42, 0.85)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(2, 132, 199, 0.4))',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bot size={22} color="#38bdf8" />
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>AI Financial Copilot</span>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    background: 'rgba(56, 189, 248, 0.15)',
                    color: '#38bdf8',
                    borderRadius: '12px',
                    border: '1px solid rgba(56, 189, 248, 0.35)',
                    fontWeight: 600,
                  }}
                >
                  Google ADK & MCP 32 Tools
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    background: 'rgba(34, 197, 94, 0.15)',
                    color: '#22c55e',
                    borderRadius: '12px',
                    border: '1px solid rgba(34, 197, 94, 0.35)',
                    fontWeight: 600,
                  }}
                >
                  Live Agent
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                Assistente conversazionale quantitativo & analisi di mercato in tempo reale (Chainlit App)
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setIframeKey((k) => k + 1)}
              className="btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '7px 14px',
                fontSize: '12px',
                borderRadius: '8px',
                background: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#e2e8f0',
                cursor: 'pointer',
              }}
              title="Ricarica sessione Chainlit"
            >
              <RefreshCw size={14} />
              <span>Ricarica Chat</span>
            </button>

            <a
              href={chainlitUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '7px 14px',
                fontSize: '12px',
                borderRadius: '8px',
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                color: '#38bdf8',
                textDecoration: 'none',
                fontWeight: 500,
                cursor: 'pointer',
              }}
              title="Apri a schermo intero in una nuova finestra"
            >
              <ExternalLink size={14} />
              <span>Nuova Scheda</span>
            </a>
          </div>
        </div>

        {/* Embedded Chainlit Application */}
        <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%' }}>
          <iframe
            key={iframeKey}
            src={chainlitUrl}
            title="AI Financial Copilot Assistant"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block',
            }}
            allow="clipboard-write; clipboard-read"
          />
        </div>
      </div>
    </main>
  );
}
