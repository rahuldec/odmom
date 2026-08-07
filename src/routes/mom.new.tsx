import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { MomForm } from "@/components/mom-form";
import { Button } from "@/components/ui/button";
import { createMom } from "@/lib/mom.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/mom/new")({
  head: () => ({ meta: [{ title: "New MOM — MOM Portal" }] }),
  component: NewPage,
});

function NewPage() {
  const router = useRouter();
  const create = useServerFn(createMom);
  const [busy, setBusy] = useState(false);

  return (
    <AppShell>
      <Link to="/" className="mb-4 inline-block">
        <Button variant="ghost" size="sm" className="gap-1 -ml-2 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> All meetings
        </Button>
      </Link>

      <PageHeader
        eyebrow="New record"
        title="Write up a meeting"
        description="Rough notes are fine. Tidy the wording per section, add photos, and save — the PDF is generated from this."
      />

      <MomForm
        submitLabel="Create MOM"
        submitting={busy}
        draftKey="odmom:draft:new"
        onSubmit={async (input) => {
          setBusy(true);
          try {
            const { id } = await create({ data: input });
            toast.success("MOM created");
            await router.navigate({ to: "/mom/$id", params: { id } });
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Couldn't save. Check your connection.");
            throw e;
          } finally {
            setBusy(false);
          }
        }}
      />
    </AppShell>
  );
}
