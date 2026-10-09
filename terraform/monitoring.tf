# ==============================================================================
# monitoring.tf — Google Cloud Monitoring & Osservabilità Colli di Bottiglia
# ==============================================================================
# Codifica dichiarativa e replicabile dell'infrastruttura di osservabilità
# per Google Managed Service for Prometheus (GMP) e Google Cloud Trace.
# Registrazione interna degli incidenti a costo 0,00 €.
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. Dashboard Unificata Google Cloud Monitoring per i Colli di Bottiglia
# ------------------------------------------------------------------------------
resource "google_monitoring_dashboard" "platform_bottlenecks" {
  count          = var.enable_monitoring_observability ? 1 : 0
  project        = var.project_id
  dashboard_json = file("${path.module}/dashboards/platform_bottlenecks.json")
}

# ------------------------------------------------------------------------------
# 2. Alerting Policy PromQL: Saturazione del Rate Limiter eToro (Resilience4j)
# ------------------------------------------------------------------------------
resource "google_monitoring_alert_policy" "etoro_ratelimit_alert" {
  count        = var.enable_monitoring_observability && var.enable_monitoring_alerts ? 1 : 0
  project      = var.project_id
  display_name = "ALERT: eToro API Rate Limiter Contention"
  combiner     = "OR"

  conditions {
    display_name = "Resilience4j Waiting Threads > 0"
    condition_prometheus_query_language {
      query               = "sum(resilience4j_ratelimiter_waiting_threads{name=\"etoroApi\"}) > 0"
      duration            = "60s"
      evaluation_interval = "30s"
    }
  }

  notification_channels = []

  documentation {
    content   = "Le chiamate verso eToro superano la quota di 10 req/s con thread in attesa nel rate-limiter. Verificare il carico o scaglionare i cronjob."
    mime_type = "text/markdown"
  }
}

# ------------------------------------------------------------------------------
# 3. Alerting Policy PromQL: Latenza Anomala API eToro Outbound (p95 > 2.5s)
# ------------------------------------------------------------------------------
resource "google_monitoring_alert_policy" "etoro_latency_alert" {
  count        = var.enable_monitoring_observability && var.enable_monitoring_alerts ? 1 : 0
  project      = var.project_id
  display_name = "ALERT: eToro Outbound API High Latency"
  combiner     = "OR"

  conditions {
    display_name = "eToro Outbound HTTP p95 Latency > 2.5s"
    condition_prometheus_query_language {
      query               = "histogram_quantile(0.95, sum(rate(http_client_requests_seconds_bucket[5m])) by (le)) > 2.5"
      duration            = "120s"
      evaluation_interval = "30s"
    }
  }

  notification_channels = []

  documentation {
    content   = "La latenza di risposta delle API pubbliche eToro supera i 2.5 secondi. Possibile degradazione del broker o congestione di rete."
    mime_type = "text/markdown"
  }
}

# ------------------------------------------------------------------------------
# 4. Alerting Policy PromQL: Freeze JVM da Pause di Garbage Collection (> 300ms)
# ------------------------------------------------------------------------------
resource "google_monitoring_alert_policy" "jvm_gc_freeze_alert" {
  count        = var.enable_monitoring_observability && var.enable_monitoring_alerts ? 1 : 0
  project      = var.project_id
  display_name = "ALERT: JVM High Garbage Collection Pause Duration"
  combiner     = "OR"

  conditions {
    display_name = "JVM GC Average Pause > 300ms"
    condition_prometheus_query_language {
      query               = "(sum(rate(jvm_gc_pause_seconds_sum[5m])) / sum(rate(jvm_gc_pause_seconds_count[5m]))) > 0.3"
      duration            = "120s"
      evaluation_interval = "30s"
    }
  }

  notification_channels = []

  documentation {
    content   = "Pause di Garbage Collection prolungate nella JVM (>300ms). Rischio freeze temporaneo del motore di esecuzione ordini."
    mime_type = "text/markdown"
  }
}

# ------------------------------------------------------------------------------
# 5. Alerting Policy PromQL: Latenza FastAPI Cockpit Web (p99 > 2.0s)
# ------------------------------------------------------------------------------
resource "google_monitoring_alert_policy" "cockpit_latency_alert" {
  count        = var.enable_monitoring_observability && var.enable_monitoring_alerts ? 1 : 0
  project      = var.project_id
  display_name = "ALERT: FastAPI Cockpit Web Latency High"
  combiner     = "OR"

  conditions {
    display_name = "FastAPI Request p99 Latency > 2.0s"
    condition_prometheus_query_language {
      query               = "histogram_quantile(0.99, sum(rate(fastapi_requests_duration_seconds_bucket[5m])) by (le)) > 2.0"
      duration            = "120s"
      evaluation_interval = "30s"
    }
  }

  notification_channels = []

  documentation {
    content   = "Latenza elevata delle API FastAPI del Cockpit (>2.0s). Possibile blocco CPU sincrono nell'event loop o contesa I/O."
    mime_type = "text/markdown"
  }
}
