import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useState } from "react";
import { ArrowUpRight, CheckSquare, LayoutDashboard, Menu, Plus, Rows3 } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import logoUrl from "@/logo.png";

const NAV = [
  { to: "/", label: "Meetings", icon: Rows3 },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
] as const;

const CHECKLIST_URL = "https://odchecklist.lovable.app/";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header
        data-print-hide
        className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md"
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2.5"
            aria-label="MOM Portal home"
          >
            <img src={logoUrl} alt="" className="h-9 w-9 object-contain" />
            <span className="flex flex-col leading-none">
              <span className="font-display text-base font-bold tracking-tight">MOM Portal</span>
              <span className="eyebrow mt-1 hidden sm:block">Okie Dokie</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="ml-6 hidden items-center gap-1 md:flex" aria-label="Main">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "relative rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive(item.to)
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
                {isActive(item.to) && (
                  <span className="absolute inset-x-3 -bottom-[0.875rem] h-0.5 rounded-full bg-primary" />
                )}
              </Link>
            ))}
            <a
              href={CHECKLIST_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Checklist
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Link to="/mom/new" className="hidden sm:block">
              <Button size="sm" className="gap-1.5 font-semibold">
                <Plus className="h-4 w-4" /> New MOM
              </Button>
            </Link>
            <ThemeToggle />

            {/* Mobile nav */}
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetTitle className="font-display text-lg">MOM Portal</SheetTitle>
                <SheetDescription className="sr-only">Main navigation</SheetDescription>
                <nav className="mt-6 flex flex-col gap-1">
                  {NAV.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive(item.to)
                          ? "bg-secondary text-secondary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  ))}
                  <a
                    href={CHECKLIST_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <CheckSquare className="h-4 w-4" />
                    Checklist
                    <ArrowUpRight className="ml-auto h-3.5 w-3.5" />
                  </a>
                </nav>
                <Link to="/mom/new" onClick={() => setMenuOpen(false)} className="mt-6 block">
                  <Button className="w-full gap-1.5 font-semibold">
                    <Plus className="h-4 w-4" /> New MOM
                  </Button>
                </Link>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">{children}</main>

      <footer data-print-hide className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-5 sm:px-6">
          <p className="eyebrow">Okie Dokie · Campus Automation Partner</p>
          <p className="text-xs text-muted-foreground">
            Every MOM here is sent to a client — check names and dates before you save.
          </p>
        </div>
      </footer>
    </div>
  );
}

/** Page masthead used by every route: eyebrow, title, optional actions. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        {description && (
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
