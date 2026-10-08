import React from 'react';
import { Activity, Flame, Globe, TrendingUp, TrendingDown, Clock, ChevronRight } from 'lucide-react';
import { YahooSectorPerformance } from './YahooSectorPerformance';

const MACRO_EVENTS_CALENDAR = [
  { event: 'Federal Reserve FOMC Rate Decision', date: 'Mercoledì 17 Set', impact: 'CRITICAL', bias: 'Tassi invariati 5.25% - 5.50%' },
  { event: 'US CPI Consumer Price Index (MoM/YoY)', date: 'Giovedì ore 14:30', impact: 'HIGH', bias: 'Consensus 2.8% YoY' },
  { event: 'Non-Farm Payrolls & Unemployment Rate', date: 'Venerdì ore 14:30', impact: 'HIGH', bias: 'Stima +165k posti' },
  { event: 'ECB Monetary Policy Meeting & Presser', date: '25 Set ore 14:15', impact: 'MEDIUM', bias: 'Taglio atteso -25 bps' },
];

export function HubMarketPulse({
  sectorsPulse,
  trendingBuzz,
  selectedSector,
  onSelectSector,
  onFocusTicker,
}) {
  return (
    <div className="hub-market-pulse-column">
      {/* 1. Yahoo! Finance S&P 500 Sector Performance Bar Chart */}
      <YahooSectorPerformance
        sectorsPulse={sectorsPulse}
        selectedSector={selectedSector}
        onSelectSector={onSelectSector}
      />

      {/* 2. News Velocity & Buzz Leaderboard */}
      <section className="pulse-card glass-panel">
        <div className="card-header-pulse">
          <div className="title-with-icon">
            <Flame size={16} className="text-amber" />
            <h3 className="pulse-title">News Velocity & Buzz Leaderboard</h3>
          </div>
          <span className="pulse-subtitle">Volumi anomali di menzioni</span>
        </div>

        <div className="buzz-list">
          {trendingBuzz && trendingBuzz.map((item, idx) => (
            <div
              key={item.ticker}
              className="buzz-row"
              onClick={() => onFocusTicker && onFocusTicker(item.ticker)}
              title={`Clicca per filtrare ${item.ticker}`}
            >
              <div className="buzz-rank font-mono">#{idx + 1}</div>
              <div className="buzz-main">
                <div className="buzz-ticker-line">
                  <span className="buzz-code font-mono">{item.ticker}</span>
                  <span className="buzz-name">{item.name}</span>
                  <span className={`buzz-change font-mono ${item.change_p >= 0 ? 'bullish' : 'bearish'}`}>
                    {item.change_p >= 0 ? '+' : ''}{item.change_p?.toFixed(2)}%
                  </span>
                </div>
                <div className="buzz-catalyst-text">{item.primary_catalyst}</div>
              </div>
              <div className="buzz-badge font-mono">
                <span>{item.buzz_ratio}x</span>
                <small>buzz</small>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Macro & Central Bank Radar */}
      <section className="pulse-card glass-panel">
        <div className="card-header-pulse">
          <div className="title-with-icon">
            <Globe size={16} className="text-purple" />
            <h3 className="pulse-title">Macro & Central Bank Countdown</h3>
          </div>
          <span className="pulse-subtitle">Eventi ad alto impatto</span>
        </div>

        <div className="macro-events-list">
          {MACRO_EVENTS_CALENDAR.map((ev, i) => (
            <div key={i} className="macro-event-item">
              <div className="event-top">
                <span className="event-name">{ev.event}</span>
                <span className={`impact-badge ${ev.impact.toLowerCase()}`}>{ev.impact}</span>
              </div>
              <div className="event-bottom font-mono">
                <span className="event-date">
                  <Clock size={12} /> {ev.date}
                </span>
                <span className="event-bias">{ev.bias}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
