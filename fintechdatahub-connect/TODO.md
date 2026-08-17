# Roadmap Infrastruttura Enterprise (Production-Grade)

Guida e checklist delle attività da implementare per trasformare l'attuale infrastruttura GKE + CI/CD in un ecosistema enterprise resiliente, sicuro e scalabile.

---

## 🔴 Priorità Alta

- [ ] **Infrastruttura come Codice (IaC) con Terraform**
  - [ ] Migrare la creazione di VPC, Subnet, Cluster GKE, IAM e Firewall da script bash (`recreate-regional-clusters.sh`) a file `.tf`.
  - [ ] Configurare il backend remoto GCS (`gcs` state backend) per salvataggio e locking dello stato.
- [ ] **Database Enterprise Gestito (Cloud SQL / AlloyDB)**
  - [ ] Sostituire il DB locale/in-cluster con Cloud SQL (PostgreSQL) in High Availability (HA).
  - [ ] Configurare l'accesso tramite Private IP e Cloud SQL Auth Proxy.
  - [ ] Abilitare i backup automatici e il Point-In-Time Recovery (PITR).
- [ ] **Sicurezza di Rete Zero Trust (Private GKE + Cloud NAT)**
  - [ ] Assicurarsi che tutti i cluster abbiano solo IP privati per i nodi.
  - [ ] Configurare il traffico in uscita tramite Cloud NAT.
  - [ ] Definire le Network Policies Kubernetes (Calico / Dataplane v2) per isolare il traffico inter-pod.

---

## 🟡 Priorità Media

- [ ] **Gestione delle Identità e dei Segreti (Workload Identity & Secret Manager)**
  - [ ] Rimuovere l'uso di chiavi Service Account fisiche (JSON) sostituendole con Workload Identity (KSA -> GSA binding).
  - [ ] Integrazione di Google Secret Manager tramite CSIDriver per caricare password e token nei pod in modo sicuro.
- [ ] **Protezione Edge & HTTPS (Cloud Armor + Managed Certificates)**
  - [ ] Configurare Google Cloud Armor sull'Ingress (Protezione WAF OWASP Top 10, DDoS, Rate Limiting).
  - [ ] Associare certificati SSL/TLS gestiti automaticamente (`ManagedCertificate` o `cert-manager`).
- [ ] **Osservabilità e Logging Centralizzato**
  - [ ] Configurare Google Cloud Managed Service for Prometheus (GMP) per metriche RED (Rate, Errors, Duration).
  - [ ] Impostare regole di Alerting su Cloud Monitoring (es. notifiche Slack/Teams per `CrashLoopBackOff`, CPU/RAM > 85%, elevati errori 5xx).

---

## 🟢 Priorità Avanzata

- [ ] **Supply Chain Security & Compliance**
  - [ ] Abilitare la scansione automatica di vulnerabilità su Artifact Registry (Vulnerability Scanning / Container Analysis).
  - [ ] Implementare **Binary Authorization** su GKE per consentire l'esecuzione solo delle immagini firmate da Cloud Build.
- [ ] **Tracciamento Distribuito (OpenTelemetry / Cloud Trace)**
  - [ ] Instrumentare le applicazioni (`fintechdatahub-connect-webapp` e `fintechdatahub-connect-rest`) con OpenTelemetry.
  - [ ] Inviare i trace a Google Cloud Trace per analizzare latenze end-to-end.
- [ ] **Autoscaling & Disaster Recovery (DR)**
  - [ ] Implementare HPA (Horizontal Pod Autoscaler) basato su metriche di traffico reale.
  - [ ] Pianificare strategie di Disaster Recovery e Backup for GKE (es. Velero) per ripristino cross-region.
