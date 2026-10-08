# ==============================================================================
# firestore.tf — Database Cloud Firestore in Modalità Native
# ==============================================================================
# Cloud Firestore è il database documentale NoSQL scalabile e fully managed di GCP.
# Nel nostro progetto memorizza:
# - Serie storiche EOD e cache incrementale Delta-Append (prezzi OHLCV)
# - Run del DAG quantitativo e stato dei nodi (Step 0 - Step 6)
# - Ledger e metriche storiche per il Quant Audit Lab
# - Snapshot dell'Opening Shield (positions_shield/{pos_id})
# - Chunk semantici vettorizzati dei bilanci SEC EDGAR (sec_filing_chunks)
# ==============================================================================

resource "google_firestore_database" "database" {
  project     = var.project_id
  name        = var.firestore_database_id
  location_id = var.region

  # Modalità Native (consente collezioni, sotto-collezioni, query avanzate e Vector Search)
  type = "FIRESTORE_NATIVE"

  # Controllo di concorrenza ottimistico (ideale per scritture concorrenti ad alte prestazioni)
  concurrency_mode = "OPTIMISTIC"

  # Disabilita l'integrazione con App Engine (standard moderno)
  app_engine_integration_mode = "DISABLED"

  # PROTEZIONE CRITICA:
  # Impedisce a chiunque (e a Terraform stesso) di eliminare accidentalmente
  # il database contenente lo storico finanziario e i dati di audit.
  delete_protection_state = "DELETE_PROTECTION_ENABLED"

  # Assicura che l'API Firestore sia attiva prima di tentare di creare il database
  depends_on = [
    google_project_service.gcp_services["firestore.googleapis.com"]
  ]
}

# ------------------------------------------------------------------------------
# Autorizzazione Service Agent di Firestore per Import Dati da Cloud Storage
# ------------------------------------------------------------------------------
# Quando si esegue 'gcloud firestore import', il Service Agent nativo di Firestore
# ha bisogno di 'roles/storage.objectViewer' sul bucket GCS per leggere i file.
resource "google_storage_bucket_iam_member" "firestore_import_viewer" {
  count  = var.firestore_export_bucket != "" ? 1 : 0
  bucket = var.firestore_export_bucket
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:service-${data.google_project.current.number}@gcp-sa-firestore.iam.gserviceaccount.com"

  depends_on = [
    google_firestore_database.database
  ]
}
