# ==============================================================================
# variables.tf — Dichiarazione delle Variabili Configurabili
# ==============================================================================
# Le variabili rendono il codice Terraform riutilizzabile e flessibile.
# Invece di scrivere hardcoded "fintech-data-hub-75428" ovunque, definiamo una
# variabile e possiamo cambiarla agilmente o testare su progetti GCP diversi.
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. Configurazione Generale GCP
# ------------------------------------------------------------------------------

variable "project_id" {
  type        = string
  description = "L'ID del progetto Google Cloud su cui creare l'infrastruttura."
  default     = "fintech-data-hub-75428"
}

variable "region" {
  type        = string
  description = "La regione GCP primaria per tutte le risorse (Cloud Run, Firestore, Artifact Registry). europe-west1 supporta Domain Mapping nativo a costo zero."
  default     = "europe-west1" # Belgio (supporta Domain Mapping nativo a 0,00 €)
}

variable "zone" {
  type        = string
  description = "La zona GCP primaria per risorse zonali."
  default     = "europe-west1-b"
}

variable "vertex_location" {
  type        = string
  description = "La regione GCP per i modelli Vertex AI e le API di embedding (text-embedding-005, Gemini Flash)."
  default     = "us-central1"
}

# ------------------------------------------------------------------------------
# 2. Database e Storage
# ------------------------------------------------------------------------------

variable "firestore_database_id" {
  type        = string
  description = "Il nome/ID del database Firestore in modalità Native."
  default     = "fintech-data-hub-fs"
}

variable "firestore_export_bucket" {
  type        = string
  description = "Nome del bucket GCS contenente i dati di backup/export di Firestore da autorizzare per l'import."
  default     = "firestore-export-45513"
}

variable "firestore_export_folder" {
  type        = string
  description = "Cartella specifica dello snapshot Firestore esportato all'interno del bucket."
  default     = "2026-09-19T17:37:23_55519"
}

variable "artifact_repository_id" {
  type        = string
  description = "Il nome del repository Docker in Artifact Registry dove sono archiviate le immagini dei container."
  default     = "fintech-apps"
}

# ------------------------------------------------------------------------------
# 3. Parametri dei Container e Immagini Docker
# ------------------------------------------------------------------------------

variable "image_tag" {
  type        = string
  description = "Il tag dell'immagine Docker da distribuire sui servizi Cloud Run (es. 'latest' oppure uno specifico commit SHA)."
  default     = "latest"
}

variable "gemini_model" {
  type        = string
  description = "La versione del modello Google Gemini utilizzata per le valutazioni LLM e l'agente."
  default     = "gemini-3.6-flash"
}

# ------------------------------------------------------------------------------
# 4. Parametri eToro Trading Automation
# ------------------------------------------------------------------------------

variable "etoro_account_mode" {
  type        = string
  description = "Modalità conto eToro per l'esecuzione degli ordini ('demo' per paper trading, 'real' per conto reale)."
  default     = "demo"

  validation {
    condition     = contains(["demo", "real"], var.etoro_account_mode)
    error_message = "etoro_account_mode deve essere 'demo' o 'real'."
  }
}

variable "etoro_public_key" {
  type        = string
  description = "Chiave pubblica per le API di eToro. Se vuota, verrà creata la risorsa Secret vuota da popolare successivamente."
  default     = ""
  sensitive   = true
}

variable "etoro_private_key" {
  type        = string
  description = "Chiave privata (User Key) per le API di eToro. Se vuota, verrà creata la risorsa Secret vuota da popolare successivamente."
  default     = ""
  sensitive   = true
}

variable "etoro_engine" {
  type        = string
  description = "Motore di esecuzione ordini eToro attivo ('springboot' per financial-etoro-service)."
  default     = "springboot"

  validation {
    condition     = contains(["springboot"], var.etoro_engine)
    error_message = "etoro_engine deve essere 'springboot'."
  }
}

variable "enable_etoro_springboot_deploy" {
  type        = bool
  description = "Abilita la distribuzione del microservizio Java Spring Boot financial-etoro-service su Cloud Run (supporta dual-deploy a costo 0,00 € quando inattivo)."
  default     = true
}

# ------------------------------------------------------------------------------
# 5. Switch di Controllo e Attivazione Moduli
# ------------------------------------------------------------------------------

variable "enable_cloud_run_deploy" {
  type        = bool
  description = "Abilita la creazione dei servizi Cloud Run. Utile per creare prima l'infrastruttura di base (APIs, DB, Registry) e poi distribuire i servizi una volta pushate le immagini Docker."
  default     = true
}

variable "enable_cloud_scheduler" {
  type        = bool
  description = "Abilita i 5 job pianificati su Google Cloud Scheduler."
  default     = true
}

# ------------------------------------------------------------------------------
# 6. Configurazione CI/CD Cloud Build & GitHub Trigger
# ------------------------------------------------------------------------------

variable "github_repo_owner" {
  type        = string
  description = "Proprietario dell'account GitHub o organizzazione del repository."
  default     = "rubens672"
}

variable "github_repo_name" {
  type        = string
  description = "Nome del repository GitHub per la pipeline CI/CD di Cloud Build."
  default     = "antigravity-challenge-lab"
}

variable "github_branch_pattern" {
  type        = string
  description = "Espressione regolare del branch GitHub che attiva la build (es. '^main$')."
  default     = "^main$"
}

variable "enable_cloud_build_trigger" {
  type        = bool
  description = "Abilita la creazione automatica del Trigger Cloud Build per GitHub."
  default     = true
}

# ------------------------------------------------------------------------------
# 7. Domini Personalizzati (Cloud Run Domain Mapping a Costo 0,00 €)
# ------------------------------------------------------------------------------

variable "custom_domain_cockpit" {
  type        = string
  description = "Dominio personalizzato per financial-cockpit-web (es. 'cockpit.berticloud.ai'). Se vuoto, non viene creato il mapping."
  default     = ""
}

variable "custom_domain_user" {
  type        = string
  description = "Dominio personalizzato per financial-user-web (es. 'app.berticloud.ai'). Se vuoto, non viene creato il mapping."
  default     = ""
}

# ------------------------------------------------------------------------------
# 8. Google Cloud Deploy (Continuous Delivery Pipeline a 2 Ambienti: Test e Prod)
# ------------------------------------------------------------------------------

variable "enable_cloud_deploy" {
  type        = bool
  description = "Abilita la creazione delle risorse di Google Cloud Deploy (Pipeline e Target Test/Prod)."
  default     = true
}

# ------------------------------------------------------------------------------
# 9. Google Kubernetes Engine (GKE) Autopilot
# ------------------------------------------------------------------------------

variable "enable_gke_deploy" {
  type        = bool
  description = "Abilita la creazione del cluster GKE Autopilot e del Service Account con Workload Identity."
  default     = true
}

variable "gke_cluster_name" {
  type        = string
  description = "Nome del cluster GKE Autopilot per la piattaforma fintech."
  default     = "fintech-gke-prod"
}

# ------------------------------------------------------------------------------
# 10. Google Cloud Monitoring & Observability (Bottlenecks Detection)
# ------------------------------------------------------------------------------

variable "enable_monitoring_observability" {
  type        = bool
  description = "Abilita la creazione della dashboard dei colli di bottiglia e delle policy di allarme PromQL in Google Cloud Monitoring."
  default     = true
}

variable "enable_monitoring_alerts" {
  type        = bool
  description = "Abilita le policy di allarme PromQL. Va attivato dopo il primo deployment dei pod quando le metriche sono state ingerite da GMP."
  default     = false
}

