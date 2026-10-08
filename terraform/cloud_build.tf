# ==============================================================================
# cloud_build.tf — Pipeline CI/CD Google Cloud Build & Trigger GitHub
# ==============================================================================
# Google Cloud Build è il servizio di Continuous Integration & Continuous Delivery
# (CI/CD) serverless di GCP.
#
# DIDATTICA:
# In questo file configuriamo:
# 1. Il recupero automatico del 'Project Number' di GCP tramite Data Source.
# 2. I permessi IAM necessari per il Service Account di Cloud Build.
# 3. L'autorizzazione per Cloud Build ad agire per conto di 'cloudrun-sa'.
# 4. Il Trigger GitHub automatico che avvia 'cloudbuild.yaml' ad ogni push su 'main'.
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. Data Source per ottenere il Project Number di GCP
# ------------------------------------------------------------------------------
# In GCP, il Service Account di default di Cloud Build segue sempre il pattern:
# [PROJECT_NUMBER]@cloudbuild.gserviceaccount.com
# Usiamo un 'data' block per leggere il numero dinamicamente da GCP.
data "google_project" "current" {
  project_id = var.project_id
}

locals {
  cloudbuild_sa_email    = "${data.google_project.current.number}@cloudbuild.gserviceaccount.com"
  compute_sa_email       = "${data.google_project.current.number}-compute@developer.gserviceaccount.com"
  cloudbuild_agent_email = "service-${data.google_project.current.number}@gcp-sa-cloudbuild.iam.gserviceaccount.com"

  # Identità di compilazione usate da Cloud Build (sia la legacy sia la moderna Compute Engine)
  build_identities = [
    "serviceAccount:${data.google_project.current.number}@cloudbuild.gserviceaccount.com",
    "serviceAccount:${data.google_project.current.number}-compute@developer.gserviceaccount.com"
  ]

  cloudbuild_roles = [
    "roles/run.admin",                    # Permette di distribuire e aggiornare i servizi Cloud Run
    "roles/container.developer",          # Permette a Cloud Build di effettuare il deploy dei carichi di lavoro su GKE
    "roles/iam.serviceAccountUser",       # Permette di assegnare identità di servizio ai container
    "roles/artifactregistry.writer",      # Permette di effettuare il push delle immagini Docker
    "roles/logging.logWriter",            # Permette di scrivere i log della pipeline di compilazione
    "roles/secretmanager.secretAccessor", # Permette di leggere i secret durante il deploy dei servizi
    "roles/clouddeploy.releaser",         # Permette a Cloud Build di creare release su Cloud Deploy
    "roles/storage.admin"                 # Permette a Cloud Build di leggere e scrivere oggetti nello storage sorgenti
  ]

  # Matrice combinata identità x ruoli per for_each pulito
  build_iam_pairs = flatten([
    for member in local.build_identities : [
      for role in local.cloudbuild_roles : {
        member = member
        role   = role
      }
    ]
  ])
}

# ------------------------------------------------------------------------------
# 2. Ruoli IAM assegnati ai Service Account di Cloud Build sul Progetto
# ------------------------------------------------------------------------------
# Copre sia il Service Account standard di Cloud Build sia il Compute Engine SA
# abilitando completamente le autorizzazioni nella Console GCP (Cloud Build > Impostazioni).
resource "google_project_iam_member" "cloudbuild_sa_roles" {
  for_each = {
    for pair in local.build_iam_pairs : "${pair.member}-${pair.role}" => pair
  }

  project = var.project_id
  role    = each.value.role
  member  = each.value.member

  depends_on = [
    google_project_service.gcp_services["cloudbuild.googleapis.com"]
  ]
}

# ------------------------------------------------------------------------------
# 3. Autorizzazione ad Agire come 'cloudrun-sa' (ServiceAccountUser)
# ------------------------------------------------------------------------------
# Permette a Cloud Build e al relativo Service Agent di utilizzare 'cloudrun-sa'
# sia durante i build step sia come identità runtime dei servizi Cloud Run.
resource "google_service_account_iam_member" "cloudbuild_act_as_cloudrun_sa" {
  for_each = toset([
    "serviceAccount:${local.cloudbuild_sa_email}",
    "serviceAccount:${local.compute_sa_email}",
    "serviceAccount:${local.cloudbuild_agent_email}"
  ])

  service_account_id = google_service_account.cloudrun_sa.name
  role               = "roles/iam.serviceAccountUser"
  member             = each.value
}

# ------------------------------------------------------------------------------
# 4. Trigger GitHub per Cloud Build
# ------------------------------------------------------------------------------
# Attiva automaticamente la pipeline definita in 'cloudbuild.yaml' quando viene
# effettuato un git push sul branch 'main'.
resource "google_cloudbuild_trigger" "main_trigger" {
  count       = var.enable_cloud_build_trigger ? 1 : 0
  project     = var.project_id
  name        = "financial-platform-main-trigger"
  description = "Deploy automatico della Financial Platform su push al branch ${var.github_branch_pattern}"

  github {
    owner = var.github_repo_owner
    name  = var.github_repo_name
    push {
      branch = var.github_branch_pattern
    }
  }

  filename = "cloudbuild.yaml"

  # Service Account con cui viene eseguita la pipeline di build
  service_account = google_service_account.cloudrun_sa.id

  # Variabili di sostituzione passate direttamente a cloudbuild.yaml
  substitutions = {
    _REGION  = var.region
    _PROJECT = var.project_id
    _REPO    = var.artifact_repository_id
    _RUN_SA  = google_service_account.cloudrun_sa.email
  }

  depends_on = [
    google_project_service.gcp_services["cloudbuild.googleapis.com"],
    google_artifact_registry_repository.docker_repo,
    google_service_account.cloudrun_sa
  ]
}
