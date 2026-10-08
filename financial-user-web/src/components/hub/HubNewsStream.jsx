import React from 'react';
import { RefreshCw, Newspaper, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { HubNewsCard } from './HubNewsCard';

export function HubNewsStream({
  articles,
  total,
  page,
  limit,
  hasMore,
  isLoading,
  isRefreshing,
  onRefresh,
  onPageChange,
  onSelectArticle,
  onFocusTicker,
  onOpenCorrelation,
}) {
  const totalPages = Math.ceil(total / limit) || 1;

  // Enforce strict chronological order descending (most recent first)
  const sortedArticles = React.useMemo(() => {
    if (!Array.isArray(articles)) return [];
    return [...articles].sort((a, b) => {
      const timeA = a.date ? new Date(a.date).getTime() : 0;
      const timeB = b.date ? new Date(b.date).getTime() : 0;
      return timeB - timeA;
    });
  }, [articles]);

  return (
    <div className="hub-news-stream-container">
      {/* Stream Toolbar */}
      <div className="stream-toolbar glass-panel">
        <div className="toolbar-left">
          <div className="stream-heading">
            <Newspaper size={18} className="text-cyan" />
            <h2 className="stream-title">The Institutional Intelligence Stream</h2>
          </div>
          <div className="stream-meta-badges">
            <span className="stream-count-badge font-mono">
              {total} Notizie Filtrate (Pagina {page} di {totalPages})
            </span>
            <span className="stream-order-badge font-mono">
              🕒 Ordine Cronologico in Tempo Reale
            </span>
            <span className="stream-daemon-badge font-mono" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              ⚡ Auto-Sync Attivo (Continuous Ingestion)
            </span>
          </div>
        </div>

        <div className="toolbar-right">
          <button
            className={`refresh-stream-btn ${isRefreshing || isLoading ? 'spinning' : ''}`}
            onClick={onRefresh}
            disabled={isRefreshing || isLoading}
            title="Forza aggiornamento del feed da web/cache"
          >
            <RefreshCw size={15} />
            <span>{isRefreshing ? 'Aggiornamento...' : 'Live Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Loading Skeleton or Cards List */}
      {isLoading && sortedArticles.length === 0 ? (
        <div className="stream-loading-skeleton">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="news-card-skeleton glass-panel">
              <div className="skeleton-bar title-skeleton" />
              <div className="skeleton-bar text-skeleton" />
              <div className="skeleton-bar text-skeleton short" />
            </div>
          ))}
        </div>
      ) : sortedArticles.length === 0 ? (
        <div className="stream-empty-state glass-panel">
          <AlertCircle size={36} className="text-muted" />
          <h3>Nessuna notizia trovata con i filtri attuali</h3>
          <p>Prova a selezionare un altro settore, rimuovere il filtro ticker o reimpostare la polarità di sentiment.</p>
        </div>
      ) : (
        <div className="articles-feed-list">
          {sortedArticles.map((art) => (
            <HubNewsCard
              key={art.id}
              article={art}
              onSelectArticle={onSelectArticle}
              onFocusTicker={onFocusTicker}
              onOpenCorrelation={onOpenCorrelation}
            />
          ))}
        </div>
      )}

      {/* Pagination Bar */}
      {total > limit && (
        <div className="stream-pagination glass-panel">
          <button
            className="page-btn"
            disabled={page <= 1 || isLoading}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft size={16} />
            <span>Precedente</span>
          </button>

          <div className="page-indicator font-mono">
            Pagina <strong>{page}</strong> di <strong>{totalPages}</strong>
          </div>

          <button
            className="page-btn"
            disabled={page >= totalPages || isLoading}
            onClick={() => onPageChange(page + 1)}
          >
            <span>Successiva</span>
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
