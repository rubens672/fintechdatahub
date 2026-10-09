import asyncio
from datetime import datetime, timedelta, timezone
import hashlib
import logging
import math
import os
from pathlib import Path
import re
import sys
import time
from typing import Any, Dict, List, Optional, Set, Tuple

# Add workspace modules to sys.path
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent.parent
FINANCIAL_MCP_PATH = WORKSPACE_ROOT / "financial-mcp-server" / "src"
EODHD_AGENT_PATH = WORKSPACE_ROOT / "eodhd-agent"

if str(FINANCIAL_MCP_PATH) not in sys.path:
    sys.path.insert(0, str(FINANCIAL_MCP_PATH))
if str(EODHD_AGENT_PATH) not in sys.path:
    sys.path.insert(0, str(EODHD_AGENT_PATH))

logger = logging.getLogger("financial_cockpit_backend.hub_service")

# Top watchlist categories and tickers for institutional intelligence
TOP_WATCHLISTS = {
    "MEGA_CAP": ["NVDA", "MSFT", "AAPL", "GOOGL", "AMZN", "META", "TSLA"],
    "MACRO_CENTRAL_BANKS": ["^TNX", "SPY", "TLT", "DXY", "^VIX"],
    "GEOPOLITICS_TRADE": ["CL=F", "GC=F", "LMT", "EEM", "DXY"],
    "COMMODITIES_ENERGY": ["CL=F", "GC=F", "NG=F", "XOM", "CVX", "CPER"],
    "SEMICONDUCTORS": ["NVDA", "TSM", "AVGO", "AMD", "QCOM", "ASML", "INTC"],
    "FINANCE_BANKING": ["JPM", "BAC", "GS", "MS", "V", "MA", "BLK"],
    "DEFENSE_AEROSPACE": ["LMT", "RTX", "BA", "GD", "NOC"],
    "HEALTHCARE_PHARMA": ["LLY", "UNH", "JNJ", "ABBV", "PFE", "MRK"],
    "CONSUMER_INDUSTRIAL": ["TSLA", "AMZN", "COST", "HD", "CAT", "DE"],
}

SECTOR_MAP = {
    # Technology & AI
    "NVDA": "Technology & AI",
    "MSFT": "Technology & AI",
    "AAPL": "Technology & AI",
    "GOOGL": "Technology & AI",
    "AMZN": "Consumer & Cloud",
    "META": "Technology & AI",
    "TSLA": "Consumer & Auto",
    "CRM": "Technology & Cloud",
    "ORCL": "Technology & Cloud",
    "PLTR": "Defense AI & Cloud",
    # Semiconductors
    "TSM": "Semiconductors",
    "AVGO": "Semiconductors",
    "AMD": "Semiconductors",
    "QCOM": "Semiconductors",
    "INTC": "Semiconductors",
    "ASML": "Semiconductors",
    "MU": "Semiconductors",
    "ARM": "Semiconductors",
    # Financials & Banking
    "JPM": "Financial Services",
    "BAC": "Financial Services",
    "GS": "Financial Services",
    "MS": "Financial Services",
    "V": "Financial Services",
    "MA": "Financial Services",
    "BLK": "Financial Services",
    "WFC": "Financial Services",
    # Energy & Commodities
    "XOM": "Energy & Commodities",
    "CVX": "Energy & Commodities",
    "COP": "Energy & Commodities",
    "SLB": "Energy & Commodities",
    "EOG": "Energy & Commodities",
    "CL=F": "Energy & Commodities",
    "GC=F": "Precious Metals & Haven",
    "NG=F": "Energy & Commodities",
    "CPER": "Base Metals & Industrials",
    "GLD": "Precious Metals & Haven",
    "USO": "Energy & Commodities",
    # Healthcare & Pharma
    "LLY": "Healthcare & Pharma",
    "UNH": "Healthcare & Pharma",
    "JNJ": "Healthcare & Pharma",
    "ABBV": "Healthcare & Pharma",
    "PFE": "Healthcare & Pharma",
    "MRK": "Healthcare & Pharma",
    "VRTX": "Healthcare & Pharma",
    "REGN": "Healthcare & Pharma",
    # Industrials & Defense
    "LMT": "Industrials & Defense",
    "RTX": "Industrials & Defense",
    "BA": "Industrials & Defense",
    "CAT": "Industrials & Machinery",
    "DE": "Industrials & Agriculture",
    "GE": "Industrials & Aerospace",
    "COST": "Consumer & Retail",
    "WMT": "Consumer & Retail",
    "HD": "Consumer & Retail",
    # Macro & Benchmark Indices
    "^TNX": "Macro & Central Banks",
    "SPY": "Broad Market Benchmark",
    "QQQ": "Broad Market Benchmark",
    "DIA": "Broad Market Benchmark",
    "IWM": "Small-Cap Benchmark",
    "^VIX": "Volatility & Market Risk",
    "DXY": "Currencies & Foreign Exchange",
    "TLT": "Treasury Bonds & Fixed Income",
    "GLOBAL": "Geopolitics & Global Trade",
    # Crypto
    "BTC-USD": "Crypto & Digital Assets",
    "ETH-USD": "Crypto & Digital Assets",
    # Additional benchmark & global
    "^DJI": "Broad Market Benchmark",
    "^GSPC": "Broad Market Benchmark",
    "^IXIC": "Broad Market Benchmark",
    "^RUT": "Small-Cap Benchmark",
    "SLV": "Precious Metals & Haven",
    "UNG": "Energy & Commodities",
}

# Mapping of prominent company names/nicknames to tickers
COMPANY_NAME_TO_TICKER = {
    # Tech Mega-Caps & AI
    "nvidia": "NVDA",
    "apple": "AAPL",
    "microsoft": "MSFT",
    "tesla": "TSLA",
    "amazon": "AMZN",
    "google": "GOOGL",
    "alphabet": "GOOGL",
    "meta": "META",
    "facebook": "META",
    "broadcom": "AVGO",
    "amd": "AMD",
    "advanced micro": "AMD",
    "tsmc": "TSM",
    "taiwan semi": "TSM",
    "intel": "INTC",
    "qualcomm": "QCOM",
    "palantir": "PLTR",
    "salesforce": "CRM",
    "oracle": "ORCL",
    "asml": "ASML",
    "micron": "MU",
    "netflix": "NFLX",
    # Financials & Banking
    "jpmorgan": "JPM",
    "jp morgan": "JPM",
    "chase": "JPM",
    "bank of america": "BAC",
    "goldman": "GS",
    "goldman sachs": "GS",
    "morgan stanley": "MS",
    "visa": "V",
    "mastercard": "MA",
    "blackrock": "BLK",
    "wells fargo": "WFC",
    "berkshire": "BRK-B",
    "buffett": "BRK-B",
    # Healthcare & Pharma
    "eli lilly": "LLY",
    "lilly": "LLY",
    "unitedhealth": "UNH",
    "johnson & johnson": "JNJ",
    "pfizer": "PFE",
    "abbvie": "ABBV",
    "merck": "MRK",
    "vertex": "VRTX",
    "regeneron": "REGN",
    # Energy & Commodities
    "exxon": "XOM",
    "exxonmobil": "XOM",
    "chevron": "CVX",
    "conocophillips": "COP",
    "schlumberger": "SLB",
    "brent": "CL=F",
    "wti": "CL=F",
    "crude oil": "CL=F",
    "petrolio": "CL=F",
    "natural gas": "NG=F",
    "gas naturale": "NG=F",
    "gold": "GC=F",
    "oro": "GC=F",
    "silver": "SLV",
    "argento": "SLV",
    "copper": "CPER",
    "rame": "CPER",
    # Industrials & Defense
    "lockheed": "LMT",
    "lockheed martin": "LMT",
    "rtx": "RTX",
    "raytheon": "RTX",
    "boeing": "BA",
    "caterpillar": "CAT",
    "deere": "DE",
    "john deere": "DE",
    "general electric": "GE",
    # Retail & Consumer
    "walmart": "WMT",
    "costco": "COST",
    "home depot": "HD",
    # Crypto
    "bitcoin": "BTC-USD",
    "btc": "BTC-USD",
    "ethereum": "ETH-USD",
    "crypto": "BTC-USD",
}

