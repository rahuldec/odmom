# Field / Mobile Experience Upgrade

## Goal
Make the MOM Portal fast and reliable for employees recording client visits while on the road or on campus, with a mobile-first quick-capture flow, offline resilience, and location context.

## What we'll build

### 1. Quick-capture route (`/quick`)
A stripped-down, mobile-first screen designed to be used immediately after a meeting:
- One-tap camera button at the top (opens device camera, accepts multiple shots).
- Minimal required fields only: client name, meeting date (defaults to today), meeting type, Okie Dokie attendees (multi-select).
- A single "rough notes" textarea where the employee dumps everything they remember.
- "Generate MOM with AI" button that sends the rough notes to the existing AI endpoint and produces discussion points, work completed, pending points, and a summary.
- Review step showing the AI output in editable cards before saving.
- Save creates the full MOM and redirects to the detail page.

### 2. Auto-capture location
- On the quick-capture and standard MOM form, optionally capture the device's latitude/longitude when the user grants permission.
- Store coordinates in a new `geo` JSONB column on `moms` (`{ lat, lng, captured_at }`).
- Display a small map link on the detail page ("Open in Google Maps") and include the location in the PDF.
- Location capture is opt-in via a toggle; no permission prompt until the user turns it on.

### 3. Offline draft resilience
- Extend the existing localStorage draft so it survives closing the browser or losing signal.
- Add a "Pending uploads" queue: if a MOM is saved while offline, queue photo uploads and retry automatically when connectivity returns.
- Show a subtle status badge: "Saved locally · will sync when online".

### 4. Mobile dashboard improvements
- Replace the dense stats grid on small screens with large tappable cards: "New MOM", "Continue draft", "My meetings", "My pending".
- Keep the existing charts for desktop; on mobile, collapse charts into a "View report" link.

### 5. Voice notes (optional, if browser support exists)
- Add a microphone button next to the rough-notes field.
- Use the Web Speech API for transcription where supported; fallback shows "Speech-to-text not supported on this device".
- Transcribed text is appended to rough notes and can be AI-formatted.

## Technical details

- New route: `src/routes/quick.tsx`.
- New component: `src/components/quick-capture.tsx` for the wizard UI.
- Extend `moms` table with `geo jsonb` column; update `src/integrations/supabase/types.ts` and `src/lib/mom-types.ts`.
- Update `src/lib/mom.functions.ts` to accept `geo` in insert/update.
- Update `src/lib/pdf.ts` to render coordinates and a map link when present.
- Use `navigator.geolocation` inside `useEffect` / event handlers only; never at module scope.
- Use `localStorage` and `navigator.onLine` for offline queue; keep the queue in a single key (`mom-pending-uploads`).
- No new backend service required; reuse existing `createServerFn` and Supabase storage.

## Out of scope for this plan
- Native mobile app build.
- Push notifications.
- Background sync service worker.

## Success criteria
- `/quick` works smoothly on a phone-sized screen.
- A MOM can be created from rough notes + photos in under 60 seconds.
- Location is captured only when explicitly enabled and shown in the PDF.
- Drafts survive a page refresh or network drop.
