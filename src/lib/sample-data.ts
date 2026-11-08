// Starting data for the in-memory backend (used when Supabase keys are not set).
// Mirrors supabase/seed.sql. Everything here can be edited in the admin screen.
// Staff names are placeholders: real names go into the database, never this repo.
import type { Check, Group, Room, Round, Section, Setup, Staff } from "./types";

const PLACED: [room: string, section: string, group: "y1" | "y2"][] = [
  ["K-4", "F-1A", "y1"], ["K-5", "F-1B", "y1"], ["K-6", "F-2", "y1"], ["K-7", "F-3", "y1"],
  ["K-3", "F-5", "y1"], ["K-2", "F-6", "y1"], ["K-1", "F-7", "y1"], ["K-11", "F-8", "y1"],
  ["K-9", "F-9", "y1"], ["K-14", "F-10", "y1"], ["K-15", "F-11", "y1"], ["K-16", "F-12", "y1"],
  ["K-13", "F-13", "y1"], ["K-10", "F-14", "y1"], ["K-8", "F-15", "y1"], ["K-44", "F-16", "y1"],
  ["K-39", "S1A", "y2"], ["K-40", "S1B", "y2"], ["K-43", "S2", "y2"], ["K-50", "S3", "y2"],
  ["K-49", "S4", "y2"], ["K-27", "S6", "y2"], ["K-23", "S7", "y2"], ["K-25", "S8", "y2"],
  ["K-28", "S9", "y2"], ["K-32", "S10", "y2"], ["K-45", "S11", "y2"], ["K-46", "S12", "y2"],
  ["K-22", "S13", "y2"], ["K-29", "S14", "y2"], ["K-31", "S15", "y2"], ["K-48", "S16", "y2"],
];

export function sampleSetup(): Setup {
  const groups: Group[] = [
    { id: "y1", name: "1st Year", sort: 1 },
    { id: "y2", name: "2nd Year", sort: 2 },
  ];
  const rooms: Room[] = Array.from({ length: 51 }, (_, n) => ({
    id: `room-k${n}`,
    code: `K-${n}`,
    token: `demo-k${n}`,
    active: true,
    sort: n,
  }));
  const sections: Section[] = PLACED.map(([room, name, groupId], i) => ({
    id: `sec-${name.toLowerCase()}`,
    name,
    groupId,
    roomId: rooms.find((r) => r.code === room)!.id,
    active: true,
    sort: i + 1,
  }));
  const rounds: Round[] = [
    { id: "r-start", name: "Start of test", startTime: "07:50", countsKind: "attendance", sort: 1 },
    { id: "r-mid", name: "Mid-test", startTime: "08:15", countsKind: "non_attempting", sort: 2 },
  ];
  const check = (
    id: string,
    roundId: string,
    audience: Check["audience"],
    instruction: string,
    question: string,
    sort: number,
  ): Check => ({ id, roundId, audience, instruction, question, minSeconds: 8, active: true, sort });
  const checks: Check[] = [
    check("whiteboard", "r-start", "invigilator", "Look at the whiteboard.",
      "Is the whiteboard written (subject, date, time, instructions)?", 1),
    check("seating", "r-start", "both", "Walk once around the room.", "Is the seating arranged as per plan?", 2),
    check("ab-papers", "r-start", "both", "Look at the papers of two students sitting side by side.",
      "Are A/B papers distributed properly?", 3),
    check("margin", "r-mid", "both",
      "Tell students to draw margin lines. Then look at 5 answer sheets in the back row.",
      "Have you told students about margin lines?", 4),
    check("underlining", "r-mid", "both", "Remind students to underline key points.",
      "Have you told students about underlining?", 5),
    check("highlighting", "r-mid", "both", "Remind students to highlight headings.",
      "Have you told students about highlighting?", 6),
    check("lagging", "r-mid", "floor_incharge", "Ask the invigilator which students are falling behind.",
      "Have you informed the teacher about students who are lagging?", 7),
  ];
  const staff: Staff[] = [
    ...Array.from({ length: 30 }, (_, i): Staff => ({
      id: `t${i + 1}`,
      name: `Teacher ${String(i + 1).padStart(2, "0")}`,
      role: "teacher",
      active: true,
    })),
    ...["A", "B", "C"].map((x, i): Staff => ({
      id: `f${i + 1}`,
      name: `Floor Incharge ${x}`,
      role: "floor_incharge",
      active: true,
    })),
  ];
  return {
    school: {
      name: "My School",
      timezone: "Asia/Karachi",
      endTime: "08:40",
      bufferMinutes: 20,
      testWeekdays: [1, 3, 5],
    },
    groups,
    rooms,
    sections,
    rounds,
    checks,
    staff,
  };
}
