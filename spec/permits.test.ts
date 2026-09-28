import { beforeAll, describe, expect, inject, it } from "vitest";

// Turns pain points 1-3 of the brief into checks: audience, eligibility
// criteria and required documents must actually be present in the served
// HTML, not just designed on paper.
const baseUrl = inject("baseUrl");

describe("permit browse page", () => {
  let html: string;

  beforeAll(async () => {
    const res = await fetch(baseUrl);
    html = await res.text();
  });

  it("lists every seeded permit type with a visible audience tag", () => {
    for (const audience of ["staff", "student", "visitor", "accessibility", "motorcycle"]) {
      expect(html).toContain(`tag-${audience}`);
    }
  });

  it("links each permit type to its detail page", () => {
    expect(html).toContain("/permits/staff-general");
  });
});

describe("permit detail page", () => {
  let html: string;

  beforeAll(async () => {
    const res = await fetch(new URL("/permits/staff-general", baseUrl));
    html = await res.text();
  });

  it("shows who the permit is for", () => {
    expect(html).toContain("tag-staff");
  });

  it("states eligibility criteria before the apply link", () => {
    const eligibilityIndex = html.indexOf("Current ANU staff member");
    const applyIndex = html.indexOf("/apply/staff-general");
    expect(eligibilityIndex).toBeGreaterThan(-1);
    expect(applyIndex).toBeGreaterThan(-1);
    expect(eligibilityIndex).toBeLessThan(applyIndex);
  });

  it("states the required documents", () => {
    expect(html).toContain("Vehicle registration certificate");
  });
});

describe("application form", () => {
  it("repeats the eligibility criteria next to the confirmation checkbox", async () => {
    const res = await fetch(new URL("/apply/staff-general", baseUrl));
    const html = await res.text();
    expect(html).toContain("Current ANU staff member");
    expect(html).toContain("eligibilityConfirmed");
  });
});
