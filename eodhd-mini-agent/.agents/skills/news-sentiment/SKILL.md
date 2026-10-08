---
name: news-sentiment
description: >-
  Monitor company & sector news headlines, track media buzz volume, and analyze
  daily financial sentiment trends using Custom Hybrid News and Local Sentiment Engine.
  Use when the user asks for news, market sentiment, media buzz, or headline impact on a stock.
version: 0.1.0
argument-hint: "<ticker or sector tag, e.g. AAPL.US, TSLA, technology>"
---

# Skill: news-sentiment

## Purpose

Track recent financial news coverage, analyze sentiment scores, measure media volume (buzz), and assess the narrative driving a company or sector.

## Trigger

Activate when the user asks for:
- Latest news or headlines about a company (*"What's the latest news on Apple?"*, *"Show me recent headlines for TSLA"*)
- Sentiment analysis (*"What is the market sentiment on NVDA?"*, *"Is sentiment positive or negative on MSFT?"*)
- News buzz or media coverage spikes (*"How much news volume did AMD have this week?"*)
- Sector or topic news flow (*"What's happening in semiconductors?"*, *"News on AI chips"*)
- Impact of recent news on stock price action

## Workflow

1. **Identify target** — resolve ticker symbol (e.g., `AAPL.US`, `TSLA`) or topic/sector tag (e.g., `technology`, `semiconductor`, `crypto`).
2. **Fetch news articles** — Call custom tool `get_company_news(ticker="<ticker>", tag="<tag>", limit=10)` (hybrid yfinance + Google News RSS, cached on Firestore).
3. **Fetch sentiment time-series** — Call custom tool `get_sentiment_data(symbols="<ticker>")` to obtain daily polarity (-1.0 to +1.0), positive/negative/neutral percentages, and daily article counts.
4. **Fetch recent price context** — Call `get_live_price_data` or `get_historical_stock_prices` to correlate news catalysts with price changes.
5. **Synthesize & Present** using the structured output below.

## Output Structure

### [Company Name / Topic] (`TICKER`) — News & Sentiment Analysis

**Market Sentiment Snapshot**
- **Overall Mood**: 🟢 Bullish / 🔴 Bearish / ⚪ Neutral (Score: `+0.XX` on a `-1.0` to `+1.0` scale)
- **Media Buzz (Recent Coverage)**: High / Moderate / Low (`N` articles analyzed)
- **Positive vs Negative Ratio**: `X%` Positive | `Y%` Negative | `Z%` Neutral

**Daily Sentiment Trend**
| Date | Article Count (Buzz) | Sentiment Score | % Positive | % Negative | % Neutral |
|------|----------------------|-----------------|------------|------------|-----------|
| YYYY-MM-DD | — | — | — | — | — |

**Top Recent Headlines**
1. **[Headline Title]** — *[Publisher]* (*[Date/Time]*)
   - *Summary*: 1-2 sentence snippet of the news event.
   - *Impact*: Bullish / Bearish / Informational catalyst.
   - [Original Article Link]

**Key Narrative & Catalysts**
- 2-3 bullet points summarizing the primary stories moving the stock (e.g., earnings beat, product launch, regulatory probe, analyst upgrade).

> This is not financial advice. Data is for informational purposes only.

## Tools Used

| Tool | Source | Purpose | Cost |
|------|--------|---------|------|
| `get_company_news` | Custom Server (Hybrid / Firestore) | Recent news articles, publishers, snippets | 0 calls (Free) |
| `get_sentiment_data` | Custom Server (Sentiment Engine / Firestore) | Daily sentiment scores, polarity, positive/negative breakdown | 0 calls (Free) |
| `get_live_price_data` | EODHD | Current quote & intraday price reaction | 1 call |
| `get_historical_stock_prices` | Custom Server (yfinance) | Price history context | 0 calls (Free) |
