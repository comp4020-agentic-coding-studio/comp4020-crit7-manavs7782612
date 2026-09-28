import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import {
  type Application,
  applications,
  type Audience,
  type Payment,
  type PermitType,
  payments,
  permitTypes,
} from "./schema";

// One SQLite file is the app's whole persistent state. In production
// fly.toml points DATABASE_PATH at the machine's volume (/data), which is
// how state survives a reload and a redeploy; locally it defaults to an
// untracked file in .data/.
const path = process.env.DATABASE_PATH ?? "./.data/app.db";
mkdirSync(dirname(path), { recursive: true });

const client = new Database(path);
client.pragma("journal_mode = WAL");

export const db = drizzle(client);

// Migrations run at boot, on whatever machine holds the volume — the
// recommended shape for SQLite on Fly, where there's no separate machine to
// run them from. The flow: edit src/lib/schema.ts, `pnpm db:generate`,
// commit the migration it writes to drizzle/.
migrate(db, { migrationsFolder: "./drizzle" });

export type { Application, Payment, PermitType };

// Seeded once, idempotently, so a fresh volume always has something to
// browse and a redeploy never duplicates rows.
const SEED_PERMIT_TYPES: Array<Omit<PermitType, "id" | "active">> = [
  {
    slug: "staff-general",
    name: "Staff General Parking Permit",
    audience: "staff",
    description: "Day-to-day on-campus parking for continuing and fixed-term staff.",
    eligibilityCriteria: [
      "Current ANU staff member (continuing, fixed-term, or casual with a 6+ month contract)",
      "Vehicle registered in your name or a household member's name",
      "No unpaid ANU parking infringements on your account",
    ].join("\n"),
    requiredDocuments: [
      "ANU staff ID number",
      "Vehicle registration certificate",
      "Proof of current employment (offer letter or payslip) if on a fixed-term contract",
    ].join("\n"),
    priceCents: 45_000,
  },
  {
    slug: "student-general",
    name: "Student General Parking Permit",
    audience: "student",
    description: "Semester-length parking for enrolled students commuting to campus.",
    eligibilityCriteria: [
      "Currently enrolled in an ANU award course, minimum 0.5 EFTSL",
      "Vehicle registered in your name",
      "No unpaid ANU parking infringements on your account",
    ].join("\n"),
    requiredDocuments: [
      "ANU student ID number",
      "Current enrolment confirmation (from ISIS/my.anu)",
      "Vehicle registration certificate",
    ].join("\n"),
    priceCents: 28_000,
  },
  {
    slug: "visitor-daily",
    name: "Visitor Daily Permit",
    audience: "visitor",
    description: "Single-day parking for people visiting campus without an ANU ID.",
    eligibilityCriteria: [
      "Not a current ANU staff member or student",
      "Visiting for a specific, dated purpose (meeting, event, appointment)",
    ].join("\n"),
    requiredDocuments: [
      "Vehicle registration plate number",
      "Name of the ANU host or event you're attending",
    ].join("\n"),
    priceCents: 1_500,
  },
  {
    slug: "accessibility",
    name: "Accessibility Parking Permit",
    audience: "accessibility",
    description: "Reserved accessible-bay parking for staff, students or visitors with a mobility-related need.",
    eligibilityCriteria: [
      "Holds a current state or territory Disability Parking Permit",
      "Affiliated with ANU as staff, student, or a confirmed visitor",
    ].join("\n"),
    requiredDocuments: [
      "Photo or scan of your current state/territory Disability Parking Permit",
      "ANU staff or student ID number (if affiliated)",
    ].join("\n"),
    priceCents: 0,
  },
  {
    slug: "motorcycle",
    name: "Motorcycle & Scooter Permit",
    audience: "motorcycle",
    description: "Parking in designated motorcycle/scooter bays for any ANU affiliate.",
    eligibilityCriteria: [
      "Current ANU staff member or enrolled student",
      "Registered motorcycle, scooter, or moped",
    ].join("\n"),
    requiredDocuments: ["ANU staff or student ID number", "Vehicle registration certificate"].join("\n"),
    priceCents: 15_000,
  },
];

function ensureSeedPermitTypes(): void {
  if (listPermitTypes().length > 0) return;
  for (const permitType of SEED_PERMIT_TYPES) {
    db.insert(permitTypes)
      .values({ ...permitType, active: 1 })
      .run();
  }
}
ensureSeedPermitTypes();

export function listPermitTypes(): PermitType[] {
  return db.select().from(permitTypes).where(eq(permitTypes.active, 1)).all();
}

export function getPermitTypeBySlug(slug: string): PermitType | undefined {
  return db.select().from(permitTypes).where(eq(permitTypes.slug, slug)).get();
}

export function getPermitTypeById(id: number): PermitType | undefined {
  return db.select().from(permitTypes).where(eq(permitTypes.id, id)).get();
}

export function createApplication(input: {
  permitTypeId: number;
  applicantName: string;
  applicantEmail: string;
  applicantId: string;
  eligibilityConfirmed: boolean;
}): Application {
  return db
    .insert(applications)
    .values({
      permitTypeId: input.permitTypeId,
      applicantName: input.applicantName,
      applicantEmail: input.applicantEmail,
      applicantId: input.applicantId,
      eligibilityConfirmed: input.eligibilityConfirmed ? 1 : 0,
      status: "awaiting_payment",
    })
    .returning()
    .get();
}

export function createPayment(applicationId: number, amountCents: number): Payment {
  return db
    .insert(payments)
    .values({ applicationId, amountCents, status: "pending" })
    .returning()
    .get();
}

// One joined read instead of three round-trips — the query the status page
// (and the reload-persistence check) relies on.
export function getApplicationWithDetails(
  applicationId: number,
): { application: Application; permitType: PermitType; payment: Payment | null } | undefined {
  const row = db
    .select({ application: applications, permitType: permitTypes, payment: payments })
    .from(applications)
    .innerJoin(permitTypes, eq(applications.permitTypeId, permitTypes.id))
    .leftJoin(payments, eq(payments.applicationId, applications.id))
    .where(eq(applications.id, applicationId))
    .get();
  if (!row) return undefined;
  return row;
}

export function markPaymentSucceeded(applicationId: number): void {
  db.transaction((tx) => {
    tx.update(payments)
      .set({ status: "succeeded", completedAt: new Date().toISOString() })
      .where(eq(payments.applicationId, applicationId))
      .run();
    tx.update(applications).set({ status: "confirmed" }).where(eq(applications.id, applicationId)).run();
  });
}

export type { Audience };
