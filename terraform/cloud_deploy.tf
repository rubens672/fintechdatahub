# ==============================================================================
# cloud_deploy.tf — Google Cloud Deploy Continuous Delivery (Test & Produzione)
# ==============================================================================
# Google Cloud Deploy è il servizio di continuous delivery enterprise completamente
# gestito di Google Cloud che orchestra la progressione dei rilasci tra ambienti
# multipli con gating di approvazione, verifica automatica e rollback a 1-click.
#
# DIDATTICA:
# - DeliveryPipeline: definisce la sequenza degli stadi (Test -> Produzione).
# - Target 'financial-test': ambiente di collaudo su Cloud Run con verifica automatica.
# - Target 'financial-prod': ambiente di produzione con 'require_approval = false' (Rollout automatico senza blocco).
# - Automation 'auto-promote-to-prod': promozione automatica continua da Test a Produzione senza consenso manuale.
# - clouddeploy-runner: Service Account dedicato per l'esecuzione dei job di render, deploy, verify e promotion.
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. Service Account dedicato per i Job di Cloud Deploy (clouddeploy-runner)
# ------------------------------------------------------------------------------
resource "google_service_account" "clouddeploy_runner" {
  count        = var.enable_cloud_deploy ? 1 : 0
  account_id   = "clouddeploy-runner"
  display_name = "Cloud Deploy Execution Runner SA"
  description  = "Service account utilizzato da Cloud Deploy per il rendering, deployment e verifica sui target Cloud Run"
  project      = var.project_id

  depends_on = [
    google_project_service.gcp_services["iam.googleapis.com"]
  ]
}

locals {
  clouddeploy_runner_roles = [
    "roles/clouddeploy.jobRunner",   # Esecuzione dei job di render, deploy e verify di Cloud Deploy
    "roles/clouddeploy.operator",    # Gestione delle promozioni automatiche e avanzamento rollout
    "roles/container.developer",     # Deployment e gestione carichi su GKE Autopilot
    "roles/run.developer",           # Creazione e aggiornamento delle revisioni Cloud Run
    "roles/artifactregistry.reader", # Lettura e download dei manifest/immagini da Artifact Registry
    "roles/logging.logWriter",       # Scrittura dei log di render/deploy su Cloud Logging
    "roles/storage.objectViewer"     # Lettura dei bundle di rilascio da Cloud Storage
  ]
}

# Assegnazione dei ruoli operativi a clouddeploy-runner sul progetto
resource "google_project_iam_member" "clouddeploy_runner_roles" {
  for_each = var.enable_cloud_deploy ? toset(local.clouddeploy_runner_roles) : []

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.clouddeploy_runner[0].email}"
}

# Permette a clouddeploy-runner di agire con l'identità runtime di Cloud Run (cloudrun-sa)
resource "google_service_account_iam_member" "clouddeploy_act_as_cloudrun_sa" {
  count              = var.enable_cloud_deploy ? 1 : 0
  service_account_id = google_service_account.cloudrun_sa.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.clouddeploy_runner[0].email}"
}

# Permette all'agente di servizio Cloud Deploy di impersonare clouddeploy-runner per le automazioni di pipeline
resource "google_service_account_iam_member" "clouddeploy_sa_act_as_runner" {
  count              = var.enable_cloud_deploy ? 1 : 0
  service_account_id = google_service_account.clouddeploy_runner[0].name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:service-${data.google_project.current.number}@gcp-sa-clouddeploy.iam.gserviceaccount.com"
}

# ------------------------------------------------------------------------------
# 2. Target 1: Ambiente di Test & Collaudo (financial-test)
# ------------------------------------------------------------------------------
resource "google_clouddeploy_target" "financial_test" {
  count       = var.enable_cloud_deploy ? 1 : 0
  name        = "financial-test"
  location    = var.region
  project     = var.project_id
  description = "Ambiente di Test & Collaudo su Google Kubernetes Engine (Rollout automatico)"

  dynamic "gke" {
    for_each = var.enable_gke_deploy ? [1] : []
    content {
      cluster = "projects/${var.project_id}/locations/${var.region}/clusters/${var.gke_cluster_name}"
    }
  }

  dynamic "run" {
    for_each = var.enable_gke_deploy ? [] : [1]
    content {
      location = "projects/${var.project_id}/locations/${var.region}"
    }
  }

  execution_configs {
    usages          = ["RENDER", "DEPLOY", "VERIFY"]
    service_account = google_service_account.clouddeploy_runner[0].email
  }

  labels = {
    env        = "test"
    managed-by = "terraform"
    runtime    = var.enable_gke_deploy ? "gke" : "cloudrun"
  }

  depends_on = [
    google_project_service.gcp_services["clouddeploy.googleapis.com"],
    google_service_account.clouddeploy_runner
  ]
}

