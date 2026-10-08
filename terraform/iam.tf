# ==============================================================================
# iam.tf — Service Accounts e Gestione dei Permessi di Sicurezza (IAM)
# ==============================================================================
# In GCP, il principio del "Least Privilege" (Minimo Privilegio) richiede che
# ogni processo software utilizzi una propria identità (Service Account) con solo
# i permessi strettamente necessari per svolgere il proprio compito.
#
# DIDATTICA:
# - Un "Service Account" (SA) è un account non umano (un'email tecnica) usata dai servizi.
# - Un "IAM Binding" associa un ruolo (es. 'roles/datastore.user') a quel Service Account.
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. Service Account per i Container Cloud Run (cloudrun-sa)
# ------------------------------------------------------------------------------
# Questa è l'identità runtime che eseguirà i container dei nostri 6 microservizi.
resource "google_service_account" "cloudrun_sa" {
  account_id   = "cloudrun-sa"
  display_name = "Financial Platform Cloud Run SA"
  description  = "Service Account assegnata ai container Cloud Run per accesso a Firestore, Vertex AI e Secret Manager"
  project      = var.project_id

  depends_on = [
    google_project_service.gcp_services["iam.googleapis.com"]
  ]
}

# Ruoli necessari per l'operatività di Cloud Run
locals {
  cloudrun_roles = [
    "roles/datastore.user",               # Accesso in lettura/scrittura su Cloud Firestore
    "roles/aiplatform.user",              # Accesso a Vertex AI (text-embedding-005 e Gemini)
    "roles/secretmanager.secretAccessor", # Decifratura e lettura chiavi API da Secret Manager
    "roles/logging.logWriter",            # Scrittura log su Cloud Logging
    "roles/monitoring.metricWriter",      # Pubblicazione metriche su Cloud Monitoring
    "roles/cloudtrace.agent",             # Tracing distribuito delle richieste HTTP
    "roles/artifactregistry.writer",      # Scrittura e push delle immagini Docker in Artifact Registry
    "roles/run.admin",                    # Deploy e gestione completa dei servizi Cloud Run
    "roles/iam.serviceAccountUser",       # Assegnazione del Service Account ai container Cloud Run
    "roles/cloudbuild.builds.builder",    # Esecuzione di step e container in Cloud Build
    "roles/container.admin",              # Gestione completa carichi di lavoro, RBAC e get-credentials su cluster GKE
    "roles/clouddeploy.releaser",         # Creazione release e avvio rollout su Google Cloud Deploy
    "roles/clouddeploy.developer",        # Ispezione pipeline e gestione avanzata rilasci
    "roles/clouddeploy.admin"             # Gestione dichiarativa pipeline e target (gcloud deploy apply)
  ]
}

# Assegnazione di ciascun ruolo al Service Account cloudrun-sa
resource "google_project_iam_member" "cloudrun_sa_roles" {
  for_each = toset(local.cloudrun_roles)

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.cloudrun_sa.email}"
}

# Permette a cloudrun-sa di assegnare se stesso come identità di runtime per Cloud Run
resource "google_service_account_iam_member" "cloudrun_act_as_self" {
  service_account_id = google_service_account.cloudrun_sa.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.cloudrun_sa.email}"
}

# ------------------------------------------------------------------------------
# 2. Service Account per Cloud Scheduler (etoro-scheduler-invoker)
# ------------------------------------------------------------------------------
# Questa identità è usata dai Cron Job di Google Cloud Scheduler per generare
# token OIDC crittografici e chiamare gli endpoint protetti dei microservizi.
resource "google_service_account" "scheduler_sa" {
  account_id   = "etoro-scheduler-invoker"
  display_name = "eToro Cloud Scheduler Invoker SA"
  description  = "Service account dedicato all'invocazione sicura OIDC dei Cron Job Cloud Scheduler su Cloud Run"
  project      = var.project_id

  depends_on = [
    google_project_service.gcp_services["iam.googleapis.com"]
  ]
}
