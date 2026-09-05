# Finish dashboard attendee drill-down

## Goal
When a user clicks a team-member name on the dashboard "Visits by team member" chart, the meetings list opens filtered to show only that person's MOMs.

## Current state
- Dashboard already navigates to `/meetings?attendee=<name>` when a name is clicked.
- Meetings page already reads the `attendee` search param and shows an attendee filter input.
- The attendee value is **not** included in the server filters, so the list is not actually filtered.
- "Clear filters" does not clear the attendee param.

## What we'll change

1. Wire the attendee filter into the query
   - Add `attendee` to the `filters` object sent to `listMoms`.
   - Update `hasFilters` to include `debouncedAttendee`.
   - Update `clearFilters` to reset `attendee` and remove it from the URL search params.

2. Server-side filtering in `listMoms`
   - In `src/lib/mom.functions.ts`, accept an optional `attendee` string in the list input.
   - After fetching from Supabase, filter the result client-side by matching the attendee name against `employee_name` and any attendee row where `team === "okie_dokie"`.
   - Use the existing `nameKey` helper in `src/lib/people.ts` for normalized comparison so "Vishvas Sehra" matches "vishvas sehra" or comma-joined variants.

3. Keep the UI consistent
   - Pre-fill the attendee input from the URL.
   - Show the filtered count correctly.
   - Ensure the "Clear filters" button appears when only an attendee filter is active.

## Files to edit
- `src/routes/meetings.tsx` — include attendee in filters, hasFilters, and clearFilters.
- `src/lib/mom.functions.ts` — accept and apply the attendee filter.

## Out of scope
- Changing the dashboard chart itself.
- Adding new routes or pages.

## Success criteria
- Clicking a name on the dashboard opens `/meetings?attendee=<name>`.
- The meetings list shows only MOMs where that person is recorded as an Okie Dokie attendee or the recorder.
- "Clear filters" removes the attendee filter and shows the full list.
