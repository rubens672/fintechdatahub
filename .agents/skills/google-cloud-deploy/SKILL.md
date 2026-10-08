---
name: google-cloud-deploy
description: >-
  Guides continuous delivery architecture, multi-target pipelines, and automated rollouts with Google Cloud Deploy.
  Use when creating or modifying Cloud Deploy delivery pipelines (clouddeploy.yaml), configuring Skaffold (skaffold.yaml)
  with Kustomize/Helm for GKE or Cloud Run targets, setting up multi-stage environments (dev, staging, prod),
  configuring canary or blue-green deployment strategies, approval gates, post-deploy verify phases,
  and automated rollback policies.
---

# Google Cloud Deploy Production Engineering Guide

Google Cloud Deploy is the managed continuous delivery service for Google Cloud that automates container application delivery to Google Kubernetes Engine (GKE), Cloud Run, and GKE Enterprise.

This skill provides production-ready architecture blueprints, declarative manifests, Skaffold configurations, and operational workflows for enterprise-grade deployments.

--------------------------------------------------------------------------------

## 1. Core Industrial Delivery Architecture

An industrial deployment pipeline enforces strict progression gates, declarative manifests, automated verification, and rapid rollback mechanisms.

```
       Git Commit / PR Merge
                 │
                 ▼
        [ Google Cloud Build ]
                 │ (Build image, test, push to Artifact Registry)
                 │ (Generate Cloud Deploy release)
                 ▼
     [ Cloud Deploy Pipeline ]
                 │
   ┌─────────────┴─────────────┐
   ▼                           ▼
[1. Dev Target]         [2. Staging Target]         [3. Production Target]
- Direct Rollout        - Direct Rollout             - Approval Gate (requireApproval: true)
- Smoke Verify Test     - Verification Suite         - Canary Rollout (25% ➔ 50% ➔ 100%)
- Immediate apply       - Promotion Trigger          - 1-Click Automated Rollback
```

--------------------------------------------------------------------------------

## 2. Multi-Target Delivery Pipeline Blueprint (`clouddeploy.yaml`)

Define the `DeliveryPipeline` and individual `Target` resources in a single or modular YAML manifest.

```yaml
apiVersion: deploy.cloud.google.com/v1
kind: DeliveryPipeline
metadata:
  name: institutional-financial-pipeline
  labels:
    tier: production
    managed-by: cloud-deploy
description: "Institutional continuous delivery pipeline for GKE financial microservices"
serialPipeline:
  stages:
  - targetId: gke-dev
    profiles:
    - dev
    strategy:
      standard:
        verify: true

  - targetId: gke-staging
    profiles:
    - staging
    strategy:
      standard:
        verify: true

  - targetId: gke-prod
    profiles:
    - prod
    strategy:
      canary:
        runtimeConfig:
          kubernetes:
            gatewayServiceMesh:
              httpRoute: "financial-service-route"
              service: "financial-service-svc"
              deployment: "financial-service-app"
              routeUpdateWaitTime: "60s"
        canaryDeployment:
          percentages:
          - 25
          - 50
          verify: true
          predeploy: {}
          postdeploy: {}
---
# Development GKE Target
apiVersion: deploy.cloud.google.com/v1
kind: Target
metadata:
  name: gke-dev
  labels:
    env: dev
description: "Development GKE Cluster"
gke:
  cluster: projects/fintech-data-hub-75428/locations/europe-west1/clusters/fintech-gke-dev
executionConfigs:
- usages:
  - RENDER
  - DEPLOY
  - VERIFY
  serviceAccount: cloud-deploy-runner@fintech-data-hub-75428.iam.gserviceaccount.com
---
# Staging GKE Target
apiVersion: deploy.cloud.google.com/v1
kind: Target
metadata:
  name: gke-staging
  labels:
    env: staging
description: "Staging GKE Cluster"
gke:
  cluster: projects/fintech-data-hub-75428/locations/europe-west1/clusters/fintech-gke-staging
executionConfigs:
- usages:
  - RENDER
  - DEPLOY
  - VERIFY
  serviceAccount: cloud-deploy-runner@fintech-data-hub-75428.iam.gserviceaccount.com
---
# Production GKE Target (Strict Approval Required)
apiVersion: deploy.cloud.google.com/v1
kind: Target
metadata:
  name: gke-prod
  labels:
    env: prod
description: "Production GKE Cluster with Approval Gate"
requireApproval: true
gke:
  cluster: projects/fintech-data-hub-75428/locations/europe-west1/clusters/fintech-gke-prod
executionConfigs:
- usages:
  - RENDER
  - DEPLOY
  - VERIFY
  serviceAccount: cloud-deploy-runner@fintech-data-hub-75428.iam.gserviceaccount.com
```

