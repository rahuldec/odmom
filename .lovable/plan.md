## Goal
Users are missing the "Improve with AI" button on Discussion Points, Work Completed, and Pending Points sections — either because it looks like a secondary outline button tucked in the card header, or because its purpose isn't obvious.

## Changes (UI only, in `src/components/mom-form.tsx`)

### 1. Make the button visually prominent
Currently it's a small outline button next to "Add Point". Change to:
- Filled primary style (gradient or solid `bg-primary text-primary-foreground`) with the Sparkles icon
- Slightly larger (default size instead of `sm`) so it stands out from the neutral "Add" button
- Subtle pulse/shimmer ring on first render to draw the eye

### 2. Clarify what it does
- Rename label from **"Improve with AI"** → **"✨ Auto-format with AI"** (clearer verb)
- Update the section hint text from the generic "Just write your thoughts roughly..." to a stronger call-to-action:
  > "💡 Tip: Type rough bullet points here, then click **Auto-format with AI** to turn them into clean, professional wording."
- Add a small helper line directly under the button on first use: "Rewrites your rough notes into polished text."

### 3. Add an inline empty-state nudge
When a section has 1+ rough items but hasn't been AI-polished yet, show a dashed callout row:
> ✨ Ready to polish? Click **Auto-format with AI** above to clean up your wording.

### 4. Tooltip on hover
Wrap the button in a shadcn `Tooltip` explaining: "Sends your rough notes to AI and rewrites them into clear, professional MOM language. Your points stay — only the wording improves."

## Out of scope
- No changes to the AI server function, prompt, or data model
- No changes to Attendees/Photos/Meeting Info sections
- No onboarding modal / product tour

## Files touched
- `src/components/mom-form.tsx` (only)

Confirm and I'll implement.