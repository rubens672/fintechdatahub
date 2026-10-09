import React from 'react';
import { X, ExternalLink, TrendingUp, TrendingDown, BookOpen, ShieldCheck, Sparkles, Layers, Clock, BarChart2, Zap, Flame, Gauge, Activity } from 'lucide-react';
import { YahooMarketChart } from './YahooMarketChart';

export function NewsDetailModal({ isOpen, onClose, article, onFocusTicker, onOpenCorrelation }) {
  if (!isOpen || !article) return null;

  const score = parseFloat(article.sentiment_score || 0);
  const isBullish = score >= 0.20;
  const isBearish = score <= -0.20;
  const ticker = article.primary_ticker || article.ticker;

  const modalFormattedPrice = React.useMemo(() => {
    const sym = article.primary_ticker || article.ticker;
    const p = article.price;
    if (p === undefined || p === null || p <= 0) return null;
    if (sym === '^TNX') return `${p.toFixed(2)}%`;
    if (sym === 'GLOBAL') return 'World Index';
    if (sym === 'DXY') return `${p.toFixed(2)} pts`;
    if (p >= 1000) return `$${p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return `$${p.toFixed(2)}`;
  }, [article.primary_ticker, article.ticker, article.price]);

  const cleanTitle = React.useMemo(() => {
    let t = (article.title || '').trim();
    if (article.publisher && t.toLowerCase().endsWith(` - ${article.publisher.toLowerCase()}`)) {
      t = t.slice(0, -(article.publisher.length + 3)).trim();
    }
    return t;
  }, [article.title, article.publisher]);

  const fullArticleContent = React.useMemo(() => {
    const rawContent = (article.content || '').trim();
    if (rawContent) {
      return rawContent;
    }
    const sym = ticker || 'il titolo';
    const sector = article.sector || 'Equities';
    const pub = article.publisher || 'Media Finanziario';
    return `Resoconto da ${pub}: aggiornamento operativo per ${sym} nel comparto ${sector}. Consultare il report originale per ulteriori dettagli.`;
  }, [article.content, ticker, article.sector, article.publisher]);

  // Dynamic Lexical Terms Extraction
  const { displayPosTerms, displayNegTerms } = React.useMemo(() => {
    const rawPos = article.sentiment_details?.positive_terms || [];
    const rawNeg = article.sentiment_details?.negative_terms || [];
    if (rawPos.length > 0 || rawNeg.length > 0) {
      return { displayPosTerms: rawPos, displayNegTerms: rawNeg };
    }
    const textToScan = `${cleanTitle} ${fullArticleContent}`.toLowerCase();
    const posDictionary = ['record', 'surge', 'crescita', 'accelerazione', 'espansione', 'profitto', 'upgrade', 'strong', 'beat', 'gain', 'buy', 'fiducia', 'rally', 'breakout', 'outperform', 'supera'];
    const negDictionary = ['rischio', 'calo', 'decline', 'pressione', 'miss', 'cut', 'drop', 'warning', 'downgrade', 'freno', 'perdita', 'weak', 'slump', 'incertezza', 'headwind'];

    const matchedPos = posDictionary.filter(w => textToScan.includes(w)).slice(0, 5);
    const matchedNeg = negDictionary.filter(w => textToScan.includes(w)).slice(0, 5);
    return { displayPosTerms: matchedPos, displayNegTerms: matchedNeg };
  }, [article, cleanTitle, fullArticleContent]);

  // Dynamic Confidence Calculation
  const { confidencePct, confidenceLabel } = React.useMemo(() => {
    const rawConf = article.sentiment_details?.confidence;
    const rawPct = article.sentiment_details?.confidence_pct;
    const rawLabel = article.sentiment_details?.confidence_label;

    if (typeof rawPct === 'number' && rawPct > 0) {
      return {
        confidencePct: rawPct,
        confidenceLabel: rawLabel || 'Confluenza Lessicale & Prezzo',
      };
    }
    if (typeof rawConf === 'number' && rawConf > 0) {
      return {
        confidencePct: Math.round(rawConf <= 1 ? rawConf * 100 : rawConf),
        confidenceLabel: rawLabel || 'Statistica VADER / Lexicon',
      };
    }

    const termCount = displayPosTerms.length + displayNegTerms.length;
    const concordant = (score * (article.change_p || 0)) > 0;
    const base = 75 + Math.min(12, termCount * 4) + Math.min(8, Math.round(Math.abs(score) * 10)) + (concordant ? 4 : 0);
    const pct = Math.min(96, Math.max(68, base));
    const label = concordant ? 'Confluenza Prezzo & Sentiment' : 'Analisi Lessicale VADER';
    return { confidencePct: pct, confidenceLabel: label };
  }, [article, displayPosTerms, displayNegTerms, score]);

  // Dynamic Market Impact Calculation (clean vector labels, no emojis)
  const impactData = React.useMemo(() => {
    const backendImpact = (article.sentiment_details?.market_impact || '').replace(/[^\w\sÀ-ÿ]/gi, '').trim();
    const backendScore = article.sentiment_details?.impact_score;
    const backendDesc = article.sentiment_details?.impact_desc;

    if (backendImpact && backendScore) {
      return {
        label: backendImpact,
        score: backendScore,
        desc: backendDesc || 'Catalizzatore Volatilità',
      };
    }

    const cat = article.catalyst_type || 'GENERAL_NEWS';
    let base = 52;
    if (cat === 'EARNINGS_GUIDANCE') base = 88;
    else if (cat === 'MACRO_FED') base = 84;
    else if (cat === 'INSIDER_TRADING') base = 82;
    else if (cat === 'MA_EXPANSION') base = 78;
    else if (cat === 'OPTIONS_FLOW') base = 76;
    else if (cat === 'CONGRESSIONAL_TRADE') base = 70;

    const chgBoost = Math.min(10, Math.round(Math.abs(article.change_p || 0) * 2.8));
    const sentBoost = Math.min(8, Math.round(Math.abs(score) * 10));
    const tot = Math.min(98, Math.max(38, base + chgBoost + sentBoost));

    let label = 'NEUTRO';
    let vol = '< ±1.0%';
    if (tot >= 80) { label = 'CRITICO'; vol = '±3.5% – ±5.0%'; }
    else if (tot >= 65) { label = 'ALTO'; vol = '±2.2% – ±3.4%'; }
    else if (tot >= 45) { label = 'MEDIO'; vol = '±1.2% – ±2.0%'; }

    return {
      label,
      score: tot,
      desc: `Volatilità Attesa: ${vol}`,
    };
  }, [article, score]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content news-detail-modal glass-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <BookOpen size={20} className="text-cyan" />
            <div>
              <h2 className="modal-title">Analisi Quantitativa Notizia & Sentiment</h2>
              <div className="modal-subtitle">
                {article.publisher} • {new Date(article.date).toLocaleString('it-IT')}
              </div>
            </div>
          </div>

          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body custom-scrollbar">
          <div className="news-modal-grid">
            {/* Left Column: Visuals (Meta Chips + Compact Chart + Sentiment KPIs) */}
            <div className="modal-left-visual-col">
              {/* Top Meta Chips */}
              <div className="detail-meta-chips">
                {ticker && (
                  <div className="meta-chip ticker font-mono">
                    <span>Ticker: {ticker}</span>
                    {modalFormattedPrice && <span className="price">{modalFormattedPrice}</span>}
                    {article.price > 0 && article.primary_ticker !== 'GLOBAL' && (
                      <span className={`change ${article.change_p >= 0 ? 'bullish' : 'bearish'}`}>
                        {article.change_p >= 0 ? '+' : ''}{article.change_p?.toFixed(2)}%
                      </span>
                    )}
                  </div>
                )}

                <div className="meta-chip sector">
                  <Layers size={13} />
                  <span>{article.sector}</span>
                </div>

                {article.catalyst_label && (
                  <div className="meta-chip catalyst">
                    <ShieldCheck size={13} />
                    <span>{article.catalyst_label}</span>
                  </div>
                )}
              </div>

              {/* Yahoo! Finance Compact Stock Chart with News Catalyst Marker */}
              <div className="modal-chart-section">
                <YahooMarketChart
                  symbol={ticker || 'SPY'}
                  companyName={ticker ? `${ticker} • ${article.sector || 'Equities'}` : 'S&P 500 Market Index'}
                  newsArticles={[article]}
                  compact={true}
                  height={175}
                />
              </div>

              {/* Sentiment Summary KPIs */}
              <div className="sentiment-summary-grid">
                {/* 1. Punteggio Sentiment */}
                <div className="sentiment-kpi-card">
                  <div className="kpi-header-row">
                    <span className="kpi-label">Punteggio Sentiment</span>
                    {isBullish ? (
                      <TrendingUp size={15} className="kpi-badge-icon bullish" />
                    ) : isBearish ? (
                      <TrendingDown size={15} className="kpi-badge-icon bearish" />
                    ) : (
                      <Activity size={15} className="kpi-badge-icon neutral" />
                    )}
                  </div>
                  <div className={`kpi-score font-mono ${isBullish ? 'bullish' : isBearish ? 'bearish' : 'neutral'}`}>
                    <span>{score >= 0 ? '+' : ''}{score.toFixed(2)}</span>
                  </div>
                  <span className="kpi-desc">Polarità: {article.sentiment_polarity || (isBullish ? 'BULLISH' : isBearish ? 'BEARISH' : 'NEUTRAL')}</span>
                </div>

                {/* 2. Confidenza Modello */}
                <div className="sentiment-kpi-card">
                  <div className="kpi-header-row">
                    <span className="kpi-label">Confidenza Modello</span>
                    <ShieldCheck size={15} className="kpi-badge-icon text-cyan" />
                  </div>
                  <div className="kpi-score font-mono text-cyan">
                    <span>{confidencePct}%</span>
                  </div>
                  <span className="kpi-desc">{confidenceLabel}</span>
                </div>

                {/* 3. Impatto Mercato */}
                <div className="sentiment-kpi-card">
                  <div className="kpi-header-row">
                    <span className="kpi-label">Impatto Mercato</span>
                    {impactData.score >= 80 ? (
                      <Zap size={15} className="kpi-badge-icon text-amber" />
                    ) : impactData.score >= 65 ? (
                      <Flame size={15} className="kpi-badge-icon text-orange" />
                    ) : impactData.score >= 45 ? (
                      <BarChart2 size={15} className="kpi-badge-icon text-cyan" />
                    ) : (
                      <Gauge size={15} className="kpi-badge-icon text-muted" />
                    )}
                  </div>
                  <div className={`kpi-score font-mono ${impactData.score >= 75 ? 'text-amber' : impactData.score >= 50 ? 'text-cyan' : 'text-muted'}`}>
                    <span className="impact-badge-text">{impactData.label}</span>
                    <span className="impact-score-num">({impactData.score}/100)</span>
                  </div>
                  <span className="kpi-desc">{impactData.desc}</span>
                </div>
              </div>
            </div>

            {/* Right Column: Full Text & Lexical Breakdown */}
            <div className="modal-right-text-col">
              {/* Article Full Title & Text */}
              <div className="article-main-text-box glass-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="font-mono text-cyan" style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    📰 Titolo & Testo della Notizia
                  </span>
                  {article.link && article.link !== '#' && (
                    <a
                      href={article.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="external-source-link"
                      style={{ fontSize: '11px', color: 'var(--accent-cyan)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      title="Apri l'articolo originale alla fonte"
                    >
                      <span>Leggi alla Fonte ({article.publisher || 'Web'})</span>
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
                <h3 className="article-full-title">{cleanTitle}</h3>
                <div className="article-full-content">
                  {fullArticleContent.split('\n\n').map((paragraph, pIdx) => (
                    <p key={pIdx}>{paragraph}</p>
                  ))}
                </div>
              </div>

              {/* Sentiment Lexicon Breakdown */}
              <div className="sentiment-analysis-section glass-panel">
                <div className="section-title-line">
                  <Sparkles size={15} className="text-cyan" />
                  <h4>Scomposizione Lessicale Finanziaria</h4>
                </div>

                {/* Keyword Matches */}
                <div className="keywords-breakdown-box">
                  <div className="keyword-col">
                    <span className="kw-header bullish">Termini Rialzisti:</span>
                    <div className="kw-tags">
                      {displayPosTerms.length > 0 ? (
                        displayPosTerms.map((term, i) => <span key={i} className="kw-tag bullish font-mono">+{term}</span>)
                      ) : (
                        <span className="text-dim">Nessun termine rialzista marcato</span>
                      )}
                    </div>
                  </div>

                  <div className="keyword-col">
                    <span className="kw-header bearish">Termini Ribassisti:</span>
                    <div className="kw-tags">
                      {displayNegTerms.length > 0 ? (
                        displayNegTerms.map((term, i) => <span key={i} className="kw-tag bearish font-mono">-{term}</span>)
                      ) : (
                        <span className="text-dim">Nessun termine ribassista marcato</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <div className="footer-left">
            {article.primary_ticker && (
              <button
                className="modal-btn secondary font-mono"
                onClick={() => {
                  onClose();
                  onOpenCorrelation && onOpenCorrelation(article.primary_ticker);
                }}
              >
                📊 Analisi Correlazione 1 Anno
              </button>
            )}
          </div>

          <div className="footer-right">
            {article.link && article.link !== '#' && (
              <a
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className="modal-btn primary"
              >
                <ExternalLink size={15} />
                <span>Apri Fonte Originale</span>
              </a>
            )}
            <button className="modal-btn close" onClick={onClose}>
              Chiudi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
