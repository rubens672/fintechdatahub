# Guida Completa: GKE Private Clusters + Cloud NAT

## 🛡️ Cos'è e perché è l'Architettura Enterprise Gold Standard

Fino ad oggi, i nodi delle tue macchine virtuali GKE possedevano ciascuno un **IP Pubblico diretto**. 
Con 3 cluster (`test`, `staging`, `prod`), ogni nodo in ogni zona prendeva 1 IP pubblico, raggiungendo il limite di quota GCP (8 IP pubblici).

### L'Architettura con Private Clusters e Cloud NAT:

```
                  ┌──────────────────────────────────────────────┐
                  │                 INTERNET                     │
                  └───────┬──────────────────────────────▲───────┘
                          │ (Inbound Traffic)            │ (Outbound Traffic)
                          ▼                              │
                ┌──────────────────┐           ┌─────────┴─────────┐
                │ GKE Ingress / LB │           │    Cloud NAT      │
                │   (1 IP Pubblico)│           │   (1 IP Pubblico) │
                └─────────┬────────┘           └─────────▲─────────┘
                          │                              │
     ═════════════════════╪══════════════════════════════╪═════════════════════
     RETE PRIVATA VPC (Nessun IP Pubblico per le VM Nodi)│
                          │                              │
                          ▼                              │
             ┌─────────────────────────┐                 │
             │ Pod WebApp / REST       │                 │
             │ Nodi Worker GKE         ├─────────────────┘
             │ (Solo IP Privati 10.x)  │  (Download Docker Images, API esterne)
             └─────────────────────────┘
```

### Vantaggi Chiave:

1. **Sicurezza Totale (Zero Surface Exposure)**: 
   I nodi worker non hanno alcun IP pubblico. Un hacker su Internet **non può tentare la connessione diretta via SSH o exploit di porta** alle VM del cluster.
2. **Quota IP Pubblici Ottimizzata**:
   **0 IP pubblici usati dai nodi!** Un solo IP pubblico viene condiviso da Cloud NAT per tutti i cluster ed i nodi della regione `europe-west8`. Puoi scalare fino a 100 nodi senza mai superare la quota di IP.
3. **Traffico Esterno Garantito (Egress NAT)**:
   Quando i container o i nodi devono scaricare pacchetti Linux, comunicare con API esterne o registri Docker, il traffico esce in sicurezza attraverso il gateway Cloud NAT.

---

## 🛠️ Procedura Operativa di Implementazione

### 1. Abilitare Private Google Access sulla Subnet VPC
Consente ai pod ed alle VM senza IP pubblico di accedere ai servizi Google Cloud (Artifact Registry, Cloud Logging, Cloud Storage) tramite IP interni di Google.

```bash
gcloud compute networks subnets update default \
    --region=europe-west8 \
    --enable-private-ip-google-access
```

### 2. Creazione di Cloud Router e Cloud NAT Gateway
Crea il Gateway NAT nella regione `europe-west8` con IP pubblico allocato automaticamente.

```bash
# Crea il Cloud Router
gcloud compute routers create nat-router-europe-west8 \
    --network=default \
    --region=europe-west8

# Crea il Gateway Cloud NAT
gcloud compute routers nats create nat-gateway-europe-west8 \
    --router=nat-router-europe-west8 \
    --region=europe-west8 \
    --auto-allocate-nat-external-ips \
    --nat-all-subnetworks-to-nat
```

### 3. Ricreazione dei Cluster GKE Privati
Per ciascun cluster (`test`, `staging`, `prod`), aggiungiamo i parametri:
* `--enable-private-nodes`: Rimuove gli IP pubblici dai nodi worker.
* `--master-ipv4-cidr`: Definisce un blocco `/28` di IP interni dedicati per la comunicazione privata col Control Plane.

