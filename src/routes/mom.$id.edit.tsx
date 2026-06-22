import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { MomForm } from "@/components/mom-form";
import { Button } from "@/components/ui/button";
import { getMom, updateMom } from "@/lib/mom.functions";
import type { MOMInput } from "@/lib/mom-types";
import { toast } from "sonner";

export const Route = createFileRoute("/mom/$id/edit")({
  head: () => ({ meta: [{ title: "Edit MOM — MOM Portal" }] }),
  component: EditPage,
});

function EditPage() {
  const { id } = Route.useParams();
  const router = useRouter();
  const get = useServerFn(getMom);
  const update = useServerFn(updateMom);
  const [busy, setBusy] = useState(false);

  const { data: mom, isLoading } = useQuery({
    queryKey: ["mom", id],
    queryFn: () => get({ data: { id } }),
  });

  return (
    <AppShell>
      <div className="mb-6 flex items-center gap-3">
        <Link to="/mom/$id" params={{ id }}>
          <Button variant="ghost" size="sm" className="gap-1"><ArrowLeft className="h-4 w-4" /> Back</Button>
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Edit MOM</h1>
      </div>
      {isLoading || !mom ? (
        <div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>
      ) : (
        <MomForm
          submitLabel="Save Changes"
          submitting={busy}
          initial={{
            client_name: mom.client_name,
            meeting_date: mom.meeting_date,
            meeting_type: mom.meeting_type,
            employee_name: mom.employee_name,
            location: mom.location ?? "",
            summary: mom.summary ?? "",
            attendees: mom.attendees,
            discussion_points: mom.discussion_points,
            work_completed: mom.work_completed,
            pending_points: mom.pending_points,
          }}
          onSubmit={async (input: MOMInput) => {
            setBusy(true);
            try {
              await update({ data: { id, patch: input } });
              toast.success("Saved");
              router.navigate({ to: "/mom/$id", params: { id } });
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Failed");
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
    </AppShell>
  );
}
