# ==============================================================================
# provider.tf — Configurazione dei Provider Google Cloud
# ==============================================================================
# In questo file impostiamo i parametri globali di connessione a GCP:
# il progetto predefinito, la regione e la zona.
# ==============================================================================

# Provider Google Cloud Principale
provider "google" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}

# Provider Google Cloud Beta (estensione con funzionalità avanzate)
provider "google-beta" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}
