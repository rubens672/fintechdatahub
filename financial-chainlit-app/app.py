import asyncio
import os
import re
import sys
from pathlib import Path
from uuid import uuid4
from typing import Optional, Dict, Any, List

# Unconditionally inject sibling module directories into sys.path
_MODULE_DIR = Path(__file__).resolve().parent
_WORKSPACE_ROOT = _MODULE_DIR.parent
_FINANCIAL_MCP_SRC = _WORKSPACE_ROOT / "financial-mcp-server" / "src"
_EODHD_AGENT_DIR = _WORKSPACE_ROOT / "eodhd-agent"

for _p in [str(_FINANCIAL_MCP_SRC), str(_EODHD_AGENT_DIR), str(_WORKSPACE_ROOT)]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

import chainlit as cl
from dotenv import load_dotenv

# Load configurations
from config import (
    MODEL_NAME,
    ENABLE_PLOTLY_CHARTS,
)

# Import Renderers
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

# Import AI Copilot Agent Service
from agent_service import stream_agent_query, sanitize_text


@cl.set_starters
async def set_starters():
    """Defines starter action buttons displayed on an empty chat."""
    return [
        cl.Starter(
            label="📊 Analisi Fondamentale Completa",
            message="Esegui un'analisi fondamentale e di bilancio dettagliata su NVDA, includendo multipli di valutazione, rating degli analisti e news recenti.",
            icon="/public/analysis.svg",
        ),
        cl.Starter(
            label="🔄 Superprompt 7-Step Workflow",
            message="Avvia il workflow a 7 nodi quantitativo per selezionare e pesare il miglior portafoglio US Mega-Cap con capitale 10.000 €.",
            icon="/public/workflow.svg",
        ),
        cl.Starter(
            label="📈 Grafico Candlestick & Indicatori",
            message="Genera il grafico Candlestick con SMA 20/50, Bande di Bollinger e analisi tecnica per AAPL.",
            icon="/public/candlestick.svg",
        ),
        cl.Starter(
            label="🏛️ Macro Dashboard & Tassi Treasury",
            message="Mostra lo stato della curva dei rendimenti US Treasury da FRED API e gli indicatori macroeconomici chiave.",
            icon="/public/macro.svg",
        ),
        cl.Starter(
            label="👔 Insider SEC Form 4 & Congress",
            message="Trova le ultime transazioni SEC Form 4 degli executive e gli scambi azionari dei membri del Congresso USA.",
            icon="/public/insider.svg",
        ),
        cl.Starter(
            label="⚖️ SEC EDGAR Forensic & RAG",
            message="Esegui l'analisi forense contabile (Altman Z, Beneish M, Piotroski) e verifica i rischi 10-K per NVDA.",
            icon="/public/analysis.svg",
        ),
    ]


@cl.on_chat_start
async def on_chat_start():
    """Initializes session state when a user starts or resets a chat session."""
    user_id = "trader_user"
    session_id = str(uuid4())

    cl.user_session.set("user_id", user_id)
    cl.user_session.set("session_id", session_id)
    cl.user_session.set("message_history", [])

    # Welcome header notification
    await cl.Message(
        content=(
            "👋 **Benvenuto nel Financial Cockpit AI Copilot!**\n\n"
            "Sono il tuo assistente quantitativo e di analisi finanziaria alimentato da **Google ADK & MCP Server**.\n"
            "Posso analizzare bilanci, calcolare indicatori tecnici, monitorare il sentiment delle news, "
            "consultare la curva dei tassi FRED ed eseguire il **Workflow a 7 Nodi** per la selezione di portafoglio.\n\n"
            "Seleziona uno dei suggerimenti sopra oppure scrivi il ticker o la richiesta che desideri analizzare."
        )
    ).send()


@cl.on_message
async def main(message: cl.Message):
    """Handles incoming user messages, executes the agent stream, and renders rich responses."""
    user_id = cl.user_session.get("user_id", "trader_user")
    session_id = cl.user_session.get("session_id", str(uuid4()))
    message_history = cl.user_session.get("message_history", [])

    user_query = message.content.strip()
    message_history.append({"role": "user", "content": user_query})

    # Prepare response message
    msg = cl.Message(content="")
    elements = []
    actions = []
    active_step: Optional[cl.Step] = None

    try:
        # Stream response chunks and steps from agent service
        async for event in stream_agent_query(user_query=user_query, user_id=user_id, session_id=session_id):
            ev_type = event.get("type")

            if ev_type == "step_start":
                step_name = event.get("name", "Tool Esecuzione")
                step_in = event.get("input", "")
                active_step = cl.Step(name=f"🔧 {step_name}", type="tool")
                active_step.input = step_in
                await active_step.send()

            elif ev_type == "step_end":
                if active_step:
                    active_step.output = event.get("output", "Completato con successo.")
                    await active_step.update()
                    active_step = None

            elif ev_type == "token":
                clean_text = sanitize_text(event.get("text", ""))
                await msg.stream_token(clean_text)

            elif ev_type == "chart":
                fig = event.get("figure")
                name = event.get("name", "chart")
                if fig and ENABLE_PLOTLY_CHARTS:
                    elements.append(cl.Plotly(figure=fig, name=name, display="inline"))

            elif ev_type == "actions":
                for act in event.get("items", []):
                    actions.append(
                        cl.Action(
                            name=act.get("name", "action"),
                            payload={"ticker": act.get("value", "")},
                            label=act.get("label", "Dettagli"),
                        )
                    )

        # Close any lingering step
        if active_step:
            active_step.output = "Completato."
            await active_step.update()

        # Attach rich elements & actions
        msg.elements = elements
        msg.actions = actions

        if msg.content or msg.elements:
            message_history.append({"role": "assistant", "content": msg.content})
            await msg.update()
        else:
            await msg.remove()

    except Exception as e:
        print(f"[Chainlit] Error during message processing: {e}")
        await cl.Message(content=f"⚠️ **Errore durante l'elaborazione**: {str(e)}").send()


@cl.action_callback("view_fundamentals")
async def on_view_fundamentals(action: cl.Action):
    ticker = getattr(action, "value", None) or (action.payload.get("ticker") if getattr(action, "payload", None) else "NVDA")
    await main(cl.Message(content=f"Mostrami i dati fondamentali approfonditi e i bilanci per {ticker}."))


@cl.action_callback("view_chart")
async def on_view_chart(action: cl.Action):
    ticker = getattr(action, "value", None) or (action.payload.get("ticker") if getattr(action, "payload", None) else "NVDA")
    await main(cl.Message(content=f"Genera il grafico candlestick e l'analisi tecnica per {ticker}."))


@cl.action_callback("view_sentiment")
async def on_view_sentiment(action: cl.Action):
    ticker = getattr(action, "value", None) or (action.payload.get("ticker") if getattr(action, "payload", None) else "NVDA")
    await main(cl.Message(content=f"Qual è il sentiment delle notizie e l'impatto catalizzatori per {ticker}?"))


@cl.action_callback("view_forensic")
async def on_view_forensic(action: cl.Action):
    ticker = getattr(action, "value", None) or (action.payload.get("ticker") if getattr(action, "payload", None) else "NVDA")
    await main(cl.Message(content=f"Mostrami l'analisi forense contabile SEC EDGAR e i rischi di bilancio per {ticker}."))

