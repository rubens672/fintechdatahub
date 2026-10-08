# ==========================================
# Multi-Stage Production Dockerfile for financial-user-web
# Stage 1: Build React SPA
# Stage 2: FastAPI Production Server & Services (Read-Only)
# ==========================================

# --- Stage 1: Frontend Build ---
FROM node:20-slim AS frontend-builder
WORKDIR /app
COPY financial-user-web/package.json financial-user-web/package-lock.json* ./
RUN npm install
COPY financial-user-web ./
RUN npm run build

# --- Stage 2: Python Runtime & Production Server ---
FROM python:3.12-slim
WORKDIR /app

# Install system dependencies & uv
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir uv


# Copy project sibling directories
COPY financial-mcp-server /app/financial-mcp-server
COPY eodhd-agent /app/eodhd-agent
COPY GRAPH_WORKFLOW_DESIGN.md /app/GRAPH_WORKFLOW_DESIGN.md
COPY financial-user-web/backend /app/backend
COPY --from=frontend-builder /app/dist /app/dist

# Set Python path
ENV PYTHONPATH="/app/financial-mcp-server/src:/app/eodhd-agent:/app"
ENV PORT=8080
ENV HOST=0.0.0.0

# Install dependencies
RUN uv pip install --system \
    fastapi \
    uvicorn[standard] \
    pydantic \
    yfinance \
    google-cloud-firestore \
    httpx \
    "mcp>=1.3.0" \
    python-dotenv \
    google-genai \
    google-adk \
    feedparser \
    beautifulsoup4 \
    pandas \
    numpy

# Expose standard Cloud Run port
EXPOSE 8080

# Run FastAPI production server
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8080"]
