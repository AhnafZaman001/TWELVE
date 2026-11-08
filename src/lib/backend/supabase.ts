// Supabase backend. Server-only: uses the service-role key, which must never
// reach the browser. Tables are defined in supabase/migrations.
import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { StoredReport } from "../report";
import { localParts } from "../time";
import type { Check, Room, Schedule, Staff } from "../types";
import type { Backend } from "./types";

const SCHOOL_SLUG = process.env.SCHOOL_SLUG || "main";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

function must<T>(result: { data: T | null; error: { message: string } | null }, what: string): NonNullable<T> {
  if (result.error) throw new Error(`Supabase ${what}: ${result.error.message}`);
  if (result.data === null || result.data === undefined) throw new Error(`Supabase ${what}: no data`);
  return result.data;
}

interface SchoolRow {
  id: string;
  timezone: string;
  start_time: string;
  round2_time: string;
  end_time: string;
  buffer_minutes: number;
}

async function school(): Promise<SchoolRow> {
  return must(
    await supabase
      .from("schools")
      .select("id, timezone, start_time, round2_time, end_time, buffer_minutes")
      .eq("slug", SCHOOL_SLUG)
      .single(),
    `school '${SCHOOL_SLUG}'`,
  );
}

const toSchedule = (s: SchoolRow): Schedule => ({
  timezone: s.timezone,
  startTime: s.start_time,
  round2Time: s.round2_time,
  endTime: s.end_time,
  bufferMinutes: s.buffer_minutes,
});

const ROOM_COLUMNS = "code, section, is_test_room, qr_token";
const toRoom = (r: { code: string; section: string | null; is_test_room: boolean; qr_token: string }): Room => ({
  token: r.qr_token,
  code: r.code,
  section: r.section,
  isTestRoom: r.is_test_room,
});

export const supabaseBackend: Backend = {
  name: "supabase",

  getSchedule: async () => toSchedule(await school()),

  async getRooms() {
    const s = await school();
    const rows = must(
      await supabase.from("rooms").select(ROOM_COLUMNS).eq("school_id", s.id).eq("active", true).order("sort"),
      "rooms",
    );
    return rows.map(toRoom);
  },

  async getRoomByToken(token) {
    const s = await school();
    const { data, error } = await supabase
      .from("rooms")
      .select(ROOM_COLUMNS)
      .eq("school_id", s.id)
      .eq("qr_token", token)
      .eq("active", true)
      .maybeSingle();
    if (error) throw new Error(`Supabase room: ${error.message}`);
    return data ? toRoom(data) : null;
  },

  async getChecks() {
    const s = await school();
    const rows = must(
      await supabase
        .from("checks")
        .select("slug, round, audience, instruction, question, min_seconds")
        .eq("school_id", s.id)
        .eq("active", true)
        .order("sort"),
      "checks",
    );
    return rows.map(
      (c): Check => ({
        id: c.slug,
        round: c.round as Check["round"],
        audience: c.audience as Check["audience"],
        instruction: c.instruction,
        question: c.question,
        minSeconds: c.min_seconds,
      }),
    );
  },

  async getStaff() {
    const s = await school();
    const rows = must(
      await supabase
        .from("staff")
        .select("id, full_name, role")
        .eq("school_id", s.id)
        .eq("active", true)
        .order("full_name"),
      "staff",
    );
    return rows.map((r): Staff => ({ id: r.id, name: r.full_name, role: r.role as Staff["role"] }));
  },

  async saveReport(report, problems, receivedAt = new Date()) {
    const s = await school();
    const room = must<{ id: string }>(
      await supabase
        .from("rooms")
        .select("id")
        .eq("school_id", s.id)
        .eq("qr_token", report.roomToken)
        .single(),
      "room lookup",
    );
    const checkRows = must(
      await supabase.from("checks").select("id, slug").eq("school_id", s.id),
      "check lookup",
    );
    const checkId = new Map(checkRows.map((c) => [c.slug, c.id]));

    const saved = must<{ id: string }>(
      await supabase
        .from("reports")
        .insert({
          school_id: s.id,
          room_id: room.id,
          staff_id: report.staffId,
          role: report.role,
          round: report.round,
          local_date: localParts(receivedAt, s.timezone).dateKey,
          arrived_at: report.arrivedAt,
          received_at: receivedAt.toISOString(),
          problems,
          total: report.attendance?.total ?? null,
          present: report.attendance?.present ?? null,
          absent: report.attendance?.absent ?? null,
          late: report.attendance?.late ?? null,
          non_attempting: report.nonAttempting?.count ?? null,
          non_attempting_names: report.nonAttempting?.names || null,
        })
        .select("id")
        .single(),
      "save report",
    );

    const answers = report.answers
      .filter((a) => checkId.has(a.checkId))
      .map((a) => ({
        report_id: saved.id,
        check_id: checkId.get(a.checkId)!,
        result: a.result,
        seconds_on_card: Math.round(a.secondsOnCard),
      }));
    if (answers.length) {
      const { error } = await supabase.from("answers").insert(answers);
      if (error) throw new Error(`Supabase save answers: ${error.message}`);
    }
  },

  async listReports(dateKey) {
    const s = await school();
    const rows = must(
      await supabase
        .from("reports")
        .select(
          "id, role, round, staff_id, arrived_at, received_at, problems, total, present, absent, late, " +
            "non_attempting, non_attempting_names, rooms(qr_token), answers(result, seconds_on_card, checks(slug))",
        )
        .eq("school_id", s.id)
        .eq("local_date", dateKey)
        .returns<ReportRow[]>(),
      "list reports",
    );
    return rows.map(
      (r): StoredReport => ({
        id: r.id,
        roomToken: r.rooms?.qr_token ?? "",
        staffId: r.staff_id,
        role: r.role,
        round: r.round,
        arrivedAt: r.arrived_at,
        receivedAt: r.received_at,
        problems: r.problems,
        answers: r.answers.map((a) => ({
          checkId: a.checks?.slug ?? "",
          result: a.result,
          secondsOnCard: a.seconds_on_card,
        })),
        attendance:
          r.total === null
            ? undefined
            : { total: r.total, present: r.present ?? 0, absent: r.absent ?? 0, late: r.late ?? 0 },
        nonAttempting:
          r.non_attempting === null
            ? undefined
            : { count: r.non_attempting, names: r.non_attempting_names ?? "" },
      }),
    );
  },

  async clearReports(dateKey) {
    const s = await school();
    const { error } = await supabase.from("reports").delete().eq("school_id", s.id).eq("local_date", dateKey);
    if (error) throw new Error(`Supabase clear reports: ${error.message}`);
  },
};

interface ReportRow {
  id: string;
  role: StoredReport["role"];
  round: StoredReport["round"];
  staff_id: string;
  arrived_at: string;
  received_at: string;
  problems: string[];
  total: number | null;
  present: number | null;
  absent: number | null;
  late: number | null;
  non_attempting: number | null;
  non_attempting_names: string | null;
  rooms: { qr_token: string } | null;
  answers: { result: "done" | "skipped"; seconds_on_card: number; checks: { slug: string } | null }[];
}
