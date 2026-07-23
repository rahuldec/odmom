import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FileText } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { countMoms } from "@/lib/mom.functions";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — MOM Portal" },
      {
        name: "description",
        content: "Overview of Minutes of Meeting generated from the portal.",
      },
      {
        property: "og:title",
        content: "Dashboard — MOM Portal",
      },
      {
        property: "og:description",
        content: "Overview of Minutes of Meeting generated from the portal.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const getCount = useServerFn(countMoms);
  const { data: total = 0, isLoading } = useQuery({
    queryKey: ["moms", "count"],
    queryFn: () => getCount({ data: {} }),
  });

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of Minutes of Meeting generated from the portal.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total MOMs
              </p>
              <p className="text-3xl font-semibold tracking-tight">
                {isLoading ? "—" : total}
              </p>
            </div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Generated from this portal
          </p>
        </Card>
      </div>

      <div className="mt-6">
        <Link to="/">
          <Button variant="outline">View all MOMs</Button>
        </Link>
      </div>
    </AppShell>
  );
}
