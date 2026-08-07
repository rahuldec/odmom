import { Monitor, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Every point in a MOM is tagged with an ERP module, and the module is what
 * readers scan by. Fixed colour per module (see .module-chip in styles.css)
 * makes a two-page MOM legible at a glance.
 */
export function ModuleChip({ module, className }: { module: string; className?: string }) {
  return (
    <span data-module={module} className={cn("module-chip", className)}>
      {module}
    </span>
  );
}

export function MeetingTypeChip({
  type,
  className,
}: {
  type: "online" | "offline";
  className?: string;
}) {
  const Icon = type === "online" ? Monitor : MapPin;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
        type === "online"
          ? "border-primary/25 bg-primary/10 text-primary"
          : "border-border bg-muted text-muted-foreground",
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {type === "online" ? "Online" : "On site"}
    </span>
  );
}

/** Who a pending item is waiting on. Gold = waiting on us, and gold is used
 *  nowhere else in the app. */
export function OwnerChip({
  owner,
  className,
}: {
  owner: "okie_dokie" | "client";
  className?: string;
}) {
  const ours = owner === "okie_dokie";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        ours
          ? "border-gold/60 bg-gold/20 text-gold-foreground dark:text-gold"
          : "border-border bg-muted text-muted-foreground",
        className,
      )}
    >
      {ours ? "With Okie Dokie" : "With client"}
    </span>
  );
}
