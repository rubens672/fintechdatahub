import pytest
from renderers.chart_renderer import (
    create_candlestick_chart,
    create_yield_curve_chart,
    create_sentiment_gauge,
)
from renderers.table_renderer import (
    format_insider_transactions_table,
    format_screener_results_table,
)
from renderers.badge_renderer import (
    render_regime_badge,
    render_sentiment_badge,
    render_rating_badge,
)


def test_candlestick_chart_generation():
    mock_data = [
        {"date": "2026-01-01", "open": 150.0, "high": 155.0, "low": 149.0, "close": 154.0, "volume": 1000000},
        {"date": "2026-01-02", "open": 154.0, "high": 158.0, "low": 153.0, "close": 157.0, "volume": 1200000},
        {"date": "2026-01-03", "open": 157.0, "high": 160.0, "low": 156.0, "close": 155.0, "volume": 800000},
    ]
    fig = create_candlestick_chart(mock_data, "AAPL")
    assert fig is not None
    assert "AAPL" in fig.layout.title.text


def test_yield_curve_chart_generation():
    mock_yields = {
        "1M": 5.25,
        "3M": 5.20,
        "6M": 5.10,
        "1Y": 4.80,
        "2Y": 4.25,
        "10Y": 4.15,
        "30Y": 4.35,
    }
    fig = create_yield_curve_chart(mock_yields)
    assert fig is not None
    assert "US Treasury" in fig.layout.title.text
    assert "INVERTITA" in fig.layout.title.text  # 10Y (4.15) < 2Y (4.25)


def test_sentiment_gauge_generation():
    fig_bullish = create_sentiment_gauge(0.65, "NVDA")
    assert fig_bullish is not None
    assert "BULLISH" in fig_bullish.data[0].title.text

    fig_bearish = create_sentiment_gauge(-0.50, "TSLA")
    assert fig_bearish is not None
    assert "BEARISH" in fig_bearish.data[0].title.text


def test_table_renderers():
    mock_tx = [
        {
            "date": "2026-02-15",
            "reportingName": "Tim Cook",
            "officerTitle": "CEO",
            "transactionType": "P",
            "shares": 5000,
            "price": 180.0,
            "totalValue": 900000,
        }
    ]
    tx_table = format_insider_transactions_table(mock_tx)
    assert "Tim Cook" in tx_table
    assert "🟢 ACQUISTO (P)" in tx_table
    assert "$900,000" in tx_table

    mock_screen = [
        {
            "symbol": "AAPL",
            "company_name": "Apple Inc.",
            "sector": "Technology",
            "market_cap": 3000000000000,
            "pe": 28.5,
            "dividend_yield": 0.005,
            "beta": 1.1,
        }
    ]
    screen_table = format_screener_results_table(mock_screen)
    assert "Apple Inc." in screen_table
    assert "$3.00T" in screen_table
    assert "28.5x" in screen_table


def test_badge_renderers():
    regime = render_regime_badge("Expansion / Bull Market")
    assert "🟢" in regime

    sentiment = render_sentiment_badge(0.45)
    assert "🟢 **BULLISH**" in sentiment

    rating = render_rating_badge("STRONG_BUY")
    assert "⭐ **STRONG BUY**" in rating
