import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/app-shell";
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
      <div className="mb-6 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="sm" className="gap-1"><ArrowLeft className="h-4 w-4" /> Back</Button></Link>
        <h1 className="text-2xl font-semibold tracking-tight">New Minutes of Meeting</h1>
      </div>
      <MomForm
        submitLabel="Create MOM"
        submitting={busy}
        onSubmit={async (input) => {
          setBusy(true);
          try {
            const { id } = await create({ data: input });
            toast.success("MOM created");
            router.navigate({ to: "/mom/$id", params: { id } });
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed");
          } finally {
            setBusy(false);
          }
        }}
      />
    </AppShell>
  );
}
