from typing import List, Dict, Any, Optional
import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots


def create_candlestick_chart(
    data: List[Dict[str, Any]],
    ticker: str,
    title: Optional[str] = None,
) -> go.Figure:
    """Generates an interactive multi-pane Candlestick + Volume + Indicators chart.

    Args:
        data: List of dicts with keys 'date', 'open', 'high', 'low', 'close', 'volume'
        ticker: Symbol code (e.g. 'NVDA', 'AAPL')
        title: Optional custom chart title
    """
    if not data:
        fig = go.Figure()
        fig.update_layout(title="Nessun dato storico disponibile")
        return fig

    df = pd.DataFrame(data)
    
    # Ensure numeric columns
    for col in ["open", "high", "low", "close", "volume"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
    
    # Sort chronological
    if "date" in df.columns:
        df["date"] = pd.to_datetime(df["date"])
        df = df.sort_values("date").reset_index(drop=True)

    # Calculate Indicators if enough data points
    has_indicators = len(df) >= 20
    if has_indicators:
        df["sma_20"] = df["close"].rolling(window=20).mean()
        df["std_20"] = df["close"].rolling(window=20).std()
        df["bb_upper"] = df["sma_20"] + (2 * df["std_20"])
        df["bb_lower"] = df["sma_20"] - (2 * df["std_20"])

    if len(df) >= 50:
        df["sma_50"] = df["close"].rolling(window=50).mean()

    # Create Subplots: Row 1 = Price + BBands + SMAs (75%), Row 2 = Volume (25%)
    fig = make_subplots(
        rows=2,
        cols=1,
        shared_xaxes=True,
        vertical_spacing=0.03,
        row_heights=[0.75, 0.25],
    )

    # Candlestick
    fig.add_trace(
        go.Candlestick(
            x=df["date"],
            open=df["open"],
            high=df["high"],
            low=df["low"],
            close=df["close"],
            name=f"{ticker} Prezzo",
            increasing_line_color="#10b981",
            decreasing_line_color="#ef4444",
            increasing_fillcolor="#10b981",
            decreasing_fillcolor="#ef4444",
        ),
        row=1,
        col=1,
    )

    # Bollinger Bands
    if has_indicators and "bb_upper" in df.columns:
        fig.add_trace(
            go.Scatter(
                x=df["date"],
                y=df["bb_upper"],
                line=dict(color="rgba(148, 163, 184, 0.4)", width=1, dash="dot"),
                name="BB Upper",
                showlegend=False,
            ),
            row=1,
            col=1,
        )
        fig.add_trace(
            go.Scatter(
                x=df["date"],
                y=df["bb_lower"],
                line=dict(color="rgba(148, 163, 184, 0.4)", width=1, dash="dot"),
                fill="tonexty",
                fillcolor="rgba(148, 163, 184, 0.05)",
                name="Bande di Bollinger (20, 2)",
            ),
            row=1,
            col=1,
        )
        fig.add_trace(
            go.Scatter(
                x=df["date"],
                y=df["sma_20"],
                line=dict(color="#f59e0b", width=1.5),
                name="SMA 20",
            ),
            row=1,
            col=1,
        )

    # SMA 50
    if "sma_50" in df.columns:
        fig.add_trace(
            go.Scatter(
                x=df["date"],
                y=df["sma_50"],
                line=dict(color="#3b82f6", width=1.5),
                name="SMA 50",
            ),
            row=1,
            col=1,
        )

    # Volume Bar Chart
    if "volume" in df.columns:
        colors = [
            "#10b981" if c >= o else "#ef4444"
            for o, c in zip(df["open"], df["close"])
        ]
        fig.add_trace(
            go.Bar(
                x=df["date"],
                y=df["volume"],
                marker_color=colors,
                name="Volume",
                opacity=0.6,
                showlegend=False,
            ),
            row=2,
            col=1,
        )

    # Dark Theme Layout
    chart_title = title or f"📊 {ticker.upper()} — Analisi Prezzi & Indicatori Tecnici"
    fig.update_layout(
        title=dict(
            text=chart_title,
            font=dict(size=16, color="#f1f5f9", family="Inter, sans-serif"),
        ),
        paper_bgcolor="#0b0f19",
        plot_bgcolor="#0f172a",
        font=dict(color="#94a3b8", family="Inter, sans-serif"),
        xaxis=dict(
            showgrid=True,
            gridcolor="#1e293b",
            rangeslider=dict(visible=False),
        ),
        xaxis2=dict(
            showgrid=True,
            gridcolor="#1e293b",
        ),
        yaxis=dict(
            title="Prezzo ($)",
            showgrid=True,
            gridcolor="#1e293b",
            side="right",
        ),
        yaxis2=dict(
            title="Vol",
            showgrid=True,
            gridcolor="#1e293b",
            side="right",
        ),
        legend=dict(
            orientation="h",
            yanchor="bottom",
            y=1.02,
            xanchor="right",
            x=1,
            font=dict(size=11, color="#cbd5e1"),
        ),
        margin=dict(l=20, r=40, t=50, b=20),
        height=450,
    )

    return fig


def create_yield_curve_chart(
    yield_data: Dict[str, float],
    title: str = "🏛️ US Treasury Par Yield Curve",
) -> go.Figure:
    """Generates an interactive US Treasury Yield Curve chart.

    Args:
        yield_data: Dict of maturities to rates (e.g. {'1M': 5.25, '2Y': 4.15, '10Y': 4.25, ...})
    """
    maturities_order = ["1M", "3M", "6M", "1Y", "2Y", "3Y", "5Y", "7Y", "10Y", "20Y", "30Y"]
    x_labels = [m for m in maturities_order if m in yield_data]
    y_values = [yield_data[m] for m in x_labels]

    fig = go.Figure()

    # Yield curve line with gradient fill
    fig.add_trace(
        go.Scatter(
            x=x_labels,
            y=y_values,
            mode="lines+markers",
            name="Yield (%)",
            line=dict(color="#38bdf8", width=3, shape="spline"),
            marker=dict(size=8, color="#0ea5e9", line=dict(color="#ffffff", width=1.5)),
            fill="tozeroy",
            fillcolor="rgba(14, 165, 233, 0.08)",
        )
    )

    # Calculate 2Y-10Y Spread if both exist
    spread_text = ""
    if "2Y" in yield_data and "10Y" in yield_data:
        spread = round(yield_data["10Y"] - yield_data["2Y"], 2)
        spread_status = "⚠️ INVERTITA" if spread < 0 else "✓ NORMALE"
        spread_text = f" | Spread 10Y-2Y: {spread:+.2f}% ({spread_status})"

    fig.update_layout(
        title=dict(
            text=f"{title}{spread_text}",
            font=dict(size=15, color="#f1f5f9", family="Inter, sans-serif"),
        ),
        paper_bgcolor="#0b0f19",
        plot_bgcolor="#0f172a",
        font=dict(color="#94a3b8", family="Inter, sans-serif"),
        xaxis=dict(
            title="Scadenza (Maturity)",
            showgrid=True,
            gridcolor="#1e293b",
        ),
        yaxis=dict(
            title="Rendimento Nominale (%)",
            showgrid=True,
            gridcolor="#1e293b",
            ticksuffix="%",
        ),
        margin=dict(l=40, r=30, t=50, b=40),
        height=350,
    )

    return fig


def create_sentiment_gauge(
    score: float,
    ticker: str = "",
    title: str = "Sentiment Polarità di Mercato",
) -> go.Figure:
    """Generates an indicator gauge for financial news sentiment (-1.0 to +1.0)."""
    # Normalize score between -1.0 and +1.0
    val = max(-1.0, min(1.0, float(score)))

    # Color mapping
    if val >= 0.25:
        bar_color = "#10b981"  # Bullish Emerald
        status = "BULLISH"
    elif val <= -0.25:
        bar_color = "#ef4444"  # Bearish Coral
        status = "BEARISH"
    else:
        bar_color = "#f59e0b"  # Neutral Amber
        status = "NEUTRALE"

    ticker_prefix = f"{ticker.upper()} — " if ticker else ""

    fig = go.Figure(
        go.Indicator(
            mode="gauge+number",
            value=val,
            title=dict(
                text=f"{ticker_prefix}{title} ({status})",
                font=dict(size=14, color="#f8fafc", family="Inter, sans-serif"),
            ),
            number=dict(
                font=dict(size=28, color=bar_color),
                valueformat="+.2f",
            ),
            gauge=dict(
                axis=dict(range=[-1.0, 1.0], tickcolor="#64748b"),
                bar=dict(color=bar_color, thickness=0.3),
                bgcolor="#1e293b",
                borderwidth=1,
                bordercolor="#334155",
                steps=[
                    dict(range=[-1.0, -0.25], color="rgba(239, 68, 68, 0.15)"),
                    dict(range=[-0.25, 0.25], color="rgba(245, 158, 11, 0.15)"),
                    dict(range=[0.25, 1.0], color="rgba(16, 185, 129, 0.15)"),
                ],
            ),
        )
    )

    fig.update_layout(
        paper_bgcolor="#0b0f19",
        font=dict(color="#cbd5e1", family="Inter, sans-serif"),
        margin=dict(l=25, r=25, t=40, b=20),
        height=220,
    )

    return fig
