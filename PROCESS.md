# Process overview

## What I built

A redesign of ANU's ePermit parking portal, modelled as one full-stack slice —
browse permit types, apply, pay, check status — fixing five first-hand pain
points with the real portal: unclear audience, missing document requirements,
invisible eligibility, slow pages, and a clunky payment step.

## How I got here

I picked ANU's real ePermit portal and named five first-hand problems with it
up front, then had Claude Code draft an implementation plan before writing
code — that turned the vague pain points into specific schema fields and page
decisions checkable against the crit's own spec.

The schema came first: `permit_types` carries `audience`, `eligibilityCriteria`
and `requiredDocuments` as first-class columns, so the browse page, detail
page and application form all read the same fields and can't say three
different things about one permit
([`2b92437`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-manavs7782612/commit/2b92437)).
Pages then built in flow order — browse/detail read-only first
([`7deba61`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-manavs7782612/commit/7deba61)),
then the application form with its eligibility checkbox directly under the
criteria it confirms
([`5336f2a`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-manavs7782612/commit/5336f2a)),
then the mocked payment step and status page
([`79d7002`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-manavs7782612/commit/79d7002)).
I deliberately cut the starter's SSE live-broadcast rather than adapt it — a
single-applicant flow doesn't need a multi-tab feed, and dropping it is a
direct answer to "pages load slowly," not just a side effect of replacing the
guestbook.

I corrected one mistake in my own first schema draft: `applications
.permit_type_id` was accidentally unique, which would have capped each permit
type at one application ever — caught on re-reading before generating the
migration, fixed to a plain index.

To ground the reload-persistence requirement I drove the full flow manually
with curl against the built server (apply → pay → GET the status page twice)
before writing the automated version of the same check
([`be0d44b`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-manavs7782612/commit/be0d44b)).
`pnpm check` is green on every commit in this history.

Later, on rereading the flow, I noticed there was nowhere to check "did my
payment go through" once you'd left the status page — no login exists, so
without a lookup that answer was gone the moment you closed the tab. I
added `/my-permits/`, keyed on the applicant's email (the one field they
already type on the form, and the only handle they have on their own
history without an account), with a spec test asserting one applicant's
email never surfaces another's application
([`5c86360`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-manavs7782612/commit/5c86360)).

