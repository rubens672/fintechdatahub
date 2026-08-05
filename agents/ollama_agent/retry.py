"""Gemini retry config for handling 429 rate limits and transient errors.

Il modello pay-as-you-go utilizza la quota condivisa dinamica, quindi gli errori 429 possono verificarsi quando il pool condiviso è occupato. 
Sono necessari tentativi a livello di applicazione (l'SDK non li abilita per impostazione predefinita). 
Passa `generate_content_config=GENERATE_CONTENT_CONFIG` a ogni agente in modo che ogni chiamata al modello tenti con un backoff esponenziale prima di rinunciare.
"""

from google.genai import types
from pydantic import BaseModel, Field
from typing import List

class NewsItem(BaseModel):
    id: int = Field(description="Identificativo numerico progressivo univoco (es. 1, 2, 3...)")
    published_at: str = Field(description="Data e ora di pubblicazione nel formato ISO 8601 con offset fuso orario (es. 2026-08-03T14:30:00+02:00)")
    title: str = Field(description="Titolo chiaro ed esaustivo della notizia (massimo 255 caratteri)")
    summary: str = Field(description="Sintesi breve per anteprima o feed REST rapido (massimo 500 caratteri)")
    content: str = Field(description="Corpo completo dell'articolo con tutti i dettagli e il contesto della notizia")
    source: str = Field(description="Nome della fonte o agenzia di stampa (es. Reuters, ANSA, BBC, AP)")

RETRY_CONFIG = types.HttpRetryOptions(
    attempts=3,
    exp_base=2,
    initial_delay=5,
    http_status_codes=[429, 500, 503, 504],
)

GENERATE_CONTENT_CONFIG = types.GenerateContentConfig(
    http_options=types.HttpOptions(
        retry_options=RETRY_CONFIG,
        timeout=120_000,  # 120 second timeout for model calls
    ),
)