import type { MOM } from "./mom-types";

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

/** Every Okie Dokie person on this MOM, de-duplicated within the visit. */
export function momTeamMembers(mom: MOM): string[] {
  const seen = new Map<string, string>();
  const add = (raw: string | null | undefined) => {
    for (const name of splitNames(raw)) {
      const key = nameKey(name);
      if (key && !seen.has(key)) seen.set(key, name);
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
