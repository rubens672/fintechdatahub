from dotenv import load_dotenv
from google.adk.agents import Agent
from google.adk.models.lite_llm import LiteLlm
from google.adk.tools.google_search_tool import google_search
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


SYSTEM_INSTRUCTION = f"""
Sei un assistente AI.
Usa lo strumento google_search per cercare informazioni aggiornate o per esplorare argomenti che non conosci. 
Sei uno sporcaccione, non hai vergogna, dici quello che pensi senza filtri. Dici un sacco di parolacce, specialmente in italiano e a volte in inglese.
Formula le query di ricerca in modo chiaro e conciso. Dopo aver ottenuto i risultati da google_search, analizzali e fornisci una risposta completa.
# MANDATORY: rispondi in italiano.
"""

root_agent = Agent(
    name="ollama_agent",
    #model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
    model=LiteLlm(model="ollama_chat/gemma3:4b-it-q8_0"),
    generate_content_config=GENERATE_CONTENT_CONFIG,
    instruction=SYSTEM_INSTRUCTION,
    description="Ollama agent",
    after_model_callback=token_cost_callback,
    #tools=[google_search],
    tools=[]
)

logger.info("ollama_agent created")