# ------------------------------------------------------------------------------
# 3. Target 2: Ambiente di Produzione (financial-prod - Rollout Automatico)
# ------------------------------------------------------------------------------
resource "google_clouddeploy_target" "financial_prod" {
  count            = var.enable_cloud_deploy ? 1 : 0
  name             = "financial-prod"
  location         = var.region
  project          = var.project_id
  description      = "Ambiente di Produzione su Google Kubernetes Engine (Rollout automatico senza approvazione)"
  require_approval = false

  dynamic "gke" {
    for_each = var.enable_gke_deploy ? [1] : []
    content {
      cluster = "projects/${var.project_id}/locations/${var.region}/clusters/${var.gke_cluster_name}"
    }
  }

  dynamic "run" {
    for_each = var.enable_gke_deploy ? [] : [1]
    content {
      location = "projects/${var.project_id}/locations/${var.region}"
    }
  }

  execution_configs {
    usages          = ["RENDER", "DEPLOY", "VERIFY"]
    service_account = google_service_account.clouddeploy_runner[0].email
  }

  labels = {
    env        = "production"
    managed-by = "terraform"
    runtime    = var.enable_gke_deploy ? "gke" : "cloudrun"
  }

  depends_on = [
    google_project_service.gcp_services["clouddeploy.googleapis.com"],
    google_service_account.clouddeploy_runner
  ]
}

# ------------------------------------------------------------------------------
# 4. Delivery Pipeline a 2 Stadi: Test -> Produzione (financial-platform-pipeline)
# ------------------------------------------------------------------------------
resource "google_clouddeploy_delivery_pipeline" "financial_platform_pipeline" {
  count       = var.enable_cloud_deploy ? 1 : 0
  name        = "financial-platform-pipeline"
  location    = var.region
  project     = var.project_id
  description = "Pipeline istituzionale di Continuous Delivery a 2 ambienti (Test e Produzione) per microservizi finanziari"

  serial_pipeline {
    # Stadio 1: Test (Rollout automatico e validazione smoke test)
    stages {
      target_id = google_clouddeploy_target.financial_test[0].name
      profiles  = ["test"]
      strategy {
        standard {
          verify = true
        }
      }
    }

    # Stadio 2: Produzione (Rollout automatico continuo senza approvazione)
    stages {
      target_id = google_clouddeploy_target.financial_prod[0].name
      profiles  = ["prod"]
    }
  }

  labels = {
    tier       = "institutional"
    managed-by = "terraform"
  }

  depends_on = [
    google_project_service.gcp_services["clouddeploy.googleapis.com"],
    google_clouddeploy_target.financial_test,
    google_clouddeploy_target.financial_prod
  ]
}

# ------------------------------------------------------------------------------
# 5. Automazione Cloud Deploy: Promozione Automatica Test -> Produzione
# ------------------------------------------------------------------------------
resource "google_clouddeploy_automation" "auto_promote_to_prod" {
  count             = var.enable_cloud_deploy ? 1 : 0
  name              = "auto-promote-to-prod"
  project           = var.project_id
  location          = var.region
  delivery_pipeline = google_clouddeploy_delivery_pipeline.financial_platform_pipeline[0].name
  service_account   = google_service_account.clouddeploy_runner[0].email
  description       = "Promozione automatica continua da Test a Produzione senza attesa del consenso manuale"

  selector {
    targets {
      id = google_clouddeploy_target.financial_test[0].name
    }
  }

  rules {
    promote_release_rule {
      id = "promote-test-to-prod"
    }
  }

  depends_on = [
    google_clouddeploy_delivery_pipeline.financial_platform_pipeline,
    google_clouddeploy_target.financial_test,
    google_clouddeploy_target.financial_prod
  ]
}

