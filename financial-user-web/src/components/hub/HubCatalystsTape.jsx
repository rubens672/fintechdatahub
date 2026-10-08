import React from 'react';
import { Zap, ExternalLink } from 'lucide-react';

export function HubCatalystsTape({ catalysts, onSelectCatalyst, lastUpdated }) {
  if (!catalysts || catalysts.length === 0) return null;

  return (
    <div className="hub-catalysts-tape glass-panel">
      <div className="tape-label">
        <span className="hub-pulse-dot" />
        <Zap size={14} className="text-cyan" />
        <span>INSTITUTIONAL RADAR</span>
        <span className="tape-live-indicator">LIVE (60s)</span>
      </div>

      <div className="tape-marquee-container">
        <div className="tape-track">
          {/* Double items for continuous loop */}
          {[...catalysts, ...catalysts].map((item, idx) => (
            <div
              key={`${item.id || idx}_${idx}`}
              className="tape-item"
              onClick={() => onSelectCatalyst && onSelectCatalyst(item)}
              title="Clicca per approfondire il catalizzatore"
            >
              <span className="tape-icon">{item.icon || '⚡'}</span>
              <span className="tape-ticker font-mono">{item.ticker}</span>
              <span className="tape-title">{item.title}</span>
              <span className={`tape-sentiment font-mono ${parseFloat(item.sentiment) >= 0 ? 'bullish' : 'bearish'}`}>
                {item.sentiment}
              </span>
              <span className="tape-time">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
