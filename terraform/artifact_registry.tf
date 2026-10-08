# ==============================================================================
# artifact_registry.tf — Repository Docker per le Immagini dei Microservizi
# ==============================================================================
# Google Artifact Registry è il successore sicuro ed efficiente di Container Registry (GCR).
# In questo repository Docker memorizziamo i container compilati da Cloud Build:
# - financial-cockpit-web
# - financial-user-web
# - financial-chainlit-app
# - financial-mcp-server
# - financial-etoro-service
# - financial-edgar-app
# ==============================================================================

resource "google_artifact_registry_repository" "docker_repo" {
  project       = var.project_id
  location      = var.region
  repository_id = var.artifact_repository_id
  description   = "Financial Platform Docker images"
  format        = "DOCKER"

  docker_config {
    # Permette di aggiornare il tag 'latest' ad ogni nuova build mantenendo i commit SHA
    immutable_tags = false
  }

  depends_on = [
    google_project_service.gcp_services["artifactregistry.googleapis.com"]
  ]
}
