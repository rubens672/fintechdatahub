# Manuale Operativo: Continuous Delivery con Google Cloud Deploy su GKE Autopilot (Test & Produzione)

**Autore:** Antigravity AI Engineering Team  
**Stato:** Guida Ufficiale di Rilascio e Deployment  
**Target Attivo:** Google Kubernetes Engine Autopilot (`fintech-gke-prod` - `europe-west1`)

---

## 1. Visione Generale dell'Architettura

La piattaforma utilizza **Google Cloud Deploy** come orchestratore centralizzato e dichiarativo di Continuous Delivery verso il cluster **GKE Autopilot (`fintech-gke-prod`)**, separando rigorosamente le fasi di integrazione (CI via Cloud Build) dal deployment (CD via Cloud Deploy + Skaffold + Kustomize):

```
       Git Push (main / feature branch)
                      │
                      ▼
         [ Google Cloud Build ]
          1. Build parallelo container Docker (8 microservizi)
          2. Push su Artifact Registry (europe-west1)
          3. Sincronizzazione clouddeploy.yaml & Creazione Release su Cloud Deploy
                      │
                      ▼
   [ Google Cloud Deploy: financial-platform-pipeline ]
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
[1. STADIO TEST (GKE)]       [2. STADIO PRODUZIONE (GKE)]
- Target: financial-test     - Target: financial-prod
- Cluster: fintech-gke-prod  - Cluster: fintech-gke-prod
- Profilo Skaffold: test     - Profilo Skaffold: prod (Spot Pods)
- Smoke Test (verify: true)  - requireApproval: false (Auto-Promote)
                             - Rollback istantaneo a 1-click
```

---

## 2. Struttura dei Repository & Manifest

```
antigravity-challenge-lab/
├── clouddeploy.yaml              # Pipeline e Target GKE per 'gcloud deploy apply'
├── skaffold.yaml                 # Configurazione Skaffold v4beta7 (profili test, prod, gke-prod)
├── cloudbuild.yaml               # Pipeline CI/CD Cloud Build -> Cloud Deploy -> GKE
└── deploy/k8s/                   # Manifest nativi per Google Kubernetes Engine (GKE Autopilot)
    ├── base/                     # 8 Deployment, ClusterIP, Cloudflare Tunnel, RBAC e 7 CronJob nativi
    └── overlays/
        └── prod/                 # Overlay Kustomize con selettore GKE Spot Pods
```

---

## 3. Gestione con Terraform (`terraform/cloud_deploy.tf`)

Tutte le risorse di Cloud Deploy sono dichiarate come Infrastructure as Code (IaC) e sincronizzate:

1. **Service Account `clouddeploy-runner`**:
   - `roles/clouddeploy.jobRunner`: esecuzione dei job di render, deploy e verify.
   - `roles/clouddeploy.operator`: esecuzione delle promozioni automatiche e avanzamento rollout.
   - `roles/container.developer`: deploy e aggiornamento dei workload sul cluster GKE Autopilot `fintech-gke-prod`.
   - `roles/iam.serviceAccountUser`: autorizzazione per Cloud Deploy Service Agent.
   - `roles/artifactregistry.reader`: download delle immagini e dei metadati.
   - `roles/logging.logWriter` & `roles/storage.objectViewer`: tracciamento dei log e lettura dei bundle di rilascio.

2. **Delivery Pipeline, Targets GKE & Automazione**:
   - Pipeline: `financial-platform-pipeline` (regione: `europe-west1`).
   - Target Test: `financial-test` (cluster GKE `fintech-gke-prod`, rollout automatico con `verify = true`).
   - Target Produzione: `financial-prod` (cluster GKE `fintech-gke-prod`, rollout automatico continuo con `require_approval = false`).
   - Automation: `auto-promote-to-prod` (promuove automaticamente da `financial-test` a `financial-prod` al superamento del verify).

3. **Permessi di Cloud Build**:
   - Il service account di compilazione ha il ruolo `roles/clouddeploy.releaser` per generare automaticamente le release alla conclusione del push delle immagini.

---

## 4. Runbook Operativo (Comandi CLI `gcloud deploy`)

### A. Ispezione della Pipeline e dei Target

```bash
# Visualizza lo stato della pipeline
gcloud deploy delivery-pipelines describe financial-platform-pipeline \
  --region=europe-west1 \
  --project=fintech-data-hub-45513

# Elenco dei target disponibili
gcloud deploy targets list \
  --region=europe-west1 \
  --project=fintech-data-hub-45513
```

### B. Promozione di una Release da Test a Produzione (Automatica & Manuale)

La pipeline promuove e rilascia **automaticamente** la release da test a produzione via `auto-promote-to-prod`. Se si desidera forzare manualmente una promozione:

```bash
# 1. Trova l'identificativo dell'ultima release
gcloud deploy releases list \
  --delivery-pipeline=financial-platform-pipeline \
  --region=europe-west1 \
  --project=fintech-data-hub-45513

# 2. Promuovi la release allo stadio successivo (Produzione)
gcloud deploy releases promote \
  --release=rel-018b70a \
  --delivery-pipeline=financial-platform-pipeline \
  --region=europe-west1 \
  --project=fintech-data-hub-45513
```

### C. Rilascio Automatico in Produzione (Senza Blocco di Approvazione)

Con `requireApproval: false`, il rollout in produzione viene avviato **istantaneamente in modo automatico** non appena il collaudo nello stadio di test ha esito positivo. Non è richiesta alcuna approvazione manuale.

Se per motivi di audit si volesse ripristinare il blocco manuale, basterà impostare `require_approval = true` in Terraform o `clouddeploy.yaml`. In tal caso, il comando di sblocco è:

```bash
gcloud deploy rollouts approve <NOME_ROLLOUT> \
  --release=rel-018b70a \
  --delivery-pipeline=financial-platform-pipeline \
  --region=europe-west1 \
  --project=fintech-data-hub-45513
```

### D. Procedura di Rollback Immediato a 1-Click

Se in produzione si riscontra un'anomalia, è possibile effettuare un rollback istantaneo alla versione stabile precedente sul cluster GKE Autopilot:

```bash
gcloud deploy targets rollback financial-prod \
  --delivery-pipeline=financial-platform-pipeline \
  --region=europe-west1 \
  --project=fintech-data-hub-45513
```
Cloud Deploy crea immediatamente un nuovo rollout applicando l'ultimo release bundle Kustomize che era stato verificato e distribuito con successo.

---

## 5. Configurazione Attiva GKE Autopilot (`clouddeploy.yaml` & `skaffold.yaml`)

I target di Cloud Deploy sono configurati nativamente per puntare al cluster GKE Autopilot `fintech-gke-prod` (`europe-west1`) tramite la direttiva `gke:`:

```yaml
apiVersion: deploy.cloud.google.com/v1
kind: Target
metadata:
  name: financial-prod
description: Target di Produzione Istituzionale (GKE Autopilot fintech-gke-prod)
requireApproval: false
gke:
  cluster: projects/fintech-data-hub-45513/locations/europe-west1/clusters/fintech-gke-prod
executionConfigs:
- usages:
  - RENDER
  - DEPLOY
  serviceAccount: clouddeploy-runner@fintech-data-hub-45513.iam.gserviceaccount.com
```

La cartella `deploy/k8s/` contiene tutti i manifest Kubernetes (`base/` e `overlays/prod/` con Spot VMs, 8 Deployment applicativi, `cloudflared` Zero-Trust Tunnel e 7 CronJob nativi `batch/v1`), renderizzati automaticamente da Skaffold (`skaffold.yaml`) durante ogni rilascio Cloud Deploy.

