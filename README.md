# MOM Portal — UI redesign

Drop-in replacement files for `odmom`. Every path here mirrors the repo, so
copying `src/` over the top of your `src/` is the whole install. No new
dependencies, no schema changes, no server-function changes.

```
cp -r odmom-redesign/src/. odmom-main/src/
```

The only thing you may want to check afterwards is `src/lib/pdf.ts`, since it
was rewritten in place rather than replaced wholesale — see below.

---

## The palette

Sampled straight off `src/logo.png` rather than approximated:

| Colour | Hex | Where it comes from | Where it's used |
|---|---|---|---|
| Orange | `#EE6723` | the seal's inner disc | primary — buttons, links, active states |
| Maroon | `#7C1D13` | the seal's ring lettering | document masthead, PDF header |
| Gold | `#FFDE56` | the two stars | **only** "waiting on Okie Dokie" |
| Blush | `#FDEEE5` | the seal's highlight | secondary surfaces |
| Paper | `#FBF6F2` | derived | page background |
| Ink | `#2A1613` | derived | body text (warm, not blue-black) |

Previously the app ran stock shadcn slate with an indigo primary
(`oklch(0.475 0.18 268)`) and a hardcoded `bg-slate-900` document header. No
brand colour appeared anywhere.

Gold carries exactly one meaning across the app and the PDF: *this is waiting
on us*. It is not used decoratively anywhere. If you add a new accent later,
don't reach for gold.

## Type

- **Gabarito** — display. Friendly geometric caps, closest match to the logo's
  letterforms.
- **Instrument Sans** — body and UI. Holds up at small sizes in dense forms.
- **IBM Plex Mono** — dates, counts, eyebrows. Anything that reads as record
  data rather than prose.

Loaded via one Google Fonts request in `__root.tsx`. If your deployment blocks
external font hosts, self-host and change that one `<link>`.

## The signature element

The logo is a circular seal, and a MOM is a record that gets stamped and sent.
`src/components/seal.tsx` renders that geometry as SVG with ring lettering and
the two stars. It appears **at most once per screen** — the document masthead,
the empty state, the 404, and small in the document footer. Everything else
stays quiet.

The ring text sits on **two arcs**, not one: a single full-circle textPath puts
the bottom half upside down, so the lower arc is reversed and both halves read
left to right, the way the real logo is set. Props are `topText` and
`bottomText`; pass empty strings for a plain ring (that's what the small footer
seal does, since lettering is illegible at 36px).

On the document masthead the seal is positioned **fully inside** the card with
the text column padded clear of it, and hidden below the `sm` breakpoint. An
earlier pass bled it off the right edge, which read as a clipping bug rather
than a design choice.

## Module colours

Every discussion point, completed task, and pending item is tagged with an ERP
module, and that tag is what people scan by. Each module now has a fixed colour
(`.module-chip` and the `[data-module="…"]` rules in `styles.css`). It's driven
by a data attribute rather than JS, so it's SSR-safe and adapts to dark mode
without a hydration mismatch.

The list is **alphabetical with "Other" pinned last** — it's a catch-all, not a
name, so sorting it under O would bury it mid-list. Fourteen modules now:
Admission, COE, Communication, Examination, Fee, Front Desk, HR, Library,
Mobile App, SIS, Student Attendance, Transport, Website, Other.

`src/lib/mom-types.ts` is included in this package for that reason — it's
otherwise unchanged from your original.

Adding a module means adding two lines to `styles.css` (light + dark) alongside
the entry in `MODULES`. All fourteen were rendered and checked for legibility in
both themes; Fee and Front Desk sit closest in light mode, so if that pairing
ever matters on screen, shift one of the two hex values.

No migration needed — every previous module name is still in the list, so
existing records keep their tags.

---

## UX changes

These matter more than the colour did.

### Form (`src/components/mom-form.tsx`)

