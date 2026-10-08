import React from 'react';
import { Search, Filter, Layers, TrendingUp, TrendingDown, Zap, Shield, Sparkles, X } from 'lucide-react';

const WATCHLIST_PRESETS = [
  { id: 'ALL', label: 'Tutti i Mercati', icon: '🌐' },
  { id: 'MACRO_CENTRAL_BANKS', label: 'Macro & Tassi Fed', icon: '🌐' },
  { id: 'GEOPOLITICS_TRADE', label: 'Geopolitica & Dazi', icon: '🌍' },
  { id: 'ENERGY_COMMODITIES', label: 'Energia & Oro', icon: '🛢️' },
  { id: 'DEFENSE_AEROSPACE', label: 'Difesa & Industriali', icon: '🛡️' },
  { id: 'MEGA_CAP', label: 'Mega-Cap Top 7', icon: '🚀' },
  { id: 'SEMICONDUCTORS', label: 'Chips & AI', icon: '⚡' },
  { id: 'FINANCE_BANKING', label: 'Banche & Finanza', icon: '🏦' },
  { id: 'HEALTHCARE_PHARMA', label: 'Pharma & Biotech', icon: '💊' },
];

const SECTORS_LIST = [
  'ALL',
  'Macro & Central Banks',
  'Geopolitics & Global Trade',
  'Energy & Commodities',
  'Technology & AI',
  'Semiconductors',
  'Financial Services',
  'Healthcare & Pharma',
  'Industrials & Defense',
  'Consumer & Cloud',
];

const CATALYST_TYPES = [
  { id: 'ALL', label: 'Tutti i Flussi', icon: '📋' },
  { id: 'MACRO_FED', label: 'Macro & Tassi Fed', icon: '🌐' },
  { id: 'GEOPOLITICS_TRADE', label: 'Geopolitica & Accordi', icon: '🌍' },
  { id: 'COMMODITIES_ENERGY', label: 'Materie Prime & OPEC', icon: '🛢️' },
  { id: 'INSIDER_TRADING', label: 'SEC Form 4 Insider', icon: '👔' },
  { id: 'CONGRESSIONAL_TRADE', label: 'STOCK Act Congresso', icon: '🏛️' },
  { id: 'EARNINGS_GUIDANCE', label: 'Earnings & Guidance', icon: '📊' },
  { id: 'OPTIONS_FLOW', label: 'Unusual Options', icon: '⚡' },
  { id: 'MA_EXPANSION', label: 'M&A & Accordi', icon: '🤝' },
];

export function HubSidebarFilters({
  searchQuery,
  onSearchChange,
  selectedWatchlist,
  onWatchlistChange,
  selectedSector,
  onSectorChange,
  selectedCatalyst,
  onCatalystChange,
  selectedSentiment,
  onSentimentChange,
  activeTicker,
  onClearTicker,
  onResetFilters,
}) {
  return (
    <aside className="hub-sidebar glass-panel">
      {/* Header & Reset */}
      <div className="sidebar-header">
        <div className="sidebar-title">
          <Filter size={16} className="text-cyan" />
          <span>Filtri & Watchlist</span>
        </div>
        <button className="reset-btn" onClick={onResetFilters} title="Reimposta tutti i filtri">
          Reset
        </button>
      </div>

      {/* Active Ticker Focus Badge (if set) */}
      {activeTicker && (
        <div className="active-ticker-banner">
          <div className="ticker-badge font-mono">
            <span>Focus: {activeTicker}</span>
            <button onClick={onClearTicker} title="Rimuovi filtro ticker">
              <X size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className="search-box">
        <Search size={15} className="search-icon text-muted" />
        <input
          type="text"
          placeholder="Cerca per titolo, ticker o keyword..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="search-input"
        />
        {searchQuery && (
          <button className="clear-search-btn" onClick={() => onSearchChange('')}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Watchlist Quick-Select */}
      <div className="filter-group">
        <div className="filter-group-title">
          <Layers size={14} />
          <span>Paniere & Watchlist</span>
        </div>
        <div className="watchlist-chips">
          {WATCHLIST_PRESETS.map((w) => (
            <button
              key={w.id}
              className={`watchlist-chip ${selectedWatchlist === w.id ? 'active' : ''}`}
              onClick={() => onWatchlistChange(w.id)}
            >
              <span>{w.icon}</span>
              <span>{w.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sentiment Polarity Filter */}
      <div className="filter-group">
        <div className="filter-group-title">
          <Sparkles size={14} />
          <span>Polarità Sentiment (Loughran-McDonald)</span>
        </div>
        <div className="sentiment-selector">
          <button
            className={`sentiment-btn ${selectedSentiment === 'ALL' ? 'active' : ''}`}
            onClick={() => onSentimentChange('ALL')}
          >
            Tutti
          </button>
          <button
            className={`sentiment-btn bullish ${selectedSentiment === 'BULLISH' ? 'active' : ''}`}
            onClick={() => onSentimentChange('BULLISH')}
          >
            <TrendingUp size={13} />
            <span>Rialzisti (≥ +0.20)</span>
          </button>
          <button
            className={`sentiment-btn bearish ${selectedSentiment === 'BEARISH' ? 'active' : ''}`}
            onClick={() => onSentimentChange('BEARISH')}
          >
            <TrendingDown size={13} />
            <span>Ribassisti (≤ -0.20)</span>
          </button>
          <button
            className={`sentiment-btn impact ${selectedSentiment === 'HIGH_IMPACT' ? 'active' : ''}`}
            onClick={() => onSentimentChange('HIGH_IMPACT')}
          >
            <Zap size={13} />
            <span>Alto Impatto (|S| ≥ 0.40)</span>
          </button>
        </div>
      </div>

      {/* Institutional Catalysts Filter */}
      <div className="filter-group">
        <div className="filter-group-title">
          <Shield size={14} />
          <span>Tipo di Catalizzatore</span>
        </div>
        <div className="catalyst-list">
          {CATALYST_TYPES.map((cat) => (
            <button
              key={cat.id}
              className={`catalyst-chip ${selectedCatalyst === cat.id ? 'active' : ''}`}
              onClick={() => onCatalystChange(cat.id)}
            >
              <span className="cat-icon">{cat.icon}</span>
              <span className="cat-label">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sectors Dropdown / Pills */}
      <div className="filter-group">
        <div className="filter-group-title">
          <Layers size={14} />
          <span>Settore di Mercato</span>
        </div>
        <div className="sector-chips">
          {SECTORS_LIST.map((sec) => (
            <button
              key={sec}
              className={`sector-chip ${selectedSector === sec ? 'active' : ''}`}
              onClick={() => onSectorChange(sec)}
            >
              {sec === 'ALL' ? 'Tutti i Settori' : sec}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
