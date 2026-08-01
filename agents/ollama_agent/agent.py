from dotenv import load_dotenv
from google.adk.agents import Agent
from google.adk.models.lite_llm import LiteLlm
from google.adk.tools.google_search_tool import google_search
from duckduckgo_search import DDGS
import os
import logging

try:
    from .retry import GENERATE_CONTENT_CONFIG
except ImportError:
    from retry import GENERATE_CONTENT_CONFIG

load_dotenv()

logger = logging.getLogger("ollama_agent")

# ── Prezzi Gemini 2.5 Flash ($ per 1M token) ─────────────────────────────────
# Aggiorna questi valori se cambi modello
# https://cloud.google.com/vertex-ai/generative-ai/pricing
PRICE_INPUT_PER_1M  = 0.075   # $ per 1M token in input
PRICE_OUTPUT_PER_1M = 0.30    # $ per 1M token in output

# Accumulatore di sessione
_session_totals = {"input": 0, "output": 0, "cost": 0.0, "calls": 0}


def token_cost_callback(callback_context, llm_response):
    """Logga token usati e costo stimato dopo ogni chiamata al modello."""
    usage = getattr(llm_response, "usage_metadata", None)
    if usage is None:
        # LiteLLM (Ollama) non ha usage_metadata → nessun costo
        logger.info("[TOKEN] Modello locale (Ollama) — costo: $0.00")
        return None  # non modificare la risposta

    prompt_tokens    = getattr(usage, "prompt_token_count", 0) or 0
    response_tokens  = getattr(usage, "candidates_token_count", 0) or 0
    total_tokens     = prompt_tokens + response_tokens

    cost = (prompt_tokens / 1_000_000 * PRICE_INPUT_PER_1M +
            response_tokens / 1_000_000 * PRICE_OUTPUT_PER_1M)

    # Aggiorna accumulatore di sessione
    _session_totals["input"]  += prompt_tokens
    _session_totals["output"] += response_tokens
    _session_totals["cost"]   += cost
    _session_totals["calls"]  += 1

    logger.info(
        f"[TOKEN] chiamata #{_session_totals['calls']} | "
        f"input={prompt_tokens} | output={response_tokens} | "
        f"totale={total_tokens} | costo_chiamata=${cost:.6f} | "
        f"costo_sessione=${_session_totals['cost']:.6f}"
    )
    return None  # non modificare la risposta


def web_search(query: str) -> str:
    """Cerca su internet tramite DuckDuckGo e restituisce i primi risultati.
    Args:
        query: Il testo o la parola chiave da cercare sul web.
    """
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=3))
            if not results:
                return "Nessun risultato trovato."
            snippets = []
            for r in results:
                snippets.append(f"Titolo: {r.get('title')}\nLink: {r.get('href')}\nContenuto: {r.get('body')}")
            return "\n\n".join(snippets)
    except Exception as e:
        return f"Errore durante la ricerca web: {e}"

SYSTEM_INSTRUCTION = f"""
Sei un assistente AI.
Usa lo strumento google_search per cercare informazioni aggiornate o per esplorare argomenti che non conosci. 
Formula le query di ricerca in modo chiaro e conciso. Dopo aver ottenuto i risultati da google_search, analizzali e fornisci una risposta completa.
# MANDATORY: rispondi in italiano.
"""

root_agent = Agent(
    name="ollama_agent",
    model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
    #model=LiteLlm(model="ollama_chat/gemma3:4b-it-q8_0"),
    #model=LiteLlm(model="ollama_chat/gemma4:e2b"),
    generate_content_config=GENERATE_CONTENT_CONFIG,
    instruction=SYSTEM_INSTRUCTION,
    description="Ollama agent",
    after_model_callback=token_cost_callback,
    tools=[google_search], # NOTE: Google search tool is not supported for model ollama_chat/gemma3:4b-it-q8_0
    #tools=[web_search] # Use the local web search tool provided by ADK
)

logger.info("ollama_agent created")