--------------------------------------------------------------------------------

## 3. Skaffold & Kustomize Configuration (`skaffold.yaml`)

Cloud Deploy relies on Skaffold to render and apply Kubernetes manifests. Use Kustomize overlays to separate configuration per environment.

### Directory Layout
```text
k8s/
├── base/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── kustomization.yaml
└── overlays/
    ├── dev/
    │   ├── patch-resources.yaml
    │   └── kustomization.yaml
    ├── staging/
    │   └── kustomization.yaml
    └── prod/
        ├── patch-replicas.yaml
        └── kustomization.yaml
```

### `skaffold.yaml`
```yaml
apiVersion: skaffold/v4beta11
kind: Config
metadata:
  name: financial-microservices
build:
  artifacts:
  - image: europe-west1-docker.pkg.dev/fintech-data-hub-75428/financial-containers/financial-service
    docker:
      dockerfile: Dockerfile
manifests:
  kustomize:
    paths:
    - k8s/base

profiles:
- name: dev
  manifests:
    kustomize:
      paths:
      - k8s/overlays/dev

- name: staging
  manifests:
    kustomize:
      paths:
      - k8s/overlays/staging

- name: prod
  manifests:
    kustomize:
      paths:
      - k8s/overlays/prod

# Automated Post-Deploy Verification
verify:
- name: health-smoke-test
  container:
    name: curl-checker
    image: curlimages/curl:8.5.0
    command: ["sh", "-c"]
    args:
    - |
      echo "Validating health endpoint..."
      curl --fail --connect-timeout 5 --max-time 10 http://financial-service-svc/health || exit 1
      echo "Health check passed!"
```

--------------------------------------------------------------------------------

## 4. Upstream Cloud Build Trigger (`cloudbuild.yaml`)

Automates the build, container push, and release creation in Cloud Deploy upon merge to `main`.

```yaml
steps:
# 1. Run Unit Tests & Lint
- name: 'python:3.12-slim'
  entrypoint: 'bash'
  args:
  - '-c'
  - |
    pip install uv
    uv run pytest

# 2. Build Container Image with BuildKit & Cache
- name: 'gcr.io/kaniko-project/executor:latest'
  args:
  - '--destination=europe-west1-docker.pkg.dev/$PROJECT_ID/financial-containers/financial-service:$COMMIT_SHA'
  - '--destination=europe-west1-docker.pkg.dev/$PROJECT_ID/financial-containers/financial-service:latest'
  - '--cache=true'
  - '--cache-ttl=168h'

# 3. Create Cloud Deploy Release
- name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
  entrypoint: 'gcloud'
  args:
  - 'deploy'
  - 'releases'
  - 'create'
  - 'rel-$SHORT_SHA'
  - '--delivery-pipeline=institutional-financial-pipeline'
  - '--region=europe-west1'
  - '--images=europe-west1-docker.pkg.dev/$PROJECT_ID/financial-containers/financial-service=europe-west1-docker.pkg.dev/$PROJECT_ID/financial-containers/financial-service:$COMMIT_SHA'
  - '--skaffold-file=skaffold.yaml'

options:
  logging: CLOUD_LOGGING_ONLY
```

