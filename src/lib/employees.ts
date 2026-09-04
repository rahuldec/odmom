/** Okie Dokie team roster, used by the attendee picker. Sorted by name. */
export type TeamRole = "RM" | "ARM" | "CR";

export type TeamMember = { name: string; role: TeamRole };

const ROSTER: TeamMember[] = [
  { name: "Mansi Rana", role: "RM" },
  { name: "Sultan Malik", role: "RM" },
  { name: "Sukhmeet Singh", role: "RM" },
  { name: "Kashish Goel", role: "RM" },
  { name: "Amit Kumar", role: "RM" },
  { name: "Ankush Rana", role: "RM" },
  { name: "Lalit Garg", role: "RM" },
  { name: "Rahul Sharma", role: "RM" },
  { name: "Vishvas Sehra", role: "RM" },
  { name: "Jatin Goel", role: "RM" },
  { name: "Gaurav Singla", role: "RM" },
  { name: "Ashish Kumar", role: "RM" },
  { name: "Ayush Garg", role: "RM" },
  { name: "Sagar Mishra", role: "RM" },
  { name: "Divya", role: "ARM" },
  { name: "Lokesh Kumar", role: "ARM" },
  { name: "Gobind Monga", role: "ARM" },
  { name: "Anjali Verma", role: "ARM" },
  { name: "Priya", role: "ARM" },
  { name: "Vansh Saini", role: "CR" },
  { name: "Aanchal Dhiman", role: "CR" },
  { name: "Sapna", role: "CR" },
  { name: "Bhavey Saluja", role: "CR" },
  { name: "Akshat Wahi", role: "CR" },
  { name: "Tanvi Gupta", role: "CR" },
  { name: "Aadhar Mittal", role: "CR" },
];

export const TEAM_MEMBERS: TeamMember[] = [...ROSTER].sort((a, b) =>
  a.name.localeCompare(b.name),
);

export const TEAM_MEMBER_NAMES = TEAM_MEMBERS.map((m) => m.name);
