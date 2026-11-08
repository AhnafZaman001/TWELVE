// Local sample data until Supabase is connected. Staff names are placeholders:
// real names go into the database, never into this public repo.
import type { Check, Room, Schedule, Staff } from "./types";

const SECTIONS: Record<string, string> = {
  "K-4": "F-1A", "K-5": "F-1B", "K-6": "F-2", "K-7": "F-3", "K-3": "F-5", "K-2": "F-6",
  "K-1": "F-7", "K-11": "F-8", "K-9": "F-9", "K-14": "F-10", "K-15": "F-11", "K-16": "F-12",
  "K-13": "F-13", "K-10": "F-14", "K-8": "F-15", "K-44": "F-16",
  "K-39": "S1A", "K-40": "S1B", "K-43": "S2", "K-50": "S3", "K-49": "S4", "K-27": "S6",
  "K-23": "S7", "K-25": "S8", "K-28": "S9", "K-32": "S10", "K-45": "S11", "K-46": "S12",
  "K-22": "S13", "K-29": "S14", "K-31": "S15", "K-48": "S16",
};

export const rooms: Room[] = Array.from({ length: 51 }, (_, n) => {
  const code = `K-${n}`;
  const section = SECTIONS[code] ?? null;
  return { token: `demo-k${n}`, code, section, isTestRoom: section !== null };
});

export const checks: Check[] = [
  {
    id: "whiteboard",
    round: 1,
    audience: "invigilator",
    instruction: "Look at the whiteboard.",
    question: "Is the whiteboard written (subject, date, time, instructions)?",
    minSeconds: 8,
  },
  {
    id: "seating",
    round: 1,
    audience: "both",
    instruction: "Walk once around the room.",
    question: "Is the seating arranged as per plan?",
    minSeconds: 8,
  },
  {
    id: "ab-papers",
    round: 1,
    audience: "both",
    instruction: "Look at the papers of two students sitting side by side.",
    question: "Are A/B papers distributed properly?",
    minSeconds: 8,
  },
  {
    id: "margin",
    round: 2,
    audience: "both",
    instruction: "Tell students to draw margin lines. Then look at 5 answer sheets in the back row.",
    question: "Have you told students about margin lines?",
    minSeconds: 8,
  },
  {
    id: "underlining",
    round: 2,
    audience: "both",
    instruction: "Remind students to underline key points.",
    question: "Have you told students about underlining?",
    minSeconds: 8,
  },
  {
    id: "highlighting",
    round: 2,
    audience: "both",
    instruction: "Remind students to highlight headings.",
    question: "Have you told students about highlighting?",
    minSeconds: 8,
  },
  {
    id: "lagging",
    round: 2,
    audience: "floor_incharge",
    instruction: "Ask the invigilator which students are falling behind.",
    question: "Have you informed the teacher about students who are lagging?",
    minSeconds: 8,
  },
];

export const staff: Staff[] = [
  ...Array.from({ length: 30 }, (_, i): Staff => ({
    id: `t${i + 1}`,
    name: `Teacher ${String(i + 1).padStart(2, "0")}`,
    role: "teacher",
  })),
  { id: "f1", name: "Floor Incharge A", role: "floor_incharge" },
  { id: "f2", name: "Floor Incharge B", role: "floor_incharge" },
  { id: "f3", name: "Floor Incharge C", role: "floor_incharge" },
];

export const schedule: Schedule = {
  timezone: "Asia/Karachi",
  startTime: "07:50",
  round2Time: "08:15",
  endTime: "08:40",
};
