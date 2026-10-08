# ==============================================================================
# cloud_scheduler.tf — I 6 Cron Job di Google Cloud Scheduler
# ==============================================================================
# Google Cloud Scheduler è il gestore serverless di attività pianificate di GCP.
# Tutti i cron sono rigorosamente configurati su fuso 'America/New_York'
# per sincronizzarsi al minuto con gli orari ufficiali di Wall Street (NYSE / NASDAQ),
# rimanendo immuni a discrepanze dovute al cambio dell'ora legale (DST Gap).
#
# DIDATTICA:
# I job effettuano chiamate HTTP POST protette verso i servizi Cloud Run,
# allegando un token OIDC firmato crittograficamente da Google tramite
# il Service Account 'etoro-scheduler-invoker'.
# ==============================================================================

locals {
  wall_street_tz = "America/New_York"
}

# ------------------------------------------------------------------------------
# 1. Opening Shield Widen (09:10 NY / 15:10 IT — 20 minuti prima dell'apertura)
# ------------------------------------------------------------------------------
# Allarga temporaneamente lo Stop Loss a -10% per prevenire lo stop-hunting della campana iniziale
resource "google_cloud_scheduler_job" "opening_shield_widen" {
  count       = (var.enable_cloud_scheduler && var.enable_cloud_run_deploy) ? 1 : 0
  name        = "etoro-opening-shield-widen"
  description = "Allarga lo Stop Loss a -10% alle 9:10 NY (15:10 IT) per evitare la caccia agli stop all'apertura di Wall Street con ampio margine"
  schedule    = "10 9 * * 1-5"
  time_zone   = local.wall_street_tz
  region      = var.region
  project     = var.project_id

  http_target {
    http_method = "POST"
    uri         = "${local.active_etoro_url}/api/scheduler/opening-shield?action=widen&account=${var.etoro_account_mode}"

    oidc_token {
      service_account_email = google_service_account.scheduler_sa.email
      audience              = local.active_etoro_url
    }
  }

  depends_on = [
    google_project_service.gcp_services["cloudscheduler.googleapis.com"],
    google_cloud_run_v2_service.etoro_service_springboot
  ]
}

# ------------------------------------------------------------------------------
# 2. Opening Shield Restore (10:00 NY / 16:00 IT — 30 minuti dopo l'apertura)
# ------------------------------------------------------------------------------
# Ripristina fedelmente lo Stop Loss quantitativo dinamico salvato su Firestore a book disteso
resource "google_cloud_scheduler_job" "opening_shield_restore" {
  count       = (var.enable_cloud_scheduler && var.enable_cloud_run_deploy) ? 1 : 0
  name        = "etoro-opening-shield-restore"
  description = "Ripristina lo Stop Loss quantitativo alle 10:00 NY (16:00 IT) a mercati distesi e spread normalizzati"
  schedule    = "00 10 * * 1-5"
  time_zone   = local.wall_street_tz
  region      = var.region
  project     = var.project_id

  http_target {
    http_method = "POST"
    uri         = "${local.active_etoro_url}/api/scheduler/opening-shield?action=restore&account=${var.etoro_account_mode}"

    oidc_token {
      service_account_email = google_service_account.scheduler_sa.email
      audience              = local.active_etoro_url
    }
  }

  depends_on = [
    google_project_service.gcp_services["cloudscheduler.googleapis.com"],
    google_cloud_run_v2_service.etoro_service_springboot
  ]
}

# ------------------------------------------------------------------------------
# 3. Break-Even Guardian (Ogni 5 minuti a mercati distesi — 10:00-16:00 NY / 16:00-22:00 IT)
# ------------------------------------------------------------------------------
# Monitora le posizioni attive: quando Tranche 1 tocca T1, sposta Tranche 2 a Break-Even
resource "google_cloud_scheduler_job" "breakeven_guardian" {
  count       = (var.enable_cloud_scheduler && var.enable_cloud_run_deploy) ? 1 : 0
  name        = "etoro-breakeven-guardian"
  description = "Sposta lo Stop Loss della Tranche 2 a Break-Even a mercati distesi post-Opening Shield (10:00-16:00 NY / 16:00-22:00 IT)"
  schedule    = "*/5 10-16 * * 1-5"
  time_zone   = local.wall_street_tz
  region      = var.region
  project     = var.project_id

  http_target {
    http_method = "POST"
    uri         = "${local.active_etoro_url}/api/scheduler/breakeven-guardian?account=${var.etoro_account_mode}"

    oidc_token {
      service_account_email = google_service_account.scheduler_sa.email
      audience              = local.active_etoro_url
    }
  }

  depends_on = [
    google_project_service.gcp_services["cloudscheduler.googleapis.com"],
    google_cloud_run_v2_service.etoro_service_springboot
  ]
}

