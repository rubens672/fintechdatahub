# ==============================================================================
# cloud_run.tf — Definizione degli 8 Microservizi Serverless su Cloud Run (v2)
# ==============================================================================
# Google Cloud Run è la piattaforma serverless container-based di GCP:
# scala automaticamente da zero fino al massimo configurato in base al traffico,
# azzerando i costi computazionali quando il sistema è inattivo.
# ==============================================================================

locals {
  # Base URI delle immagini in Artifact Registry
  image_base = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_repository_id}"

  # Variabili d'ambiente standard condivise dalla maggior parte dei microservizi
  common_env = [
    { name = "GOOGLE_CLOUD_PROJECT", value = var.project_id },
    { name = "GCP_PROJECT", value = var.project_id },
    { name = "FIRESTORE_DATABASE", value = var.firestore_database_id },
    { name = "GOOGLE_CLOUD_LOCATION", value = var.region },
    { name = "GOOGLE_GENAI_USE_VERTEXAI", value = "true" },
    { name = "GEMINI_MODEL", value = var.gemini_model },
    { name = "MODEL", value = var.gemini_model }
  ]

  # URL dell'engine eToro attivo (financial-etoro-service Java 21 / Spring Boot 3)
  active_etoro_url = (
    var.enable_cloud_run_deploy && var.enable_etoro_springboot_deploy && length(google_cloud_run_v2_service.etoro_service_springboot) > 0
    ? google_cloud_run_v2_service.etoro_service_springboot[0].uri
    : ""
  )
}

# ------------------------------------------------------------------------------
# 1. Microservizio: financial-cockpit-web (UI Operativa Pro + Backend FastAPI)
# ------------------------------------------------------------------------------
resource "google_cloud_run_v2_service" "cockpit_web" {
  count               = var.enable_cloud_run_deploy ? 1 : 0
  name                = "financial-cockpit-web"
  location            = var.region
  project             = var.project_id
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false

  template {
    service_account = google_service_account.cloudrun_sa.email
    timeout         = "300s"

    scaling {
      min_instance_count = 0
      max_instance_count = 2
    }

    containers {
      image = "${local.image_base}/financial-cockpit-web:${var.image_tag}"

      resources {
        limits = {
          cpu    = "1"
          memory = "1Gi"
        }
        cpu_idle = true
      }

      ports {
        container_port = 8080
      }

      dynamic "env" {
        for_each = local.common_env
        content {
          name  = env.value.name
          value = env.value.value
        }
      }

      # Routing verso il microservizio eToro attivo (Python o Java Spring Boot)
      env {
        name  = "ETORO_CLIENT_URL"
        value = local.active_etoro_url
      }

      # Routing verso il microservizio Alpha Harvest Agent (Autonomous Exit Reviewer)
      env {
        name  = "ALPHA_HARVEST_URL"
        value = length(google_cloud_run_v2_service.alpha_harvest_agent) > 0 ? google_cloud_run_v2_service.alpha_harvest_agent[0].uri : ""
      }

      # Routing verso il microservizio SEC EDGAR App
      env {
        name  = "EDGAR_APP_URL"
        value = length(google_cloud_run_v2_service.edgar_app) > 0 ? google_cloud_run_v2_service.edgar_app[0].uri : ""
      }
    }
  }

  depends_on = [
    google_project_service.gcp_services["run.googleapis.com"],
    google_artifact_registry_repository.docker_repo,
    google_firestore_database.database
  ]

  lifecycle {
    ignore_changes = [scaling, client, client_version]
  }
}

# ------------------------------------------------------------------------------
# 2. Microservizio: financial-user-web (Portale Pubblico Read-Only)
# ------------------------------------------------------------------------------
resource "google_cloud_run_v2_service" "user_web" {
  count               = var.enable_cloud_run_deploy ? 1 : 0
  name                = "financial-user-web"
  location            = var.region
  project             = var.project_id
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false

  template {
    service_account = google_service_account.cloudrun_sa.email
    timeout         = "300s"

    scaling {
      min_instance_count = 0
      max_instance_count = 2
    }

    containers {
      image = "${local.image_base}/financial-user-web:${var.image_tag}"

      resources {
        limits = {
          cpu    = "1"
          memory = "1Gi"
        }
        cpu_idle = true
      }

      ports {
        container_port = 8080
      }

      dynamic "env" {
        for_each = local.common_env
        content {
          name  = env.value.name
          value = env.value.value
        }
      }

      # Routing verso il microservizio eToro attivo (Python o Java Spring Boot)
      env {
        name  = "ETORO_CLIENT_URL"
        value = local.active_etoro_url
      }

      env {
        name = "ETORO_PUBLIC_KEY"
        value_source {
          secret_key_ref {
            secret  = "etoro-public-key"
            version = "latest"
          }
        }
      }

      env {
        name = "ETORO_PRIVATE_KEY"
        value_source {
          secret_key_ref {
            secret  = "etoro-private-key"
            version = "latest"
          }
        }
      }
    }
  }

  depends_on = [
    google_project_service.gcp_services["run.googleapis.com"],
    google_artifact_registry_repository.docker_repo
  ]

  lifecycle {
    ignore_changes = [scaling, client, client_version]
  }
}

