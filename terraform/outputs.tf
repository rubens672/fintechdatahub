# ==============================================================================
# outputs.tf — Risultati e Informazioni Utili post-Deployment
# ==============================================================================
# Gli Output sono i valori calcolati da Terraform al termine dell'applicazione.
# Vengono stampati a video sul terminale e possono essere interrogati in qualsiasi
# momento eseguendo semplicemente: 'terraform output'.
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. Informazioni Database & Registry
# ------------------------------------------------------------------------------

output "firestore_database_name" {
  description = "ID del Database Cloud Firestore in Native mode"
  value       = google_firestore_database.database.name
}

output "artifact_registry_repo" {
  description = "Percorso completo del repository Artifact Registry per le immagini Docker"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_repository_id}"
}

# ------------------------------------------------------------------------------
# 2. Service Accounts Creati
# ------------------------------------------------------------------------------

output "cloudrun_service_account" {
  description = "Email del Service Account runtime assegnato ai container Cloud Run"
  value       = google_service_account.cloudrun_sa.email
}

output "scheduler_service_account" {
  description = "Email del Service Account utilizzato dai Cron Job di Cloud Scheduler"
  value       = google_service_account.scheduler_sa.email
}

# ------------------------------------------------------------------------------
# 3. URL dei Microservizi Cloud Run
# ------------------------------------------------------------------------------

output "url_cockpit_web" {
  description = "URL del Cruscotto Web Principale (Cockpit Pro)"
  value       = var.enable_cloud_run_deploy ? google_cloud_run_v2_service.cockpit_web[0].uri : "Non distribuito (enable_cloud_run_deploy=false)"
}

output "url_user_web" {
  description = "URL del Portale Utente Pubblico (Read-Only)"
  value       = var.enable_cloud_run_deploy ? google_cloud_run_v2_service.user_web[0].uri : "Non distribuito (enable_cloud_run_deploy=false)"
}

output "url_chainlit_app" {
  description = "URL dell'Applicazione Chat Conversazionale Chainlit"
  value       = var.enable_cloud_run_deploy ? google_cloud_run_v2_service.chainlit_app[0].uri : "Non distribuito (enable_cloud_run_deploy=false)"
}

output "url_mcp_server" {
  description = "URL interno del Custom MCP Server a 34 Tool"
  value       = var.enable_cloud_run_deploy ? google_cloud_run_v2_service.mcp_server[0].uri : "Non distribuito (enable_cloud_run_deploy=false)"
}

output "url_etoro_client" {
  description = "URL del microservizio Python Automated Trading Execution eToro (Dismesso)"
  value       = "DECOMMISSIONED (Sostituito integralmente da financial-etoro-service)"
}

output "url_etoro_service_springboot" {
  description = "URL del microservizio Java Spring Boot 3 Automated Trading eToro"
  value       = (var.enable_cloud_run_deploy && var.enable_etoro_springboot_deploy && length(google_cloud_run_v2_service.etoro_service_springboot) > 0) ? google_cloud_run_v2_service.etoro_service_springboot[0].uri : "Non distribuito"
}

output "active_etoro_engine" {
  description = "Motore di esecuzione ordini eToro attualmente attivo ('python' o 'springboot')"
  value       = var.etoro_engine
}

output "active_etoro_url" {
  description = "URL effettivo del microservizio eToro collegato a Cockpit Web e Cloud Scheduler"
  value       = local.active_etoro_url
}

output "url_edgar_app" {
  description = "URL del microservizio SEC EDGAR Forensic & RAG"
  value       = var.enable_cloud_run_deploy ? google_cloud_run_v2_service.edgar_app[0].uri : "Non distribuito (enable_cloud_run_deploy=false)"
}

output "url_alpha_harvest_agent" {
  description = "URL del microservizio Alpha Harvest Agent (Autonomous Exit Reviewer)"
  value       = (var.enable_cloud_run_deploy && length(google_cloud_run_v2_service.alpha_harvest_agent) > 0) ? google_cloud_run_v2_service.alpha_harvest_agent[0].uri : "Non distribuito"
}

# ------------------------------------------------------------------------------
# 4. Parametri CI/CD Cloud Build
# ------------------------------------------------------------------------------

