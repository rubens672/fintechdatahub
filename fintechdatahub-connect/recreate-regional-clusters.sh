#!/usr/bin/env bash
set -e

# Configurazione variabili
export PROJECT_ID=$(gcloud config get-value project)
export REGION="europe-west8"
export ZONE="europe-west8-a"
export SA_EMAIL="gke-node-sa@${PROJECT_ID}.iam.gserviceaccount.com"

echo "=== 1. Abilitazione Private Google Access sulla Subnet VPC default ==="
gcloud compute networks subnets update default \
    --region="${REGION}" \
    --enable-private-ip-google-access || true

echo "=== 2. Configurazione Cloud Router e Cloud NAT Gateway ==="
if ! gcloud compute routers describe nat-router-${REGION} --region="${REGION}" > /dev/null 2>&1; then
    gcloud compute routers create nat-router-${REGION} \
        --network=default \
        --region="${REGION}"
fi

if ! gcloud compute routers nats describe nat-gateway-${REGION} --router=nat-router-${REGION} --region="${REGION}" > /dev/null 2>&1; then
    gcloud compute routers nats create nat-gateway-${REGION} \
        --router=nat-router-${REGION} \
        --region="${REGION}" \
        --auto-allocate-nat-external-ips \
        --nat-all-subnet-ip-ranges
fi

echo "=== 3. Eliminazione dei vecchi cluster ==="
gcloud container clusters delete test --region="${REGION}" --quiet --async || true
gcloud container clusters delete staging --region="${REGION}" --quiet --async || true
gcloud container clusters delete prod --region="${REGION}" --quiet --async || true
gcloud container clusters delete test --zone="${ZONE}" --quiet --async || true
gcloud container clusters delete staging --zone="${ZONE}" --quiet --async || true
gcloud container clusters delete prod --zone="${ZONE}" --quiet --async || true

echo "=== Attesa completamento cancellazione cluster... ==="
while gcloud container clusters list --format="value(name)" | grep -E "test|staging|prod" > /dev/null 2>&1; do
    echo "In attesa che i vecchi cluster vengano eliminati..."
    sleep 15
done
echo "Vecchi cluster eliminati."

echo "=== 4. Creazione dei nuovi cluster regionali PRIVATI (senza IP pubblici sui nodi) ==="
gcloud container clusters create test \
  --region="${REGION}" \
  --enable-private-nodes \
  --master-ipv4-cidr=172.16.0.0/28 \
  --service-account="${SA_EMAIL}" \
  --num-nodes=1 \
  --disk-size=50 \
  --disk-type=pd-balanced \
  --enable-autoscaling \
  --min-nodes=1 \
  --max-nodes=2 \
  --async

gcloud container clusters create staging \
  --region="${REGION}" \
  --enable-private-nodes \
  --master-ipv4-cidr=172.16.0.16/28 \
  --service-account="${SA_EMAIL}" \
  --num-nodes=1 \
  --disk-size=50 \
  --disk-type=pd-balanced \
  --enable-autoscaling \
  --min-nodes=1 \
  --max-nodes=2 \
  --async

gcloud container clusters create prod \
  --region="${REGION}" \
  --enable-private-nodes \
  --master-ipv4-cidr=172.16.0.32/28 \
  --service-account="${SA_EMAIL}" \
  --num-nodes=1 \
  --disk-size=50 \
  --disk-type=pd-balanced \
  --enable-autoscaling \
  --min-nodes=1 \
  --max-nodes=3 \
  --async

echo "=== Attesa completamento creazione cluster regionali privati... ==="
while true; do
    TEST_STATUS=$(gcloud container clusters describe test --region="${REGION}" --format="value(status)" 2>/dev/null || echo "CREATING")
    STAGING_STATUS=$(gcloud container clusters describe staging --region="${REGION}" --format="value(status)" 2>/dev/null || echo "CREATING")
    PROD_STATUS=$(gcloud container clusters describe prod --region="${REGION}" --format="value(status)" 2>/dev/null || echo "CREATING")
    
    echo "Status: test=${TEST_STATUS}, staging=${STAGING_STATUS}, prod=${PROD_STATUS}"
    
    if [ "${TEST_STATUS}" = "RUNNING" ] && [ "${STAGING_STATUS}" = "RUNNING" ] && [ "${PROD_STATUS}" = "RUNNING" ]; then
        break
    fi
    sleep 20
done

echo "=== 5. Configurazione credenziali e contesti kubectl ==="
CONTEXTS=("test" "staging" "prod")
for CONTEXT in "${CONTEXTS[@]}"
do   
    gcloud container clusters get-credentials "${CONTEXT}" --region "${REGION}"
    kubectl config rename-context "gke_${PROJECT_ID}_${REGION}_${CONTEXT}" "${CONTEXT}" --force 2>/dev/null || true
done

echo "=== 6. Ri-applicazione configurazione Cloud Deploy ==="
gcloud deploy apply --file=clouddeploy.yaml --region="${REGION}"

echo "=== Operazione completata con successo! ==="
gcloud container clusters list --format="table(name,location,status,numNodes)"
