import React from 'react';
import { ExternalLink, TrendingUp, TrendingDown, BookOpen, BarChart2, ShieldCheck, Zap } from 'lucide-react';

export function HubNewsCard({ article, onSelectArticle, onFocusTicker, onOpenCorrelation }) {
  if (!article) return null;

  const score = parseFloat(article.sentiment_score || 0);
  const isBullish = score >= 0.20;
  const isBearish = score <= -0.20;
  const changeP = parseFloat(article.change_p || 0);

  // Format date
  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return 'Recente';
    try {
      const now = new Date();
      const past = new Date(dateStr);
      const diffMin = Math.floor((now - past) / 60000);
      if (diffMin < 1) return 'Adesso';
      if (diffMin < 60) return `${diffMin}m fa`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `${diffHours}h fa`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d fa`;
    } catch {
      return dateStr.slice(0, 10);
    }
  };

  // Clean title: remove trailing publisher if redundant
  const cleanTitle = React.useMemo(() => {
    let t = (article.title || '').trim();
    if (article.publisher && t.toLowerCase().endsWith(` - ${article.publisher.toLowerCase()}`)) {
      t = t.slice(0, -(article.publisher.length + 3)).trim();
    }
    return t;
  }, [article.title, article.publisher]);

  // Display the genuine article body content
  const extendedSnippet = React.useMemo(() => {
    const rawContent = (article.content || '').trim();
    if (rawContent) {
      return rawContent;
    }
    const sym = article.primary_ticker || 'Mercato';
    const sector = article.sector || 'Equities';
    const pub = article.publisher || 'Fonte Finanziaria';
    return `Notizia da ${pub}: aggiornamento operativo per ${sym} nel comparto ${sector}. Clicca per aprire il testo completo.`;
  }, [article.content, article.primary_ticker, article.sector, article.publisher]);

  const formattedPrice = React.useMemo(() => {
    const sym = article.primary_ticker;
    const p = article.price;
    if (p === undefined || p === null || p <= 0) return '---';
    if (sym === '^TNX') return `${p.toFixed(2)}%`;
    if (sym === 'GLOBAL') return 'World Index';
    if (sym === 'DXY') return `${p.toFixed(2)} pts`;
    if (p >= 1000) return `$${p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return `$${p.toFixed(2)}`;
  }, [article.primary_ticker, article.price]);

  const tickerPrefix = React.useMemo(() => {
    const sym = article.primary_ticker;
    if (sym === '^TNX') return '📈 ';
    if (sym === 'GLOBAL') return '🌐 ';
    if (sym === 'CL=F') return '🛢️ ';
    if (sym === 'GC=F') return '🪙 ';
    if (sym === 'SLV') return '🥈 ';
    if (sym === 'CPER') return '🥉 ';
    if (sym === 'DXY') return '💵 ';
    if (sym === 'BTC-USD' || sym === 'ETH-USD') return '₿ ';
    if (sym === '^VIX') return '⚡ ';
    if (['SPY', 'QQQ', 'DIA', 'IWM'].includes(sym)) return '📊 ';
    return '';
  }, [article.primary_ticker]);

  return (
    <article className="hub-news-card glass-panel">
      {/* Top Meta Bar */}
      <div className="card-top-bar">
        {/* Ticker & Live Quote Pill */}
        {article.primary_ticker && (
          <div
            className="ticker-quote-pill font-mono"
            onClick={(e) => {
              e.stopPropagation();
              onFocusTicker && onFocusTicker(article.primary_ticker);
            }}
            title={`Clicca per filtrare su ${article.primary_ticker}`}
          >
            <span className="ticker-code">{tickerPrefix}{article.primary_ticker}</span>
            <span className="ticker-price">{formattedPrice}</span>
            {article.primary_ticker !== 'GLOBAL' && article.price > 0 && (
              <span className={`ticker-change ${changeP >= 0 ? 'bullish' : 'bearish'}`}>
                {changeP >= 0 ? '+' : ''}{changeP.toFixed(2)}%
              </span>
            )}
          </div>
        )}

        {/* Catalyst Tag */}
        {article.catalyst_label && (
          <div className="catalyst-tag-badge">
            <span>{article.catalyst_label}</span>
          </div>
        )}

        {/* Sentiment Pill */}
        <div className={`sentiment-score-badge font-mono ${isBullish ? 'bullish' : isBearish ? 'bearish' : 'neutral'}`}>
          {isBullish ? <TrendingUp size={13} /> : isBearish ? <TrendingDown size={13} /> : null}
          <span>
            {score >= 0 ? '+' : ''}{score.toFixed(2)} {article.sentiment_polarity}
          </span>
        </div>
      </div>

      {/* Title & Extended News Snippet */}
      <div className="card-body" onClick={() => onSelectArticle && onSelectArticle(article)}>
        <h3 className="card-title">{cleanTitle}</h3>
        <p className="card-snippet">{extendedSnippet}</p>
      </div>

      {/* Dynamic Market Impact Strip */}
      {article.sentiment_details?.market_impact && (
        <div className="card-impact-bar">
          <div className="impact-left">
            <span className={`market-impact-tag impact-${article.sentiment_details.market_impact.toLowerCase()}`}>
              <Zap size={11} /> Impact {article.sentiment_details.market_impact}
            </span>
            <span className="volatility-tag font-mono text-muted">
              {article.sentiment_details.volatility_expected || ''}
            </span>
          </div>

          {(article.sentiment_details.favored_assets?.length > 0 || article.sentiment_details.pressured_assets?.length > 0) && (
            <div className="impact-assets-flow">
              {article.sentiment_details.favored_assets?.length > 0 && (
                <span className="asset-flow favored">
                  <span className="flow-dot green">▲</span> Favore: {article.sentiment_details.favored_assets.slice(0, 2).join(', ')}
                </span>
              )}
              {article.sentiment_details.pressured_assets?.length > 0 && (
                <span className="asset-flow pressured">
                  <span className="flow-dot red">▼</span> Pressione: {article.sentiment_details.pressured_assets.slice(0, 2).join(', ')}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Bottom Footer Actions */}
      <div className="card-footer">
        <div className="source-info">
          <span className="publisher-name">{article.publisher}</span>
          <span className="bullet-dot">•</span>
          <span className="time-ago">{formatTimeAgo(article.date)}</span>
          <span className="bullet-dot">•</span>
          <span className="sector-tag">{article.sector}</span>
        </div>

        <div className="card-actions">
          {/* 1-Year Correlation Button */}
          {article.primary_ticker && (
            <button
              className="action-icon-btn font-mono"
              onClick={(e) => {
                e.stopPropagation();
                onOpenCorrelation && onOpenCorrelation(article.primary_ticker);
              }}
              title="Correlazione Prezzo vs Notizie a 1 Anno"
            >
              <BarChart2 size={14} />
              <span>1Y Correlazione</span>
            </button>
          )}

          {/* Detail Reader Button */}
          <button
            className="action-icon-btn primary"
            onClick={(e) => {
              e.stopPropagation();
              onSelectArticle && onSelectArticle(article);
            }}
            title="Leggi approfondimento e analisi lessicale"
          >
            <BookOpen size={14} />
            <span>Analisi Sentiment</span>
          </button>

          {/* External Source Link */}
          {article.link && article.link !== '#' && (
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="action-icon-btn link"
              onClick={(e) => e.stopPropagation()}
              title="Apri articolo originale"
            >
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
