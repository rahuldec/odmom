import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { TEAM_MEMBERS, TEAM_MEMBER_NAMES } from "@/lib/employees";

/**
 * Multi-select of Okie Dokie people. Stored back as a single comma-joined
 * string so nothing downstream (PDF, API, stats) has to change.
 */
export function EmployeePicker({
  value,
  onChange,
  invalid,
}: {
  value: string;
  onChange: (next: string) => void;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [manual, setManual] = useState("");

  const selected = useMemo(
    () =>
      value
        .split(",")
        .map((n) => n.trim())
        .filter(Boolean),
    [value],
  );

  const commit = (names: string[]) => {
    const seen = new Set<string>();
    const unique = names.filter((n) => {
      const k = n.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    unique.sort((a, b) => a.localeCompare(b));
    onChange(unique.join(", "));
  };

  const toggle = (name: string) => {
    const has = selected.some((n) => n.toLowerCase() === name.toLowerCase());
    commit(
      has
        ? selected.filter((n) => n.toLowerCase() !== name.toLowerCase())
        : [...selected, name],
    );
  };

  const extras = selected.filter(
    (n) => !TEAM_MEMBER_NAMES.some((m) => m.toLowerCase() === n.toLowerCase()),
  );

  const filtered = TEAM_MEMBERS.filter((m) =>
    m.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const addManual = () => {
    const name = manual.trim();
    if (!name) return;
    commit([...selected, name]);
    setManual("");
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-invalid={invalid}
            className={cn(
              "w-full justify-between font-normal",
              !selected.length && "text-muted-foreground",
            )}
          >
            <span className="truncate">
              {selected.length
                ? `${selected.length} selected`
                : "Select team members"}
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(22rem,90vw)] p-0" align="start">
          <div className="border-b p-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name"
              className="h-9"
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                No match. Add the name below.
              </p>
            ) : (
              filtered.map((m) => {
                const active = selected.some(
                  (n) => n.toLowerCase() === m.name.toLowerCase(),
                );
                return (
                  <button
                    key={m.name}
                    type="button"
                    onClick={() => toggle(m.name)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent",
                      active && "bg-accent/60",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 items-center justify-center rounded border",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input",
                      )}
                    >
                      {active && <Check className="h-3 w-3" />}
                    </span>
                    <span className="flex-1 truncate">{m.name}</span>
                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {m.role}
                    </span>
                  </button>
                );
              })
            )}
          </div>
          <div className="flex items-center gap-2 border-t p-2">
            <Input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addManual();
                }
              }}
              placeholder="Other — type a name"
              className="h-9"
            />
            <Button type="button" size="sm" onClick={addManual} className="gap-1">
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((n) => (
            <span
              key={n}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
            >
              {n}
              {extras.includes(n) && (
                <span className="text-[10px] uppercase text-muted-foreground">
                  manual
                </span>
              )}
              <button
                type="button"
                aria-label={`Remove ${n}`}
                onClick={() => toggle(n)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
