# Antrahq Android apps (TWA)

Three Trusted Web Activity wrappers for Google Play:

| App | Package | Launch URL |
|-----|---------|------------|
| Employee | `com.antrahq.employee` | `https://employee.antrahq.com/` |
| Manager | `com.antrahq.manager` | `https://app.antrahq.com/login/` |
| Platform | `com.antrahq.platform` | `https://platform.antrahq.com/` |

## Prerequisites

- [Bubblewrap CLI](https://github.com/GoogleChromeLabs/bubblewrap) (`npm i -g @bubblewrap/cli`)
- JDK 17+
- Play Console organization account
- Upload keystore (store in GitHub Actions secrets, not in git)

## Initialize each project (once)

```bash
cd apps/android/employee
bubblewrap init --manifest=https://employee.antrahq.com/manifest.json

cd ../manager
bubblewrap init --manifest=https://app.antrahq.com/manifest.json

cd ../platform
bubblewrap init --manifest=https://platform.antrahq.com/manifest.json
```

Use the package names above and enable **Location** delegation for the Employee app.

## Digital Asset Links

After you create an upload key, set GitHub Actions secrets and redeploy the frontend:

- `ANDROID_SHA256_EMPLOYEE`
- `ANDROID_SHA256_MANAGER`
- `ANDROID_SHA256_PLATFORM`

The deploy workflow runs `scripts/generate-assetlinks.mjs`, which writes `public/.well-known/assetlinks.json`.

Verify: `https://employee.antrahq.com/.well-known/assetlinks.json` (same file on all ops hosts).

## Play Store policy URLs

- Privacy: https://antrahq.com/privacy/
- Terms: https://antrahq.com/terms/
- Account deletion: https://antrahq.com/account-deletion/

## Create upload keystore (once per org, can sign all three apps)

```bash
keytool -genkeypair -v \
  -keystore antrahq-upload.keystore \
  -alias upload \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -dname "CN=Antrahq, OU=Mobile, O=Your Legal Entity, L=City, ST=State, C=IN"
```

Store the keystore and passwords in a password manager / GitHub Actions secrets — **never commit** the file.

Upload-key SHA-256 (optional, for local checks):

```bash
keytool -list -v -keystore antrahq-upload.keystore -alias upload | grep SHA256
```

After the **first** `.aab` upload to Play Console, open **Setup → App integrity → App signing key certificate** and copy that **SHA-256** into the matching GitHub secret (`ANDROID_SHA256_EMPLOYEE`, etc.). TWA verification uses the certificate that signs the app users install (often Google’s app signing key, not only the upload key).

## Build signed release AAB (per app)

From each initialized project directory:

```bash
export BUBBLEWRAP_KEYSTORE=/path/to/antrahq-upload.keystore
export BUBBLEWRAP_KEYSTORE_PASSWORD='…'
export BUBBLEWRAP_KEY_ALIAS=upload
export BUBBLEWRAP_KEY_PASSWORD='…'

bubblewrap build
```

Output: `app-release-signed.aab` or `app-release-bundle.aab` (Bubblewrap version-dependent) under the project folder.

Repeat for `employee`, `manager`, and `platform` with the correct package id from `bubblewrap init`.

Upload each `.aab` to its own Play Console app → **Testing → Internal testing** first.

## iOS (later)

See `docs/MOBILE_APPS_PUBLISHING.md` — Capacitor/WKWebView shells with the same launch URLs and bundle IDs under `com.antrahq.*`.