# Rende financial-user-web accessibile pubblicamente (Read-Only)
resource "google_cloud_run_v2_service_iam_member" "user_web_public" {
  count    = var.enable_cloud_run_deploy ? 1 : 0
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.user_web[0].name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ------------------------------------------------------------------------------
# 3. Microservizio: financial-chainlit-app (Chat Conversazionale Interattiva)
# ------------------------------------------------------------------------------
resource "google_cloud_run_v2_service" "chainlit_app" {
  count               = var.enable_cloud_run_deploy ? 1 : 0
  name                = "financial-chainlit-app"
  location            = var.region
  project             = var.project_id
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false

  template {
    service_account = google_service_account.cloudrun_sa.email
    timeout         = "300s"

    scaling {
      min_instance_count = 0
      max_instance_count = 2
    }

    containers {
      image = "${local.image_base}/financial-chainlit-app:${var.image_tag}"

      resources {
        limits = {
          cpu    = "1"
          memory = "1Gi"
        }
        cpu_idle = true
      }

      ports {
        container_port = 8080
      }

      dynamic "env" {
        for_each = local.common_env
        content {
          name  = env.value.name
          value = env.value.value
        }
      }
    }
  }

  depends_on = [
    google_project_service.gcp_services["run.googleapis.com"],
    google_artifact_registry_repository.docker_repo
  ]

  lifecycle {
    ignore_changes = [scaling, client, client_version]
  }
}

# ------------------------------------------------------------------------------
# 4. Microservizio: financial-mcp-server (Custom MCP Server a 34 Tool Nativi)
# ------------------------------------------------------------------------------
resource "google_cloud_run_v2_service" "mcp_server" {
  count               = var.enable_cloud_run_deploy ? 1 : 0
  name                = "financial-mcp-server"
  location            = var.region
  project             = var.project_id
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false

  template {
    service_account = google_service_account.cloudrun_sa.email
    timeout         = "300s"

    scaling {
      min_instance_count = 0
      max_instance_count = 2
    }

    containers {
      image = "${local.image_base}/financial-mcp-server:${var.image_tag}"

      resources {
        limits = {
          cpu    = "1"
          memory = "1Gi"
        }
        cpu_idle = true
      }

      ports {
        container_port = 8080
      }

      dynamic "env" {
        for_each = local.common_env
        content {
          name  = env.value.name
          value = env.value.value
        }
      }
    }
  }

  depends_on = [
    google_project_service.gcp_services["run.googleapis.com"],
    google_artifact_registry_repository.docker_repo
  ]

  lifecycle {
    ignore_changes = [scaling, client, client_version]
  }
}

# ------------------------------------------------------------------------------
# 5. Microservizio: financial-etoro-client (DECOMMISSIONED - sostituito da financial-etoro-service)
# ------------------------------------------------------------------------------
resource "google_cloud_run_v2_service" "etoro_client" {
  count               = 0 # DECOMMISSIONED: Sostituito integralmente da financial-etoro-service (Java 21 / Spring Boot 3)
  name                = "financial-etoro-client"
  location            = var.region
  project             = var.project_id
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false

  template {
    service_account = google_service_account.cloudrun_sa.email
    timeout         = "300s"

    scaling {
      min_instance_count = 0
      max_instance_count = 2
    }

    containers {
      image = "${local.image_base}/financial-etoro-client:${var.image_tag}"

      resources {
        limits = {
          cpu    = "1"
          memory = "1Gi"
        }
        cpu_idle = true
      }

      ports {
        container_port = 8080
      }

      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }
      env {
        name  = "GCP_PROJECT"
        value = var.project_id
      }
      env {
        name  = "FIRESTORE_DATABASE"
        value = var.firestore_database_id
      }
      env {
        name  = "ETORO_ACCOUNT_MODE"
        value = var.etoro_account_mode
      }

      # Iniezione sicura delle API Key da Secret Manager in memoria
      env {
        name = "ETORO_PUBLIC_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.etoro_public_key.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "ETORO_PRIVATE_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.etoro_private_key.secret_id
            version = "latest"
          }
        }
      }
    }
  }

  depends_on = [
    google_project_service.gcp_services["run.googleapis.com"],
    google_artifact_registry_repository.docker_repo,
    google_secret_manager_secret.etoro_public_key,
    google_secret_manager_secret.etoro_private_key
  ]

  lifecycle {
    ignore_changes = [scaling, client, client_version]
  }
}