```bash
export REGION="europe-west8"
export PROJECT_ID=$(gcloud config get-value project)
export SA_EMAIL="gke-node-sa@${PROJECT_ID}.iam.gserviceaccount.com"

# Cluster TEST (Master CIDR: 172.16.0.0/28)
gcloud container clusters create test \
  --region=$REGION \
  --enable-private-nodes \
  --master-ipv4-cidr=172.16.0.0/28 \
  --service-account=$SA_EMAIL \
  --num-nodes=1 \
  --disk-size=50 \
  --disk-type=pd-balanced \
  --enable-autoscaling \
  --min-nodes=1 \
  --max-nodes=2 \
  --async

# Cluster STAGING (Master CIDR: 172.16.0.16/28)
gcloud container clusters create staging \
  --region=$REGION \
  --enable-private-nodes \
  --master-ipv4-cidr=172.16.0.16/28 \
  --service-account=$SA_EMAIL \
  --num-nodes=1 \
  --disk-size=50 \
  --disk-type=pd-balanced \
  --enable-autoscaling \
  --min-nodes=1 \
  --max-nodes=2 \
  --async

# Cluster PROD (Master CIDR: 172.16.0.32/28)
gcloud container clusters create prod \
  --region=$REGION \
  --enable-private-nodes \
  --master-ipv4-cidr=172.16.0.32/28 \
  --service-account=$SA_EMAIL \
  --num-nodes=1 \
  --disk-size=50 \
  --disk-type=pd-balanced \
  --enable-autoscaling \
  --min-nodes=1 \
  --max-nodes=3 \
  --async
```

---

## 📊 Verifiche Post-Implementazione

1. **Verifica Cloud NAT**:
   ```bash
   gcloud compute routers nats describe nat-gateway-europe-west8 --router=nat-router-europe-west8 --region=europe-west8
   ```

2. **Verifica IP Privati dei Nodi**:
   ```bash
   kubectl get nodes -o wide
   # Nella colonna EXTERNAL-IP comparirà <none> (Nessun IP pubblico sui nodi!)
   ```

3. **Verifica Quota IP GCP**:
   L'utilizzo degli IP pubblici per i nodi scenderà da 8/8 a **0/8**!

---

## 🌐 Architettura di Rete: Inbound vs Outbound e Bilanciamento del Carico Utenti

### 1. Distinzione tra Traffico In ingresso ed In uscita

| Componente | Tipo di Traffico | IP Pubblico Usato | Scopo |
|---|---|---|---|
| **Cloud NAT Gateway** | **Outbound (Uscita)** | 1 IP Pubblico (Condiviso) | Permette ai nodi/pod senza IP pubblico di scaricare immagini Docker, accedere ad API esterne o pacchetti Linux. **Nessuno dall'esterno può entrare tramite questo IP.** |
| **GKE Ingress** | **Inbound (Ingresso)** | 1 IP Pubblico (Load Balancer) | Punto di accesso pubblico per gli utenti nel browser. Espone in modo sicuro solo ed esclusivamente il servizio WebApp. |

```
[ Utenti nel Browser ] ───(Inbound HTTP/HTTPS)───► [ IP Pubblico Ingress (GCE Load Balancer) ] ──► WebApp (IP Privato)
                                                                                                        │
[ Internet Esterno ]   ◄───(Outbound Requests)─── [ IP Pubblico Cloud NAT Gateway ] ◄───────────────┘
```

### 2. Come Funziona il Bilanciamento del Carico Utenti (Container-Native NEG)

Nel progetto viene utilizzata l'architettura **Container-Native Load Balancing** tramite annotazione NEG su `webapp-service`:
`cloud.google.com/neg: '{"ingress": true}'`

1. **Richiesta Utente**: L'utente si collega all'IP Pubblico dell'Ingress (Google External Application Load Balancer).
2. **Instradamento Diretto (NEG)**: Il Load Balancer di Google conosce direttamente gli **IP privati interni di ciascun Pod WebApp** (`10.x.x.x`) e manda il traffico direttamente ai container, eliminando i salti di rete ed azzerando la latenza.
3. **Health Checks**: Il Load Balancer verifica costantemente lo stato di salute dei Pod. Se un pod crasha, viene rimosso istantaneamente dal bilanciamento.
4. **Integrazione con Autoscaling (HPA)**: Quando l'Horizontal Pod Autoscaler scala la WebApp da 2 a 5 pod durante un picco di traffico, i nuovi Pod vengono registrati automaticamente nel Load Balancer per distribuire subito la carica.
