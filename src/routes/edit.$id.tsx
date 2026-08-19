import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { MomForm } from "@/components/mom-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getMom, updateMom } from "@/lib/mom.functions";
import type { MOMInput } from "@/lib/mom-types";
import { formatDay } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/edit/$id")({
  head: () => ({ meta: [{ title: "Edit MOM — MOM Portal" }] }),
  component: EditPage,
});

function EditPage() {
  const { id } = Route.useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const get = useServerFn(getMom);
  const update = useServerFn(updateMom);
  const [busy, setBusy] = useState(false);

  const { data: mom, isLoading } = useQuery({
    queryKey: ["mom", id],
    queryFn: () => get({ data: { id } }),
  });

  return (
    <AppShell>
      <Link to="/mom/$id" params={{ id }} className="mb-4 inline-block">
        <Button variant="ghost" size="sm" className="-ml-2 gap-1 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to the MOM
        </Button>
      </Link>

      <PageHeader
        eyebrow="Editing"
        title={mom ? mom.client_name : "Edit MOM"}
        description={
          mom
            ? `Meeting of ${formatDay(mom.meeting_date)}. Changes go live as soon as you save.`
            : undefined
        }
      />

      {isLoading ? (
        <Card className="space-y-4 p-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
        </Card>
      ) : !mom ? (
        <Card className="px-6 py-16 text-center">
          <h2 className="font-display text-lg font-semibold">This MOM no longer exists</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            It may have been deleted by someone else on the team.
          </p>
          <Link to="/meetings" className="mt-5 inline-block">
            <Button variant="outline">Go to all meetings</Button>
          </Link>
        </Card>
      ) : (
        <MomForm
          submitLabel="Save changes"
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
            photos: mom.photos ?? [],
            signatures: mom.signatures ?? { employee: null, client: null },
          }}
          onSubmit={async (input: MOMInput) => {
            setBusy(true);
            try {
              await update({ data: { id, patch: input } });
              toast.success("Changes saved");
              await queryClient.invalidateQueries({ queryKey: ["mom", id] });
              await queryClient.invalidateQueries({ queryKey: ["moms"] });
              await router.navigate({ to: "/mom/$id", params: { id } });
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Couldn't save. Check your connection.");
              throw e;
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
    </AppShell>
  );
}
