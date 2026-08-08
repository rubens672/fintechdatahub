# FintechDataHub Connect - Microservices & Kubernetes Pipeline

Progetto di microservizi decoupled in **Java 17 / Spring Boot 3.x**, pronti per lo sviluppo locale reattivo tramite **Minikube** e **Skaffold** e per il deployment aziendale enterprise su **Google Cloud Platform (GCP Cloud Deploy & GKE)** con strategie di **Canary Release** ed **Autoscaling (HPA & Cluster Autoscaler)**.

---

## 🏗️ Architettura del Sistema

Il sistema si compone di due microservizi indipendenti:

1. **`fintechdatahub-connect-rest` (Service REST - Porta 8081)**:
   - Legge i dati finanziari e notizie dal file JSON `src/main/resources/data/sample-data.json`.
   - Espone l'endpoint REST `GET /api/v1/data`.
   - Percorso del file configurabile via `application.yml` ed override tramite variabile d'ambiente `DATA_FILE_PATH`.

2. **`fintechdatahub-connect-webapp` (Web Application - Porta 8080)**:
   - Dashboard web responsive basata su **Thymeleaf** e **Bootstrap 5**.
   - Recupera le notizie via HTTP dal microservizio REST.
   - Endpoint del servizio REST configurabile tramite variabile d'ambiente `REST_SERVICE_URL` tramite ConfigMap.

---

## 📁 Struttura del Repository

```text
fintechdatahub-connect/
├── pom.xml                        # Maven Parent POM (Multi-modulo)
├── skaffold.yaml                  # Configurazione Skaffold (Profilo locale Hot-Sync e GCP CI/CD)
├── README.md                      # Documentazione aggiornata del progetto
├── artifacts.json                 # Registro degli artefatti compilati per Cloud Deploy
├── news-template.json             # Template sorgente dati di esempio
├── clouddeploy-config/            # Configurazione della Delivery Pipeline GCP Cloud Deploy
│   └── delivery-pipeline.yaml     # Pipeline con 3 Target (test, staging, prod) e strategia Canary
├── fintechdatahub-connect-rest/   # Modulo REST Service
│   ├── Dockerfile                 # Multi-stage Dockerfile (JRE Alpine)
│   ├── pom.xml
│   └── src/
├── fintechdatahub-connect-webapp/ # Modulo Web Application
│   ├── Dockerfile                 # Multi-stage Dockerfile (JRE Alpine)
│   ├── pom.xml
│   └── src/
└── k8s/                           # Manifest Kubernetes gestiti con Kustomize
    ├── base/                      # Risorse Kubernetes comuni
    │   ├── kustomization.yaml
    │   ├── web-app-namespace.yaml # Namespace isolato `web-app`
    │   ├── rest-deployment.yaml
    │   ├── rest-service.yaml
    │   ├── webapp-deployment.yaml
    │   ├── webapp-service.yaml
    │   ├── webapp-configmap.yaml
    │   └── ingress-setup.yaml     # GCE Ingress & BackendConfig
    └── overlays/                  # Sovrascritture specifiche per gli ambienti
        ├── local/                 # Ambiente Minikube Locale (Hot-Sync)
        │   └── kustomization.yaml
        ├── test/                  # Ambiente GCP TEST
        │   └── kustomization.yaml
        ├── staging/               # Ambiente GCP STAGING
        │   └── kustomization.yaml
        └── prod/                  # Ambiente GCP PROD (2 Repliche + HPA)
            ├── kustomization.yaml
            └── hpa-webapp.yaml    # Horizontal Pod Autoscaler (2 - 5 Pods)
```

---

## ⚡ Caratteristiche di Produzione (PROD)

