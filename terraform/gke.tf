# ==============================================================================
# gke.tf — Definizione del Cluster GKE Autopilot e Workload Identity
# ==============================================================================
# In conformità con PROGETTAZIONE_ARCHITETTURA_GKE_AUTOPILOT.md:
# Cluster GKE in modalità Autopilot con Workload Identity Federation nativa,
# zero gestione dei nodi VM e pieno supporto per GKE Spot Pods.
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. Cluster Google Kubernetes Engine (GKE) Autopilot
# ------------------------------------------------------------------------------
resource "google_container_cluster" "gke_cluster" {
  count               = var.enable_gke_deploy ? 1 : 0
  name                = var.gke_cluster_name
  location            = var.region
  project             = var.project_id
  enable_autopilot    = true
  deletion_protection = false

  # Rete e Subnet predefinite
  network    = "default"
  subnetwork = "default"

  ip_allocation_policy {
    # VPC-native cluster gestito automaticamente da Autopilot
  }

  depends_on = [
    google_project_service.gcp_services["container.googleapis.com"]
  ]
}

# ------------------------------------------------------------------------------
# 2. Service Account Google Cloud per Workload Identity (fintech-gke-sa)
# ------------------------------------------------------------------------------
resource "google_service_account" "gke_sa" {
  count        = var.enable_gke_deploy ? 1 : 0
  account_id   = "fintech-gke-sa"
  display_name = "Fintech Platform GKE Workload SA"
  description  = "Service Account assegnata ai pod GKE per accesso sicuro a Firestore, Secret Manager e Vertex AI senza chiavi JSON"
  project      = var.project_id

  depends_on = [
    google_project_service.gcp_services["iam.googleapis.com"]
  ]
}

# Ruoli IAM concessi al Service Account GKE
locals {
  gke_workload_roles = [
    "roles/datastore.user",               # Accesso completo a Cloud Firestore
    "roles/secretmanager.secretAccessor", # Lettura credenziali cifrate da Secret Manager
    "roles/aiplatform.user",              # Vertex AI (text-embedding-005 e Gemini Flash)
    "roles/artifactregistry.reader",      # Lettura e pull immagini da Artifact Registry
    "roles/logging.logWriter",            # Scrittura log su Cloud Logging
    "roles/monitoring.metricWriter",      # Metriche applicative
    "roles/cloudtrace.agent"              # Distributed tracing
  ]
}

resource "google_project_iam_member" "gke_sa_roles" {
  for_each = var.enable_gke_deploy ? toset(local.gke_workload_roles) : toset([])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.gke_sa[0].email}"
}

# Consente ai nodi del cluster GKE di effettuare il pull delle immagini da Artifact Registry
resource "google_project_iam_member" "gke_node_artifact_registry_reader" {
  count   = var.enable_gke_deploy ? 1 : 0
  project = var.project_id
  role    = "roles/artifactregistry.reader"
  member  = "serviceAccount:${data.google_project.current.number}-compute@developer.gserviceaccount.com"
}

# ------------------------------------------------------------------------------
# 3. Binding Workload Identity tra K8s ServiceAccount e Google Service Account
# ------------------------------------------------------------------------------
# Consente al ServiceAccount K8s 'fintech-workload-sa' nel namespace 'fintech-platform'
# di assumere l'identità del Service Account GCP 'fintech-gke-sa' a zero chiavi statiche.
resource "google_service_account_iam_member" "gke_workload_identity_binding" {
  count              = var.enable_gke_deploy ? 1 : 0
  service_account_id = google_service_account.gke_sa[0].name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${google_container_cluster.gke_cluster[0].workload_identity_config[0].workload_pool}[fintech-platform/fintech-workload-sa]"

  depends_on = [
    google_container_cluster.gke_cluster,
    google_service_account.gke_sa
  ]
}

