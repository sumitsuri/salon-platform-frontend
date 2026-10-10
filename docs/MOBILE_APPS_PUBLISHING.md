# Mobile app publishing — Antrahq (3 apps)

## Apps and hosts

| Play / App Store listing | Host | Login `portal` (API) | Roles |
|--------------------------|------|----------------------|-------|
| **Antrahq Employee** | `employee.antrahq.com` | `employee` | `SALON_STAFF` |
| **Antrahq Manager** | `app.antrahq.com` | `manager` | Branch/salon managers, `BRAND_ADMIN` (CEO) |
| **Antrahq Platform** | `platform.antrahq.com` | `admin` | `PLATFORM_SUPER_ADMIN`, `SALES_EXECUTIVE` |

Each host uses isolated browser storage (separate origins). `CrossOriginRoleGuard` redirects authenticated users to the correct origin.

## Legal (all listings)

| Document | URL |
|----------|-----|
| Privacy policy | https://antrahq.com/privacy/ |
| Terms of use | https://antrahq.com/terms/ |
| Account deletion | https://antrahq.com/account-deletion/ |
| Support email | contact@antrahq.com |

Deploy marketing site (`pravaah-marketing`) after legal page changes.

## Infrastructure

Terraform (`salon-platform-infra`):

- ACM CloudFront cert SAN: `platform.antrahq.com`
- CloudFront alias + Route 53 A/AAAA for `platform.antrahq.com`
- CORS: `https://platform.antrahq.com` on backend SSM parameter

Apply Terraform, then deploy frontend CI (sets `NEXT_PUBLIC_PLATFORM_APP_URL`).

## Android (phase 1)

1. Complete Play Console **organization** registration and payments profile.
2. Create upload keystore; add `ANDROID_SHA256_*` secrets; redeploy frontend for `assetlinks.json`.
3. Run Bubblewrap per `apps/android/README.md`.
4. Complete **Data safety** (location on Employee app, accounts on all).
5. Internal testing → production.

## Apple (phase 2, ~1 month later)

1. Apple Developer **Organization** (D-U-N-S required).
2. Three bundle IDs matching `com.antrahq.employee`, `.manager`, `.platform`.
3. Capacitor or minimal WKWebView shells loading the same HTTPS URLs.
4. App Privacy labels aligned with https://antrahq.com/privacy/

## Regression checklist

- [ ] `app.antrahq.com/login/` — manager + CEO login unchanged
- [ ] `employee.antrahq.com/` — staff login at root
- [ ] `platform.antrahq.com/` — platform login; `portal=admin`
- [ ] Platform user cannot complete login on manager app (message + link)
- [ ] `/platform/*` on `app.antrahq.com` redirects to `platform.antrahq.com`
- [ ] `/employee/*` on `app.antrahq.com` still redirects to employee host