# ------------------------------------------------------------------------------
# 4. SEC EDGAR Sync Watcher (Ogni 2 ore nei giorni di Wall Street — 09:00-18:00 NY)
# ------------------------------------------------------------------------------
# Rileva e vettorizza in tempo reale nuovi bilanci Form 10-K, 10-Q e 8-K
resource "google_cloud_scheduler_job" "sec_edgar_sync" {
  count       = (var.enable_cloud_scheduler && var.enable_cloud_run_deploy) ? 1 : 0
  name        = "sec-edgar-sync-watcher"
  description = "Rileva in tempo reale nuovi bilanci 10-K, 10-Q e 8-K depositati sul feed SEC EDGAR e attiva la vettorizzazione su Firestore"
  schedule    = "0 */2 9-18 * 1-5"
  time_zone   = local.wall_street_tz
  region      = var.region
  project     = var.project_id

  http_target {
    http_method = "POST"
    uri         = "${google_cloud_run_v2_service.edgar_app[0].uri}/api/sec/sync-feed"

    oidc_token {
      service_account_email = google_service_account.scheduler_sa.email
      audience              = google_cloud_run_v2_service.edgar_app[0].uri
    }
  }

  depends_on = [
    google_project_service.gcp_services["cloudscheduler.googleapis.com"],
    google_cloud_run_v2_service.edgar_app
  ]
}

# ------------------------------------------------------------------------------
# 5. News Hub Continuous Ingestion (Ogni 15 minuti 24/7)
# ------------------------------------------------------------------------------
# Ingestione e cache warm-up continuo delle news finanziare per tempi di risposta sub-15ms
resource "google_cloud_scheduler_job" "news_hub_ingestion" {
  count       = (var.enable_cloud_scheduler && var.enable_cloud_run_deploy) ? 1 : 0
  name        = "news-hub-continuous-ingestion"
  description = "Ingestione continua automatica e warm-up delle notizie per FintechDataHub (sub-15ms e dati costantemente aggiornati)"
  schedule    = "*/15 * * * *"
  time_zone   = local.wall_street_tz
  region      = var.region
  project     = var.project_id
  attempt_deadline = "320s"

  http_target {
    http_method = "POST"
    uri         = "${google_cloud_run_v2_service.user_web[0].uri}/api/hub/refresh"

    oidc_token {
      service_account_email = google_service_account.scheduler_sa.email
      audience              = google_cloud_run_v2_service.user_web[0].uri
    }
  }

  depends_on = [
    google_project_service.gcp_services["cloudscheduler.googleapis.com"],
    google_cloud_run_v2_service.user_web
  ]
}

# ------------------------------------------------------------------------------
# 6. Alpha Harvest Portfolio Reviewer (10:30 NY / 16:30 IT — Goldilocks Window)
# ------------------------------------------------------------------------------
# Esegue la diagnosi clinica a 5 fasi su tutte le posizioni mature (holding days >= 8)
resource "google_cloud_scheduler_job" "alpha_harvest_scan" {
  count       = (var.enable_cloud_scheduler && var.enable_cloud_run_deploy) ? 1 : 0
  name        = "alpha-harvest-portfolio-scan"
  description = "Esegue la scansione autonoma di portfolio exit review alle 10:30 NY (16:30 IT) per il ricircolo del capitale"
  schedule    = "30 10 * * 1-5"
  time_zone   = local.wall_street_tz
  region      = var.region
  project     = var.project_id

  http_target {
    http_method = "POST"
    uri         = "${length(google_cloud_run_v2_service.alpha_harvest_agent) > 0 ? google_cloud_run_v2_service.alpha_harvest_agent[0].uri : ""}/api/harvest/scan-portfolio?account=${var.etoro_account_mode}"

    oidc_token {
      service_account_email = google_service_account.scheduler_sa.email
      audience              = length(google_cloud_run_v2_service.alpha_harvest_agent) > 0 ? google_cloud_run_v2_service.alpha_harvest_agent[0].uri : ""
    }
  }

  depends_on = [
    google_project_service.gcp_services["cloudscheduler.googleapis.com"],
    google_cloud_run_v2_service.alpha_harvest_agent
  ]
}

