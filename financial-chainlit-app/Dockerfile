# ==========================================
# Production Dockerfile for AI Financial Copilot (Chainlit) on GCP Cloud Run
# ==========================================
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies & uv
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir uv


# Copy project files & sibling modules
COPY financial-mcp-server /app/financial-mcp-server
COPY eodhd-agent /app/eodhd-agent
COPY financial-chainlit-app /app/financial-chainlit-app

WORKDIR /app/financial-chainlit-app

# Set Python path for sibling module resolution
ENV PYTHONPATH="/app/financial-mcp-server/src:/app/eodhd-agent:/app/financial-chainlit-app:/app"
ENV PORT=8080
ENV HOST=0.0.0.0

# Install dependencies with uv
RUN uv pip install --system \
    chainlit \
    plotly \
    pandas \
    yfinance \
    feedparser \
    beautifulsoup4 \
    python-dotenv \
    pydantic \
    google-cloud-firestore \
    google-genai \
    google-adk \
    "mcp>=1.3.0"

# Expose standard Cloud Run port
EXPOSE 8080

# Run Chainlit on Cloud Run $PORT
CMD ["chainlit", "run", "app.py", "--host", "0.0.0.0", "--port", "8080", "--headless"]
