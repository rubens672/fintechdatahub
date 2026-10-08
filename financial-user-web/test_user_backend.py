"""Unit and Integration tests for Financial User Backend API."""

import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_health_endpoint():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "UP"
    assert data["mode"] == "READ_ONLY"
    assert data["service"] == "financial-user-web"


def test_market_regime():
    res = client.get("/api/market/regime")
    assert res.status_code == 200
    data = res.json()
    assert "vix" in data
    assert "regime" in data


def test_market_indices():
    res = client.get("/api/market/indices")
    assert res.status_code == 200
    data = res.json()
    assert "indices" in data
    assert len(data["indices"]) > 0


def test_workflow_runs_read():
    res = client.get("/api/workflow/runs")
    assert res.status_code == 200
    data = res.json()
    assert "runs" in data


def test_workflow_run_mutation_blocked():
    res = client.post("/api/workflow/run", json={"capital": 10000})
    assert res.status_code == 403
    assert "sola lettura" in res.json()["detail"].lower()


def test_quant_audit_apply_tuning_blocked():
    res = client.post("/api/quant-audit/apply-tuning", json={"regimes": {}})
    assert res.status_code == 403
    assert "sola lettura" in res.json()["detail"].lower()


def test_quant_audit_kpis():
    res = client.get("/api/quant-audit/kpis")
    assert res.status_code == 200
    data = res.json()
    assert "win_rate_pct" in data or "win_rate" in data


def test_hub_trending():
    res = client.get("/api/hub/trending")
    assert res.status_code == 200
    assert "trending" in res.json()


def test_docs_graph_design():
    res = client.get("/api/docs/graph-design")
    assert res.status_code == 200
    data = res.json()
    assert "content" in data


def test_docs_graph_design_view():
    res = client.get("/api/docs/graph-design/view")
    assert res.status_code == 200
    assert "text/html" in res.headers.get("content-type", "")
    assert "Metodologia" in res.text


def test_batch_sparklines():
    res = client.post(
        "/api/market/batch-sparklines",
        json={"symbols": ["AAPL", "NVDA"], "period": "1d", "interval": "5m"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "count" in data
    assert "AAPL" in data["items"]
    assert "NVDA" in data["items"]
    aapl = data["items"]["AAPL"]
    assert "price" in aapl
    assert "sparkline" in aapl
    assert isinstance(aapl["sparkline"], list)


def test_etoro_positions():
    res = client.get("/api/etoro/positions?mode=demo")
    assert res.status_code == 200
    data = res.json()
    assert "positions" in data
    assert "total" in data
    assert "symbols" in data
    assert isinstance(data["positions"], list)
    assert isinstance(data["symbols"], list)


def test_ws_market_stream():
    """Verifies that the /ws/market WebSocket endpoint accepts connections, sends INIT, and responds to ping/subscribe."""
    with client.websocket_connect("/ws/market") as ws:
        # 1. First message is CONNECTION_ESTABLISHED handshake frame
        init_frame = ws.receive_json()
        assert init_frame["type"] == "CONNECTION_ESTABLISHED"
        assert init_frame["status"] == "CONNECTED"
        assert "initial_prices" in init_frame
        assert "initial_positions" in init_frame
        assert "timestamp" in init_frame

        # 2. Test ping -> PONG
        ws.send_json({"action": "ping"})
        pong_frame = ws.receive_json()
        assert pong_frame["type"] == "PONG"
        assert "timestamp" in pong_frame

        # 3. Test subscribe -> SUBSCRIPTION_UPDATED
        ws.send_json({"action": "subscribe", "symbols": ["NVDA", "AAPL", "MSFT"]})
        sub_frame = ws.receive_json()
        assert sub_frame["type"] == "SUBSCRIPTION_UPDATED"
        assert "NVDA" in sub_frame["subscribed"]
        assert "AAPL" in sub_frame["subscribed"]


def test_etoro_orders_endpoint():
    res = client.get("/api/etoro/orders/test_run_123")
    assert res.status_code == 200
    data = res.json()
    assert "run_id" in data
    assert "has_executed" in data
    assert data["run_id"] == "test_run_123"




