# FintechDataHub Connect - Microservices & Kubernetes Pipeline

Progetto di microservizi decoupled in **Java 17 / Spring Boot 3.x**, pronti per lo sviluppo in locale tramite **Minikube** e **Skaffold** e per il deployment aziendale in ambiente cloud su **Google Cloud Platform (GCP Cloud Deploy & GKE)**.

---

## 🏗️ Architettura del Sistema

Il sistema si compone di due microservizi indipendenti:

1. **`fintechdatahub-connect-rest` (Service REST - Porta 8081)**:
   - Legge i dati finanziari dal file JSON `src/main/resources/data/sample-data.json`.
   - Espone l'endpoint REST `GET /api/v1/data`.
   - Percorso del file configurabile via `application.yml` ed override tramite variabile d'ambiente `DATA_FILE_PATH`.

2. **`fintechdatahub-connect-webapp` (Web Application - Porta 8080)**:
   - Fornisce la dashboard web responsive basata su **Thymeleaf** e **Bootstrap 5 (CDN)**.
   - Recupera le notizie via HTTP dal microservizio REST.
   - Endpoint del servizio REST configurabile tramite variabile d'ambiente `REST_SERVICE_URL`.

---

## 📁 Struttura del Repository

```text
fintechdatahub-connect/
├── pom.xml                        # Maven Parent POM (Multi-modulo)
├── skaffold.yaml                  # Configurazione Skaffold (Local, Dev, Test, Prod)
├── README.md                      # Documentazione del progetto
├── news-template.json             # Template sorgente dati di esempio
├── fintechdatahub-connect-rest/   # Modulo REST Service
│   ├── Dockerfile                 # Multi-stage Dockerfile
│   ├── pom.xml
│   └── src/
└── fintechdatahub-connect-webapp/ # Modulo Web Application
    ├── Dockerfile                 # Multi-stage Dockerfile
    ├── pom.xml
    └── src/
└── k8s/                           # Manifest Kubernetes gestiti con Kustomize
    ├── base/                      # Risorse Kubernetes comuni
    │   ├── kustomization.yaml
    │   ├── rest-deployment.yaml
    │   ├── rest-service.yaml
    │   ├── webapp-deployment.yaml
    │   └── webapp-service.yaml
    └── overlays/                  # Sovrascritture specifiche per i 4 ambienti
        ├── local/                 # Ambiente Minikube Locale
        │   ├── kustomization.yaml
        │   └── webapp-configmap.yaml
        ├── dev/                   # Ambiente GCP DEV
        │   ├── kustomization.yaml
        │   └── webapp-configmap.yaml
        ├── test/                  # Ambiente GCP TEST
        │   ├── kustomization.yaml
        │   └── webapp-configmap.yaml
        └── prod/                  # Ambiente GCP PROD (2 Repliche alta disponibilità)
            ├── kustomization.yaml
            └── webapp-configmap.yaml
```

---

## 🛠️ Requisiti Software

- **Java**: 17 LTS (o superiore)
- **Maven**: 3.8+
- **Docker**: 20.10+
- **Minikube**: v1.30+
- **kubectl**: v1.26+
- **Skaffold**: v2.x+ (opzionale per sviluppo in live-reload)

---

## 🚀 Guida Rapida allo Sviluppo in Locale

### Metodo 1: Sviluppo Reattivo con Skaffold (Consigliato)

Con **Skaffold**, le immagini vengono compilate direttamente dentro Minikube (senza push remoti) ed i log ed il port-forwarding vengono gestiti in automatico.

1. **Avvia Minikube**:
   ```bash
   minikube start
   ```

2. **Lancia lo sviluppo continuo**:
   ```bash
   cd fintechdatahub-connect
   skaffold dev --profile=local
   ```
   *Skaffold compila le immagini, applica i manifest Kustomize locali, attiva il port-forwarding sulla porta `8080` e ricompila automaticamente i container ad ogni modifica del codice sorgente!*

3. **Apri la Dashboard nel Browser**:
   [http://localhost:8080](http://localhost:8080)

---

### Metodo 2: Deployment Manuale su Minikube con Docker & Kubectl

1. **Configura il daemon Docker di Minikube**:
   ```bash
   eval $(minikube -p minikube docker-env)
   ```

2. **Compila le Immagini Docker**:
   ```bash
   # Dalla cartella fintechdatahub-connect
   minikube image build -t fintechdatahub-connect-rest:latest -f ./fintechdatahub-connect-rest/Dockerfile .
   minikube image build -t fintechdatahub-connect-webapp:latest -f ./fintechdatahub-connect-webapp/Dockerfile .
   ```

3. **Applica i Manifest Kustomize dell'Ambiente Locale**:
   ```bash
   kubectl apply -k k8s/overlays/local
   ```

4. **Accedi al Servizio WebApp**:
   ```bash
   minikube service fintechdatahub-connect-webapp-service
   ```

---

## ☁️ Deployment Enterprise su GCP (Cloud Deploy)

Questo repository è predisposto per le pipeline di **GCP Cloud Deploy**. Durante il flusso CI/CD, Cloud Deploy esegue il rendering dei manifest tramite Skaffold utilizzando i profili definiti in `skaffold.yaml`:

- **Ambiente DEV**:
  ```bash
  skaffold run --profile=dev
  ```
- **Ambiente TEST**:
  ```bash
  skaffold run --profile=test
  ```
- **Ambiente PROD**:
  ```bash
  skaffold run --profile=prod
  ```

---

## 🔍 Comandi di Diagnostica e Troubleshooting

- **Verifica lo stato dei Pod e dei Servizi**:
  ```bash
  kubectl get pods,svc,configmap
  ```

- **Visualizza i Log del Servizio REST**:
  ```bash
  kubectl logs deployment/fintechdatahub-connect-rest-deployment -f
  ```

- **Visualizza i Log della Web Application**:
  ```bash
  kubectl logs deployment/fintechdatahub-connect-webapp-deployment -f
  ```

- **Riavvio Rolling di un Deployment**:
  ```bash
  kubectl rollout restart deployment/fintechdatahub-connect-webapp-deployment
  ```
