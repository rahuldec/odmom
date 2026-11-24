# MOM PDF redesign

Reformat generated MOM PDFs to follow the uploaded example’s formal, print-ready meeting-record style while keeping the portal’s existing data and PDF actions intact.

## What will change
- Create a restrained monochrome document layout with a centered title and subtitle, organization line, clearly aligned client/date details, and venue.
- Present client and Okie Dokie attendees in a side-by-side table.
- Organize available discussion, completed work, and pending items into a compact action-plan table with module/activity, action, responsibility, and target date where recorded.
- Use numbered section headings, clear table headers, consistent typography, and a professional footer/sign-off area; retain existing handover documents and photos in the PDF.
- Keep the redesign limited to PDF presentation. Do not add MOM fields or change saved data; omit reference-only content that the portal does not capture.

## Technical approach
- Update the existing client-side PDF generator so downloaded PDFs and PDFs attached to Asana continue using the same layout.
- Preserve current image-orientation handling, pagination, branding, and content, adapting them to the new page structure.
- Verify the generated PDF across every page for clipping, overlaps, legibility, and correct page numbering before completion.
