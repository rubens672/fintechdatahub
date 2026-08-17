#!/usr/bin/env bash
set -e

# Configurazione variabili
export PROJECT_ID=$(gcloud config get-value project)
export REGION="europe-west8"
export ZONE="europe-west8-a"
export SA_EMAIL="gke-node-sa@${PROJECT_ID}.iam.gserviceaccount.com"

echo "=== 1. Eliminazione dei vecchi cluster (zonali o regionali) ==="
#gcloud container clusters delete test --zone="${ZONE}" --quiet --async || true
#gcloud container clusters delete staging --zone="${ZONE}" --quiet --async || true
#gcloud container clusters delete prod --zone="${ZONE}" --quiet --async || true
#gcloud container clusters delete test --region="${REGION}" --quiet --async || true
#gcloud container clusters delete staging --region="${REGION}" --quiet --async || true
#gcloud container clusters delete prod --region="${REGION}" --quiet --async || true

echo "=== Attesa completamento cancellazione cluster... ==="
while gcloud container clusters list --format="value(name)" | grep -E "test|staging|prod" > /dev/null 2>&1; do
    echo "In attesa che i vecchi cluster vengano eliminati..."
    sleep 15
done
echo "Vecchi cluster eliminati."

echo "=== 2. Creazione dei nuovi cluster regionali (${REGION}) con node location singola (${ZONE}) ==="
gcloud container clusters create test \
  --region="${REGION}" \
  --node-locations="${ZONE}" \
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
  --node-locations="${ZONE}" \
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
  --node-locations="${ZONE}" \
  --service-account="${SA_EMAIL}" \
  --num-nodes=1 \
  --disk-size=50 \
  --disk-type=pd-balanced \
  --enable-autoscaling \
  --min-nodes=1 \
  --max-nodes=3 \
  --async

echo "=== Attesa completamento creazione cluster regionali... ==="
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

echo "=== 3. Configurazione credenziali e contesti kubectl ==="
CONTEXTS=("test" "staging" "prod")
for CONTEXT in "${CONTEXTS[@]}"
do   
    gcloud container clusters get-credentials "${CONTEXT}" --region "${REGION}"
    kubectl config rename-context "gke_${PROJECT_ID}_${REGION}_${CONTEXT}" "${CONTEXT}" --force 2>/dev/null || true
done

echo "=== 4. Ri-applicazione configurazione Cloud Deploy ==="
gcloud deploy apply --file=clouddeploy-config/delivery-pipeline.yaml --region="${REGION}"

echo "=== Operazione completata con successo! ==="
gcloud container clusters list --format="table(name,location,status,numNodes)"
