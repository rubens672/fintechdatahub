import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Workspace Root Paths for in-process container imports
MODULE_DIR = Path(__file__).resolve().parent
WORKSPACE_ROOT = MODULE_DIR.parent

# Sibling modules for ADK Agent and 32 MCP Tools
EODHD_AGENT_DIR = WORKSPACE_ROOT / "eodhd-agent"
FINANCIAL_MCP_DIR = WORKSPACE_ROOT / "financial-mcp-server"
FINANCIAL_MCP_SRC = FINANCIAL_MCP_DIR / "src"

# Ensure sibling directories are on sys.path for in-process execution
for path_to_add in [
    str(FINANCIAL_MCP_SRC),
    str(EODHD_AGENT_DIR),
    str(WORKSPACE_ROOT),
    str(FINANCIAL_MCP_DIR),
]:
    if path_to_add not in sys.path:
        sys.path.insert(0, path_to_add)

# Configuration Variables
MODEL_NAME = os.getenv("MODEL", os.getenv("GEMINI_MODEL", "gemini-3.6-flash"))
GOOGLE_CLOUD_PROJECT = os.getenv("GOOGLE_CLOUD_PROJECT", "fintech-data-hub-75428")
GOOGLE_CLOUD_LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
ENABLE_PLOTLY_CHARTS = os.getenv("ENABLE_PLOTLY_CHARTS", "true").lower() == "true"
