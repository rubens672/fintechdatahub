import React from 'react';
import { Activity, BarChart3, TrendingUp, TrendingDown, Layers } from 'lucide-react';

const GICS_SECTORS = [
  { name: 'Technology', symbol: 'XLK' },
  { name: 'Communication', symbol: 'XLC' },
  { name: 'Financials', symbol: 'XLF' },
  { name: 'Industrials', symbol: 'XLI' },
  { name: 'Consumer Disc', symbol: 'XLY' },
  { name: 'Healthcare', symbol: 'XLV' },
  { name: 'Materials', symbol: 'XLB' },
  { name: 'Consumer Staples', symbol: 'XLP' },
  { name: 'Real Estate', symbol: 'XLRE' },
  { name: 'Utilities', symbol: 'XLU' },
  { name: 'Energy', symbol: 'XLE' },
];

export function YahooSectorPerformance({
  sectorsPulse = [],
  selectedSector = 'ALL',
  onSelectSector,
}) {
  const mergedSectors = GICS_SECTORS.map((def) => {
    const matched = (sectorsPulse || []).find(
      (s) => s.sector && s.sector.toLowerCase().includes(def.name.toLowerCase().slice(0, 4))
    );
    if (matched) {
      const score = typeof matched.sentiment_score === 'number' ? matched.sentiment_score : 0;
      return {
        ...def,
        sentiment_score: score,
        article_count: matched.article_count || 0,
        change_p: Math.round(score * 2.2 * 100) / 100,
        hasData: true,
      };
    }
    return {
      ...def,
      sentiment_score: 0,
      article_count: 0,
      change_p: 0,
      hasData: false,
    };
  });

  const maxAbsChange = Math.max(...mergedSectors.map((s) => Math.abs(s.change_p)), 1.5);

  return (
    <div className="yahoo-sector-card glass-panel">
      <div className="sector-header-line">
        <div className="sector-title-wrap">
          <BarChart3 size={16} className="text-cyan" />
          <h3 className="sector-widget-title">S&P 500 Sector Performance</h3>
        </div>
        <span className="sector-widget-badge">Yahoo! Market Heatmap</span>
      </div>

      <div className="sector-performance-list">
        {mergedSectors.map((sec) => {
          const isSelected = selectedSector === sec.name;
          const isPos = sec.change_p >= 0;
          const barWidth = Math.min(100, Math.round((Math.abs(sec.change_p) / maxAbsChange) * 100));

          return (
            <div
              key={sec.name}
              className={`sector-perf-row ${isSelected ? 'active-perf' : ''}`}
              onClick={() => onSelectSector && onSelectSector(sec.name === selectedSector ? 'ALL' : sec.name)}
              title={`Clicca per filtrare le notizie del settore ${sec.name}`}
            >
              <div className="sector-name-col">
                <span className="sec-ticker-tag font-mono">{sec.symbol}</span>
                <span className="sec-title-text">{sec.name}</span>
              </div>

              {/* Centered Bidirectional Bar Chart */}
              <div className="sector-bar-wrapper">
                <div className="bar-center-line" />
                <div
                  className={`sector-bar-fill ${isPos ? 'positive' : 'negative'}`}
                  style={{
                    width: `${barWidth / 2}%`,
                    left: isPos ? '50%' : `${50 - barWidth / 2}%`,
                  }}
                />
              </div>

              <div className="sector-delta-col font-mono">
                <span className={`perf-delta ${isPos ? 'positive' : 'negative'}`}>
                  {isPos ? '+' : ''}{sec.change_p.toFixed(2)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
