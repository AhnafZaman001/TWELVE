export type Round = 1 | 2;
export type Role = "invigilator" | "floor_incharge";

export interface Room {
  token: string;
  code: string;
  section: string | null;
  isTestRoom: boolean;
}

export interface Check {
  id: string;
  round: Round;
  audience: Role | "both";
  instruction: string;
  question: string;
  minSeconds: number;
}

export interface Staff {
  id: string;
  name: string;
  role: "teacher" | "floor_incharge";
}

export interface Schedule {
  timezone: string;
  startTime: string; // "07:50"
  round2Time: string; // "08:15"
  endTime: string; // "08:40"
}
