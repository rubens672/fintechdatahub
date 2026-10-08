# ==============================================================================
# secrets.tf — Secret Manager per le Chiavi API Sensibili (eToro)
# ==============================================================================
# Google Cloud Secret Manager custodisce in modo cifrato a riposo (AES-256)
# le credenziali critiche come API Key e Token di accesso.
# Invece di scrivere le chiavi in chiaro nei file di configurazione o in Dockerfile,
# Cloud Run inietta i segreti direttamente in memoria come variabili d'ambiente.
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. Secret: Chiave Pubblica eToro
# ------------------------------------------------------------------------------
resource "google_secret_manager_secret" "etoro_public_key" {
  project   = var.project_id
  secret_id = "etoro-public-key"

  replication {
    auto {}
  }

  depends_on = [
    google_project_service.gcp_services["secretmanager.googleapis.com"]
  ]
}

# Versione del valore (creata solo se var.etoro_public_key non è vuota)
resource "google_secret_manager_secret_version" "etoro_public_key_val" {
  count       = var.etoro_public_key != "" ? 1 : 0
  secret      = google_secret_manager_secret.etoro_public_key.id
  secret_data = var.etoro_public_key
}

# ------------------------------------------------------------------------------
# 2. Secret: Chiave Privata eToro (User Key)
# ------------------------------------------------------------------------------
resource "google_secret_manager_secret" "etoro_private_key" {
  project   = var.project_id
  secret_id = "etoro-private-key"

  replication {
    auto {}
  }

  depends_on = [
    google_project_service.gcp_services["secretmanager.googleapis.com"]
  ]
}

# Versione del valore (creata solo se var.etoro_private_key non è vuota)
resource "google_secret_manager_secret_version" "etoro_private_key_val" {
  count       = var.etoro_private_key != "" ? 1 : 0
  secret      = google_secret_manager_secret.etoro_private_key.id
  secret_data = var.etoro_private_key
}

# ------------------------------------------------------------------------------
# 3. Permessi IAM Granulari per i Secret
# ------------------------------------------------------------------------------
# Concede specificamente a 'cloudrun-sa' il permesso di accedere alla versione attiva dei secret
resource "google_secret_manager_secret_iam_member" "etoro_pub_access" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.etoro_public_key.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloudrun_sa.email}"
}

resource "google_secret_manager_secret_iam_member" "etoro_priv_access" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.etoro_private_key.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloudrun_sa.email}"
}
