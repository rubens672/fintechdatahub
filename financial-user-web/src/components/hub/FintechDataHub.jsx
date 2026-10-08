import React, { useState, useEffect } from 'react';
import { HubCatalystsTape } from './HubCatalystsTape';
import { HubSidebarFilters } from './HubSidebarFilters';
import { HubNewsStream } from './HubNewsStream';
import { HubMarketPulse } from './HubMarketPulse';
import { YahooMarketMarquee } from './YahooMarketMarquee';
import { YahooMarketChart } from './YahooMarketChart';
import { NewsDetailModal } from './NewsDetailModal';
import { NewsCorrelationModal } from './NewsCorrelationModal';
import { api } from '../../services/api';

export function FintechDataHub() {
  // State for Stream & Filters
  const [articles, setArticles] = useState([]);
  const [totalArticles, setTotalArticles] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(15);
  const [hasMore, setHasMore] = useState(false);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWatchlist, setSelectedWatchlist] = useState('ALL');
  const [selectedSector, setSelectedSector] = useState('ALL');
  const [selectedCatalyst, setSelectedCatalyst] = useState('ALL');
  const [selectedSentiment, setSelectedSentiment] = useState('ALL');
  const [activeTicker, setActiveTicker] = useState(null);

  // Market Pulse Data
  const [sectorsPulse, setSectorsPulse] = useState([]);
  const [trendingBuzz, setTrendingBuzz] = useState([]);
  const [catalysts, setCatalysts] = useState([]);

  // UI / Loading State
  const [isLoadingStream, setIsLoadingStream] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [correlationTicker, setCorrelationTicker] = useState(null);

  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Initial Load & 60s Auto-Refresh Interval
  useEffect(() => {
    loadMarketPulseData();

    // Auto-refresh catalysts tape and market pulse every 60 seconds
    const intervalId = setInterval(() => {
      loadMarketPulseData();
      // Silently refresh stream if on page 1 without active modal
      if (currentPage === 1) {
        loadNewsStream(false);
      }
      setLastUpdated(new Date());
    }, 60000);

    return () => clearInterval(intervalId);
  }, [currentPage, activeTicker, selectedWatchlist, selectedSector, selectedCatalyst, selectedSentiment, searchQuery]);

  // Fetch News Stream on filter/page change
  useEffect(() => {
    loadNewsStream();
  }, [
    currentPage,
    searchQuery,
    selectedWatchlist,
    selectedSector,
    selectedCatalyst,
    selectedSentiment,
    activeTicker,
  ]);

  const loadMarketPulseData = async () => {
    try {
      const [secRes, buzzRes, catRes] = await Promise.all([
        api.getHubSectorPulse().catch(() => ({ sectors: [] })),
        api.getHubTrending().catch(() => ({ trending: [] })),
        api.getHubCatalysts().catch(() => ({ catalysts: [] })),
      ]);

      setSectorsPulse(secRes.sectors || []);
      setTrendingBuzz(buzzRes.trending || []);
      setCatalysts(catRes.catalysts || []);
    } catch (err) {
      console.warn('Error loading market pulse data:', err);
    }
  };

  const loadNewsStream = async (forceRefresh = false) => {
    setIsLoadingStream(true);
    try {
      const res = await api.getHubStream({
        ticker: activeTicker || (selectedWatchlist !== 'ALL' ? selectedWatchlist : undefined),
        sector: selectedSector !== 'ALL' ? selectedSector : undefined,
        catalyst: selectedCatalyst !== 'ALL' ? selectedCatalyst : undefined,
        sentiment: selectedSentiment,
        q: searchQuery,
        page: currentPage,
        limit,
        forceRefresh,
      });

      if (res && res.items) {
        setArticles(res.items);
        setTotalArticles(res.total || res.items.length);
        setHasMore(res.has_more || false);
      }
    } catch (err) {
      console.error('Error fetching hub stream:', err);
    } finally {
      setIsLoadingStream(false);
      setIsRefreshing(false);
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await api.refreshHubNews().catch(() => null);
    await Promise.all([
      loadNewsStream(true),
      loadMarketPulseData(),
    ]);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedWatchlist('ALL');
    setSelectedSector('ALL');
    setSelectedCatalyst('ALL');
    setSelectedSentiment('ALL');
    setActiveTicker(null);
    setCurrentPage(1);
  };

  const handleFocusTicker = (ticker) => {
    if (!ticker || ticker === 'ALL') {
      setActiveTicker(null);
    } else {
      setActiveTicker(ticker);
    }
    setCurrentPage(1);
  };

  return (
    <div className="fintech-datahub-view">
      {/* 1. Breaking Institutional Catalysts Tape */}
      <HubCatalystsTape
        catalysts={catalysts}
        lastUpdated={lastUpdated}
        onSelectCatalyst={(cat) => {
          if (cat.ticker) handleFocusTicker(cat.ticker);
        }}
      />

      {/* 2. Yahoo! Finance Major Indices & Commodities Marquee */}
      <YahooMarketMarquee
        activeSymbol={activeTicker}
        onSelectSymbol={(sym) => handleFocusTicker(sym)}
      />

      {/* 3. Main 3-Column Terminal Layout */}
      <div className="hub-layout-grid">
        {/* Left Column: Filters & Watchlists */}
        <HubSidebarFilters
          searchQuery={searchQuery}
          onSearchChange={(q) => {
            setSearchQuery(q);
            setCurrentPage(1);
          }}
          selectedWatchlist={selectedWatchlist}
          onWatchlistChange={(w) => {
            setSelectedWatchlist(w);
            setActiveTicker(null);
            setCurrentPage(1);
          }}
          selectedSector={selectedSector}
          onSectorChange={(s) => {
            setSelectedSector(s);
            setCurrentPage(1);
          }}
          selectedCatalyst={selectedCatalyst}
          onCatalystChange={(c) => {
            setSelectedCatalyst(c);
            setCurrentPage(1);
          }}
          selectedSentiment={selectedSentiment}
          onSentimentChange={(s) => {
            setSelectedSentiment(s);
            setCurrentPage(1);
          }}
          activeTicker={activeTicker}
          onClearTicker={() => setActiveTicker(null)}
          onResetFilters={handleResetFilters}
        />

        {/* Center Column: Interactive Yahoo! Finance Chart + Institutional News Stream */}
        <div className="hub-center-main-column">
          <YahooMarketChart
            symbol={activeTicker || '^DJI'}
            companyName={activeTicker ? `${activeTicker} Market Asset` : 'Dow Jones Industrial Average'}
            newsArticles={articles}
            onSelectNewsArticle={(art) => setSelectedArticle(art)}
            activeBenchmark={activeTicker}
            onSelectBenchmark={handleFocusTicker}
          />

          <HubNewsStream
            articles={articles}
            total={totalArticles}
            page={currentPage}
            limit={limit}
            hasMore={hasMore}
            isLoading={isLoadingStream}
            isRefreshing={isRefreshing}
            onRefresh={handleManualRefresh}
            onPageChange={setCurrentPage}
            onSelectArticle={(art) => setSelectedArticle(art)}
            onFocusTicker={handleFocusTicker}
            onOpenCorrelation={(t) => setCorrelationTicker(t)}
          />
        </div>

        {/* Right Column: Market Sentiment Pulse, Sector Performance & Macro Countdown */}
        <HubMarketPulse
          sectorsPulse={sectorsPulse}
          trendingBuzz={trendingBuzz}
          selectedSector={selectedSector}
          onSelectSector={(sec) => {
            setSelectedSector(sec);
            setCurrentPage(1);
          }}
          onFocusTicker={handleFocusTicker}
        />
      </div>

      {/* Modals */}
      <NewsDetailModal
        isOpen={selectedArticle !== null}
        onClose={() => setSelectedArticle(null)}
        article={selectedArticle}
        onFocusTicker={handleFocusTicker}
        onOpenCorrelation={(t) => setCorrelationTicker(t)}
      />

      <NewsCorrelationModal
        isOpen={correlationTicker !== null}
        onClose={() => setCorrelationTicker(null)}
        ticker={correlationTicker}
      />
    </div>
  );
}
