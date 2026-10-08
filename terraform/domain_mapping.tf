# ==============================================================================
# domain_mapping.tf — Cloud Run Domain Mapping (Nativo e Gratuito 0,00 €)
# ==============================================================================
# Nella regione 'europe-west1' (Belgio) Google Cloud offre il servizio nativo
# di Domain Mapping senza alcun costo di bilanciatore di carico.
#
# DIDATTICA:
# - Crea il collegamento tra il tuo dominio/sottodominio e il container Cloud Run.
# - Google emette e rinnova automaticamente un certificato SSL TLS/HTTPS gratuito.
# - Esporta nei comandi output i record DNS (es. CNAME ghs.googlehosted.com)
#   da copiare nel pannello del tuo registrar DNS (es. Cloudflare, Namecheap, Google Domains).
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. Custom Domain per financial-cockpit-web
# ------------------------------------------------------------------------------
resource "google_cloud_run_domain_mapping" "cockpit_domain" {
  count    = (var.enable_cloud_run_deploy && var.custom_domain_cockpit != "") ? 1 : 0
  location = var.region
  project  = var.project_id
  name     = var.custom_domain_cockpit

  metadata {
    namespace = var.project_id
  }

  spec {
    route_name = google_cloud_run_v2_service.cockpit_web[0].name
  }

  depends_on = [
    google_cloud_run_v2_service.cockpit_web
  ]
}

# ------------------------------------------------------------------------------
# 2. Custom Domain per financial-user-web (Portale Pubblico)
# ------------------------------------------------------------------------------
resource "google_cloud_run_domain_mapping" "user_domain" {
  count    = (var.enable_cloud_run_deploy && var.custom_domain_user != "") ? 1 : 0
  location = var.region
  project  = var.project_id
  name     = var.custom_domain_user

  metadata {
    namespace = var.project_id
  }

  spec {
    route_name = google_cloud_run_v2_service.user_web[0].name
  }

  depends_on = [
    google_cloud_run_v2_service.user_web
  ]
}