| Change | Why |
|---|---|
| **Draft autosaves** to `localStorage` with a restore prompt | Staff fill this on a phone after a campus visit. One dropped connection previously lost the whole write-up. Draft is kept if the save fails, cleared only on success. |
| **Section rail** with completion dots | Replaces one endless scroll of cards. Required-but-empty sections show a red ring. |
| **Sticky action bar** naming what's still missing | Each blocker is a link that scrolls to the section. |
| **Inline field errors, and a toast that names them** | Validation was a single toast fired after the whole form was filled. The toast now says which fields are missing instead of "a few things". |
| **Photos requirement surfaced upfront** | It was previously a surprise at submit time, after all the typing was done. |
| **Drag-drop and screenshot paste** for photos | Most of these are screenshots. |
| **Undo after "Tidy wording"** | The AI overwrote your text with no way back. Snapshot is kept per section. |
| Attendee side as a segmented toggle | Two taps became one. |
| Repeated "✨ Ready to polish?" banners removed | It appeared under every section. One quiet button per section instead. |

The AI button is labelled **Auto correct with AI**, and the toast tells you to
read the result before saving.

### List (`src/routes/index.tsx`)

- Mobile card layout instead of a 7-column table squeezed onto a phone.
- Debounced search (was one query per keystroke).
- Sort: newest, oldest, client A–Z, most pending.
- A **pending count** per row — the actionable number.
- Result count, active-filter clearing, and two distinct empty states ("nothing
  recorded yet" vs "nothing matches your filters").
- Skeletons instead of the word "Loading…".

### Detail (`src/routes/mom.$id.tsx`)

- Maroon document masthead with the seal, replacing `bg-slate-900`.
- Attendees split into **Client** and **Okie Dokie** columns rather than a team
  badge column you have to read row by row.
- **Pending points grouped by owner.** Clients read this section first, so
  "waiting on Okie Dokie" is now a heading, not a badge to scan for.
- A real print stylesheet — Print now produces the document and none of the app
  chrome around it.

### Dashboard (`src/routes/dashboard.tsx`)

Was one stat card sitting alone in a four-column grid. Now:

- Four stats: meetings, this month vs last, distinct clients, open pending
  items split by who owns them.
- **"Waiting on Okie Dokie"** work queue — the reason to open the page.
- Pending by module.
- Meetings per month, last six months including empty ones.

All computed client-side from `listMoms`, which already returns full rows. No
new server function. `countMoms` is now unused — safe to leave or remove.

### Quality floor

Responsive to 360px, visible keyboard focus everywhere, `prefers-reduced-motion`
respected, 16px minimum input font on mobile so iOS stops zooming on focus.

---

## PDF (`src/lib/pdf.ts`)

Retheme only — layout, pagination, and image handling are untouched.

- `NAVY` / `NAVY_SOFT` → `MAROON` / `MAROON_DEEP`
- Blue and green "pending with" badges → gold (Okie Dokie) and neutral (client),
  matching what the portal shows
- Header label switched from orange to gold, because orange on maroon sits
  around 3:1 contrast
- "Offline" → "On site", so the PDF uses the same words as the app
- Conclusion section removed
- **Bug fix:** long institute names used to run straight through the
  right-aligned date in the title strip. The date is measured first and the
  title now wraps into the remaining width.

**Verified by rendering.** The generator was run headlessly against sample data
with three photos and a four-row pending table — output is in
`mom-pdf-preview.pdf`. Colours, badges, and the logo's white backing disc all
render correctly on maroon.

**Known, pre-existing:** with a full page of content the signature block gets
pushed onto a page of its own. That's correct pagination rather than a bug, but
if you'd rather it never orphaned, the fix is to shrink the `ensureSpace(90)`
guard above the signature block.

---

## Deliberately left out

- **No Conclusion anywhere in the form or the PDF.** The `summary` column is
  still in the type and still round-trips through the edit form, so no stored
  data is dropped — there just isn't an input for it, and the PDF no longer
  prints it. The detail page still renders a Conclusion block *if* a record
  happens to have one; say the word if you want that read-only block out too.
- **No delete.** The `deleteMom` server function stays unwired, as it was.

## Not done

- No changes to `mom.functions.ts`, the Supabase schema, or auth.
- No unsaved-changes guard on navigating away from the edit form (the new-MOM
  route has the draft; edit doesn't). Worth adding if people report losing edits.
- The list loads every MOM and filters server-side but sorts client-side. Fine
  at a few hundred records; add pagination past that.
