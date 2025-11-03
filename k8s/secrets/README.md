# Secrets Management

## ⚠️ Security Notice

**NEVER commit actual secrets to git.** This directory contains templates only.

## Local Development

For local Kubernetes development, create secrets manually:

```bash
# Database credentials
kubectl create secret generic postgres-credentials \
  --from-literal=postgres-password=YOUR_PASSWORD \
  --from-literal=replication-password=YOUR_REPL_PASSWORD \
  -n educational-platform-data

kubectl create secret generic mongodb-credentials \
  --from-literal=mongodb-root-password=YOUR_MONGO_PASSWORD \
  -n educational-platform-data

# Application secrets
kubectl create secret generic jwt-signing-keys \
  --from-literal=jwt-secret=$(openssl rand -base64 64) \
  --from-literal=jwt-refresh-secret=$(openssl rand -base64 64) \
  -n educational-platform

kubectl create secret generic openai-credentials \
  --from-literal=openai-api-key=YOUR_OPENAI_KEY \
  -n educational-platform

kubectl create secret generic anthropic-credentials \
  --from-literal=anthropic-api-key=YOUR_ANTHROPIC_KEY \
  -n educational-platform
```

## CI/CD Integration

### GitHub Actions

Store secrets in GitHub repository secrets and inject during deployment:

```yaml
- name: Create Kubernetes secrets
  run: |
    kubectl create secret generic postgres-credentials \
      --from-literal=postgres-password=${{ secrets.POSTGRES_PASSWORD }} \
      --from-literal=replication-password=${{ secrets.POSTGRES_REPL_PASSWORD }} \
      -n educational-platform-data \
      --dry-run=client -o yaml | kubectl apply -f -
```

### External Secret Managers

For production, use external secret managers:

#### AWS Secrets Manager with External Secrets Operator

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets
  namespace: educational-platform
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-west-2
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets-sa
---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: jwt-signing-keys
  namespace: educational-platform
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets
    kind: SecretStore
  target:
    name: jwt-signing-keys
    creationPolicy: Owner
  data:
  - secretKey: jwt-secret
    remoteRef:
      key: educational-platform/jwt-secret
  - secretKey: jwt-refresh-secret
    remoteRef:
      key: educational-platform/jwt-refresh-secret
```

#### HashiCorp Vault

```yaml
apiVersion: secrets.hashicorp.com/v1beta1
kind: VaultAuth
metadata:
  name: vault-auth
  namespace: educational-platform
spec:
  method: kubernetes
  mount: kubernetes
  kubernetes:
    role: educational-platform
    serviceAccount: default
---
apiVersion: secrets.hashicorp.com/v1beta1
kind: VaultStaticSecret
metadata:
  name: jwt-keys
  namespace: educational-platform
spec:
  vaultAuthRef: vault-auth
  mount: secret
  type: kv-v2
  path: educational-platform/jwt
  refreshAfter: 1h
  destination:
    name: jwt-signing-keys
    create: true
```

## JWT Key Rotation

### Generate New Keys

```bash
# Generate new JWT signing key
openssl rand -base64 64

# Encode for Kubernetes
echo -n "YOUR_NEW_KEY" | base64
```

### Rotation Process

1. Generate new key pair
2. Add new key with new `kid` (key ID)
3. Update auth service to support both old and new keys
4. Deploy updated service
5. Wait for token expiry period (typically 15 minutes for access tokens)
6. Remove old key from secret
7. Update service to use new key only

### Multi-Key Support (for zero-downtime rotation)

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: jwt-signing-keys
  namespace: educational-platform
type: Opaque
data:
  jwt-secret-v1: OLD_KEY_BASE64
  jwt-secret-v2: NEW_KEY_BASE64
  jwt-refresh-secret-v1: OLD_REFRESH_KEY_BASE64
  jwt-refresh-secret-v2: NEW_REFRESH_KEY_BASE64
  current-version: djI=  # "v2" in base64
```

## Secret Scanning

Enable secret scanning in your repository:

1. GitHub: Enable secret scanning and push protection
2. Pre-commit hooks: Use tools like `detect-secrets` or `gitleaks`
3. CI checks: Scan commits for accidentally committed secrets

### Pre-commit Hook Example

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.4.0
    hooks:
      - id: detect-secrets
        args: ['--baseline', '.secrets.baseline']
```

## Encryption at Rest

Ensure Kubernetes secrets are encrypted at rest:

```yaml
# /etc/kubernetes/encryption-config.yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
    providers:
      - aescbc:
          keys:
            - name: key1
              secret: <base64-encoded-32-byte-key>
      - identity: {}
```

## Audit

Monitor secret access:

```bash
# Check who accessed secrets recently
kubectl get events --all-namespaces --field-selector involvedObject.kind=Secret

# Audit logs for secret access
kubectl logs -n kube-system kube-apiserver-<node> | grep -i secret
```