output "cloudbuild_service_account" {
  description = "Email del Service Account predefinito di Cloud Build"
  value       = local.cloudbuild_sa_email
}

output "cloudbuild_trigger_name" {
  description = "Nome del Trigger Cloud Build configurato per GitHub"
  value       = var.enable_cloud_build_trigger ? google_cloudbuild_trigger.main_trigger[0].name : "Disabilitato"
}

# ------------------------------------------------------------------------------
# 5. Comando di Ripristino / Import Database Firestore
# ------------------------------------------------------------------------------

output "firestore_import_command" {
  description = "Comando già pronto per importare lo snapshot dei dati in Firestore sul nuovo progetto"
  value       = "gcloud firestore import gs://${var.firestore_export_bucket}/${var.firestore_export_folder} --database=${var.firestore_database_id} --project=${var.project_id}"
}

# ------------------------------------------------------------------------------
# 6. Record DNS per Custom Domain Mapping (0,00 €)
# ------------------------------------------------------------------------------

output "dns_records_cockpit" {
  description = "Record DNS da inserire nel registrar del dominio per il Cockpit Web"
  value       = length(google_cloud_run_domain_mapping.cockpit_domain) > 0 ? google_cloud_run_domain_mapping.cockpit_domain[0].status[0].resource_records : []
}

output "dns_records_user" {
  description = "Record DNS da inserire nel registrar del dominio per il Portale User Web"
  value       = length(google_cloud_run_domain_mapping.user_domain) > 0 ? google_cloud_run_domain_mapping.user_domain[0].status[0].resource_records : []
}

# ------------------------------------------------------------------------------
# 7. Google Cloud Deploy (Continuous Delivery Pipeline)
# ------------------------------------------------------------------------------

output "cloud_deploy_pipeline_name" {
  description = "Nome della Delivery Pipeline Google Cloud Deploy"
  value       = var.enable_cloud_deploy && length(google_clouddeploy_delivery_pipeline.financial_platform_pipeline) > 0 ? google_clouddeploy_delivery_pipeline.financial_platform_pipeline[0].name : ""
}

output "cloud_deploy_targets" {
  description = "Nomi dei target configurati per la pipeline di rilascio (Test e Produzione)"
  value = var.enable_cloud_deploy ? {
    test = length(google_clouddeploy_target.financial_test) > 0 ? google_clouddeploy_target.financial_test[0].name : ""
    prod = length(google_clouddeploy_target.financial_prod) > 0 ? google_clouddeploy_target.financial_prod[0].name : ""
  } : {}
}

output "cloud_deploy_runner_sa" {
  description = "Email del Service Account utilizzato dai job di Cloud Deploy"
  value       = var.enable_cloud_deploy && length(google_service_account.clouddeploy_runner) > 0 ? google_service_account.clouddeploy_runner[0].email : ""
}

output "cloud_deploy_promote_command" {
  description = "Comando rapido CLI per promuovere una release dall'ambiente Test all'ambiente Produzione"
  value       = "gcloud deploy releases promote --delivery-pipeline=financial-platform-pipeline --region=${var.region} --project=${var.project_id}"
}

# ------------------------------------------------------------------------------
# 7. Informazioni Cluster GKE Autopilot
# ------------------------------------------------------------------------------

output "gke_cluster_name" {
  description = "Nome del cluster GKE Autopilot"
  value       = var.enable_gke_deploy && length(google_container_cluster.gke_cluster) > 0 ? google_container_cluster.gke_cluster[0].name : "N/A"
}

output "gke_cluster_endpoint" {
  description = "Endpoint del control plane del cluster GKE"
  value       = var.enable_gke_deploy && length(google_container_cluster.gke_cluster) > 0 ? google_container_cluster.gke_cluster[0].endpoint : "N/A"
}

output "gke_get_credentials_command" {
  description = "Comando per scaricare le credenziali kubectl per il cluster GKE"
  value       = "gcloud container clusters get-credentials ${var.gke_cluster_name} --region=${var.region} --project=${var.project_id}"
}

output "gke_workload_sa_email" {
  description = "Email del Service Account Google per Workload Identity su GKE"
  value       = var.enable_gke_deploy && length(google_service_account.gke_sa) > 0 ? google_service_account.gke_sa[0].email : "N/A"
}