# ------------------------------------------------------------------------------
# 6. Microservizio: financial-edgar-app (SEC EDGAR & Forensic Intelligence)
# ------------------------------------------------------------------------------
resource "google_cloud_run_v2_service" "edgar_app" {
  count               = var.enable_cloud_run_deploy ? 1 : 0
  name                = "financial-edgar-app"
  location            = var.region
  project             = var.project_id
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false

  template {
    service_account = google_service_account.cloudrun_sa.email
    timeout         = "300s"

    scaling {
      min_instance_count = 0
      max_instance_count = 2
    }

    containers {
      image = "${local.image_base}/financial-edgar-app:${var.image_tag}"

      resources {
        limits = {
          cpu    = "1"
          memory = "1Gi"
        }
        cpu_idle = true
      }

      ports {
        container_port = 8080
      }

      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }
      env {
        name  = "GCP_PROJECT"
        value = var.project_id
      }
      env {
        name  = "FIRESTORE_DATABASE"
        value = var.firestore_database_id
      }
      env {
        name  = "VERTEX_LOCATION"
        value = var.vertex_location
      }
    }
  }

  depends_on = [
    google_project_service.gcp_services["run.googleapis.com"],
    google_artifact_registry_repository.docker_repo
  ]

  lifecycle {
    ignore_changes = [scaling, client, client_version]
  }
}

# ------------------------------------------------------------------------------
# 5b. Microservizio: financial-etoro-service (Java 17/21 & Spring Boot 3 Engine)
# ------------------------------------------------------------------------------
resource "google_cloud_run_v2_service" "etoro_service_springboot" {
  count               = (var.enable_cloud_run_deploy && var.enable_etoro_springboot_deploy) ? 1 : 0
  name                = "financial-etoro-service"
  location            = var.region
  project             = var.project_id
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false

  template {
    service_account = google_service_account.cloudrun_sa.email
    timeout         = "300s"

    scaling {
      min_instance_count = 0
      max_instance_count = 2
    }

    containers {
      image = "${local.image_base}/financial-etoro-service:${var.image_tag}"

      resources {
        limits = {
          cpu    = "1"
          memory = "1Gi"
        }
        cpu_idle = true
      }

      ports {
        container_port = 8080
      }

      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }
      env {
        name  = "GCP_PROJECT"
        value = var.project_id
      }
      env {
        name  = "FIRESTORE_DATABASE"
        value = var.firestore_database_id
      }
      env {
        name  = "ETORO_ACCOUNT_MODE"
        value = var.etoro_account_mode
      }

      # Iniezione sicura delle API Key da Secret Manager in memoria
      env {
        name = "ETORO_PUBLIC_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.etoro_public_key.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "ETORO_PRIVATE_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.etoro_private_key.secret_id
            version = "latest"
          }
        }
      }
    }
  }

  depends_on = [
    google_project_service.gcp_services["run.googleapis.com"],
    google_artifact_registry_repository.docker_repo,
    google_secret_manager_secret.etoro_public_key,
    google_secret_manager_secret.etoro_private_key
  ]

  lifecycle {
    ignore_changes = [scaling, client, client_version]
  }
}

# ------------------------------------------------------------------------------
# Permessi di Invocazione per lo Scheduler (etoro-scheduler-invoker)
# ------------------------------------------------------------------------------
# Consente al Service Account di Cloud Scheduler di chiamare i microservizi protetti
resource "google_cloud_run_v2_service_iam_member" "scheduler_invoker_etoro" {
  count    = 0 # DECOMMISSIONED: Sostituito da scheduler_invoker_etoro_springboot
  project  = var.project_id
  location = var.region
  name     = "financial-etoro-client"
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.scheduler_sa.email}"
}

