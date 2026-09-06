import type { MOM } from "./mom-types";
import { TEAM_MEMBERS } from "./employees";

/**
 * Who from Okie Dokie was on a visit, and how many visits each person has.
 *
 * A MOM records our side in two places: `employee_name` (whoever filed it) and
 * any `attendees` row tagged `team: "okie_dokie"`. A visit made by two people
 * counts as one visit for BOTH of them — the totals here deliberately sum to
 * more than the number of meetings.
 */

const HONORIFIC = /^(?:mr|mrs|ms|miss|dr|shri|smt|sri)\.?\s+/i;
const SUFFIX = /\s+(?:sir|madam|ma'?am|ji)\.?$/i;
/** "Vishvas & Rahul", "A, B", "A / B", "A and B" all mean two people. */
const SEPARATORS = /\s*(?:,|&|\+|\/|\||;|·|\band\b)\s*/gi;

function tidy(name: string): string {
  return name
    .replace(/\s+/g, " ")
    .trim()
    .replace(HONORIFIC, "")
    .replace(SUFFIX, "")
    .trim();
}

/** Stable identity for a person, so "Vishvas Sehra" and "vishvas  sehra" merge. */
export function nameKey(name: string): string {
  return tidy(name)
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** One free-text field may hold several names. */
export function splitNames(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(SEPARATORS)
    .map(tidy)
    .filter((n) => n.length > 1);
}

// --- Canonical names: merge old spellings into the current roster ----------

/** Known misspellings / old forms that don't match by first name. */
const NAME_ALIASES: Record<string, string> = {
  "vishwas sehra": "Vishvas Sehra",
  vishwas: "Vishvas Sehra",
  "gobind sir": "Gobind Monga",
  "sukhmeet sir": "Sukhmeet Singh",
  "ankush sir": "Ankush Rana",
};

const ROSTER_BY_KEY = new Map(TEAM_MEMBERS.map((m) => [nameKey(m.name), m.name]));
const ROSTER_BY_FIRST = new Map<string, string[]>();
for (const m of TEAM_MEMBERS) {
  const first = nameKey(m.name).split(" ")[0];
  if (!first) continue;
  const list = ROSTER_BY_FIRST.get(first) ?? [];
  list.push(m.name);
  ROSTER_BY_FIRST.set(first, list);
}

/**
 * Map a recorded name to its canonical roster spelling when we can.
 * Exact normalized match wins; otherwise a unique first-name match;
 * otherwise the name is returned tidied but unchanged.
 */
export function canonicalName(raw: string): string {
  const cleaned = tidy(raw);
  const key = nameKey(cleaned);
  if (!key) return cleaned;
  const alias = NAME_ALIASES[key];
  if (alias) return alias;
  const exact = ROSTER_BY_KEY.get(key);
  if (exact) return exact;
  const first = key.split(" ")[0];
  const candidates = ROSTER_BY_FIRST.get(first);
  if (candidates && candidates.length === 1) return candidates[0];
  return cleaned;
}

/** Every Okie Dokie person on this MOM, de-duplicated within the visit. */
export function momTeamMembers(mom: MOM): string[] {
  const seen = new Map<string, string>();
  const add = (raw: string | null | undefined) => {
    for (const name of splitNames(raw)) {
      const canonical = canonicalName(name);
      const key = nameKey(canonical);
      if (key && !seen.has(key)) seen.set(key, canonical);
    }
  };

  add(mom.employee_name);
  for (const a of mom.attendees ?? []) {
    if (a.team === "okie_dokie") add(a.name);
  }
  return [...seen.values()];
}

export type EmployeeVisits = {
  key: string;
  name: string;
  visits: number;
  onsite: number;
  online: number;
  clients: number;
  joint: number;
  lastVisit: string | null;
};

export function visitsByEmployee(moms: MOM[]): EmployeeVisits[] {
  const acc = new Map<
    string,
    {
      names: Map<string, number>;
      visits: number;
      onsite: number;
      online: number;
      joint: number;
      clients: Set<string>;
      lastVisit: string | null;
    }
  >();

  for (const mom of moms) {
    const members = momTeamMembers(mom);
    if (members.length === 0) continue;

    for (const name of members) {
      const key = nameKey(name);
      let row = acc.get(key);
      if (!row) {
        row = {
          names: new Map(),
          visits: 0,
          onsite: 0,
          online: 0,
          joint: 0,
          clients: new Set(),
          lastVisit: null,
        };
        acc.set(key, row);
      }
      // Same visit, credited in full to each person present.
      row.names.set(name, (row.names.get(name) ?? 0) + 1);
      row.visits += 1;
      if (mom.meeting_type === "online") row.online += 1;
      else row.onsite += 1;
      if (members.length > 1) row.joint += 1;
      row.clients.add(mom.client_name.trim().toLowerCase());
      if (!row.lastVisit || mom.meeting_date > row.lastVisit) {
        row.lastVisit = mom.meeting_date;
      }
    }
  }

  return [...acc.entries()]
    .map(([key, row]) => ({
      key,
      // Whichever spelling of the name shows up most often wins the label.
      name: [...row.names.entries()].sort(
        (a, b) => b[1] - a[1] || b[0].length - a[0].length,
      )[0][0],
      visits: row.visits,
      onsite: row.onsite,
      online: row.online,
      joint: row.joint,
      clients: row.clients.size,
      lastVisit: row.lastVisit,
    }))
    .sort((a, b) => b.visits - a.visits || a.name.localeCompare(b.name));
}
