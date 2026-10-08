import React, { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, BarChart2, Activity, Calendar, Zap, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';

export function NewsCorrelationModal({ isOpen, onClose, ticker }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [timeframe, setTimeframe] = useState('1Y');

  useEffect(() => {
    if (isOpen && ticker) {
      loadCorrelation();
    }
  }, [isOpen, ticker, timeframe]);

  const loadCorrelation = async () => {
    setIsLoading(true);
    try {
      const res = await api.getHubCorrelation(ticker, timeframe);
      setData(res);
    } catch (err) {
      console.warn('Error loading correlation data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !ticker) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content correlation-modal glass-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <BarChart2 size={20} className="text-cyan" />
            <div>
              <h2 className="modal-title">
                Evoluzione Storica & Correlazione Prezzo vs Notizie ({timeframe === '1Y' ? '1 Anno' : timeframe === '6M' ? '6 Mesi' : '3 Mesi'})
              </h2>
              <div className="modal-subtitle font-mono">
                Asset: <strong>{ticker}</strong> • Archivio Storico Firestore ({timeframe}){data?.sector ? ` • ${data.sector}` : ''}
              </div>
            </div>
          </div>

          <div className="timeframe-selector font-mono">
            {['3M', '6M', '1Y'].map((tf) => (
              <button
                key={tf}
                className={`tf-btn ${timeframe === tf ? 'active' : ''}`}
                onClick={() => setTimeframe(tf)}
              >
                {tf}
              </button>
            ))}
          </div>

          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body custom-scrollbar">
          {isLoading ? (
            <div className="correlation-loading">
              <Activity className="spinning text-cyan" size={32} />
              <p>Calcolo correlazione quantitativa serie storica e sentiment...</p>
            </div>
          ) : data ? (
            <>
              {/* Top KPI Cards */}
              <div className="correlation-kpis-grid">
                <div className="kpi-box glass-panel">
                  <span className="kpi-label">Performance Prezzo ({timeframe})</span>
                  <div className={`kpi-val font-mono ${data.price_return_pct >= 0 ? 'bullish' : 'bearish'}`}>
                    {data.price_return_pct >= 0 ? '+' : ''}{data.price_return_pct}%
                  </div>
                  <span className="kpi-sub">Variazione cumulativa</span>
                </div>

                <div className="kpi-box glass-panel">
                  <span className="kpi-label">Sentiment Medio Notizie</span>
                  <div className="kpi-val font-mono text-cyan">
                    {data.avg_sentiment >= 0 ? '+' : ''}{data.avg_sentiment}
                  </div>
                  <span className="kpi-sub">Score -1.0 a +1.0</span>
                </div>

                <div className="kpi-box glass-panel">
                  <span className="kpi-label">Indice Correlazione Quant</span>
                  <div className="kpi-val font-mono text-amber">
                    {data.correlation_score >= 0 ? '+' : ''}{data.correlation_score}
                  </div>
                  <span className="kpi-sub">{data.correlation_label || 'Forte Correlazione Positiva'}</span>
                </div>
              </div>

              {/* Summary Box */}
              <div className="correlation-summary-box glass-panel">
                <p>{data.summary}</p>
              </div>

              {/* Timeline of Catalyst Events & Price Impact */}
              <div className="timeline-section glass-panel">
                <div className="section-title-line">
                  <Calendar size={16} className="text-cyan" />
                  <h4>Timeline Catalizzatori Storici & Reazione del Titolo</h4>
                </div>

                <div className="timeline-events-list">
                  {data.points && data.points.map((pt, idx) => {
                    const isBull = pt.sentiment >= 0.20;
                    const isBear = pt.sentiment <= -0.20;

                    return (
                      <div key={idx} className="timeline-row">
                        <div className="timeline-date font-mono">{pt.date}</div>
                        <div className={`timeline-dot ${isBull ? 'bullish' : isBear ? 'bearish' : 'neutral'}`} />
                        <div className="timeline-main">
                          <div className="timeline-event-name">{pt.event}</div>
                          <div className="timeline-meta font-mono">
                            <span className="price-tag">Prezzo: ${pt.price.toFixed(2)}</span>
                            <span className={`sentiment-tag ${isBull ? 'bullish' : isBear ? 'bearish' : 'neutral'}`}>
                              Sentiment: {pt.sentiment >= 0 ? '+' : ''}{pt.sentiment.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="correlation-empty">
              <AlertCircle size={32} className="text-muted" />
              <p>Nessun dato storico di correlazione disponibile per {ticker}.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="modal-btn close" onClick={onClose}>
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}