--------------------------------------------------------------------------------

## 5. Operational CLI Runbook (`gcloud deploy`)

### Pipeline & Target Management
```bash
# Register or update pipeline and targets
gcloud deploy apply --file=clouddeploy.yaml --region=europe-west1 --project=fintech-data-hub-75428

# List pipelines and target health
gcloud deploy delivery-pipelines list --region=europe-west1
gcloud deploy targets list --region=europe-west1
```

### Release & Rollout Lifecycle
```bash
# 1. Create a release manually (triggers automatic rollout to the first stage: gke-dev)
gcloud deploy releases create release-001 \
  --delivery-pipeline=institutional-financial-pipeline \
  --region=europe-west1 \
  --source=.

# 2. Promote release from dev to staging
gcloud deploy releases promote \
  --release=release-001 \
  --delivery-pipeline=institutional-financial-pipeline \
  --region=europe-west1

# 3. Promote from staging to prod (will pause on Approval Gate)
gcloud deploy releases promote \
  --release=release-001 \
  --delivery-pipeline=institutional-financial-pipeline \
  --region=europe-west1

# 4. Inspect pending approvals
gcloud deploy rollouts list \
  --release=release-001 \
  --delivery-pipeline=institutional-financial-pipeline \
  --region=europe-west1

# 5. Approve production rollout
gcloud deploy rollouts approve rollout-prod-001 \
  --release=release-001 \
  --delivery-pipeline=institutional-financial-pipeline \
  --region=europe-west1

# 6. Advance Canary phase (e.g. 25% -> 50% -> 100%)
gcloud deploy rollouts advance rollout-prod-001 \
  --release=release-001 \
  --delivery-pipeline=institutional-financial-pipeline \
  --region=europe-west1

# 7. Emergency Rollback (Instant revert to previous stable release)
gcloud deploy targets rollback gke-prod \
  --delivery-pipeline=institutional-financial-pipeline \
  --region=europe-west1
```

--------------------------------------------------------------------------------

## 6. IAM & Security Best Practices (Least Privilege)

The service account used by Cloud Deploy (`cloud-deploy-runner`) requires specific IAM bindings:

```bash
SA_EMAIL="cloud-deploy-runner@fintech-data-hub-75428.iam.gserviceaccount.com"

# 1. Cloud Deploy Job Runner
gcloud projects add-iam-policy-binding fintech-data-hub-75428 \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/clouddeploy.jobRunner"

# 2. Deploy to GKE (Kubernetes Developer / Workload Admin)
gcloud projects add-iam-policy-binding fintech-data-hub-75428 \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/container.developer"

# 3. Pull images from Artifact Registry
gcloud projects add-iam-policy-binding fintech-data-hub-75428 \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/artifactregistry.reader"

# 4. Write audit logs and monitoring events
gcloud projects add-iam-policy-binding fintech-data-hub-75428 \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/logging.logWriter"
```

--------------------------------------------------------------------------------

## 7. Troubleshooting & Recovery Matrix

| Issue | Root Cause | Resolution |
| :--- | :--- | :--- |
| `RENDER_FAILED` | Skaffold or Kustomize syntax error | Test rendering locally with `skaffold render -p <profile>`. Check Kustomize paths. |
| `DEPLOY_FAILED (Forbidden)` | Service account lacks `container.developer` | Verify executionConfig service account has RBAC / GKE access permissions. |
| `VERIFY_FAILED` | Smoke test container timed out or health check failed | Inspect verify pod logs: `gcloud deploy rollouts describe <rollout-id>`. |
| `ROLLOUT_BLOCKED` | Waiting for manual approval | Run `gcloud deploy rollouts approve <rollout-id>` or approve in Google Cloud Console. |
| `CANARY_STALLED` | Route update wait time or Gateway HTTPRoute misconfigured | Verify GKE Gateway API CRDs are installed and HTTPRoute matches service ports. |
