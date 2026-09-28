import { beforeAll, describe, expect, inject, it } from "vitest";

// There's no login in this prototype, so /my-permits/ is the only place an
// applicant can see their own history — checks that it actually finds the
// right applicant's applications and payments, and nobody else's.
const baseUrl = inject("baseUrl");

const post = (path: string, body: URLSearchParams) =>
  fetch(new URL(path, baseUrl), {
    method: "POST",
    headers: { origin: baseUrl },
    body,
    redirect: "manual",
  });

describe("my permits lookup", () => {
  let permitTypeId: string;
  let applicantEmail: string;
  let otherApplicantEmail: string;
  let applicationId: string;

  beforeAll(async () => {
    const formHtml = await (await fetch(new URL("/apply/staff-general", baseUrl))).text();
    const match = formHtml.match(/name="permitTypeId" value="(\d+)"/);
    if (!match) throw new Error("couldn't find permitTypeId on the application form");
    permitTypeId = match[1];

    const stamp = process.hrtime.bigint();
    applicantEmail = `my-permits-probe-${stamp}@anu.edu.au`;
    otherApplicantEmail = `my-permits-other-${stamp}@anu.edu.au`;

    for (const email of [applicantEmail, otherApplicantEmail]) {
      const applyRes = await post(
        "/api/applications",
        new URLSearchParams({
          permitTypeId,
          applicantName: "My Permits Probe",
          applicantEmail: email,
          applicantId: "u1234567",
          eligibilityConfirmed: "on",
        }),
      );
      const payPath = applyRes.headers.get("location");
      if (!payPath) throw new Error("application didn't redirect to a payment page");
      if (email === applicantEmail) applicationId = payPath.split("/").pop()!;
      await post("/api/payments", new URLSearchParams({ applicationId: payPath.split("/").pop()! }));
    }
  });

  it("shows a matching applicant their application and its paid status", async () => {
    const res = await fetch(new URL(`/my-permits/?email=${encodeURIComponent(applicantEmail)}`, baseUrl));
    const html = await res.text();
    expect(html).toContain(`/status/${applicationId}`);
    expect(html).toContain("confirmed");
    expect(html).toContain("Paid");
  });

  it("doesn't show one applicant's application to a different email", async () => {
    const res = await fetch(new URL(`/my-permits/?email=${encodeURIComponent(otherApplicantEmail)}`, baseUrl));
    const html = await res.text();
    expect(html).not.toContain(`/status/${applicationId}`);
  });

  it("says so when no application matches the email", async () => {
    const res = await fetch(new URL("/my-permits/?email=nobody-here@anu.edu.au", baseUrl));
    const html = await res.text();
    expect(html).toContain("No applications found");
  });
});
