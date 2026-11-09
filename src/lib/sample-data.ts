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
    qrIssuedAt: "2026-11-01T00:00:00.000Z",
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
    { id: "r-mid", name: "During the test", startTime: "08:15", countsKind: "non_attempting", sort: 2 },
    { id: "r-end", name: "Before collecting the scripts", startTime: "08:30", countsKind: "none", sort: 3 },
  ];
  // [round, question, instruction], in the order teachers see them
  const list: [string, string, string][] = [
    ["r-start", "Are students seated in roll-number order?",
      "Walk the room and confirm that every student is seated according to the roll-number seating plan."],
    ["r-start", "Have Paper A and Paper B been distributed alternately by row?",
      "Check that adjacent rows hold different paper versions, following the roll-number rows."],
    ["r-start", "Are the paper details displayed on the whiteboard?",
      "Subject, paper version, date, start and finish time, and total marks should be written clearly."],
    ["r-start", "Has the attendance sheet been circulated and collected from all students?",
      "Make sure every present student has signed and the sheet is back with you."],
    ["r-start", "Does your headcount match the attendance sheet?",
      "Count the students in the room and compare the total with the signatures."],
    ["r-start", "Have all absentees been verified?", "Confirm each absent roll number against the attendance sheet."],
    ["r-mid", "Have students been instructed to draw margins?", "Check margins on at least five answer sheets."],
    ["r-mid", "Have students been instructed to underline headings?", "Check headings on the same answer sheets."],
    ["r-mid", "Have students been instructed to highlight key terms?",
      "Check for highlighted key terms on the same answer sheets."],
    ["r-mid", "Have you identified students who are not attempting the paper?",
      "Walk the room and look for students who have not started writing or have stopped."],
    ["r-end", "Have the answer sheets been stapled under your supervision?",
      "Students must staple their sheets in front of you, not before the test."],
    ["r-end", "Have you checked the answer sheets for concealed or pre-written material?",
      "Inspect for extra sheets attached that were written outside the examination room."],
  ];
  const checks: Check[] = list.map(([roundId, question, instruction], i) => ({
    id: `check-${i + 1}`,
    roundId,
    audience: "both",
    instruction,
    question,
    minSeconds: 8,
    active: true,
    sort: i + 1,
  }));
  const staff: Staff[] = [
    ...Array.from({ length: 30 }, (_, i): Staff => ({
      id: `t${i + 1}`,
      name: `Teacher ${String(i + 1).padStart(2, "0")}`,
      email: null,
      role: "teacher",
      active: true,
    })),
    ...["A", "B", "C"].map((x, i): Staff => ({
      id: `f${i + 1}`,
      name: `Floor Incharge ${x}`,
      email: null,
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
      qrRotateDays: 0,
    },
    groups,
    rooms,
    sections,
    rounds,
    checks,
    staff,
    admins: [],
  };
}
