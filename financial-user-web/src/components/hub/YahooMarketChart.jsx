import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, BarChart2, Activity, Maximize2, 
  Layers, RefreshCw, Eye, EyeOff, Calendar, AlertCircle, Zap
} from 'lucide-react';
import { api } from '../../services/api';

const TIMEFRAMES = [
  { label: '1D', value: '1d', days: 1 },
  { label: '5D', value: '5d', days: 5 },
  { label: '1M', value: '1mo', days: 22 },
  { label: '6M', value: '6mo', days: 130 },
  { label: 'YTD', value: 'ytd', days: 170 },
  { label: '1Y', value: '1y', days: 252 },
];

const SWR_CHART_PREFIX = 'FINTECH_CHART_CACHE_';

const getCachedChart = (sym, tf) => {
  try {
    const raw = sessionStorage.getItem(`${SWR_CHART_PREFIX}${sym}_${tf}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.prices) && parsed.prices.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    // sessionStorage not available
  }
  return null;
};

const saveChartToCache = (sym, tf, data) => {
  try {
    sessionStorage.setItem(`${SWR_CHART_PREFIX}${sym}_${tf}`, JSON.stringify({
      prices: data.prices,
      currentQuote: data.currentQuote,
      timestamp: Date.now(),
    }));
  } catch (e) {
    // quota exceeded or private mode
  }
};

const OFFICIAL_NAMES_MAP = {
  // 1. Indici Benchmark USA Ufficiali
  '^DJI': { name: 'Dow Jones Industrial Average', short: 'Dow Jones', type: 'index', category: 'Indice Benchmark', info: '30 Blue Chip USA' },
  'DIA': { name: 'SPDR Dow Jones Industrial Average ETF', short: 'Dow Jones ETF', type: 'equity', category: 'ETF Benchmark', info: 'Replica 30 Dow' },
  '^GSPC': { name: 'S&P 500 Index', short: 'S&P 500', type: 'index', category: 'Indice Benchmark', info: '500 Large-Cap USA' },
  'SPY': { name: 'SPDR S&P 500 ETF Trust', short: 'S&P 500 ETF', type: 'equity', category: 'ETF Benchmark', info: 'Replica S&P 500' },
  '^IXIC': { name: 'Nasdaq Composite Index', short: 'Nasdaq Comp', type: 'index', category: 'Indice Benchmark', info: '3000+ Titoli Tech' },
  'QQQ': { name: 'Invesco QQQ Trust (Nasdaq 100)', short: 'Nasdaq 100 ETF', type: 'equity', category: 'ETF Tech Leader', info: '100 Top Non-Financial' },
  '^RUT': { name: 'Russell 2000 Index', short: 'Russell 2000', type: 'index', category: 'Small-Cap Index', info: '2000 Small-Cap USA' },
  'IWM': { name: 'iShares Russell 2000 ETF', short: 'Russell 2000 ETF', type: 'equity', category: 'ETF Small-Cap', info: 'Replica Russell 2000' },

  // 2. Titoli di Stato & Tassi Treasury
  '^TNX': { name: 'US 10-Year Treasury Yield', short: '10Y Yield', type: 'rate', category: 'Tasso Governativo', info: 'Benchmark Tassi USA' },
  'TLT': { name: 'iShares 20+ Year Treasury Bond ETF', short: '20Y+ Treasury', type: 'equity', category: 'Governative Long', info: 'Duration Elevata' },
  'SHY': { name: 'iShares 1-3 Year Treasury Bond ETF', short: '1-3Y Treasury', type: 'equity', category: 'Governative Short', info: 'Basso Rischio Tassi' },

  // 3. Volatilità
  '^VIX': { name: 'CBOE Volatility Index', short: 'VIX Volatility', type: 'index', category: 'Indice Paura', info: 'Volatilità Implicita S&P' },

  // 4. Materie Prime & Futures
  'GLD': { name: 'SPDR Gold Shares', short: 'Gold SPDR', type: 'commodity', category: 'Materia Prima (Oro)', info: 'Bene Rifugio Fisico' },
  'SLV': { name: 'iShares Silver Trust', short: 'Silver Trust', type: 'commodity', category: 'Materia Prima (Argento)', info: 'Metallo Industriale' },
  'USO': { name: 'United States Oil Fund', short: 'Crude Oil USO', type: 'commodity', category: 'Energia (WTI)', info: 'Prezzo Petrolio Greggio' },
  'UNG': { name: 'United States Natural Gas Fund', short: 'Natural Gas UNG', type: 'commodity', category: 'Energia (Gas Nat)', info: 'Gas Naturale Henry Hub' },
  'CPER': { name: 'United States Copper Index Fund', short: 'Copper Fund', type: 'commodity', category: 'Metalli Base', info: 'Rame Industriale' },
  'CL=F': { name: 'Crude Oil WTI Futures', short: 'WTI Crude', type: 'commodity', category: 'Futures Petrolio', info: 'Nymex WTI Greggio' },
  'GC=F': { name: 'Gold Futures COMEX', short: 'Gold Futures', type: 'commodity', category: 'Futures Oro', info: 'COMEX Gold $ / oz' },
  'SI=F': { name: 'Silver Futures COMEX', short: 'Silver Futures', type: 'commodity', category: 'Futures Argento', info: 'COMEX Silver $ / oz' },
  'NG=F': { name: 'Natural Gas Futures', short: 'Nat Gas Futures', type: 'commodity', category: 'Futures Gas', info: 'Henry Hub NYMEX' },
  'HG=F': { name: 'Copper Futures COMEX', short: 'Copper Futures', type: 'commodity', category: 'Futures Rame', info: 'COMEX Copper $ / lb' },

  // 5. Crypto
  'BTC-USD': { name: 'Bitcoin USD', short: 'Bitcoin', type: 'crypto', category: 'Criptovaluta', info: 'Leading Digital Asset' },
  'ETH-USD': { name: 'Ethereum USD', short: 'Ethereum', type: 'crypto', category: 'Criptovaluta', info: 'Smart Contract Platform' },

  // 6. Europa Ufficiale
  '^STOXX50E': { name: 'EURO STOXX 50 Index', short: 'Euro Stoxx 50', type: 'index', category: 'Indice Europeo', info: '50 Blue Chip Eurozona' },
  'FEZ': { name: 'SPDR EURO STOXX 50 ETF', short: 'Euro Stoxx ETF', type: 'equity', category: 'ETF Europa', info: 'Replica Euro Stoxx' },
  '^GDAXI': { name: 'DAX 40 Performance Index (Germania)', short: 'DAX 40', type: 'index', category: 'Indice Tedesco', info: '40 Titoli Francoforte' },
  'FTSEMIB.MI': { name: 'FTSE MIB Index (Italia)', short: 'FTSE MIB', type: 'index', category: 'Borsa Italiana', info: '40 Blue Chip Milano' },
  '^FTSE': { name: 'FTSE 100 Index (Regno Unito)', short: 'FTSE 100', type: 'index', category: 'Borsa di Londra', info: '100 Blue Chip UK' },
  '^FCHI': { name: 'CAC 40 Index (Francia)', short: 'CAC 40', type: 'index', category: 'Borsa di Parigi', info: '40 Titoli Euronext Paris' },
  '^IBEX': { name: 'IBEX 35 Index (Spagna)', short: 'IBEX 35', type: 'index', category: 'Borsa di Madrid', info: '35 Titoli Spagnoli' },
  '^SSMI': { name: 'Swiss Market Index SMI (Svizzera)', short: 'SMI 20', type: 'index', category: 'Borsa Svizzera', info: '20 Blue Chip Zurigo' },

  // 7. Asia ed Emergenti
  '^N225': { name: 'Nikkei 225 Stock Average (Giappone)', short: 'Nikkei 225', type: 'index', category: 'Borsa di Tokyo', info: '225 Titoli Giapponesi' },
  '^HSI': { name: 'Hang Seng Index (Hong Kong)', short: 'Hang Seng', type: 'index', category: 'Borsa Hong Kong', info: 'Blue Chip Hang Seng' },
  '^NSEI': { name: 'NIFTY 50 Index (India)', short: 'Nifty 50', type: 'index', category: 'Borsa Indiana', info: 'National Stock Exchange' },
  '^STI': { name: 'Straits Times Index (Singapore)', short: 'Straits Times', type: 'index', category: 'Borsa Singapore', info: '30 Top Singapore' },
  '^AXJO': { name: 'S&P/ASX 200 Index (Australia)', short: 'ASX 200', type: 'index', category: 'Borsa di Sydney', info: '200 Titoli ASX' },

  // 8. Forex / Valute
  'EURUSD=X': { name: 'Euro / US Dollar', short: 'EUR/USD', type: 'forex', category: 'Cross Valutario', info: 'Tasso di Cambio EUR/USD' },
  'GBPUSD=X': { name: 'British Pound / US Dollar', short: 'GBP/USD', type: 'forex', category: 'Cross Valutario', info: 'Tasso di Cambio GBP/USD' },
  'USDJPY=X': { name: 'US Dollar / Japanese Yen', short: 'USD/JPY', type: 'forex', category: 'Cross Valutario', info: 'Tasso di Cambio USD/JPY' },
  'USDCHF=X': { name: 'US Dollar / Swiss Franc', short: 'USD/CHF', type: 'forex', category: 'Cross Valutario', info: 'Tasso di Cambio USD/CHF' },

  // 9. Mega-Cap Equities
  'TSLA': { name: 'Tesla Inc', short: 'Tesla', type: 'equity', category: 'Automotive / AI', info: 'Auto Elettriche & Autopilot' },
  'AAPL': { name: 'Apple Inc', short: 'Apple', type: 'equity', category: 'Consumer Tech', info: 'iPhone & Servizi Ecosistema' },
  'MSFT': { name: 'Microsoft Corp', short: 'Microsoft', type: 'equity', category: 'Cloud & Software', info: 'Azure & AI Enterprise' },
  'NVDA': { name: 'Nvidia Corp', short: 'Nvidia', type: 'equity', category: 'Semiconductors', info: 'GPU AI Blackwell & Hopper' },
  'ORCL': { name: 'Oracle Corp', short: 'Oracle', type: 'equity', category: 'Enterprise Cloud', info: 'Database & OCI Cloud' },
  'AMZN': { name: 'Amazon.com Inc', short: 'Amazon', type: 'equity', category: 'E-Commerce / Cloud', info: 'AWS & Piattaforma Globale' },
  'GOOGL': { name: 'Alphabet Inc', short: 'Alphabet', type: 'equity', category: 'Search & AI', info: 'Google, YouTube & Gemini' },
  'META': { name: 'Meta Platforms Inc', short: 'Meta', type: 'equity', category: 'Social Media / AI', info: 'Instagram, WhatsApp, Llama' },
  'AVGO': { name: 'Broadcom Inc', short: 'Broadcom', type: 'equity', category: 'Semiconductors', info: 'Networking & Custom AI Silicon' },
  'AMD': { name: 'Advanced Micro Devices', short: 'AMD', type: 'equity', category: 'Semiconductors', info: 'CPU Ryzen & GPU Instinct' },
  'PLTR': { name: 'Palantir Technologies', short: 'Palantir', type: 'equity', category: 'Data & AI', info: 'AIP Enterprise Platform' },
  'CRM': { name: 'Salesforce Inc', short: 'Salesforce', type: 'equity', category: 'Enterprise SaaS', info: 'CRM & Agentforce AI' },
  'NFLX': { name: 'Netflix Inc', short: 'Netflix', type: 'equity', category: 'Streaming Media', info: 'Intrattenimento Streaming' },
  'JPM': { name: 'JPMorgan Chase & Co', short: 'JPMorgan', type: 'equity', category: 'Investment Banking', info: 'Leader Bancario Globale' },
  'LLY': { name: 'Eli Lilly and Company', short: 'Eli Lilly', type: 'equity', category: 'Pharmaceuticals', info: 'Trattamenti GLP-1 Mounjaro' },
  'BRK-B': { name: 'Berkshire Hathaway Inc (Cl B)', short: 'Berkshire', type: 'equity', category: 'Conglomerate', info: 'Holding di Warren Buffett' },
  'V': { name: 'Visa Inc', short: 'Visa', type: 'equity', category: 'Payment Networks', info: 'Circuito Globale Pagamenti' },
  'HOOD': { name: 'Robinhood Markets Inc', short: 'Robinhood', type: 'equity', category: 'Fintech Brokerage', info: 'Trading & Servizi Finanziari' },
};

const round2 = (n) => Math.round(n * 100) / 100;

const formatAxisPrice = (val, isIndex, isRate, isForex) => {
  if (val === undefined || val === null || isNaN(val)) return '';
  if (isRate) return `${val.toFixed(2)}%`;
  if (isForex || val < 2.0) return val.toFixed(4);
  if (isIndex) return val >= 1000 ? val.toLocaleString('en-US', { maximumFractionDigits: 0 }) : val.toFixed(1);
  if (val >= 1000) return `$${val.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  return `$${val.toFixed(2)}`;
};

export function YahooMarketChart({
  symbol = '^DJI',
  companyName = 'Dow Jones Industrial Average',
  newsArticles = [],
  onSelectNewsArticle,
  compact = false,
  height = null,
  activeBenchmark = null,
  onSelectBenchmark = null,
}) {
  const [selectedTimeframe, setSelectedTimeframe] = useState(compact ? '1mo' : '6mo');
  const [chartType, setChartType] = useState('area'); // 'area' | 'candle'
  const [showSMA20, setShowSMA20] = useState(true);
  const [showSMA50, setShowSMA50] = useState(!compact);
  const [showVolume, setShowVolume] = useState(true);
  const [showNewsMarkers, setShowNewsMarkers] = useState(true);

  // Normalize Symbol
  const cleanSym = useMemo(() => {
    let s = (symbol || '^DJI').replace('.US', '').trim().toUpperCase();
    if (s === 'DJI') return '^DJI';
    if (s === 'GSPC') return '^GSPC';
    if (s === 'IXIC') return '^IXIC';
    if (s === 'RUT') return '^RUT';
    if (s === 'VIX') return '^VIX';
    if (s === 'TNX') return '^TNX';
    if (s === 'STOXX50E') return '^STOXX50E';
    if (s === 'GDAXI') return '^GDAXI';
    if (s === 'FTSE') return '^FTSE';
    if (s === 'FCHI') return '^FCHI';
    if (s === 'IBEX') return '^IBEX';
    if (s === 'SSMI') return '^SSMI';
    if (s === 'N225') return '^N225';
    if (s === 'HSI') return '^HSI';
    if (s === 'NSEI') return '^NSEI';
    if (s === 'STI') return '^STI';
    if (s === 'AXJO') return '^AXJO';
    return s;
  }, [symbol]);

  // Read SWR cache synchronously on initial render
  const cachedData = useMemo(() => getCachedChart(cleanSym, selectedTimeframe), [cleanSym, selectedTimeframe]);

  const [prices, setPrices] = useState(cachedData?.prices || []);
  const [currentQuote, setCurrentQuote] = useState(cachedData?.currentQuote || null);
  const [isLoading, setIsLoading] = useState(!cachedData);
  const [fetchError, setFetchError] = useState(null);
  const [hoverIndex, setHoverIndex] = useState(null);
  const [hoverNews, setHoverNews] = useState(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const canvasRef = useRef(null);

  // Fetch real historical bars without artificial timeouts or fake data
  const loadChartData = async (isBackground = false) => {
    if (!isBackground) {
      setIsLoading(true);
    }
    setFetchError(null);

    try {
      const res = await api.getStockHistory(cleanSym, selectedTimeframe);

      if (res && Array.isArray(res.prices) && res.prices.length > 0) {
        const firstBar = res.prices[0];
        const lastBar = res.prices[res.prices.length - 1];
        const basePrice = res.quote?.prev_close !== undefined ? res.quote.prev_close : (firstBar.open || firstBar.close);
        const chg = res.quote?.change !== undefined ? res.quote.change : round2(lastBar.close - basePrice);
        const chgP = res.quote?.change_p !== undefined ? res.quote.change_p : (basePrice > 0 ? round2((chg / basePrice) * 100) : 0);

        const newQuote = {
          price: lastBar.close,
          change: chg,
          change_p: chgP,
          open: firstBar.open || basePrice,
          high: res.quote?.high !== undefined ? res.quote.high : Math.max(...res.prices.map(p => p.high || p.close)),
          low: res.quote?.low !== undefined ? res.quote.low : Math.min(...res.prices.map(p => p.low || p.close)),
          volume: lastBar.volume || 0,
          prevClose: basePrice,
        };

        setPrices(res.prices);
        setCurrentQuote(newQuote);
        saveChartToCache(cleanSym, selectedTimeframe, { prices: res.prices, currentQuote: newQuote });
        setFetchError(null);
      } else {
        if (!prices || prices.length === 0) {
          setFetchError('Nessun dato disponibile per il periodo selezionato.');
        }
      }
    } catch (err) {
      console.warn(`Error loading history for ${cleanSym}:`, err);
      if (!prices || prices.length === 0) {
        setFetchError('Impossibile connettersi al server quotazioni.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Immediate SWR display on cleanSym / selectedTimeframe change + background auto-refresh
  useEffect(() => {
    const cached = getCachedChart(cleanSym, selectedTimeframe);
    if (cached && Array.isArray(cached.prices) && cached.prices.length > 0) {
      setPrices(cached.prices);
      setCurrentQuote(cached.currentQuote);
      setIsLoading(false);
      setFetchError(null);
      // Background revalidation to keep data fresh
      loadChartData(true);
    } else {
      // Clear previous timeframe data so 6M gains (+7.2%) never bleed into 1D
      setPrices([]);
      setCurrentQuote(null);
      setIsLoading(true);
      setFetchError(null);
      loadChartData(false);
    }

    // Auto-refresh every 30 seconds for live market continuity
    const interval = setInterval(() => {
      loadChartData(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [cleanSym, selectedTimeframe]);

  // Match News Articles to Price Bars by Date for Timeline Markers
  const newsMarkers = useMemo(() => {
    if (!newsArticles || newsArticles.length === 0 || prices.length === 0) return [];
    const markers = [];
    const dateMap = new Map();
    prices.forEach((p, idx) => {
      dateMap.set(p.date, idx);
    });

    newsArticles.forEach((art) => {
      if (!art.date && !art.time) return;
      const artDateStr = (art.date || '').slice(0, 10);
      const matchIdx = dateMap.get(artDateStr);
      if (matchIdx !== undefined && prices[matchIdx]) {
        markers.push({
          index: matchIdx,
          bar: prices[matchIdx],
          article: art,
        });
      }
    });
    return markers;
  }, [newsArticles, prices]);

  // Resize listener to adapt canvas width dynamically to container
  useEffect(() => {
    const updateSize = () => {
      if (canvasRef.current && canvasRef.current.parentElement) {
        setContainerWidth(canvasRef.current.parentElement.clientWidth);
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    const t = setTimeout(updateSize, 50);
    return () => {
      window.removeEventListener('resize', updateSize);
      clearTimeout(t);
    };
  }, [compact, prices]);

  const canvasHeight = height || (compact ? 175 : 220);

  // Asset type detection & metadata matching
  const matchedMeta = OFFICIAL_NAMES_MAP[cleanSym] || null;
  const assetType = matchedMeta?.type || (
    cleanSym.startsWith('^') ? 'index' :
    cleanSym.includes('=X') ? 'forex' :
    cleanSym.includes('=F') ? 'commodity' :
    cleanSym.includes('-USD') ? 'crypto' : 'equity'
  );
  const isIndex = assetType === 'index';
  const isRate = assetType === 'rate';
  const isCommodity = assetType === 'commodity';
  const isForex = assetType === 'forex';
  const isCrypto = assetType === 'crypto';

  const pricePrefix = (isIndex || isRate || isForex) ? '' : '$';
  const priceSuffix = isRate ? '%' : (isIndex ? ' pts' : (isForex ? '' : ''));
  const displaySym = cleanSym;
  const displayCompName = matchedMeta ? matchedMeta.name : (companyName || `${cleanSym} Inc.`);

  // Render on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || prices.length === 0) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const width = containerWidth || canvas.parentElement?.clientWidth || (compact ? 440 : 800);
    const chartRenderHeight = canvasHeight;

    canvas.width = width * dpr;
    canvas.height = chartRenderHeight * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${chartRenderHeight}px`;
    ctx.scale(dpr, dpr);

    // Padding & dimensions
    const padding = compact
      ? { top: 8, right: 62, bottom: 16, left: 8 }
      : { top: 12, right: 75, bottom: 20, left: 10 };
    const chartHeight = chartRenderHeight - padding.top - padding.bottom;
    const priceChartHeight = showVolume ? chartHeight * 0.74 : chartHeight;
    const volumeChartHeight = chartHeight * 0.18;
    const volumeTop = padding.top + priceChartHeight + chartHeight * 0.08;
    const chartWidth = width - padding.left - padding.right;

    // Background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, chartRenderHeight);
    bgGrad.addColorStop(0, '#0b1324');
    bgGrad.addColorStop(1, '#070c17');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, chartRenderHeight);

    // Price range calculation
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let maxVolume = 0;
    let minVolume = Infinity;

    prices.forEach((d) => {
      if (d.low < minPrice) minPrice = d.low;
      if (d.high > maxPrice) maxPrice = d.high;
      if (d.sma20 && showSMA20 && d.sma20 > maxPrice) maxPrice = d.sma20;
      if (d.sma20 && showSMA20 && d.sma20 < minPrice) minPrice = d.sma20;
      if (d.sma50 && showSMA50 && d.sma50 > maxPrice) maxPrice = d.sma50;
      if (d.sma50 && showSMA50 && d.sma50 < minPrice) minPrice = d.sma50;
      const v = Number(d.volume) || 0;
      if (v > maxVolume) maxVolume = v;
      if (v < minVolume && v > 0) minVolume = v;
    });
    if (minVolume === Infinity) minVolume = 0;

    const priceMargin = (maxPrice - minPrice) * 0.05 || (minPrice * 0.01) || 1;
    minPrice -= priceMargin;
    maxPrice += priceMargin;
    const priceRange = maxPrice - minPrice;

    // Dynamic volume contrast: when volumes are clustered in a narrow band (e.g. 1M daily bars),
    // use a baseline offset so bars don't all look like a solid clump of identical height
    const volBase = (minVolume > 0 && minVolume > maxVolume * 0.35) ? minVolume * 0.5 : 0;
    const volRange = Math.max(1, maxVolume - volBase);

    const getY = (val) => padding.top + (1 - (val - minPrice) / (priceRange || 1)) * priceChartHeight;
    const getVolY = (vol) => volumeTop + (1 - Math.max(0.08, (vol - volBase) / volRange)) * volumeChartHeight;
    const getX = (idx) => padding.left + (idx / (prices.length - 1 || 1)) * chartWidth;

    const isOverallUp = prices[prices.length - 1].close >= prices[0].close;
    const themeColor = isOverallUp ? '#10b981' : '#ef4444';
    const themeGradColor = isOverallUp ? 'rgba(16, 185, 129, 0.22)' : 'rgba(239, 68, 68, 0.22)';

    // 1. Grid lines & Right Price Labels
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.55)';
    ctx.textAlign = 'right';

    const gridSteps = 4;
    for (let i = 0; i <= gridSteps; i++) {
      const pVal = minPrice + (i / gridSteps) * priceRange;
      const y = getY(pVal);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.fillText(formatAxisPrice(pVal, isIndex, isRate, isForex), width - 8, y + 3.5);
    }

    // 1.1 Baseline Opening Reference Line
    const openLevel = prices[0]?.open || prices[0]?.close;
    if (openLevel && openLevel >= minPrice && openLevel <= maxPrice) {
      const openY = getY(openLevel);

      ctx.save();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.65)';
      ctx.lineWidth = 1.25;
      ctx.setLineDash([4, 4]);

      ctx.beginPath();
      ctx.moveTo(padding.left, openY);
      ctx.lineTo(width - padding.right, openY);
      ctx.stroke();
      ctx.setLineDash([]);

      const badgeText = `Open ${formatAxisPrice(openLevel, isIndex, isRate, isForex)}`;
      ctx.font = 'bold 9px JetBrains Mono, monospace';
      const textMetrics = ctx.measureText(badgeText);
      const badgeW = textMetrics.width + 10;
      const badgeH = 15;
      const badgeX = width - padding.right + 4;
      const badgeY = openY - badgeH / 2;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.7)';
      ctx.lineWidth = 1;
      ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

      ctx.fillStyle = '#e2e8f0';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, badgeX + 5, openY);

      ctx.restore();
    }

    // 2. Date Labels on X-Axis
    ctx.fillStyle = 'rgba(148, 163, 184, 0.55)';
    ctx.textAlign = 'center';
    ctx.font = '9.5px JetBrains Mono, monospace';
    const stepBars = Math.max(1, Math.floor(prices.length / 6));
    for (let i = 0; i < prices.length; i += stepBars) {
      const d = prices[i];
      if (d && d.date) {
        const x = getX(i);
        let label = d.date;
        if (d.date.length === 10 && d.date.includes('-')) {
          label = d.date.slice(5);
        } else if (d.date.length > 10 && d.date.startsWith('20')) {
          label = d.date.slice(5);
        }
        ctx.fillText(label, x, chartRenderHeight - 5);
      }
    }

    // 3. Volume Bars
    if (showVolume) {
      // Balanced middle-ground: proportional width capped at 14px (instead of 26px or 6.5px) for solid presence with generous breathing room
      const rawBarW = (chartWidth / (prices.length || 1)) * 0.42;
      const barWidth = Math.min(14, Math.max(2, rawBarW));

      prices.forEach((d, i) => {
        const x = getX(i);
        const isUp = d.close >= d.open;
        const vY = getVolY(d.volume || 0);
        const vH = Math.max(2, volumeTop + volumeChartHeight - vY);
        ctx.fillStyle = isUp ? 'rgba(16, 185, 129, 0.42)' : 'rgba(239, 68, 68, 0.42)';
        ctx.fillRect(x - barWidth / 2, vY, barWidth, vH);
      });
    }

    // 4. Area / Line Chart OR Candlestick Chart
    if (chartType === 'area') {
      // Draw Area Gradient Fill
      ctx.beginPath();
      ctx.moveTo(getX(0), getY(prices[0].close));
      prices.forEach((d, i) => {
        ctx.lineTo(getX(i), getY(d.close));
      });
      ctx.lineTo(getX(prices.length - 1), padding.top + priceChartHeight);
      ctx.lineTo(getX(0), padding.top + priceChartHeight);
      ctx.closePath();

      const areaGrad = ctx.createLinearGradient(0, padding.top, 0, padding.top + priceChartHeight);
      areaGrad.addColorStop(0, themeGradColor);
      areaGrad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
      ctx.fillStyle = areaGrad;
      ctx.fill();

      // Main Price Stroke Line
      ctx.beginPath();
      ctx.strokeStyle = themeColor;
      ctx.lineWidth = compact ? 1.5 : 2;
      prices.forEach((d, i) => {
        const x = getX(i);
        const y = getY(d.close);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    } else {
      // Candlestick Chart: balanced middle-ground capped at 14px for low-density views (1M)
      const rawCandleW = (chartWidth / (prices.length || 1)) * 0.42;
      const candleWidth = Math.min(14, Math.max(2.5, rawCandleW));

      prices.forEach((d, i) => {
        const x = getX(i);
        const isUp = d.close >= d.open;
        const candleColor = isUp ? '#10b981' : '#ef4444';

        // High-Low Wick
        ctx.strokeStyle = candleColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, getY(d.high));
        ctx.lineTo(x, getY(d.low));
        ctx.stroke();

        // Open-Close Body
        const bodyTop = getY(Math.max(d.open, d.close));
        const bodyBottom = getY(Math.min(d.open, d.close));
        const bodyH = Math.max(1.5, bodyBottom - bodyTop);
        ctx.fillStyle = candleColor;
        ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyH);
      });
    }

    // 5. Technical Overlays (SMA 20 & SMA 50)
    if (showSMA20) {
      ctx.beginPath();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.2;
      let started = false;
      prices.forEach((d, i) => {
        if (d.sma20) {
          const x = getX(i);
          const y = getY(d.sma20);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      ctx.stroke();
    }

    if (showSMA50 && !compact) {
      ctx.beginPath();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.2;
      let started = false;
      prices.forEach((d, i) => {
        if (d.sma50) {
          const x = getX(i);
          const y = getY(d.sma50);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      ctx.stroke();
    }

    // 6. News Catalyst Timeline Markers
    if (showNewsMarkers && newsMarkers.length > 0) {
      newsMarkers.forEach((m) => {
        const x = getX(m.index);
        const y = getY(m.bar.close);

        // Glowing outer pulse
        ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
        ctx.beginPath();
        ctx.arc(x, y, 9, 0, Math.PI * 2);
        ctx.fill();

        // Inner solid badge
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      });
    }

    // 7. Interactive Crosshair & Hover Tooltip
    if (hoverIndex !== null && prices[hoverIndex]) {
      const d = prices[hoverIndex];
      const hX = getX(hoverIndex);
      const hY = getY(d.close);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);

      // Vertical crosshair
      ctx.beginPath();
      ctx.moveTo(hX, padding.top);
      ctx.lineTo(hX, chartRenderHeight - padding.bottom);
      ctx.stroke();

      // Horizontal crosshair
      ctx.beginPath();
      ctx.moveTo(padding.left, hY);
      ctx.lineTo(width - padding.right, hY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Point circle
      ctx.fillStyle = themeColor;
      ctx.beginPath();
      ctx.arc(hX, hY, 4, 0, Math.PI * 2);
      ctx.fill();

      // Right Axis Hover Price Pill
      const pillText = formatAxisPrice(d.close, isIndex, isRate, isForex);
      ctx.font = 'bold 9.5px JetBrains Mono, monospace';
      const textW = ctx.measureText(pillText).width;
      ctx.fillStyle = themeColor;
      ctx.fillRect(width - padding.right + 6, hY - 8, textW + 8, 16);
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'left';
      ctx.fillText(pillText, width - padding.right + 10, hY + 3.5);
    }
  }, [prices, chartType, showSMA20, showSMA50, showVolume, showNewsMarkers, newsMarkers, hoverIndex, canvasHeight, compact, containerWidth, isIndex, isRate, isForex]);

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || prices.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const paddingLeft = compact ? 8 : 10;
    const paddingRight = compact ? 62 : 75;
    const chartWidth = rect.width - paddingLeft - paddingRight;

    if (x < paddingLeft || x > rect.width - paddingRight) {
      setHoverIndex(null);
      setHoverNews(null);
      return;
    }

    const relX = (x - paddingLeft) / chartWidth;
    const idx = Math.round(relX * (prices.length - 1));
    if (idx >= 0 && idx < prices.length) {
      setHoverIndex(idx);
      const matched = newsMarkers.find((m) => Math.abs(m.index - idx) <= 1);
      setHoverNews(matched ? matched.article : null);
    }
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
    setHoverNews(null);
  };

  const activeBar = hoverIndex !== null && prices[hoverIndex] ? prices[hoverIndex] : (currentQuote || {});
  const displayPrice = activeBar.close || currentQuote?.price || 0;

  const baseReference = currentQuote?.prevClose !== undefined 
    ? currentQuote.prevClose 
    : (prices.length > 0 ? (prices[0].open || prices[0].close) : displayPrice);

  const displayChange = hoverIndex !== null && prices[hoverIndex]
    ? round2(prices[hoverIndex].close - baseReference)
    : (currentQuote?.change !== undefined ? currentQuote.change : round2(displayPrice - baseReference));

  const displayChangeP = hoverIndex !== null && prices[hoverIndex]
    ? (baseReference > 0 ? round2((displayChange / baseReference) * 100) : 0)
    : (currentQuote?.change_p !== undefined ? currentQuote.change_p : (baseReference > 0 ? round2((displayChange / baseReference) * 100) : 0));

  const isPos = displayChange >= 0;

  return (
    <div className={`yahoo-chart-card glass-panel ${compact ? 'compact-mode' : ''}`}>
      {/* 0. Selettore Rapido Benchmark nel Grafico Centrale */}
      {!compact && (
        <div className="yahoo-benchmark-quick-bar">
          <div className="benchmark-bar-label font-mono">
            <Activity size={13} className="text-cyan" />
            <span>Benchmark Rapido:</span>
          </div>
          <div className="benchmark-chips-group">
            <button
              type="button"
              className={`benchmark-chip-btn ${!activeBenchmark ? 'active all' : ''}`}
              onClick={() => onSelectBenchmark && onSelectBenchmark('ALL')}
              title="Visualizza tutte le notizie e resetta filtro asset"
            >
              <span className="bench-icon">🌐</span>
              <span className="bench-name">Tutti</span>
            </button>

            {[
              { sym: 'SPY', label: 'S&P 500', icon: '🇺🇸', tip: 'SPDR S&P 500 ETF' },
              { sym: 'QQQ', label: 'Nasdaq 100', icon: '💻', tip: 'Invesco QQQ Trust' },
              { sym: '^DJI', label: 'Dow Jones', icon: '🏛️', tip: 'Dow Jones Industrial Average' },
              { sym: '^TNX', label: '10Y Yield', icon: '📈', tip: 'US 10-Year Treasury Yield' },
              { sym: 'CL=F', label: 'Petrolio WTI', icon: '🛢️', tip: 'Crude Oil WTI Futures' },
              { sym: 'GC=F', label: 'Oro', icon: '🪙', tip: 'Gold Futures COMEX' },
            ].map((b) => {
              const isActive = activeBenchmark === b.sym;
              return (
                <button
                  key={b.sym}
                  type="button"
                  className={`benchmark-chip-btn ${isActive ? 'active' : ''}`}
                  onClick={() => onSelectBenchmark && onSelectBenchmark(b.sym)}
                  title={b.tip}
                >
                  <span className="bench-icon">{b.icon}</span>
                  <span className="bench-name">{b.label}</span>
                  <span className="bench-code font-mono">{b.sym}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 1. Header with Quote & Yahoo Market Controls */}
      <div className="yahoo-chart-header">
        <div className="yahoo-quote-block">
          <div className="quote-title-line">
            <span className="quote-symbol font-mono">{displaySym}</span>
            <span className="quote-name">{displayCompName}</span>
            <span className="quote-exchange-pill">
              {matchedMeta?.category || (isIndex ? 'Official Index' : isRate ? 'Treasury Yield' : isCommodity ? 'Commodity' : isForex ? 'Forex' : isCrypto ? 'Crypto' : 'Real-Time')}
            </span>
          </div>
          <div className="quote-price-line">
            <span className="quote-price font-mono">
              {pricePrefix}
              {displayPrice >= 1000
                ? displayPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : (isForex || displayPrice < 2.0 ? displayPrice.toFixed(4) : displayPrice.toFixed(2))}
              {priceSuffix}
            </span>
            <span className={`quote-change-badge font-mono ${isPos ? 'positive' : 'negative'}`}>
              {isPos ? '+' : ''}{displayChange.toFixed(2)} ({isPos ? '+' : ''}{displayChangeP.toFixed(2)}%)
            </span>
            {hoverIndex !== null && prices[hoverIndex] && (
              <span className="hover-date-pill font-mono">📅 {prices[hoverIndex].date}</span>
            )}
          </div>
        </div>

        {/* Timeframe & Chart Type Toolbar */}
        <div className="yahoo-chart-controls">
          <div className="timeframe-pill-group">
            {(compact ? TIMEFRAMES.filter(t => ['1M', '6M', '1Y'].includes(t.label)) : TIMEFRAMES).map((tf) => (
              <button
                key={tf.value}
                className={`tf-btn ${selectedTimeframe === tf.value ? 'active-tf' : ''}`}
                onClick={() => setSelectedTimeframe(tf.value)}
              >
                {tf.label}
              </button>
            ))}
          </div>

          <div className="chart-mode-toggles">
            <button
              className={`mode-btn ${chartType === 'area' ? 'active-mode' : ''}`}
              onClick={() => setChartType('area')}
              title="Grafico ad Area"
            >
              Area
            </button>
            <button
              className={`mode-btn ${chartType === 'candle' ? 'active-mode' : ''}`}
              onClick={() => setChartType('candle')}
              title="Candele"
            >
              Candele
            </button>
          </div>
        </div>
      </div>

      {/* 2. Interactive Indicators Strip */}
      <div className="yahoo-indicator-strip">
        <div className="indicator-toggles">
          <button
            className={`ind-toggle-btn ${showSMA20 ? 'active sma20' : ''}`}
            onClick={() => setShowSMA20(!showSMA20)}
          >
            <span className="ind-dot amber" />
            <span>SMA 20</span>
          </button>
          {!compact && (
            <button
              className={`ind-toggle-btn ${showSMA50 ? 'active sma50' : ''}`}
              onClick={() => setShowSMA50(!showSMA50)}
            >
              <span className="ind-dot cyan" />
              <span>SMA 50</span>
            </button>
          )}
          <button
            className={`ind-toggle-btn ${showVolume ? 'active' : ''}`}
            onClick={() => setShowVolume(!showVolume)}
          >
            <span>Volumi</span>
          </button>
          <button
            className={`ind-toggle-btn ${showNewsMarkers ? 'active news' : ''}`}
            onClick={() => setShowNewsMarkers(!showNewsMarkers)}
          >
            <Zap size={12} className="text-cyan" />
            <span>News ({newsMarkers.length})</span>
          </button>
        </div>

        {hoverNews && (
          <div 
            className="hover-news-preview"
            onClick={() => onSelectNewsArticle && onSelectNewsArticle(hoverNews)}
            title="Clicca per aprire la notizia completa"
          >
            <span className="news-preview-icon">⚡</span>
            <span className="news-preview-text">{hoverNews.title}</span>
          </div>
        )}
      </div>

      {/* 3. HTML5 Canvas Chart */}
      <div className="yahoo-canvas-wrapper" style={{ height: `${canvasHeight}px` }}>
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="yahoo-canvas"
        />
        {isLoading && prices.length === 0 && (
          <div className="chart-loading-overlay">
            <RefreshCw size={24} className="spinning text-cyan" />
            <span>Caricamento quotazioni live per {displaySym}...</span>
          </div>
        )}
        {fetchError && prices.length === 0 && (
          <div className="chart-loading-overlay chart-error-overlay">
            <AlertCircle size={24} className="text-amber" />
            <span>{fetchError}</span>
            <button 
              className="chart-retry-btn"
              onClick={() => loadChartData(false)}
            >
              <RefreshCw size={14} />
              <span>Riprova</span>
            </button>
          </div>
        )}
      </div>

      {/* 4. Yahoo Finance Signature Key Statistics Strip */}
      {!compact && (
        <div className="yahoo-key-stats-strip">
          <div className="stat-box">
            <span className="stat-label">Precedente Chiusura</span>
            <span className="stat-val font-mono">
              {pricePrefix}
              {currentQuote?.prevClose !== undefined
                ? (displayPrice >= 1000 ? currentQuote.prevClose.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : currentQuote.prevClose.toFixed(2))
                : (displayPrice >= 1000 ? (displayPrice * 0.99).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : (displayPrice * 0.99).toFixed(2))}
              {priceSuffix}
            </span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Apertura</span>
            <span className="stat-val font-mono">
              {pricePrefix}
              {currentQuote?.open !== undefined
                ? (displayPrice >= 1000 ? currentQuote.open.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : currentQuote.open.toFixed(2))
                : (displayPrice >= 1000 ? (displayPrice * 0.995).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : (displayPrice * 0.995).toFixed(2))}
              {priceSuffix}
            </span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Range Giornaliero</span>
            <span className="stat-val font-mono">
              {pricePrefix}{(currentQuote?.low || displayPrice * 0.985).toFixed(2)} - {(currentQuote?.high || displayPrice * 1.015).toFixed(2)}{priceSuffix}
            </span>
          </div>
          <div className="stat-box">
            <span className="stat-label">{isIndex || isRate ? 'Scambi / Contratti' : 'Volume'}</span>
            <span className="stat-val font-mono">
              {(currentQuote?.volume || 0) > 0 ? (currentQuote.volume).toLocaleString('en-US') : 'Continuo'}
            </span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Categoria Asset</span>
            <span className="stat-val font-mono">
              {matchedMeta?.category || (isIndex ? 'Indice Ufficiale' : isRate ? 'Tasso Federale' : isCommodity ? 'Materia Prima' : isCrypto ? 'Digital Asset' : isForex ? 'Forex' : 'Titolo Azionario')}
            </span>
          </div>
          <div className="stat-box">
            <span className="stat-label">{isIndex ? 'Tipologia Indice' : (isRate ? 'Orizzonte' : (isCommodity ? 'Mercato' : (isForex ? 'Base Valuta' : 'Info')))}</span>
            <span className="stat-val font-mono">
              {matchedMeta?.info || (isIndex ? 'Ponderato Cap' : isRate ? 'Scadenza 10Y' : isCommodity ? 'Mercato Merci' : isForex ? 'Mercato FX' : 'Quotato NYSE/Nasdaq')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
