# ==============================================================================
# versions.tf — Dichiarazione delle versioni di Terraform e dei Provider GCP
# ==============================================================================
# Questo file indica a Terraform quale versione minima del programma è richiesta
# e quali "plugin" (detti Provider) scaricare per poter interagire con Google Cloud.
# ==============================================================================

terraform {
  # Richiede Terraform versione 1.16.0 o superiore (utilizza la tua v1.16.3 installata)
  required_version = ">= 1.16.0"

  required_providers {
    # Provider ufficiale di Google Cloud Platform
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }

    # Provider Google Beta (usato per funzionalità recenti o anteprime di Cloud Run / Firestore)
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 6.0"
    }
  }

  # NOTA DIDATTICA sullo "State Backend":
  # Di default Terraform salva lo stato (terraform.tfstate) in locale sul tuo disco.
  # Quando si lavora in team o in produzione, questo blocco può essere decommentato
  # per salvare lo stato in un bucket Google Cloud Storage (GCS) remoto e protetto:
  #
  # backend "gcs" {
  #   bucket = "fintech-data-hub-terraform-state"
  #   prefix = "terraform/state"
  # }
}
