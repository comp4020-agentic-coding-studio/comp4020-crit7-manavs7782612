# ePermit, redesigned

ANU's real ePermit parking portal has five recurring problems: it never says
who a permit type is actually for, it doesn't list the documents you need
before you start, eligibility criteria are nowhere to be found, pages are
slow, and paying is clunky. This prototype models one slice of that system —
browse permit types, apply, pay, check status — end to end in Astro, Drizzle
and SQLite, fixing all five as concrete design decisions rather than vague
claims.

## What good looks like here

Five permit types (staff, student, visitor, accessibility, motorcycle) each
carry their own `audience`, `eligibilityCriteria` and `requiredDocuments` as
first-class database columns, not text buried in a name or a PDF. The browse
page and the detail page both render `audience` as a visible tag — never
inferred from the permit's name. The detail page and the application form
both render `eligibilityCriteria` and `requiredDocuments` from the same
field, so the two surfaces can't drift out of sync; the applicant reads the
criteria and ticks a confirmation checkbox on the very same page, not from
memory of an earlier one.

Payment is intentionally minimal: one page, one amount, one "Pay now"
button, no card fields and no redirect to an external gateway — because a
prototype gains nothing from simulating a card form, but it does need a real
state transition. Submitting still does a genuine SQLite write
(`payments.status` `pending → succeeded`, `applications.status`
`awaiting_payment → confirmed`) in one transaction, and the resulting status
page is a plain GET-by-id read, so it survives a reload.

"Fast" here means a specific, checkable decision, not a vague promise: every
page is server-rendered with zero client-side JavaScript (the starter's SSE
live-update script is gone entirely — a single-applicant flow doesn't need a
multi-tab broadcast), the foreign keys applications→permit_types and
payments→applications are indexed, and the status page reads through one
joined query instead of three round-trips.

There's no login here — an applicant's only handle on their own history is
the email they typed on the application form. `/my-permits/` takes that
email in a plain GET form (no client JS, no session) and renders every
application tied to it alongside its payment: status, amount and, once
paid, the completion date — so "did my payment go through" and "what did I
apply for" are one lookup, not a support email.

What's enforced by `spec/` (`spec/permits.test.ts`,
`spec/application-flow.test.ts`, `spec/my-permits.test.ts`, plus the shipped
invariants): every audience tag appears on the browse page, eligibility
criteria appear before the apply link on the detail page and again on the
form, required documents are stated, an application survives two consecutive
reads of its status page after payment, and looking up an email on
`/my-permits/` surfaces that applicant's applications and payment status but
no one else's. What's left as judgement: which five permit types to model,
how the mocked payment is worded, and the visual design of the tags — the
brief asks for a believable slice, not the *whole* ANU parking system.