resource "google_cloud_run_v2_service_iam_member" "scheduler_invoker_etoro_springboot" {
  count    = (var.enable_cloud_run_deploy && var.enable_etoro_springboot_deploy) ? 1 : 0
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.etoro_service_springboot[0].name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.scheduler_sa.email}"
}

resource "google_cloud_run_v2_service_iam_member" "scheduler_invoker_edgar" {
  count    = var.enable_cloud_run_deploy ? 1 : 0
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.edgar_app[0].name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.scheduler_sa.email}"
}

resource "google_cloud_run_v2_service_iam_member" "scheduler_invoker_user" {
  count    = var.enable_cloud_run_deploy ? 1 : 0
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.user_web[0].name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.scheduler_sa.email}"
}

# ------------------------------------------------------------------------------
# 7. Microservizio: alpha-harvest-agent (Portfolio Exit Reviewer & Capital Recycling)
# ------------------------------------------------------------------------------
resource "google_cloud_run_v2_service" "alpha_harvest_agent" {
  count               = var.enable_cloud_run_deploy ? 1 : 0
  name                = "alpha-harvest-agent"
  location            = var.region
  project             = var.project_id
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false

  template {
    service_account = google_service_account.cloudrun_sa.email
    timeout         = "300s"

    scaling {
      min_instance_count = 0
      max_instance_count = 2
    }

    containers {
      image = "${local.image_base}/alpha-harvest-agent:${var.image_tag}"

      resources {
        limits = {
          cpu    = "1"
          memory = "1Gi"
        }
        cpu_idle = true
      }

      ports {
        container_port = 8080
      }

      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }
      env {
        name  = "GCP_PROJECT"
        value = var.project_id
      }
      env {
        name  = "FIRESTORE_DATABASE"
        value = var.firestore_database_id
      }
      env {
        name  = "ETORO_ACCOUNT_MODE"
        value = var.etoro_account_mode
      }
      env {
        name  = "ETORO_CLIENT_URL"
        value = local.active_etoro_url
      }
      env {
        name  = "GOOGLE_CLOUD_LOCATION"
        value = var.region
      }
      env {
        name  = "GOOGLE_GENAI_USE_VERTEXAI"
        value = "true"
      }
      env {
        name  = "GEMINI_MODEL"
        value = var.gemini_model
      }
      env {
        name  = "MODEL"
        value = var.gemini_model
      }
    }
  }

  depends_on = [
    google_project_service.gcp_services["run.googleapis.com"],
    google_artifact_registry_repository.docker_repo
  ]

  lifecycle {
    ignore_changes = [scaling, client, client_version]
  }
}

resource "google_cloud_run_v2_service_iam_member" "scheduler_invoker_harvest" {
  count    = var.enable_cloud_run_deploy ? 1 : 0
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.alpha_harvest_agent[0].name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.scheduler_sa.email}"
}

# Permessi di Invocazione Pubblica per financial-cockpit-web
resource "google_cloud_run_v2_service_iam_member" "cockpit_web_public" {
  count    = var.enable_cloud_run_deploy ? 1 : 0
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.cockpit_web[0].name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Permette a financial-cockpit-web (cloudrun-sa) di invocare alpha-harvest-agent
resource "google_cloud_run_v2_service_iam_member" "cloudrun_invoker_harvest" {
  count    = var.enable_cloud_run_deploy ? 1 : 0
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.alpha_harvest_agent[0].name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.cloudrun_sa.email}"
}

# Consente l'invocazione diretta di alpha-harvest-agent
resource "google_cloud_run_v2_service_iam_member" "harvest_agent_public" {
  count    = var.enable_cloud_run_deploy ? 1 : 0
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.alpha_harvest_agent[0].name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Consente a financial-cockpit-web (cloudrun-sa) di invocare financial-etoro-service
resource "google_cloud_run_v2_service_iam_member" "cloudrun_invoker_etoro_springboot" {
  count    = (var.enable_cloud_run_deploy && var.enable_etoro_springboot_deploy) ? 1 : 0
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.etoro_service_springboot[0].name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.cloudrun_sa.email}"
}

# Consente a financial-cockpit-web (cloudrun-sa) di invocare financial-edgar-app
resource "google_cloud_run_v2_service_iam_member" "cloudrun_invoker_edgar" {
  count    = var.enable_cloud_run_deploy ? 1 : 0
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.edgar_app[0].name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.cloudrun_sa.email}"
}


