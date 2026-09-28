import { beforeAll, describe, expect, inject, it } from "vitest";

// Drives the real HTTP flow end to end: apply -> pay -> status, then reloads
// the status page to prove the crit's persistence requirement — "create
// something, and it's still there" — for this app's core flow.
const baseUrl = inject("baseUrl");

// Astro checks form POSTs carry a same-origin Origin header (CSRF
// protection); browsers send it automatically, a bare fetch doesn't.
const post = (path: string, body: URLSearchParams) =>
  fetch(new URL(path, baseUrl), {
    method: "POST",
    headers: { origin: baseUrl },
    body,
    redirect: "manual",
  });

describe("application flow", () => {
  let permitTypeId: string;
  let applicantEmail: string;

  beforeAll(async () => {
    const formHtml = await (await fetch(new URL("/apply/staff-general", baseUrl))).text();
    const match = formHtml.match(/name="permitTypeId" value="(\d+)"/);
    if (!match) throw new Error("couldn't find permitTypeId on the application form");
    permitTypeId = match[1];
    applicantEmail = `spec-probe-${process.hrtime.bigint()}@anu.edu.au`;
  });

  it("submits an application and redirects to the mock payment step", async () => {
    const res = await post(
      "/api/applications",
      new URLSearchParams({
        permitTypeId,
        applicantName: "Spec Probe",
        applicantEmail,
        applicantId: "u1234567",
        eligibilityConfirmed: "on",
      }),
    );
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toMatch(/^\/pay\/\d+$/);
  });

  it("pays and redirects to a persisted status page", async () => {
    const applyRes = await post(
      "/api/applications",
      new URLSearchParams({
        permitTypeId,
        applicantName: "Spec Probe Two",
        applicantEmail: `two-${applicantEmail}`,
        applicantId: "u7654321",
        eligibilityConfirmed: "on",
      }),
    );
    const payPath = applyRes.headers.get("location");
    if (!payPath) throw new Error("application didn't redirect to a payment page");
    const applicationId = payPath.split("/").pop();

    const payRes = await post("/api/payments", new URLSearchParams({ applicationId: applicationId! }));
    expect(payRes.status).toBe(303);
    expect(payRes.headers.get("location")).toBe(`/status/${applicationId}`);

    // Fetch the status page twice, simulating a reload — both must show the
    // confirmed application, proving it survives beyond the request that
    // created it.
    for (let i = 0; i < 2; i++) {
      const statusRes = await fetch(new URL(payRes.headers.get("location")!, baseUrl));
      const html = await statusRes.text();
      expect(html).toContain("Spec Probe Two");
      expect(html).toContain("confirmed");
      expect(html).toContain("succeeded");
    }
  });
});
