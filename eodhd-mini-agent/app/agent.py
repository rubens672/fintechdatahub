# ruff: noqa
# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import os
import sys
from pathlib import Path

from google.adk.agents import Agent
from google.adk.apps import App
from google.adk.models import Gemini
from google.adk.tools import McpToolset
from google.adk.tools.mcp_tool.mcp_session_manager import (
    StdioConnectionParams,
    StreamableHTTPConnectionParams,
)
from google.genai import types
from mcp import StdioServerParameters

MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.6-flash")

# Paths for Custom Financial MCP Server
WORKSPACE_ROOT = Path(__file__).resolve().parents[2]
FINANCIAL_SERVER_DIR = WORKSPACE_ROOT / "financial-mcp-server"
PYTHON_BIN = FINANCIAL_SERVER_DIR / ".venv" / "bin" / "python"
if not PYTHON_BIN.exists():
    PYTHON_BIN = Path(sys.executable)

# 1. Custom Financial MCP Toolset (100% Native - Zero External Subscription Cost)
custom_toolset = McpToolset(
    connection_params=StdioConnectionParams(
        server_params=StdioServerParameters(
            command=str(PYTHON_BIN),
            args=["-m", "financial_mcp_server.server", "--transport", "stdio"],
            cwd=str(FINANCIAL_SERVER_DIR),
            env=dict(os.environ),
        ),
        timeout=30.0,
    ),
    tool_filter=[
        "get_bulk_fundamentals",
        "get_fundamentals_data",
        "get_company_news",
        "get_sentiment_data",
        "get_earnings_trends",
        "get_insider_transactions",
        "get_historical_stock_prices",
        "get_technical_indicators",
        "get_support_resistance_levels",
        "stock_screener",
        "get_macro_indicator",
        "get_economic_events",
        "get_ust_yield_rates",
        "get_ust_bill_rates",
        "get_live_price_data",
        "get_us_live_extended_quotes",
        "get_intraday_historical_data",
        "get_stocks_from_search",
        "resolve_ticker",
        "get_exchanges_list",
        "get_exchange_details",
        "get_historical_dividends",
        "get_historical_splits",
        "get_historical_market_cap",
        "get_upcoming_earnings",
        "get_upcoming_ipos",
        "get_historical_commodity_prices",
        "get_congressional_trades",
        "get_us_options_contracts",
        "get_us_options_eod",
        "get_sec_forensic_scores",
        "query_sec_rag_filings",
        "system_health_check",
    ],
)

root_agent = Agent(
    name="root_agent",
    model=Gemini(
        model=MODEL,
        retry_options=types.HttpRetryOptions(attempts=5),
    ),
    instruction=(
        "You are the Chief Financial Intelligence AI Assistant powered by a 100% native, self-hosted Financial MCP Server.\n"
        "All fundamental analysis, live prices, intraday series, corporate actions, technical indicators, macroeconomic data (FRED), "
        "Treasury yield curves, commodities, congressional disclosures, and US options with Greeks are powered locally at zero external cost.\n"
        "CRITICAL RESPONSE GUIDELINES:\n"
        "1. ALWAYS immediately present a rich, comprehensive, and well-structured response in the chat after tool execution. "
        "Use markdown tables, key metrics, technical pivot tables, valuation ratios, and clear bulleted takeaways. Never stop silently after calling tools.\n"
        "2. If the user writes or prompts in Italian, always respond in fluent Italian.\n"
        "3. NEVER fabricate data: If any tool call returns an error or no data, never make up numbers or simulate data."
    ),
    tools=[custom_toolset],
)

app = App(
    root_agent=root_agent,
    name="app",
)
