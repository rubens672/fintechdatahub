# ==============================================================================
# services.tf — Abilitazione delle API Google Cloud Platform
# ==============================================================================
# In Google Cloud, per poter creare qualsiasi risorsa (es. un container Cloud Run
# o un DB Firestore), è necessario abilitare l'API corrispondente nel progetto.
#
# DIDATTICA:
# Usiamo 'for_each' per iterare su una lista di stringhe: in questo modo,
# invece di scrivere 10 blocchi 'resource' ripetitivi, ne scriviamo solo uno.
# 'disable_on_destroy = false' garantisce che, se si distrugge il piano Terraform,
# le API del progetto GCP rimangano comunque attive senza bloccare altri servizi.
# ==============================================================================

locals {
  required_services = [
    "artifactregistry.googleapis.com", # Per archiviare le immagini Docker
    "run.googleapis.com",              # Per eseguire i container serverless Cloud Run
    "cloudbuild.googleapis.com",       # Per le build automatiche CI/CD
    "cloudscheduler.googleapis.com",   # Per i cron job (Opening Shield, Break-Even, ecc.)
    "iam.googleapis.com",              # Per gestire Service Account e ruoli di sicurezza
    "secretmanager.googleapis.com",    # Per custodire chiavi API in modo cifrato
    "firestore.googleapis.com",        # Per il database NoSQL di mercato e run
    "aiplatform.googleapis.com",       # Per Vertex AI (embedding vettoriali e modelli Gemini)
    "logging.googleapis.com",          # Per i log centralizzati di sistema
    "monitoring.googleapis.com",       # Per le metriche e telemetria delle performance
    "cloudtrace.googleapis.com",       # Per il distributed tracing dei microservizi
    "clouddeploy.googleapis.com",      # Per l'orchestrazione di Continuous Delivery con Google Cloud Deploy
    "container.googleapis.com"         # Per Google Kubernetes Engine (GKE) Autopilot
  ]
}

resource "google_project_service" "gcp_services" {
  for_each = toset(local.required_services)

  project = var.project_id
  service = each.value

  # Non disattivare l'API in caso di "terraform destroy" per non rompere il progetto GCP
  disable_on_destroy = false
}
