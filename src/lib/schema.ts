import { sql } from "drizzle-orm";
import { index, int, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// The schema is the ground truth for the database. To change it: edit here,
// run `pnpm db:generate` to turn the diff into a migration under drizzle/,
// and commit both — the migration applies automatically when the server
// boots (see src/lib/db.ts), locally and deployed. Never edit the database
// by hand: state on the deployed volume outlives every deploy, and the
// migration trail is what keeps old state and new code compatible.

// A permit type's audience is a fixed set, never inferred from its name —
// every page that lists or describes a permit type renders this column
// directly as a visible tag.
export const AUDIENCES = ["staff", "student", "visitor", "accessibility", "motorcycle"] as const;
export type Audience = (typeof AUDIENCES)[number];

export const permitTypes = sqliteTable(
  "permit_types",
  {
    id: int().primaryKey({ autoIncrement: true }),
    slug: text().notNull(),
    name: text().notNull(),
    audience: text().notNull().$type<Audience>(),
    description: text().notNull(),
    // Both lists are stored one item per line — plain text, no JSON parsing
    // needed to render or to seed.
    eligibilityCriteria: text("eligibility_criteria").notNull(),
    requiredDocuments: text("required_documents").notNull(),
    priceCents: int("price_cents").notNull(),
    active: int().notNull().default(1),
  },
  (table) => [uniqueIndex("permit_types_slug_idx").on(table.slug)],
);

export const applications = sqliteTable(
  "applications",
  {
    id: int().primaryKey({ autoIncrement: true }),
    permitTypeId: int("permit_type_id")
      .notNull()
      .references(() => permitTypes.id),
    applicantName: text("applicant_name").notNull(),
    applicantEmail: text("applicant_email").notNull(),
    applicantId: text("applicant_id").notNull(),
    // Ticked on the same page that shows the eligibility criteria, so the
    // confirmation is next to the text it confirms, not a memory of it.
    eligibilityConfirmed: int("eligibility_confirmed").notNull().default(0),
    // draft -> awaiting_payment -> confirmed (or cancelled)
    status: text().notNull().default("draft"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [index("applications_permit_type_idx").on(table.permitTypeId)],
);

export const payments = sqliteTable(
  "payments",
  {
    id: int().primaryKey({ autoIncrement: true }),
    applicationId: int("application_id")
      .notNull()
      .references(() => applications.id),
    amountCents: int("amount_cents").notNull(),
    // pending -> succeeded (mocked: no external gateway, but a real DB write)
    status: text().notNull().default("pending"),
    method: text().notNull().default("mock-card"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    completedAt: text("completed_at"),
  },
  (table) => [uniqueIndex("payments_application_idx").on(table.applicationId)],
);

export type PermitType = typeof permitTypes.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type Payment = typeof payments.$inferSelect;
