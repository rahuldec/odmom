import { createFileRoute } from "@tanstack/react-router";
import { Download, FileText } from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";

export const Route = createFileRoute("/resources")({
  component: ResourcesPage,
});

const DOWNLOADS = [
  {
    href: "/ERP_Module_Handover_Template.pdf",
    download: "ERP Module Handover Document.pdf",
    label: "ERP Module Handover Document",
    description: "Sign-off template for module handovers during onsite visits.",
  },
  {
    href: "/ERP_Query_Resolution_Form.pdf",
    download: "ERP Query Resolution Form.pdf",
    label: "ERP Query Resolution / Escalation Form",
    description: "Query status summary with acknowledgement sign-off for clients.",
  },
];

function ResourcesPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Resources"
        title="Downloads"
        description="Forms and templates used during onsite visits and client meetings."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {DOWNLOADS.map((item) => (
          <a
            key={item.href}
            href={item.href}
            download={item.download}
            className="group flex items-start gap-4 rounded-xl border border-border bg-card px-5 py-4 shadow-sm transition-colors hover:bg-muted/50 hover:text-primary"
          >
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-snug">{item.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
            </div>
            <Download className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
          </a>
        ))}
      </div>
    </AppShell>
  );
}
