# Attendance Punch — Root Cause Analysis & Permanent Fix

## Symptoms (reported)
1. Modal stuck on **“Getting GPS location…”** then **“GPS timed out”**
2. **Camera blocked** — upload fallback shown
3. Check-in appears to **fail** even after upload
4. **False “Outside branch geofence”** — e.g. 13185m away on localhost desktop despite “GPS ready (±17m)”

---

## Root causes

### False geofence OUT on desktop (13185m away)

| Factor | Explanation |
|--------|-------------|
| **Network-first geolocation** | Previous fix used `enableHighAccuracy: false` first so desktop wouldn’t timeout. That returns **Wi‑Fi / IP geolocation**, often wrong by **kilometers** in dense cities. |
| **Misleading accuracy** | Browser reports small `accuracyMeters` (e.g. ±17m) even for coarse network fixes. |
| **Branch coords are correct** | Mantri Lithos demo branch `12.9352, 77.6245` is valid; reported `12.93241, 77.74613` is a bad network fix (~0.12° longitude ≈ 13 km in Bangalore). |
| **Geofence treated network fix as GPS** | Client and server compared coarse coords to 150m radius → hard **OUT_OF_GEOFENCE**. |

**Permanent fix:**
- **GPS chip first** on all devices; network only as fallback for display.
- Tag fixes with `highAccuracy` / `locationHighAccuracy`; **never flag OUT** for network fixes (`GPS_UNAVAILABLE` instead).
- **Confidence-aware geofence:** only OUT when `distance - accuracy > radius`; inconclusive → `GPS_UNAVAILABLE`.
- UX: “Approximate location (Wi‑Fi/IP)” banner instead of “Outside geofence” on desktop.

### GPS timeout (primary on desktop / Mac)

| Factor | Explanation |
|--------|-------------|
| **`enableHighAccuracy: true` first** | Browser waits for hardware GPS. Laptops/desktops have no GPS chip → times out (12–20s). |
| **Location permission** | Chrome/Safari must allow location for the site. Denied → error; “Ask” pending → looks stuck. |
| **Not a punch blocker** | Backend accepts punches with `GPS_UNAVAILABLE`. Timeout is a **warning**, not failure. |

**Permanent fix:** After GPS attempt, optional network fallback (approximate only). Clear copy: *“You can still punch; record will be flagged.”*

### Camera blocked

| Factor | Explanation |
|--------|-------------|
| **Secure context** | `getUserMedia` requires `https://` or `http://localhost`. LAN IP (`http://192.168.x.x`) or prod IP (`http://3.110.251.63`) → blocked. |
| **Permission denied** | Browser or OS denied camera — no prompt. |
| **Auto-start on modal open** | Some browsers reject camera without explicit user tap (gesture). |

**Permanent fix:** Do **not** auto-open camera. Show **Open camera** + **Upload selfie** buttons (user gesture). Classify errors (HTTPS vs permission vs no device). **Prod needs HTTPS** (e.g. sslip.io + Let’s Encrypt) for camera/location on manager phones.

### Punch submit failure (silent bug)

| Factor | Explanation |
|--------|-------------|
| **Wrong MIME on upload** | `fetch(dataUrl).blob()` can yield `application/octet-stream` or HEIC → backend rejected with *“Photo must be JPEG, PNG, or WebP”*. |
| **Large photos** | >1 MB rejected by backend. |

**Permanent fix:** Normalize all photos to **JPEG via canvas** before upload; send `File` with `type: image/jpeg`. Backend accepts missing/octet-stream MIME when filename is `.jpg`.

---

## What we implemented

### Frontend
- `lib/attendance-punch-media.ts` — GPS-first tiered geolocation, `highAccuracy` flag, camera helpers
- `lib/attendance-geo.ts` — confidence-aware geofence; network fixes → `GPS_UNAVAILABLE`
- `AttendancePunchModal` — approximate vs OUT banners; passes `locationHighAccuracy` to API

### Backend
- `GeofenceUtil.evaluate(lat, lng, accuracy, locationHighAccuracy, branch)` — same confidence rules
- `VerifiedPunchRequest.locationHighAccuracy` — multipart field on verified punch

---

## Verification

| Scenario | Expected |
|----------|----------|
| Desktop Chrome localhost, location allowed | GPS times out → network fallback → “Approximate location”, **no false OUT** |
| Desktop, location denied | Warning + retry; upload selfie → punch succeeds (flagged) |
| Phone at branch on HTTPS | High-accuracy GPS → **In geofence** within 150m |
| Phone away from branch with good GPS | **Outside geofence** (true OUT) |
| Prod HTTP IP | Location/camera blocked in Chrome; use HTTPS or upload-only punch |

---

## Production mobile (recommended)
- Serve app over **HTTPS** (sslip.io / domain + Let’s Encrypt) so manager phones get real GPS + camera
- For dev on phone: Cloudflare Tunnel / ngrok
- Optional: Capacitor native camera plugin for in-app browsers