- **🐤 Rollout Canary Progressivo**: 
  Configurato in [`clouddeploy-config/delivery-pipeline.yaml`](file:///home/aberti/cloud-devops-labs/fintechdatahub/fintechdatahub-connect/clouddeploy-config/delivery-pipeline.yaml). La promozione verso `prod` distribuisce gradualmente il traffico sulla nuova release (**10% ➡️ 30% ➡️ 60% ➡️ 100%**) sfruttando Kubernetes Service Networking.
- **📊 Horizontal Pod Autoscaler (HPA)**:
  Definito in [`k8s/overlays/prod/hpa-webapp.yaml`](file:///home/aberti/cloud-devops-labs/fintechdatahub/fintechdatahub-connect/k8s/overlays/prod/hpa-webapp.yaml). Scala automaticamente il deployment webapp da **2 a 5 repliche** quando l'uso medio di CPU supera il **70%**.
- **🖥️ GKE Cluster Autoscaler**:
  Abilitato sul Node Pool `default-pool` del cluster GKE `prod` per aggiungere automaticamente nodi VM (**min: 1, max: 3**) in caso di saturazione delle risorse del nodo.
- **🌐 GCP Cloud Load Balancing (Ingress & BackendConfig)**:
  Configurato con Health Checks HTTP dedicati per gestire il traffico esterno e l'instradamento verso la Web Application.

---

## 🛠️ Requisiti Software

- **Java**: 17 LTS
- **Maven**: 3.8+
- **Docker**: 20.10+
- **Google Cloud SDK (gcloud)**: Con plugin `gke-gcloud-auth-plugin`
- **kubectl**: v1.26+
- **Skaffold**: v2.x+ / v4beta+
- **Minikube**: v1.30+ (per sviluppo locale)

---

## 🚀 Sviluppo Locale Reattivo (Minikube & Skaffold)

Con **Skaffold**, le modifiche al codice sorgente (file `.class` e `.yml`) vengono riflesse in tempo reale nel container tramite **Hot-Sync** senza dover ricostruire l'immagine Docker.

1. **Avvia Minikube**:
   ```bash
   minikube start --driver=docker
   ```

2. **Avvia Skaffold in modalità Dev**:
   ```bash
   cd fintechdatahub-connect
   skaffold dev --profile=local
   ```
   *Skaffold applica i manifest Kustomize locali, attiva il port-forwarding automatico sulla porta `8080` ed il live-reload.*

3. **Accedi alla Dashboard**:
   Apri [http://localhost:8080](http://localhost:8080) nel browser.

---

## ☁️ Deployment Enterprise su GCP (Cloud Deploy Pipeline)

### 1. Configurazione delle Variabili d'Ambiente
```bash
export PROJECT_ID=$(gcloud config get-value project)
export REGION="europe-west8"
export ZONE="europe-west8-a"
```

### 2. Build delle Immagini su Artifact Registry
Compila i microservizi e pubblica le immagini taggate su Artifact Registry generando `artifacts.json`:
```bash
skaffold build --interactive=false \
  --default-repo=$REGION-docker.pkg.dev/$PROJECT_ID/fdh-connect-registry \
  --file-output=artifacts.json
```

### 3. Applicazione della Delivery Pipeline
```bash
gcloud deploy apply --file=clouddeploy-config/delivery-pipeline.yaml --region=$REGION
```

### 4. Creazione della Release ed Avvio Deploy (su TEST)
```bash
gcloud deploy releases create release-005 \
  --delivery-pipeline=fintechdatahub-connect \
  --region=$REGION \
  --build-artifacts=artifacts.json
```

### 5. Promozione delle Release tra gli Ambienti

* **Da TEST a STAGING**:
  ```bash
  gcloud deploy releases promote \
    --release=release-005 \
    --delivery-pipeline=fintechdatahub-connect \
    --region=$REGION \
    --to-target=staging
  ```

* **Da STAGING a PROD (con Rollout Canary & Approvazione)**:
  ```bash
  gcloud deploy releases promote \
    --release=release-005 \
    --delivery-pipeline=fintechdatahub-connect \
    --region=$REGION \
    --to-target=prod
  ```

* **Approvazione manuale per PROD (se richiesta)**:
  ```bash
  gcloud deploy rollouts approve release-005-to-prod-0001 \
    --release=release-005 \
    --delivery-pipeline=fintechdatahub-connect \
    --region=$REGION
  ```

### 6. Gestione Rollback
In caso di problemi o regressioni in un qualsiasi ambiente:
```bash
gcloud deploy targets rollback prod \
  --delivery-pipeline=fintechdatahub-connect \
  --region=$REGION \
  --release=release-004
```

---

## 🔍 Diagnostica e Verifica del Cluster

- **Stato dei Pod in Produzione**:
  ```bash
  kubectl get pods -n web-app --context prod
  ```

- **Verifica dell'HPA in Produzione**:
  ```bash
  kubectl get hpa -n web-app --context prod
  ```

- **Verifica dell'Ingress e IP Pubblico**:
  ```bash
  kubectl get ingress fintechdatahub-connect-webapp-ingress -n web-app
  ```

- **Log dei Microservizi**:
  ```bash
  kubectl logs deployment/fintechdatahub-connect-webapp-deployment -n web-app -f
  kubectl logs deployment/fintechdatahub-connect-rest-deployment -n web-app -f
  ```