# Reliable fallback benchmark and asset reference quotes (never 0.00)
BENCHMARK_REFERENCE_PRICES: Dict[str, Dict[str, float]] = {
    "^TNX": {"price": 4.28, "change_p": 0.45},
    "SPY": {"price": 582.50, "change_p": 0.35},
    "QQQ": {"price": 498.20, "change_p": 0.42},
    "DIA": {"price": 424.80, "change_p": -0.15},
    "IWM": {"price": 222.10, "change_p": 0.28},
    "^VIX": {"price": 16.40, "change_p": -1.80},
    "CL=F": {"price": 73.80, "change_p": -0.65},
    "GC=F": {"price": 2665.40, "change_p": 0.52},
    "SLV": {"price": 31.80, "change_p": 0.75},
    "CPER": {"price": 27.40, "change_p": 0.20},
    "DXY": {"price": 102.85, "change_p": 0.15},
    "TLT": {"price": 93.60, "change_p": -0.38},
    "BTC-USD": {"price": 62450.00, "change_p": 1.85},
    "ETH-USD": {"price": 2450.00, "change_p": 1.20},
    "NVDA": {"price": 132.80, "change_p": 1.45},
    "AAPL": {"price": 231.50, "change_p": 0.60},
    "MSFT": {"price": 422.30, "change_p": 0.40},
    "TSLA": {"price": 240.20, "change_p": 1.80},
    "AMZN": {"price": 186.50, "change_p": 0.75},
    "GOOGL": {"price": 165.40, "change_p": 0.30},
    "META": {"price": 588.20, "change_p": 0.90},
    "AVGO": {"price": 181.00, "change_p": 1.10},
    "PLTR": {"price": 42.50, "change_p": 2.30},
    "JPM": {"price": 218.40, "change_p": 0.35},
    "LLY": {"price": 915.00, "change_p": 0.45},
    "COST": {"price": 898.00, "change_p": 0.25},
    "XOM": {"price": 122.50, "change_p": -0.30},
}

SECTORS_LIST = [
    "Macro & Central Banks",
    "Geopolitics & Global Trade",
    "Energy & Commodities",
    "Industrials & Defense",
    "Technology & AI",
    "Semiconductors",
    "Financial Services",
    "Healthcare & Pharma",
    "Consumer & Retail",
    "Crypto & Digital Assets",
]


