export type AttendeeTeam = "client" | "okie_dokie";
export type Attendee = {
  name: string;
  designation: string;
  mobile?: string;
  team: AttendeeTeam;
};
export type DiscussionPoint = { module: string; details: string };
export type WorkCompletedItem = { module: string; task: string };
export type PendingWith = "okie_dokie" | "client" | "sample_from_customer";
export type PendingPoint = {
  module: string;
  requirement: string;
  pending_with: PendingWith;
};

export const ATTENDEE_TEAMS: { value: AttendeeTeam; label: string }[] = [
  { value: "client", label: "Client" },
  { value: "okie_dokie", label: "Okie Dokie Team" },
];

export const PENDING_WITH: { value: PendingWith; label: string }[] = [
  { value: "okie_dokie", label: "Okie Dokie Team" },
  { value: "client", label: "Client" },
  { value: "sample_from_customer", label: "Sample from Customer" },
];

export type MomPhoto = { path: string; url: string; caption?: string };

export type MOM = {
  id: string;
  client_name: string;
  meeting_date: string;
  meeting_type: "online" | "offline";
  employee_name: string;
  location: string | null;
  summary: string | null;
  attendees: Attendee[];
  discussion_points: DiscussionPoint[];
  work_completed: WorkCompletedItem[];
  pending_points: PendingPoint[];
  photos: MomPhoto[];
  created_at: string;
  updated_at: string;
};

export type MOMInput = Omit<MOM, "id" | "created_at" | "updated_at">;


export const MODULES = [
  "Admission",
  "SIS",
  "Fee",
  "Transport",
  "HR",
  "Examination",
  "Mobile App",
  "Website",
  "Other",
] as const;
