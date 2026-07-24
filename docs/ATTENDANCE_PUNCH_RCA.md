# Attendance Punch — Root Cause Analysis & Permanent Fix

## Symptoms (reported)
1. Modal stuck on **“Getting GPS location…”** then **“GPS timed out”**
2. **Camera blocked** — upload fallback shown
3. Check-in appears to **fail** even after upload

---

## Root causes

### GPS timeout (primary on desktop / Mac)

| Factor | Explanation |
|--------|-------------|
| **`enableHighAccuracy: true` first** | Browser waits for hardware GPS. Laptops/desktops have no GPS chip → times out (12–20s). |
| **Location permission** | Chrome/Safari must allow location for the site. Denied → error; “Ask” pending → looks stuck. |
| **Not a punch blocker** | Backend accepts punches with `GPS_UNAVAILABLE`. Timeout is a **warning**, not failure. |

**Permanent fix:** Tiered geolocation — network/Wi‑Fi location first (`enableHighAccuracy: false`), then high-accuracy GPS for phones. Clear copy: *“You can still punch; record will be flagged.”*

### Camera blocked

| Factor | Explanation |
|--------|-------------|
| **Secure context** | `getUserMedia` requires `https://` or `http://localhost`. LAN IP (`http://192.168.x.x`) → blocked. |
| **Permission denied** | Browser or OS denied camera — no prompt. |
| **Auto-start on modal open** | Some browsers reject camera without explicit user tap (gesture). |

**Permanent fix:** Do **not** auto-open camera. Show **Open camera** + **Upload selfie** buttons (user gesture). Classify errors (HTTPS vs permission vs no device).

### Punch submit failure (silent bug)

| Factor | Explanation |
|--------|-------------|
| **Wrong MIME on upload** | `fetch(dataUrl).blob()` can yield `application/octet-stream` or HEIC → backend rejected with *“Photo must be JPEG, PNG, or WebP”*. |
| **Large photos** | >1 MB rejected by backend. |

**Permanent fix:** Normalize all photos to **JPEG via canvas** before upload; send `File` with `type: image/jpeg`. Backend accepts missing/octet-stream MIME when filename is `.jpg`.

---

## What we implemented

### Frontend
- `lib/attendance-punch-media.ts` — tiered GPS, camera error classification, JPEG normalize
- `AttendancePunchModal` — choose camera OR upload; no auto-camera; GPS retry + proceed hint
- `api.verifiedPunch` — explicit `File(..., { type: 'image/jpeg' })`

### Backend
- `AttendancePhotoStorageService` — treat `application/octet-stream` / empty MIME as JPEG when appropriate

---

## Verification

| Scenario | Expected |
|----------|----------|
| Desktop Chrome localhost, location allowed | GPS resolves in ~1–3s (network) |
| Desktop, location denied | Warning + retry; upload selfie → punch succeeds (flagged) |
| Desktop, camera denied | Open camera fails; Upload selfie → Confirm punch → success |
| Phone on HTTPS PWA | GPS + camera work with permissions |
| Phone on LAN HTTP | Camera blocked; upload works; use HTTPS tunnel for camera |

---

## Production mobile (Phase 2 optional)
- Serve app only over **HTTPS** (already true on prod)
- For dev on phone: Cloudflare Tunnel / ngrok
- Optional: Capacitor native camera plugin for in-app browsers
