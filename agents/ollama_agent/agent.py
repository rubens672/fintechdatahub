from dotenv import load_dotenv
from google.adk.agents import Agent
from google.adk.models.lite_llm import LiteLlm
from google.adk.tools.google_search_tool import google_search
from duckduckgo_search import DDGS
import os
import logging

try:
    from .retry import GENERATE_CONTENT_CONFIG, NewsItem
except ImportError:
    from retry import GENERATE_CONTENT_CONFIG, NewsItem

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
        query: La parola chiave o frase di ricerca (es. 'geopolitica agosto 2026').
    """
    try:
        with DDGS() as ddgs:
            # 1° tentativo: ricerca con la query inviata dal modello
            results = list(ddgs.text(query, max_results=5))
            
            # 2° tentativo (Fallback): se la ricerca esatta fallisce, pulisci la query
            if not results:
                words = [w for w in query.split() if w.lower() not in ["notizie", "notizia", "ultime", "importanti", "della", "del", "di", "ed"]]
                cleaned_query = " ".join(words).strip()
                if cleaned_query and cleaned_query != query:
                    results = list(ddgs.text(cleaned_query, max_results=5))

            if not results:
                return "Nessun risultato trovato sul web per la ricerca indicata."

            snippets = []
            for r in results:
                snippets.append(f"Titolo: {r.get('title')}\nLink: {r.get('href')}\nContenuto: {r.get('body')}")
            return "\n\n".join(snippets)
    except Exception as e:
        return f"Errore durante la ricerca web: {e}"

SYSTEM_INSTRUCTION = """
Agisci come un analista internazionale geopolitico e data entry specializzato.

IL TUO COMPITO:
Cerca e sintetizza le notizie più importanti ed essenziali di rilevanza globale accadute nel mondo.

REGOLE RIGIDE SULL'ATTRIBUZIONE TEMPORALE E SULLE DATE:
1. PRECISIONE DELLA DATA: Presta la massima attenzione all'attribuzione della data esatta di accadimento di ciascun evento. A causa della complessità della sintesi dei dati, eventi importanti che generano discussioni o sviluppi per più giorni rischiano a volte di essere posizionati in una data imprecisa rispetto al loro momento esatto di accadimento. EVITA TASSATIVAMENTE tale errore!
2. COERENZA TEMPORALE: Assicurati che ogni notizia inserita nel JSON appartenga in modo rigoroso alla data esatta richiesta. Se un evento principale è accaduto in giorni diversi, evita di attribuirlo alla data errata e fornisci invece altre notizie rilevanti ed effettivamente accadute o battute in quella data esatta!
3. SELEZIONE DATA:
   - Se l'utente SPECIFICA una data nel messaggio (es. "1 agosto 2026"), filtra e seleziona esclusivamente notizie riferite a quella data esatta.
   - Se l'utente NON specifica alcuna data, seleziona notizie riferite alla giornata odierna.

REQUISITI DI ESTRAZIONE E CONTENUTO:
1. Estrai almeno 3-5 notizie di rilevanza globale per la data o il periodo richiesto.
2. Mantieni un tono di scrittura neutro, giornalistico ed oggettivo.
3. Rispondi in lingua italiana.

STRUTTURA DEI DATI E LIMITI (JSON):
Restituisci i dati strutturati secondo i seguenti vincoli di campo per ciascuna notizia:
- id: Identificativo numerico progressivo univoco (es. 1, 2, 3...).
- published_at: Data e ora di pubblicazione della notizia nel formato ISO 8601 con offset fuso orario (es. YYYY-MM-DDTHH:MM:SS+02:00, rispecchiando esattamente la data indicata dall'utente o della notizia).
- title: Titolo chiaro ed esaustivo della notizia (TASSATIVAMENTE massimo 255 caratteri).
- summary: Sintesi breve per anteprima o feed REST rapido (TASSATIVAMENTE massimo 500 caratteri).
- content: Corpo completo dell'articolo con tutti i dettagli e il contesto della notizia.
- source: Nome della fonte o agenzia di stampa (es. Reuters, ANSA, BBC, AP).

REGOLE RIGIDE SULL'OUTPUT:
Restituisci l'output ESCLUSIVAMENTE come un blocco di codice JSON formattato in questo modo:
```json
[
  {
    "id": 1,
    "published_at": "YYYY-MM-DDTHH:MM:SS+02:00",
    "title": "Titolo...",
    "summary": "Sintesi...",
    "content": "Contenuto...",
    "source": "Fonte..."
  }
]
```
Non inserire alcun testo introduttivo, salutare o conclusivo prima o dopo il blocco ```json.
# MANDATORY: rispondi in italiano.
"""

#il modello ha  contezza delle notizie fino a giugno 2024
root_agent = Agent(
    name="ollama_agent",
    model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
    #model=LiteLlm(model="ollama_chat/gemma3:4b-it-q8_0"),
    #model=LiteLlm(model="ollama_chat/gemma4:e2b"),
    generate_content_config=GENERATE_CONTENT_CONFIG,
    instruction=SYSTEM_INSTRUCTION,
    description="Ollama agent",
    after_model_callback=token_cost_callback,
    # tools=[web_search], # Rimosso per risposte istantanee basate sul modello
)

logger.info("ollama_agent created")