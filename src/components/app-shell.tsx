import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "@/components/ui/button";
import logoUrl from "@/logo.png";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <img src={logoUrl} alt="Okie Dokie" className="h-7 w-7 object-contain" />
            <span className="hidden sm:inline">MOM Portal</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link to="/">
              <Button variant="ghost" size="sm">All MOMs</Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="ghost" size="sm">Dashboard</Button>
            </Link>
            <a href="https://odchecklist.lovable.app/" target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm ring-1 ring-primary/40">
                Checklist
              </Button>
            </a>
            <Link to="/mom/new">
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" /> New MOM
              </Button>
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
