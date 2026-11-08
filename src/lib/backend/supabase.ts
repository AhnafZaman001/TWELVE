// Supabase backend. Server-only: uses the service-role key, which must never
// reach the browser. Tables are defined in supabase/migrations.
import "server-only";
import { createClient } from "@supabase/supabase-js";
import { newToken } from "../entities";
import type { StoredReport } from "../report";
import { localParts } from "../time";
import type { Entities, EntityKind, Room, School, Setup } from "../types";
import type { Backend } from "./types";

const SCHOOL_SLUG = process.env.SCHOOL_SLUG || "main";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

type Row = Record<string, unknown>;

function must<T>(result: { data: T | null; error: { message: string; code?: string } | null }, what: string) {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  if (result.data === null || result.data === undefined) throw new Error(`${what}: no data`);
  return result.data as NonNullable<T>;
}

// App field name -> database column, per editable list
const COLUMNS: { [K in EntityKind]: { table: string; order: string; map: Partial<Record<keyof Entities[K], string>> } } = {
  groups: { table: "groups", order: "sort", map: { id: "id", name: "name", sort: "sort" } },
  rooms: {
    table: "rooms",
    order: "sort",
    map: { id: "id", code: "code", token: "qr_token", active: "active", sort: "sort" },
  },
  sections: {
    table: "sections",
    order: "sort",
    map: { id: "id", name: "name", groupId: "group_id", roomId: "room_id", active: "active", sort: "sort" },
  },
  rounds: {
    table: "rounds",
    order: "sort",
    map: { id: "id", name: "name", startTime: "start_time", countsKind: "counts_kind", sort: "sort" },
  },
  checks: {
    table: "checks",
    order: "sort",
    map: {
      id: "id",
      roundId: "round_id",
      audience: "audience",
      instruction: "instruction",
      question: "question",
      minSeconds: "min_seconds",
      active: "active",
      sort: "sort",
    },
  },
  staff: { table: "staff", order: "full_name", map: { id: "id", name: "full_name", role: "role", active: "active" } },
};

function fromDb<K extends EntityKind>(kind: K, row: Row): Entities[K] {
  const out: Row = {};
  for (const [field, col] of Object.entries(COLUMNS[kind].map)) out[field] = row[col as string];
  return out as unknown as Entities[K];
}

function toDb<K extends EntityKind>(kind: K, obj: Row): Row {
  const out: Row = {};
  for (const [field, col] of Object.entries(COLUMNS[kind].map)) {
    if (field in obj && field !== "id") out[col as string] = obj[field];
  }
  return out;
}

const selectCols = (kind: EntityKind) => Object.values(COLUMNS[kind].map).join(", ");

interface SchoolRow {
  id: string;
  name: string;
  timezone: string;
  end_time: string;
  buffer_minutes: number;
  test_weekdays: number[];
}

async function school(): Promise<SchoolRow> {
  return must(
    await supabase
      .from("schools")
      .select("id, name, timezone, end_time, buffer_minutes, test_weekdays")
      .eq("slug", SCHOOL_SLUG)
      .single<SchoolRow>(),
    `School '${SCHOOL_SLUG}'`,
  );
}

const toSchool = (s: SchoolRow): School => ({
  name: s.name,
  timezone: s.timezone,
  endTime: s.end_time,
  bufferMinutes: s.buffer_minutes,
  testWeekdays: s.test_weekdays,
});

async function listKind<K extends EntityKind>(kind: K, schoolId: string): Promise<Entities[K][]> {
  const { table, order } = COLUMNS[kind];
  const rows = must(
    await supabase.from(table).select(selectCols(kind)).eq("school_id", schoolId).order(order).returns<Row[]>(),
    `Load ${kind}`,
  );
  return rows.map((r) => fromDb(kind, r));
}