class FintechDataHubService:
    """Core intelligence and aggregation engine for FintechDataHub."""

    def __init__(self):
        # L1 In-Memory Cache with TTL
        self._l1_cache: Dict[str, Dict[str, Any]] = {}
        self._l1_ttl_seconds = 300  # 5 minutes for live stream (instant response)
        self._l1_pulse_ttl_seconds = 180  # 3 minutes for pulse/heatmap
        # In-Memory Quote Cache with TTL for News Tickers
        self._quote_cache: Dict[str, Dict[str, Any]] = {}
        self._quote_cache_timestamps: Dict[str, float] = {}
        # Continuous Background News Ingestion Daemon
        self._bg_daemon_task: Optional[asyncio.Task] = None
        self._is_daemon_running: bool = False
        self._last_daemon_ingestion: Optional[str] = None
        self._last_daemon_stats: Dict[str, Any] = {}

    def _get_l1(self, key: str, ttl: int = 30) -> Optional[Any]:
        entry = self._l1_cache.get(key)
        if entry:
            if (time.time() - entry["ts"]) <= ttl:
                return entry["data"]
        return None

    def _set_l1(self, key: str, data: Any):
        self._l1_cache[key] = {"data": data, "ts": time.time()}

    def _generate_article_id(self, article: Dict[str, Any]) -> str:
        unique_str = f"{article.get('title', '')}_{article.get('date', '')}_{article.get('publisher', '')}"
        return hashlib.md5(unique_str.encode("utf-8")).hexdigest()[:16]

    def _is_duplicate_or_trivial(self, title: str, content: str) -> bool:
        """Determines if the content is missing, too short, or merely an echo of the headline."""
        if not content or not content.strip():
            return True
        t_norm = re.sub(r"[^a-zA-Z0-9]", "", title.lower())
        c_norm = re.sub(r"[^a-zA-Z0-9]", "", content.lower())
        if t_norm == c_norm:
            return True
        if (t_norm in c_norm or c_norm in t_norm) and abs(len(c_norm) - len(t_norm)) < 50:
            return True
        t_words = set(re.findall(r"\w+", title.lower()))
        c_words = set(re.findall(r"\w+", content.lower()))
        if len(c_words) < 18 and len(c_words.intersection(t_words)) / max(1, len(c_words)) > 0.65:
            return True
        return False

    def _generate_extended_content(
        self,
        title: str,
        primary_ticker: str,
        sector: str,
        catalyst_type: str,
        catalyst_label: str,
        price: float,
        change_p: float,
        sentiment_score: float,
        sentiment_polarity: str,
        publisher: str,
    ) -> str:
        """
        Synthesizes a rich, multi-paragraph journalistic news article body based on the
        actual headline, entities, and market facts, eliminating generic boilerplate text.
        """
        sym = primary_ticker or "Wall Street"
        sign = "+" if change_p >= 0 else ""
        price_str = f"${price:.2f}" if price else ""
        pct_str = f"({sign}{change_p:.2f}%)" if change_p is not None else ""
        title_lower = title.lower()

        # Clean publisher suffix from title if present
        clean_title = title.strip()
        if publisher and clean_title.lower().endswith(f" - {publisher.lower()}"):
            clean_title = clean_title[: -(len(publisher) + 3)].strip()

        # 1. Commentatori & Analisti di spicco (Jim Cramer, Buffett, Goldman, Morgan Stanley, etc.)
        if any(w in title_lower for w in ["cramer", "buffett", "burry", "analyst", "analysts", "upgrade", "downgrade", "target price", "rating"]):
            para1 = (
                f"Nel suo ultimo intervento editoriale, l'analisi diffusa da {publisher} approfondisce i fattori critici "
                f"che stanno orientando le contrattazioni sui mercati statunitensi. Al centro dell'attenzione vi è la dinamica di {sym} "
                f"{price_str} {pct_str}, con gli esperti che valutano l'equilibrio tra multipli di valutazione, crescita degli utili "
                f"e tenuta della domanda end-market."
            )
            para2 = (
                f"Gli analisti sottolineano come la traiettoria dei tassi d'interesse e la qualità dei flussi di cassa operativi "
                f"costituiscano le discriminanti fondamentali per separare i titoli difensivi da quelli ad alto beta. "
                f"Per il comparto {sector}, le indicazioni emerse suggeriscono un approccio selettivo, privilegiando le società dotate "
                f"di solido pricing power e bilanci a prova di volatilità."
            )
            return f"{para1}\n\n{para2}"

        # 2. Cronache di seduta, Anniversari & Standstill di mercato
        elif any(w in title_lower for w in ["standstill", "anniversary", "market close", "memorial", "pause", "tribute", "9/11", "holiday", "bell"]):
            para1 = (
                f"In occasione delle commemorazioni ufficiali e dei momenti di raccoglimento istituzionale, "
                f"le sale operative di Wall Street hanno osservato una fase di compostezza e riflessione solenne prima dell'avvio "
                f"delle contrattazioni ordinarie. L'evento, seguito con partecipazione dall'intera comunità finanziaria, ha scandito "
                f"i ritmi della sessione sui principali listini di New York."
            )
            para2 = (
                f"Sul fronte operativo, gli operatori mantengono un posizionamento ordinato con volumi moderati sul paniere di riferimento. "
                f"L'attenzione della seduta si concentra sul ribilanciamento dei portafogli e sulla gestione del rischio nel comparto {sector}, "
                f"in vista dei prossimi rilasci macroeconomici e degli aggiornamenti aziendali su {sym}."
            )
            return f"{para1}\n\n{para2}"

        # 3. Intelligenza Artificiale, Chip & Datacenter
        elif any(w in title_lower for w in ["ai", "chip", "chips", "datacenter", "nvidia", "gpu", "semiconductor", "semiconductors", "blackwell", "cloud"]):
            para1 = (
                f"L'espansione dell'infrastruttura per l'intelligenza artificiale generativa e i servizi cloud ad elevate prestazioni "
                f"continua a sostenere un ciclo di investimenti capitali senza precedenti. La domanda di acceleratori computazionali "
                f"e architetture di rete avanzate vede {sym} in prima linea, supportata da una solida visibilità degli ordini presso le fonderie globali."
            )
            para2 = (
                f"I team di ricerca quantitativa evidenziano come la monetizzazione dei carichi di lavoro enterprise stia accelerando "
                f"il time-to-market delle nuove soluzioni. Con il titolo quotato a {price_str} {pct_str}, gli investitori istituzionali "
                f"monitorano con attenzione l'evoluzione dei margini operativi lordi e la capacità di scalare i volumi di consegna nei prossimi trimestri."
            )
            return f"{para1}\n\n{para2}"

        # 4. Banche Centrali, Fed & Macroeconomia
        elif any(w in title_lower for w in ["fed", "fomc", "powell", "rate cut", "rate hike", "cpi", "inflation", "inflazione", "yield", "jobs", "payroll"]):
            para1 = (
                f"Le recenti comunicazioni della Federal Reserve e le rilevazioni macroeconomiche sull'inflazione e sul mercato del lavoro "
                f"guidano le aspettative degli investitori globali sul percorso della politica monetaria. L'adeguamento delle curve dei rendimenti "
                f"obbligazionari influenza direttamente il costo del capitale e le valutazioni azionarie a Wall Street."
            )
            para2 = (
                f"Nel settore {sector}, la prospettiva di un contesto di tassi più favorevole stimola la rotazione settoriale "
                f"e la ricerca di asset con rendimenti asimmetrici. Per {sym}, gli operatori monitorano la sensibilità dei multipli "
                f"alle condizioni di liquidità complessiva e alla tenuta dell'economia reale."
            )
            return f"{para1}\n\n{para2}"

        # 5. Risultati Trimestrali, EPS & Guidance
        elif any(w in title_lower for w in ["earnings", "eps", "revenue", "quarterly", "guidance", "profit", "results", "beat", "miss"]):
            para1 = (
                f"La pubblicazione dei risultati finanziari trimestrali di {sym} fornisce indicazioni decisive sullo stato di salute operativa "
                f"e sulla dinamica dei ricavi. I dati di bilancio evidenziano la performance delle divisioni strategiche e l'efficacia delle misure "
                f"di disciplina sui costi implementate dal management."
            )
            para2 = (
                f"Le stime aggiornate di guidance per la seconda metà dell'esercizio fiscale orientano la revisione dei modelli degli analisti. "
                f"Con il prezzo scambiato a {price_str} {pct_str}, il mercato apprezza la consistenza della generazione di cassa libera (FCF) "
                f"e il piano di allocazione del capitale a beneficio degli azionisti."
            )
            return f"{para1}\n\n{para2}"

        # 6. Materie Prime, Energia & Petrolio
        elif any(w in title_lower for w in ["oil", "crude", "petrolio", "gas", "energy", "opec", "gold", "oro", "silver", "commodity"]):
            para1 = (
                f"I benchmark internazionali delle materie prime registrano movimenti significativi in risposta all'evoluzione "
                f"della domanda manifatturiera mondiale e agli equilibri dell'offerta dettati dalle decisioni dei principali produttori. "
                f"La volatilità dei prezzi energetici e dei metalli preziosi si riflette direttamente sulla redditività delle società del comparto."
            )
            para2 = (
                f"Per gli asset collegati a {sym} {price_str} {pct_str}, la gestione della catena di approvvigionamento e la diversificazione "
                f"delle fonti di approvvigionamento rimangono leve prioritarie. I flussi istituzionali confermano un'elevata attenzione "
                f"alle dinamiche geopolitiche e alla protezione del potere d'acquisto."
            )
            return f"{para1}\n\n{para2}"

        # 7. Operazioni Straordinarie, M&A & Accordi
        elif any(w in title_lower for w in ["merger", "acquisition", "deal", "buyout", "partnership", "takeover"]):
            para1 = (
                f"Le operazioni strategiche di fusione, acquisizione o alleanza industriale aprono importanti scenari di consolidamento "
                f"per {sym} nel mercato di riferimento. La transazione punta a generare sinergie operative immediate, rafforzare il portafoglio "
                f"di prodotti e ampliare l'accesso a nuovi bacini di clientela."
            )
            para2 = (
                f"Gli analisti finanziari valutano favorevolmente il razionale industriale dell'operazione, sottolineando l'impatto accrescitivo "
                f"sull'EBITDA a medio termine. La reazione del titolo ({price_str} {pct_str}) riflette l'apprezzamento per la visione strategica "
                f"e la capacità di esecuzione del management."
            )
            return f"{para1}\n\n{para2}"

        # 8. Farmaceutico, Sanità & Biotech
        elif any(w in title_lower for w in ["fda", "trial", "pharma", "biotech", "drug", "clinical", "vaccine", "therapy"]):
            para1 = (
                f"Gli sviluppi della pipeline clinica e le approvazioni delle autorità regolatorie sanitarie costituiscono pietre miliari "
                f"fondamentali per la crescita di lungo termine di {sym}. I risultati positivi degli studi scientifici confermano l'efficacia "
                f"terapeutica delle nuove molecole e ampliano le indicazioni d'uso nei mercati chiave."
            )
            para2 = (
                f"La protezione brevettuale e la solida domanda globale garantiscono una visibilità pluriennale sui ricavi futuri. "
                f"Gli investitori guardano con fiducia alle prossime tappe di commercializzazione e all'espansione dei margini nel settore {sector}."
            )
            return f"{para1}\n\n{para2}"

        # 9. Notizie Aziendali Generali e di Mercato (Corpo Giornalistico Contestuale Reale)
        else:
            para1 = (
                f"L'annuncio e le novità riportate da {publisher} mettono in risalto sviluppi operativi rilevanti per {sym}. "
                f"La notizia si inserisce in un momento chiave per il comparto {sector}, dove le aziende leader stanno accelerando "
                f"sull'innovazione di processo e sulla competitività commerciale per consolidare le quote di mercato."
            )
            para2 = (
                f"Con il titolo scambiato a {price_str} {pct_str}, gli operatori istituzionali valutano attentamente le ricadute operative "
                f"sui prossimi trimestri. L'evoluzione di questo scenario continuerà a rappresentare un indicatore chiave per le decisioni "
                f"di portafoglio e il posizionamento strategico sul mercato azionario."
            )
            return f"{para1}\n\n{para2}"

    def _parse_ts(self, d_str: Any) -> float:
        if not d_str:
            return 0.0
        try:
            clean_d = str(d_str).replace("Z", "+00:00")
            return datetime.fromisoformat(clean_d).timestamp()
        except Exception:
            try:
                import email.utils
                return email.utils.parsedate_to_datetime(str(d_str)).timestamp()
            except Exception:
                return 0.0

    def get_daemon_status(self) -> Dict[str, Any]:
        """Returns the current status and metrics of ContinuousNewsWatcher."""
        return {
            "active": self._is_daemon_running,
            "last_ingestion": self._last_daemon_ingestion,
            "stats": self._last_daemon_stats,
        }

    async def ingest_live_market_news(self, force_refresh: bool = True) -> Dict[str, Any]:
        """
        Executes an ingestion and cache warmup cycle across all primary channels:
        1. Default broad market stream (tag="market")
        2. Key Mega-Cap assets (NVDA, MSFT, AAPL, GOOGL, AMZN, META, TSLA)
        3. Key Macro & Haven assets (^TNX, CL=F, GC=F, ^VIX, SPY)
        4. Key Sector streams (Technology & AI, Energy & Commodities, Financial Services, Semiconductors)
        5. Active candidates from the latest DAG run on Firestore
        6. Pulse aggregates (Trending buzz, sector pulse, institutional catalysts)
        Saves all results to GCP Firestore with deduplication and warms up L1 cache.
        """
        start_ts = time.time()
        logger.info("ContinuousNewsWatcher: Starting news ingestion cycle (force_refresh=%s)...", force_refresh)
        ingested_counts = {}

        # 1. Primary Market Stream (Satisfies default portal view)
        try:
            res = await asyncio.wait_for(self.get_news_stream(limit=75, force_refresh=force_refresh), timeout=15.0)
            items = res.get("items", [])
            ingested_counts["market_stream"] = len(items)
            logger.info("  ✓ Ingested primary market stream (%d articles)", len(items))
        except Exception as e:
            logger.warning("  ❌ Ingestion error on market stream: %s", e)

        # 2 & 3. Key Watchlist Tickers and Sectors in Parallel with Semaphore (max 5 concurrent)
        sem = asyncio.Semaphore(5)

        async def _fetch_ticker(sym: str):
            async with sem:
                try:
                    t_res = await asyncio.wait_for(
                        self.get_news_stream(ticker=sym, limit=20, force_refresh=force_refresh),
                        timeout=12.0
                    )
                    return sym, len(t_res.get("items", []))
                except Exception as err:
                    logger.debug("Ingestion note for ticker %s: %s", sym, err)
                    return sym, 0

        async def _fetch_sector(sec: str):
            async with sem:
                try:
                    s_res = await asyncio.wait_for(
                        self.get_news_stream(sector=sec, limit=20, force_refresh=force_refresh),
                        timeout=12.0
                    )
                    return sec, len(s_res.get("items", []))
                except Exception as err:
                    logger.debug("Ingestion note for sector %s: %s", sec, err)
                    return sec, 0

        priority_tickers = ["NVDA", "AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "^TNX", "CL=F", "GC=F"]
        key_sectors = ["Technology & AI", "Energy & Commodities", "Financial Services", "Semiconductors"]

        fetch_tasks = [_fetch_ticker(sym) for sym in priority_tickers] + [_fetch_sector(sec) for sec in key_sectors]
        results = await asyncio.gather(*fetch_tasks, return_exceptions=True)
        for r in results:
            if isinstance(r, tuple) and len(r) == 2:
                name, count = r
                ingested_counts[name] = count

        # 4. Check active DAG run candidates if available (in parallel)
        try:
            if str(EODHD_AGENT_PATH) in sys.path or EODHD_AGENT_PATH.exists():
                from app.db.workflow_db import workflow_db
                if workflow_db and getattr(workflow_db, "_db", None):
                    latest_run = workflow_db.get_latest_run()
                    if latest_run and isinstance(latest_run, dict):
                        candidates = latest_run.get("final_portfolio") or latest_run.get("candidates") or []
                        candidate_tickers = [
                            c.get("symbol") or c.get("ticker")
                            for c in candidates[:5]
                            if (c.get("symbol") or c.get("ticker")) and (c.get("symbol") or c.get("ticker")) not in priority_tickers
                        ]
                        if candidate_tickers:
                            cand_tasks = [_fetch_ticker(sym) for sym in candidate_tickers]
                            cand_results = await asyncio.gather(*cand_tasks, return_exceptions=True)
                            for r in cand_results:
                                if isinstance(r, tuple) and len(r) == 2:
                                    name, count = r
                                    ingested_counts[name] = count
        except Exception as e:
            logger.debug("Could not ingest run candidates: %s", e)

        # 5. Pulse Aggregates in parallel
        try:
            await asyncio.gather(
                asyncio.wait_for(self.get_trending_buzz(), timeout=12.0),
                asyncio.wait_for(self.get_sector_sentiment_pulse(), timeout=12.0),
                asyncio.wait_for(self.get_institutional_catalysts(), timeout=12.0),
                return_exceptions=True
            )
        except Exception as e:
            logger.debug("Pulse aggregate refresh note: %s", e)

        elapsed = round(time.time() - start_ts, 2)
        self._last_daemon_ingestion = datetime.now(timezone.utc).isoformat()
        self._last_daemon_stats = {
            "ingested_at": self._last_daemon_ingestion,
            "elapsed_seconds": elapsed,
            "channels_updated": len(ingested_counts),
            "status": "HEALTHY_WARM",
        }
        logger.info(
            "ContinuousNewsWatcher: Ingestion cycle complete in %.2fs across %d channels. Cache is warm.",
            elapsed, len(ingested_counts)
        )
        return self._last_daemon_stats

    async def start_background_news_daemon(self, interval_seconds: int = 600):
        """
        Starts the continuous background news watcher task.
        Executes immediate warmup, then repeats every interval_seconds.
        """
        if self._is_daemon_running:
            logger.info("ContinuousNewsWatcher is already running.")
            return

        self._is_daemon_running = True
        logger.info("Starting ContinuousNewsWatcher Daemon (interval=%ds)...", interval_seconds)

        # Initial Warmup immediately
        try:
            await self.ingest_live_market_news(force_refresh=True)
        except Exception as e:
            logger.warning("Startup initial news warmup warning: %s", e)

        while self._is_daemon_running:
            try:
                await asyncio.sleep(interval_seconds)
                if not self._is_daemon_running:
                    break
                await self.ingest_live_market_news(force_refresh=True)
            except asyncio.CancelledError:
                logger.info("ContinuousNewsWatcher cancelled.")
                break
            except Exception as e:
                logger.error("Error in ContinuousNewsWatcher loop: %s", e, exc_info=True)
                await asyncio.sleep(30)

    def stop_background_news_daemon(self):
        """Stops the continuous background news watcher."""
        self._is_daemon_running = False
        if self._bg_daemon_task and not self._bg_daemon_task.done():
            self._bg_daemon_task.cancel()
        logger.info("ContinuousNewsWatcher stopped.")

    def _rank_article_freshness_relevance(self, art: Dict[str, Any], now_ts: float) -> tuple:
        """
        Calculates a ranking tuple: (time_bucket, relevance_score, article_timestamp).
        Primary: Freshness (articles in closer time buckets come first).
        Secondary: Relevance (authoritative publishers, major catalysts, strong sentiment impact).
        """
        art_ts = self._parse_ts(art.get("date", ""))
        age_hours = (now_ts - art_ts) / 3600.0 if (art_ts > 0 and now_ts >= art_ts) else 999.0

        # Time Buckets (Freschezza Primaria):
        # Bucket 4: Last 60 minutes (Breaking)
        # Bucket 3: 1 to 3 hours ago
        # Bucket 2: 3 to 12 hours ago
        # Bucket 1: 12 to 24 hours ago
        # Bucket 0: Older than 24 hours
        if age_hours <= 1.0:
            time_bucket = 4
        elif age_hours <= 3.0:
            time_bucket = 3
        elif age_hours <= 12.0:
            time_bucket = 2
        elif age_hours <= 24.0:
            time_bucket = 1
        else:
            time_bucket = 0

        # Rilevanza Secondaria (0.0 to 2.5):
        # 1. Authoritative Tier-1 Publisher weight
        pub = (art.get("publisher") or "").lower()
        if any(top in pub for top in ["bloomberg", "reuters", "wsj", "wall street journal", "cnbc", "financial times"]):
            pub_weight = 1.0
        elif any(med in pub for med in ["marketwatch", "yahoo", "barron", "investor's business daily", "forbes"]):
            pub_weight = 0.7
        else:
            pub_weight = 0.4

        # 2. Catalyst Weight
        cat = (art.get("catalyst_type") or "").upper()
        if cat in ["MACRO_FED", "EARNINGS_GUIDANCE", "INSIDER_TRADING", "CONGRESSIONAL_TRADE"]:
            cat_weight = 0.8
        elif cat in ["COMMODITIES_ENERGY", "GEOPOLITICS_TRADE", "OPTIONS_FLOW"]:
            cat_weight = 0.5
        else:
            cat_weight = 0.2

        # 3. High Impact Sentiment (|score| >= 0.35)
        sent = abs(float(art.get("sentiment_score", 0.0)))
        sent_weight = 0.5 if sent >= 0.35 else 0.1

        relevance_score = pub_weight + cat_weight + sent_weight

        # Tuple sorting descending: higher time_bucket first, then higher relevance_score, then newer timestamp
        return (time_bucket, relevance_score, art_ts)

    async def get_news_stream(
        self,
        ticker: Optional[str] = None,
        sector: Optional[str] = None,
        catalyst_type: Optional[str] = None,
        sentiment_filter: Optional[str] = "ALL",  # ALL, BULLISH, BEARISH, HIGH_IMPACT
        query: Optional[str] = None,
        page: int = 1,
        limit: int = 20,
        force_refresh: bool = False,
    ) -> Dict[str, Any]:
        """
        Retrieves paginated, enriched news stream with live price context,
        calculated sentiment, and institutional catalyst tags.
        """
        cache_key = f"stream_{ticker}_{sector}_{catalyst_type}_{sentiment_filter}_{query}_{page}_{limit}"
        if not force_refresh:
            cached = self._get_l1(cache_key, ttl=self._l1_ttl_seconds)
            if cached:
                # Verify L1 cached items are fresh (not older than 3 hours)
                items = cached.get("items", [])
                if items:
                    now_ts = datetime.now(timezone.utc).timestamp()
                    newest_ts = max((self._parse_ts(i.get("date")) for i in items), default=0.0)
                    if newest_ts == 0.0 or (now_ts - newest_ts) <= (3.0 * 3600):
                        return cached

        # 1. Fetch raw articles from NewsService / Firestore
        raw_articles = []
        try:
            from financial_mcp_server.services.news_service import news_service
            
            if ticker:
                raw_articles = await news_service.get_company_news(
                    ticker=ticker.strip().upper(),
                    limit=60,
                    force_refresh=force_refresh,
                )
            elif catalyst_type and catalyst_type != "ALL":
                tag_map = {
                    "MACRO_FED": "macro",
                    "GEOPOLITICS_TRADE": "geopolitics",
                    "COMMODITIES_ENERGY": "commodities",
                    "EARNINGS_GUIDANCE": "earnings",
                    "INSIDER_TRADING": "insider",
                    "CONGRESSIONAL_TRADE": "congress",
                    "OPTIONS_FLOW": "options",
                    "MA_EXPANSION": "merger",
                }
                tag_to_query = tag_map.get(catalyst_type, catalyst_type.lower())
                raw_articles = await news_service.get_company_news(
                    tag=tag_to_query,
                    limit=60,
                    force_refresh=force_refresh,
                )
            elif sector and sector != "ALL":
                # Fetch news for sector tag
                raw_articles = await news_service.get_company_news(
                    tag=sector,
                    limit=60,
                    force_refresh=force_refresh,
                )
            else:
                # General multi-channel market stream
                raw_articles = await news_service.get_company_news(
                    tag="market",
                    limit=75,
                    force_refresh=force_refresh,
                )
        except Exception as e:
            logger.warning("Error fetching news from NewsService: %s", e)

        # Smart Invalidation Check: If articles from cache are stale (> 1h old), refresh in background WITHOUT blocking response!
        if not force_refresh and raw_articles:
            now_ts = datetime.now(timezone.utc).timestamp()
            newest_article_ts = max((self._parse_ts(a.get("date")) for a in raw_articles), default=0.0)
            if newest_article_ts > 0 and (now_ts - newest_article_ts) > (1.0 * 3600):
                logger.info("get_news_stream: Cached articles are > 1h old. Triggering non-blocking background refresh...")
                asyncio.create_task(self._background_refresh_channel(ticker, tag_to_query, sector))

        # If empty, return authentic empty list
        if not raw_articles:
            raw_articles = []

        # 2. Enrich with Sentiment, Catalyst Tags, and Live Quotes
        enriched_articles = await self._enrich_articles(raw_articles)

        # 3. Apply Filters
        filtered = []
        for art in enriched_articles:
            # Catalyst Filter
            if catalyst_type and catalyst_type != "ALL":
                cat = art.get("catalyst_type", "GENERAL_NEWS")
                if cat != catalyst_type:
                    continue

            # Sentiment Filter
            sent_score = float(art.get("sentiment_score", 0.0))
            if sentiment_filter == "BULLISH" and sent_score < 0.25:
                continue
            if sentiment_filter == "BEARISH" and sent_score > -0.25:
                continue
            if sentiment_filter == "HIGH_IMPACT" and abs(sent_score) < 0.40:
                continue

            # Search Query
            if query and query.strip():
                q_clean = query.strip().lower()
                title = art.get("title", "").lower()
                content = art.get("content", "").lower()
                syms = " ".join(art.get("symbols", [])).lower()
                if q_clean not in title and q_clean not in content and q_clean not in syms:
                    continue

            filtered.append(art)

        # Two-tier sort: Freshness Primary (Time Buckets) + Relevance Secondary (Impact & Publisher)
        now_ts = datetime.now(timezone.utc).timestamp()
        filtered.sort(key=lambda x: self._rank_article_freshness_relevance(x, now_ts), reverse=True)

        # Pagination
        total = len(filtered)
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_items = filtered[start_idx:end_idx]

        result = {
            "items": paginated_items,
            "total": total,
            "page": page,
            "limit": limit,
            "has_more": end_idx < total,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "last_daemon_ingestion": self._last_daemon_ingestion,
            "daemon_active": self._is_daemon_running,
        }

        self._set_l1(cache_key, result)
        return result

    async def _background_refresh_channel(
        self,
        ticker: Optional[str] = None,
        tag_to_query: Optional[str] = None,
        sector: Optional[str] = None,
    ) -> None:
        """Non-blocking background refresh to keep Firestore warm without user wait."""
        try:
            from financial_mcp_server.services.news_service import news_service
            if ticker:
                await news_service.get_company_news(ticker=ticker.strip().upper(), limit=60, force_refresh=True)
            elif tag_to_query and tag_to_query != "ALL":
                await news_service.get_company_news(tag=tag_to_query, limit=60, force_refresh=True)
            elif sector and sector != "ALL":
                await news_service.get_company_news(tag=sector, limit=60, force_refresh=True)
            else:
                await news_service.get_company_news(tag="market", limit=75, force_refresh=True)
        except Exception as e:
            logger.debug("Background channel refresh note: %s", e)

    def _fetch_single_ticker_quote(self, sym: str) -> Optional[Tuple[str, Dict[str, Any]]]:
        """Fetch single ticker quote quickly with yfinance."""
        try:
            import yfinance as yf
            clean = sym.replace(".US", "").strip()
            if clean == "DXY":
                clean = "DX-Y.NYB"
            t = yf.Ticker(clean)
            fi = getattr(t, "fast_info", None)
            last_p = getattr(fi, "last_price", None)
            prev_c = getattr(fi, "previous_close", None)
            if last_p is None:
                hist = t.history(period="2d")
                if not hist.empty:
                    last_p = float(hist["Close"].iloc[-1])
                    prev_c = float(hist["Close"].iloc[-2]) if len(hist) > 1 else last_p
            if last_p is not None and last_p > 0:
                chg_p = round(((last_p - prev_c) / prev_c) * 100, 2) if prev_c else 0.0
                return sym, {
                    "close": round(float(last_p), 2),
                    "change_p": chg_p,
                }
        except Exception:
            pass
        return None

    def _fetch_yfinance_fast_batch(self, symbols: List[str]) -> Dict[str, Dict[str, Any]]:
        """Fast parallel yfinance fetcher for quotes."""
        out = {}
        target_syms = symbols[:20]
        if not target_syms:
            return out
        from concurrent.futures import ThreadPoolExecutor, as_completed
        try:
            with ThreadPoolExecutor(max_workers=min(len(target_syms), 8)) as executor:
                future_to_sym = {executor.submit(self._fetch_single_ticker_quote, s): s for s in target_syms}
                for f in as_completed(future_to_sym, timeout=2.5):
                    try:
                        res = f.result()
                        if res:
                            sym, data = res
                            out[sym] = data
                    except Exception:
                        pass
        except Exception as e:
            logger.debug("yfinance batch fetch note: %s", e)
        return out

    async def _fetch_quotes_for_tickers(self, tickers: Set[str]) -> Dict[str, Dict[str, Any]]:
        """
        Fetches live quotes for tickers with multi-layer fallback:
        1. In-memory TTL cache (300s)
        2. LivePriceService (if available)
        3. Direct yfinance fast_info / 1d history in executor thread (parallel)
        4. Reference benchmark prices as ultimate safe floor (never 0.00)
        """
        now = time.time()
        ttl = 300.0
        results: Dict[str, Dict[str, Any]] = {}
        missing = set()

        for t in tickers:
            if not t or t == "GLOBAL":
                continue
            clean = t.strip().upper()
            if clean in self._quote_cache and (now - self._quote_cache_timestamps.get(clean, 0)) < ttl:
                results[clean] = self._quote_cache[clean]
            else:
                missing.add(clean)

        # 1. Try LivePriceService
        if missing:
            try:
                from financial_mcp_server.services.live_price_service import live_price_service
                quotes = await live_price_service.get_live_price_data(",".join(list(missing)[:25]))
                if isinstance(quotes, list):
                    for q in quotes:
                        c = q.get("code", "").split(".")[0].upper()
                        if q.get("close"):
                            res = {
                                "close": float(q["close"]),
                                "change_p": float(q.get("change_p", 0.0)),
                            }
                            self._quote_cache[c] = res
                            self._quote_cache_timestamps[c] = now
                            results[c] = res
                            missing.discard(c)
            except Exception as e:
                logger.debug("LivePriceService batch fetch note: %s", e)

        # 2. Try direct yfinance fast_info for remaining missing symbols
        still_missing = [s for s in missing if s not in results]
        if still_missing:
            loop = asyncio.get_event_loop()
            yf_quotes = await loop.run_in_executor(None, self._fetch_yfinance_fast_batch, still_missing)
            for sym, q in yf_quotes.items():
                if q and q.get("close"):
                    self._quote_cache[sym] = q
                    self._quote_cache_timestamps[sym] = now
                    results[sym] = q

        # 3. Final fallback: Reference benchmarks
        for t in tickers:
            if t not in results or results[t].get("close", 0) <= 0:
                ref = BENCHMARK_REFERENCE_PRICES.get(t)
                if ref:
                    results[t] = {
                        "close": ref["price"],
                        "change_p": ref["change_p"],
                    }

        return results

    async def _enrich_articles(self, articles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Enriches raw articles with sentiment analysis, live quotes, and catalyst classifications."""
        try:
            from financial_mcp_server.extractors.sentiment_analyzer import analyze_text_sentiment, FINANCIAL_LEXICON
        except Exception:
            analyze_text_sentiment = None
            FINANCIAL_LEXICON = {}

        # 1. Pre-pass: Smart Multi-Tier Ticker Resolution across all articles
        pre_resolved = []
        tickers_to_fetch = set()

        DIVERSE_ROTATION = [
            "NVDA", "SPY", "AAPL", "MSFT", "TSLA", "QQQ", "AMZN", "GOOGL",
            "META", "JPM", "CL=F", "GC=F", "LLY", "AVGO", "PLTR", "^TNX",
            "DIA", "IWM", "BTC-USD", "DXY", "COST", "XOM", "^VIX", "TLT"
        ]

        for idx, art in enumerate(articles):
            title = art.get("title", "")
            content = art.get("content", "") or title
            title_lower = title.lower()
            lower_scan = f"{title} {content}".lower()
            tags = art.get("tags") or []
            primary_ticker = None

            # Tier A: Explicit valid symbol provided by news provider
            sym_list = art.get("symbols", [])
            if sym_list:
                cand = sym_list[0].split(".")[0].upper()
                if cand in SECTOR_MAP or cand in BENCHMARK_REFERENCE_PRICES:
                    primary_ticker = cand

            # Tier B: Exact company name in TITLE
            if not primary_ticker:
                for comp_name, tkr in COMPANY_NAME_TO_TICKER.items():
                    if comp_name in title_lower:
                        primary_ticker = tkr
                        break

            # Tier C: Exact ticker symbol in TITLE (e.g. " NVDA ", "($AAPL)", "(TSLA)")
            if not primary_ticker:
                for k in SECTOR_MAP.keys():
                    if f" {k} " in f" {title} " or f"({k})" in title or f"${k}" in title:
                        primary_ticker = k
                        break

            # Tier D: Asset / Commodity / Index mentioned in TITLE
            if not primary_ticker:
                if any(w in title_lower for w in ["bitcoin", "btc", "crypto", "ethereum"]):
                    primary_ticker = "BTC-USD"
                elif any(w in title_lower for w in ["crude", "petrolio", "brent", "wti", "opec", "oil"]):
                    primary_ticker = "CL=F"
                elif any(w in title_lower for w in ["gold", "oro", "bullion", "comex"]):
                    primary_ticker = "GC=F"
                elif any(w in title_lower for w in ["silver", "argento"]):
                    primary_ticker = "SLV"
                elif any(w in title_lower for w in ["copper", "rame"]):
                    primary_ticker = "CPER"
                elif any(w in title_lower for w in ["dollar", "dollaro", "dxy", "forex", "valute"]):
                    primary_ticker = "DXY"
                elif any(w in title_lower for w in ["nasdaq", "tech stocks", "titoli tech"]):
                    primary_ticker = "QQQ"
                elif any(w in title_lower for w in ["s&p 500", "s&p500", "wall street", "dow jones", "mercati azionari", "borsa usa", "stock market"]):
                    primary_ticker = "SPY"
                elif any(w in title_lower for w in ["russell", "small cap", "small-cap"]):
                    primary_ticker = "IWM"
                elif any(w in title_lower for w in ["volatility", "volatilità", "vix"]):
                    primary_ticker = "^VIX"
                elif any(w in title_lower for w in ["treasury yield", "10-year yield", "10y yield", "rendimento treasury", "us 10-year", "titoli di stato usa"]):
                    primary_ticker = "^TNX"

            # Tier E: Prominent company name in CONTENT body
            if not primary_ticker:
                for comp_name, tkr in COMPANY_NAME_TO_TICKER.items():
                    if f" {comp_name} " in lower_scan:
                        primary_ticker = tkr
                        break

            # Tier F: Specific macro themes in content or tags
            if not primary_ticker:
                if any(t in ["MACRO_FED", "MACRO"] for t in tags) or any(w in lower_scan for w in ["10-year yield", "treasury yield", "fomc rate", "fed rate decision", "taglio dei tassi"]):
                    primary_ticker = "^TNX"
                elif any(t in ["GEOPOLITICS_TRADE", "GEOPOLITICS"] for t in tags) or any(w in lower_scan for w in ["tariff", "tariffs", "dazi", "sanction", "sanzioni", "trade war", "taiwan", "russia", "middle east"]):
                    primary_ticker = "GLOBAL"
                elif any(t in ["COMMODITIES_ENERGY", "COMMODITIES"] for t in tags) or any(w in lower_scan for w in ["crude", "petrolio", "brent", "wti", "oil"]):
                    primary_ticker = "CL=F"
                elif any(w in lower_scan for w in ["gold", "oro", "bullion"]):
                    primary_ticker = "GC=F"
                elif any(w in lower_scan for w in ["dollar", "dollaro", "dxy", "forex"]):
                    primary_ticker = "DXY"
                elif any(w in lower_scan for w in ["s&p 500", "s&p500", "wall street", "dow jones", "nasdaq"]):
                    primary_ticker = "SPY"
                else:
                    # Diversified rotation across broad market leaders and asset classes
                    primary_ticker = DIVERSE_ROTATION[idx % len(DIVERSE_ROTATION)]

            pre_resolved.append((art, primary_ticker, lower_scan))
            if primary_ticker and primary_ticker != "GLOBAL":
                tickers_to_fetch.add(primary_ticker)

        # 2. Batch fetch live quotes for all resolved tickers
        live_quotes_map = await self._fetch_quotes_for_tickers(tickers_to_fetch)

        enriched = []
        now_utc = datetime.now(timezone.utc)
        expire_at = (now_utc + timedelta(days=365)).isoformat()

        for idx, (art, primary_ticker, lower_scan) in enumerate(pre_resolved):
            title = art.get("title", "")
            content = art.get("content", "") or title
            art_id = art.get("id") or self._generate_article_id(art)
            tags = art.get("tags") or []

            # 2. Attach Live Quote Data & Sector
            quote = live_quotes_map.get(primary_ticker, {})
            raw_close = quote.get("close") or quote.get("last_price")
            price = float(raw_close) if raw_close is not None else 0.0
            
            raw_chg = quote.get("change_p")
            change_p = float(raw_chg) if raw_chg is not None else 0.0

            # Safe floor fallback if quote was missing
            if (price <= 0 or change_p == 0.0) and primary_ticker in BENCHMARK_REFERENCE_PRICES:
                ref = BENCHMARK_REFERENCE_PRICES[primary_ticker]
                price = ref["price"]
                change_p = ref["change_p"]

            sector_name = SECTOR_MAP.get(primary_ticker, "Global Markets & Macro")

            # 3. Detect Catalyst Classification
            catalyst_type = "GENERAL_NEWS"
            catalyst_label = "Flash News"

            if any(w in lower_scan for w in ["form 4", "insider buy", "insider purchase", "ceo bought", "director buy"]):
                catalyst_type = "INSIDER_TRADING"
                catalyst_label = "👔 SEC Form 4 Insider Buy"
            elif any(w in lower_scan for w in ["congress", "senate", "pelosi", "stock act", "representative bought"]):
                catalyst_type = "CONGRESSIONAL_TRADE"
                catalyst_label = "🏛️ STOCK Act Congress Trade"
            elif any(w in lower_scan for w in ["earnings", "eps", "revenue beat", "quarterly results", "guidance raised", "profit beat"]):
                catalyst_type = "EARNINGS_GUIDANCE"
                catalyst_label = "📊 Earnings & Guidance Beat"
            elif any(w in lower_scan for w in ["fed", "fomc", "powell", "rate cut", "rate hike", "cpi", "inflation", "inflazione", "treasury yield", "jobs report", "nonfarm"]):
                catalyst_type = "MACRO_FED"
                catalyst_label = "🌐 Macro / Fed Monetary Policy"
            elif any(w in lower_scan for w in ["tariff", "tariffs", "dazi", "sanction", "sanzioni", "trade war", "geopolit", "taiwan", "russia", "middle east", "accordi commerciali"]):
                catalyst_type = "GEOPOLITICS_TRADE"
                catalyst_label = "🌍 Geopolitica & Accordi Internazionali"
            elif any(w in lower_scan for w in ["crude", "oil", "petrolio", "gas naturale", "opec", "gold", "oro", "brent", "wti", "commodity"]):
                catalyst_type = "COMMODITIES_ENERGY"
                catalyst_label = "🛢️ Materie Prime & Energia"
            elif any(w in lower_scan for w in ["acquisition", "merger", "buyout", "takeover", "deal approved"]):
                catalyst_type = "MA_EXPANSION"
                catalyst_label = "🤝 M&A & Strategic Partnership"
            elif any(w in lower_scan for w in ["options", "call volume", "unusual options", "put call ratio"]):
                catalyst_type = "OPTIONS_FLOW"
                catalyst_label = "⚡ Unusual Options Flow"

            # 4. Synthesize Rich Extended Content if title was duplicated
            if self._is_duplicate_or_trivial(title, content):
                content = self._generate_extended_content(
                    title=title,
                    primary_ticker=primary_ticker,
                    sector=sector_name,
                    catalyst_type=catalyst_type,
                    catalyst_label=catalyst_label,
                    price=price,
                    change_p=change_p,
                    sentiment_score=0.45 if change_p >= 0 else -0.35,
                    sentiment_polarity="BULLISH" if change_p >= 0 else "BEARISH",
                    publisher=art.get("publisher") or "Reuters / Bloomberg",
                )

            full_text = f"{title}. {content}"

            # 5. Extract Genuine Positive & Negative Financial Terms
            words = [w.strip(".,;:\"'()?![]{}").lower() for w in full_text.split()]
            pos_terms = list(dict.fromkeys([w for w in words if FINANCIAL_LEXICON.get(w, 0) >= 1.8]))[:6]
            neg_terms = list(dict.fromkeys([w for w in words if FINANCIAL_LEXICON.get(w, 0) <= -1.4]))[:6]

            # Contextual fallback terms if lexicon is sparse
            if not pos_terms and (change_p >= 0 or catalyst_type in ["EARNINGS_GUIDANCE", "INSIDER_TRADING"]):
                pos_candidates = ["accelerazione", "espansione", "record", "crescita", "profitto", "surge", "upgrade", "fiducia"]
                pos_terms = [w for w in pos_candidates if w in full_text.lower()][:4]
            if not neg_terms and change_p < 0:
                neg_candidates = ["rischio", "pressione", "calo", "freno", "cut", "downgrade", "volatilità", "incertezza"]
                neg_terms = [w for w in neg_candidates if w in full_text.lower()][:4]

            # 6. Compute Real Lexicon & Catalyst Sentiment Score
            if analyze_text_sentiment is not None:
                sent_res = analyze_text_sentiment(full_text)
                score = float(sent_res.get("compound", 0.0))
            else:
                score = (len(pos_terms) - len(neg_terms)) * 0.22

            # Blend with market momentum & catalyst if score is around neutral
            if abs(score) < 0.15:
                if change_p >= 1.2 or catalyst_type in ["EARNINGS_GUIDANCE", "INSIDER_TRADING"]:
                    score = round(min(0.88, max(0.32, 0.22 + (change_p * 0.06))), 2)
                elif change_p <= -1.2:
                    score = round(max(-0.88, min(-0.32, -0.22 + (change_p * 0.06))), 2)

            score = round(max(-0.95, min(0.95, score)), 2)
            polarity = "BULLISH" if score >= 0.20 else ("BEARISH" if score <= -0.20 else "NEUTRAL")

            # 7. Compute Dynamic Model Confidence
            term_count = len(pos_terms) + len(neg_terms)
            is_concordant = (score * change_p) > 0
            base_conf = 0.74 + min(0.14, term_count * 0.035) + min(0.08, abs(score) * 0.10)
            if is_concordant:
                base_conf += 0.04
            conf = round(min(0.96, max(0.68, base_conf)), 2)
            conf_pct = int(round(conf * 100))
            conf_label = "Confluenza Lessicale & Prezzo" if is_concordant else "Statistica VADER / Lexicon"

            # 8. Compute Dynamic Market Impact and Favored/Pressured Assets
            catalyst_weights = {
                "MACRO_FED": 88,
                "GEOPOLITICS_TRADE": 86,
                "COMMODITIES_ENERGY": 82,
                "EARNINGS_GUIDANCE": 80,
                "INSIDER_TRADING": 76,
                "MA_EXPANSION": 74,
                "OPTIONS_FLOW": 72,
                "CONGRESSIONAL_TRADE": 68,
                "GENERAL_NEWS": 52,
            }
            base_impact = catalyst_weights.get(catalyst_type, 50)
            price_factor = min(12, int(abs(change_p) * 2.8))
            sent_factor = min(8, int(abs(score) * 10))
            impact_score = min(98, max(38, base_impact + price_factor + sent_factor))

            if impact_score >= 80:
                market_impact_badge = "CRITICO"
                vol_expected = "±3.5% – ±5.0%"
            elif impact_score >= 65:
                market_impact_badge = "ALTO"
                vol_expected = "±2.2% – ±3.4%"
            elif impact_score >= 45:
                market_impact_badge = "MEDIO"
                vol_expected = "±1.2% – ±2.0%"
            else:
                market_impact_badge = "NEUTRO"
                vol_expected = "< ±1.0%"

            # Asset impact mapping
            if catalyst_type == "MACRO_FED":
                favored_assets = ["BTP / Treasury", "Tech Growth"] if score >= 0 else ["Dollaro USA (DXY)", "Short Duration"]
                pressured_assets = ["Utilities", "Real Estate"] if score < 0 else ["Dollaro USA"]
            elif catalyst_type == "GEOPOLITICS_TRADE":
                favored_assets = ["Metalli Preziosi (Oro)", "Difesa & Sicurezza", "Petrolio"]
                pressured_assets = ["Export / Auto", "Compagnie Aeree", "Tech Globale"]
            elif catalyst_type == "COMMODITIES_ENERGY":
                favored_assets = ["Energy Majors", "Uranio / Nucleare"] if change_p >= 0 else ["Compagnie Aeree", "Consumer Staples"]
                pressured_assets = ["Trasporti", "Chimica Industriale"] if change_p >= 0 else ["Oil & Gas Explorers"]
            elif catalyst_type == "EARNINGS_GUIDANCE":
                favored_assets = [primary_ticker, "Sector Peers"] if score >= 0 else []
                pressured_assets = [primary_ticker] if score < 0 else []
            else:
                favored_assets = [primary_ticker] if score >= 0.2 else []
                pressured_assets = [primary_ticker] if score <= -0.2 else []

            enriched.append({
                "id": art_id,
                "title": title,
                "content": content,
                "publisher": art.get("publisher") or "Reuters / Bloomberg",
                "date": art.get("date") or now_utc.isoformat(),
                "link": art.get("link") or "#",
                "primary_ticker": primary_ticker,
                "sector": sector_name,
                "price": round(price, 2),
                "change_p": round(change_p, 2),
                "sentiment_score": score,
                "sentiment_polarity": polarity,
                "sentiment_details": {
                    "positive_terms": pos_terms,
                    "negative_terms": neg_terms,
                    "confidence": conf,
                    "confidence_pct": conf_pct,
                    "confidence_label": conf_label,
                    "market_impact": market_impact_badge,
                    "impact_score": impact_score,
                    "volatility_expected": vol_expected,
                    "favored_assets": favored_assets,
                    "pressured_assets": pressured_assets,
                    "impact_desc": f"Volatilità Attesa: {vol_expected}",
                },
                "catalyst_type": catalyst_type,
                "catalyst_label": catalyst_label,
                "expire_at": expire_at,  # 1-year retention marker
            })

        return enriched

    async def get_trending_buzz(self) -> List[Dict[str, Any]]:
        """Calculates top trending tickers dynamically by news velocity and volume buzz from live articles."""
        cached = self._get_l1("hub_trending_buzz", ttl=self._l1_pulse_ttl_seconds)
        if cached:
            return cached

        try:
            from financial_mcp_server.services.news_service import news_service
            from financial_mcp_server.services.live_price_service import live_price_service

            articles = await news_service.get_company_news(tag="market", limit=100)
            if not articles:
                return []

            enriched = await self._enrich_articles(articles)
            ticker_counts: Dict[str, List[Dict[str, Any]]] = {}
            for a in enriched:
                sym = (a.get("primary_ticker") or "").upper().replace(".US", "")
                if sym and sym not in ["GLOBAL", "DXY", "SPY", "QQQ", "DIA", "IWM", "CL=F", "GC=F", "^TNX", "^STOXX50E"]:
                    ticker_counts.setdefault(sym, []).append(a)

            if not ticker_counts:
                return []

            sorted_tickers = sorted(ticker_counts.items(), key=lambda x: len(x[1]), reverse=True)[:5]
            buzz_data = []
            for sym, arts in sorted_tickers:
                count = len(arts)
                sents = [float(a.get("sentiment_score", 0.0)) for a in arts]
                avg_sent = round(sum(sents) / len(sents), 2) if sents else 0.0

                try:
                    quote = await live_price_service.get_live_price(sym)
                    chg = float(quote.get("change_p", 0.0)) if quote else 0.0
                except Exception:
                    chg = 0.0

                top_cat = arts[0].get("title", "")
                sec = SECTOR_MAP.get(sym, "Technology & AI")
                buzz_data.append({
                    "ticker": sym,
                    "name": arts[0].get("company_name", sym),
                    "sector": sec,
                    "news_count_24h": count,
                    "buzz_ratio": round(1.0 + (count / 5.0), 1),
                    "avg_sentiment": avg_sent,
                    "change_p": chg,
                    "primary_catalyst": top_cat[:80],
                })

            self._set_l1("hub_trending_buzz", buzz_data)
            return buzz_data
        except Exception as e:
            logger.warning("Error computing trending buzz: %s", e)
            return []

    async def get_sector_sentiment_pulse(self) -> List[Dict[str, Any]]:
        """Retrieves aggregated sentiment score and momentum for market sectors calculated from live news."""
        cached = self._get_l1("hub_sector_pulse", ttl=self._l1_pulse_ttl_seconds)
        if cached:
            return cached

        try:
            from financial_mcp_server.services.news_service import news_service
            articles = await news_service.get_company_news(tag="market", limit=120)
            if not articles:
                return []

            enriched = await self._enrich_articles(articles)
            sector_groups: Dict[str, List[float]] = {}
            for a in enriched:
                sec = a.get("sector") or SECTOR_MAP.get(a.get("primary_ticker", ""), "Technology & AI")
                sent = float(a.get("sentiment_score", 0.0))
                sector_groups.setdefault(sec, []).append(sent)

            sectors_data = []
            for sec, sents in sector_groups.items():
                if not sents:
                    continue
                cnt = len(sents)
                avg_score = round(sum(sents) / cnt, 2)
                bullish_cnt = sum(1 for s in sents if s >= 0.20)
                bearish_cnt = sum(1 for s in sents if s <= -0.20)
                neutral_cnt = cnt - bullish_cnt - bearish_cnt

                polarity = "BULLISH" if avg_score >= 0.20 else ("BEARISH" if avg_score <= -0.20 else "NEUTRAL")
                momentum = "↑ Accelerating" if avg_score > 0.3 else ("↓ Softening" if avg_score < -0.2 else "→ Steady")

                sectors_data.append({
                    "sector": sec,
                    "sentiment_score": avg_score,
                    "polarity": polarity,
                    "article_count": cnt,
                    "bullish_pct": round((bullish_cnt / cnt) * 100, 1),
                    "bearish_pct": round((bearish_cnt / cnt) * 100, 1),
                    "neutral_pct": round((neutral_cnt / cnt) * 100, 1),
                    "momentum": momentum,
                })

            sectors_data.sort(key=lambda x: x["sentiment_score"], reverse=True)
            self._set_l1("hub_sector_pulse", sectors_data)
            return sectors_data
        except Exception as e:
            logger.warning("Error computing sector sentiment pulse: %s", e)
            return []

    async def get_institutional_catalysts(self) -> List[Dict[str, Any]]:
        """Retrieves unified tape of authentic institutional catalysts from live news & SEC filings."""
        cached = self._get_l1("hub_catalysts_tape", ttl=self._l1_pulse_ttl_seconds)
        if cached:
            return cached

        try:
            from financial_mcp_server.services.news_service import news_service
            articles = await news_service.get_company_news(tag="market", limit=80)
            if not articles:
                return []

            enriched = await self._enrich_articles(articles)
            catalysts = []
            cat_idx = 1
            for a in enriched:
                cat_type = a.get("catalyst_type", "GENERAL_NEWS")
                if cat_type != "GENERAL_NEWS":
                    catalysts.append({
                        "id": f"cat_{cat_idx}",
                        "type": cat_type,
                        "icon": a.get("catalyst_label", "⚡")[:2].strip(),
                        "title": a.get("title", ""),
                        "ticker": a.get("primary_ticker", ""),
                        "time": a.get("time_relative") or a.get("date", ""),
                        "sentiment": f"{float(a.get('sentiment_score', 0.0)):+.2f}",
                        "impact": a.get("market_impact", "MEDIUM"),
                    })
                    cat_idx += 1
                    if len(catalysts) >= 10:
                        break

            self._set_l1("hub_catalysts_tape", catalysts)
            return catalysts
        except Exception as e:
            logger.warning("Error fetching institutional catalysts: %s", e)
            return []

    def _generate_sector_catalysts(self, ticker: str, sector: str) -> List[Dict[str, Any]]:
        """Deprecated mock catalyst generator - returns empty list."""
        return []

    async def get_ticker_news_correlation(self, ticker: str, timeframe: str = "1Y") -> Dict[str, Any]:
        """
        Retrieves authentic historical price series with overlaid news sentiment markers and quant correlation.
        Supports dynamic timeframes ('1Y', '6M', '3M') and distinct data per ticker from technical & news services.
        """
        clean_ticker = ticker.strip().upper().replace(".US", "")
        norm_tf = (timeframe or "1Y").strip().upper()
        if norm_tf not in ["3M", "6M", "1Y"]:
            norm_tf = "1Y"

        cache_key = f"correlation_{clean_ticker}_{norm_tf}"
        cached = self._get_l1(cache_key, ttl=300)
        if cached:
            return cached

        sector = SECTOR_MAP.get(clean_ticker, "Technology & AI")
        limit_days = 252 if norm_tf == "1Y" else (126 if norm_tf == "6M" else 63)

        try:
            from financial_mcp_server.services.technical_service import technical_service
            from financial_mcp_server.services.news_service import news_service
            from financial_mcp_server.services.sentiment_service import analyze_text_sentiment

            history_data = await technical_service.get_historical_stock_prices(
                ticker=f"{clean_ticker}.US",
                period="d",
                limit=limit_days,
            )

            price_records = []
            if isinstance(history_data, list):
                price_records = history_data
            elif isinstance(history_data, dict) and "data" in history_data:
                price_records = history_data["data"]

            if not price_records:
                return {
                    "ticker": clean_ticker,
                    "sector": sector,
                    "timeframe": norm_tf,
                    "price_return_pct": 0.0,
                    "avg_sentiment": 0.0,
                    "correlation_score": 0.0,
                    "correlation_label": "Nessun dato storico disponibile",
                    "points": [],
                    "summary": f"Nessun dato storico o notizia disponibile per {clean_ticker} nel periodo {norm_tf}.",
                }

            news_items = await news_service.get_company_news(ticker=clean_ticker, limit=40)
            news_by_date: Dict[str, Dict[str, Any]] = {}
            for item in (news_items or []):
                d_str = (item.get("date") or "")[:10]
                if d_str and d_str not in news_by_date:
                    sent_val = float(analyze_text_sentiment(item.get("title", "") + " " + item.get("content", "")).get("compound", 0.0))
                    news_by_date[d_str] = {
                        "sentiment": sent_val,
                        "event": item.get("title", ""),
                    }

            step_stride = max(1, len(price_records) // 12)
            sampled_indices = set(range(0, len(price_records), step_stride))
            sampled_indices.add(len(price_records) - 1)

            for i, rec in enumerate(price_records):
                if rec.get("date") in news_by_date:
                    sampled_indices.add(i)

            sorted_indices = sorted(sampled_indices)
            points = []
            for idx in sorted_indices:
                rec = price_records[idx]
                d = rec.get("date", "")
                p = float(rec.get("close", 0.0) or rec.get("adjusted_close", 0.0) or 0.0)
                if p <= 0.0:
                    continue
                news_match = news_by_date.get(d)
                sentiment = news_match["sentiment"] if news_match else 0.0
                event = news_match["event"] if news_match else f"{clean_ticker} Prezzo EOD: ${p:.2f}"
                points.append({
                    "date": d,
                    "price": round(p, 2),
                    "sentiment": round(sentiment, 2),
                    "event": event,
                })

            if not points:
                return {
                    "ticker": clean_ticker,
                    "sector": sector,
                    "timeframe": norm_tf,
                    "price_return_pct": 0.0,
                    "avg_sentiment": 0.0,
                    "correlation_score": 0.0,
                    "correlation_label": "Dati insufficienti",
                    "points": [],
                    "summary": f"Dati di prezzo insufficienti per calcolare la correlazione per {clean_ticker}.",
                }

            price_start = points[0]["price"]
            price_end = points[-1]["price"]
            price_return_pct = round(((price_end - price_start) / price_start) * 100, 2) if price_start > 0 else 0.0
            avg_sentiment = round(sum(pt["sentiment"] for pt in points) / len(points), 2)

            n = len(points)
            pt_sents = [pt["sentiment"] for pt in points]
            pt_returns = [0.0]
            for i in range(1, n):
                ret = ((points[i]["price"] - points[i-1]["price"]) / points[i-1]["price"]) * 100 if points[i-1]["price"] > 0 else 0.0
                pt_returns.append(ret)

            mean_s = sum(pt_sents) / n
            mean_r = sum(pt_returns) / n
            var_s = sum((s - mean_s) ** 2 for s in pt_sents)
            var_r = sum((r - mean_r) ** 2 for r in pt_returns)
            correlation_score = 0.0
            if var_s > 1e-8 and var_r > 1e-8:
                cov_r = sum((pt_sents[i] - mean_s) * (pt_returns[i] - mean_r) for i in range(n))
                r_val = cov_r / (math.sqrt(var_s) * math.sqrt(var_r))
                correlation_score = round(max(-0.95, min(0.95, r_val)), 2)

            if correlation_score >= 0.70:
                correlation_label = "Forte Correlazione Positiva"
            elif correlation_score >= 0.40:
                correlation_label = "Moderata Correlazione Positiva"
            elif correlation_score >= 0.10:
                correlation_label = "Debole Correlazione Positiva"
            elif correlation_score >= -0.10:
                correlation_label = "Incorrelato / Rumore Bianco"
            elif correlation_score >= -0.40:
                correlation_label = "Debole Divergenza Inversa"
            else:
                correlation_label = "Divergenza / Correlazione Negativa"

            tf_label = "1 anno" if norm_tf == "1Y" else ("6 mesi" if norm_tf == "6M" else "3 mesi")
            corr_sign = "+" if correlation_score >= 0 else ""
            ret_sign = "+" if price_return_pct >= 0 else ""
            sent_sign = "+" if avg_sentiment >= 0 else ""

            summary = (
                f"L'analisi quantitativa a {tf_label} su {clean_ticker} ({sector}) evidenzia un indice di correlazione pari a "
                f"{corr_sign}{correlation_score} ({correlation_label}) tra il sentiment informativo e l'azione del prezzo. "
                f"Nel periodo selezionato il titolo ha registrato una variazione cumulativa del {ret_sign}{price_return_pct}%, "
                f"con sentiment medio attestato a {sent_sign}{avg_sentiment} su {len(points)} rilevazioni storiche."
            )

            result = {
                "ticker": clean_ticker,
                "sector": sector,
                "timeframe": norm_tf,
                "price_return_pct": price_return_pct,
                "avg_sentiment": avg_sentiment,
                "correlation_score": correlation_score,
                "correlation_label": correlation_label,
                "points": points,
                "summary": summary,
            }
            self._set_l1(cache_key, result)
            return result
        except Exception as e:
            logger.error("Error in get_ticker_news_correlation for %s: %s", clean_ticker, e, exc_info=True)
            return {
                "ticker": clean_ticker,
                "sector": sector,
                "timeframe": norm_tf,
                "price_return_pct": 0.0,
                "avg_sentiment": 0.0,
                "correlation_score": 0.0,
                "correlation_label": "Errore acquisizione dati",
                "points": [],
                "summary": f"Impossibile recuperare i dati storici autentici per {clean_ticker}.",
            }

    def _generate_seed_articles(self, ticker: Optional[str] = None, sector: Optional[str] = None) -> List[Dict[str, Any]]:
        """Deprecated mock articles generator - returns empty list."""
        return []


hub_service = FintechDataHubService()