export const supabaseBackend: Backend = {
  name: "supabase",

  async getSetup(): Promise<Setup> {
    const s = await school();
    const [groups, rooms, sections, rounds, checks, staff] = await Promise.all([
      listKind("groups", s.id),
      listKind("rooms", s.id),
      listKind("sections", s.id),
      listKind("rounds", s.id),
      listKind("checks", s.id),
      listKind("staff", s.id),
    ]);
    return { school: toSchool(s), groups, rooms, sections, rounds, checks, staff };
  },

  async getRoomByToken(token) {
    const s = await school();
    const { data, error } = await supabase
      .from("rooms")
      .select(selectCols("rooms"))
      .eq("school_id", s.id)
      .eq("qr_token", token)
      .eq("active", true)
      .maybeSingle<Row>();
    if (error) throw new Error(`Room: ${error.message}`);
    return data ? fromDb("rooms", data) : null;
  },

  async saveSchool(next) {
    const s = await school();
    const saved = must(
      await supabase
        .from("schools")
        .update({
          name: next.name,
          timezone: next.timezone,
          end_time: next.endTime,
          buffer_minutes: next.bufferMinutes,
          test_weekdays: next.testWeekdays,
        })
        .eq("id", s.id)
        .select("id, name, timezone, end_time, buffer_minutes, test_weekdays")
        .single<SchoolRow>(),
      "Save school",
    );
    return toSchool(saved);
  },

  async upsert(kind, input) {
    const s = await school();
    const { table } = COLUMNS[kind];
    const values = toDb(kind, input as Row);
    const query = input.id
      ? supabase.from(table).update(values).eq("id", input.id).eq("school_id", s.id)
      : supabase
          .from(table)
          .insert({ ...values, school_id: s.id, ...(kind === "rooms" ? { qr_token: newToken() } : {}) });
    const row = must(await query.select(selectCols(kind)).single<Row>(), `Save ${kind}`);
    return fromDb(kind, row);
  },

  async remove(kind, id) {
    const s = await school();
    const { error } = await supabase.from(COLUMNS[kind].table).delete().eq("id", id).eq("school_id", s.id);
    if (error) throw new Error(`Delete ${kind}: ${error.message}`);
  },

  async newRoomToken(roomId): Promise<Room> {
    const s = await school();
    const row = must(
      await supabase
        .from("rooms")
        .update({ qr_token: newToken() })
        .eq("id", roomId)
        .eq("school_id", s.id)
        .select(selectCols("rooms"))
        .single<Row>(),
      "New QR code",
    );
    return fromDb("rooms", row);
  },

  async saveReport({ receivedAt = new Date(), ...r }) {
    const s = await school();
    const saved = must(
      await supabase
        .from("reports")
        .insert({
          school_id: s.id,
          room_id: r.roomId,
          section_id: r.sectionId,
          staff_id: r.staffId,
          round_id: r.roundId,
          room_code: r.roomCode,
          section_name: r.sectionName,
          staff_name: r.staffName,
          round_name: r.roundName,
          role: r.role,
          local_date: localParts(receivedAt, s.timezone).dateKey,
          arrived_at: r.arrivedAt,
          received_at: receivedAt.toISOString(),
          problems: r.problems,
          total: r.attendance?.total ?? null,
          present: r.attendance?.present ?? null,
          absent: r.attendance?.absent ?? null,
          late: r.attendance?.late ?? null,
          non_attempting: r.nonAttempting?.count ?? null,
          non_attempting_names: r.nonAttempting?.names || null,
        })
        .select("id")
        .single<{ id: string }>(),
      "Save report",
    );
    if (r.answers.length) {
      const { error } = await supabase.from("answers").insert(
        r.answers.map((a) => ({
          report_id: saved.id,
          check_id: a.checkId,
          question: r.questions[a.checkId] ?? a.checkId,
          result: a.result,
          seconds_on_card: Math.round(a.secondsOnCard),
        })),
      );
      if (error) throw new Error(`Save answers: ${error.message}`);
    }
  },

  async listReports(dateKey) {
    const s = await school();
    const rows = must(
      await supabase
        .from("reports")
        .select("*, rooms(qr_token), answers(check_id, question, result, seconds_on_card)")
        .eq("school_id", s.id)
        .eq("local_date", dateKey)
        .returns<ReportRow[]>(),
      "Load reports",
    );
    return rows.map(
      (r): StoredReport => ({
        id: r.id,
        roomId: r.room_id,
        roomToken: r.rooms?.qr_token ?? "",
        roomCode: r.room_code,
        sectionId: r.section_id,
        sectionName: r.section_name,
        staffId: r.staff_id ?? "",
        staffName: r.staff_name,
        roundId: r.round_id ?? "",
        roundName: r.round_name,
        role: r.role,
        arrivedAt: r.arrived_at,
        receivedAt: r.received_at,
        problems: r.problems,
        questions: Object.fromEntries(r.answers.map((a) => [a.check_id ?? a.question, a.question])),
        answers: r.answers.map((a) => ({
          checkId: a.check_id ?? a.question,
          result: a.result,
          secondsOnCard: a.seconds_on_card,
        })),
        attendance:
          r.total === null
            ? undefined
            : { total: r.total, present: r.present ?? 0, absent: r.absent ?? 0, late: r.late ?? 0 },
        nonAttempting:
          r.non_attempting === null ? undefined : { count: r.non_attempting, names: r.non_attempting_names ?? "" },
      }),
    );
  },

  async clearReports(dateKey) {
    const s = await school();
    const { error } = await supabase.from("reports").delete().eq("school_id", s.id).eq("local_date", dateKey);
    if (error) throw new Error(`Clear reports: ${error.message}`);
  },
};

interface ReportRow {
  id: string;
  room_id: string | null;
  section_id: string | null;
  staff_id: string | null;
  round_id: string | null;
  room_code: string;
  section_name: string | null;
  staff_name: string;
  round_name: string;
  role: StoredReport["role"];
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
  answers: { check_id: string | null; question: string; result: "done" | "skipped"; seconds_on_card: number }[];
}
