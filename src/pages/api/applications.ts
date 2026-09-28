import type { APIRoute } from "astro";
import { createApplication, createPayment, getPermitTypeById } from "../../lib/db";

// The write half of the application form: validate, persist the application
// as awaiting_payment, create its (still-pending) payment row priced from the
// permit type, then redirect to the mock payment step. No client-side
// JavaScript needed — the 303 redirect is what carries the new application
// id forward.
export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const permitTypeId = Number(form.get("permitTypeId"));
  const applicantName = String(form.get("applicantName") ?? "").trim();
  const applicantEmail = String(form.get("applicantEmail") ?? "").trim();
  const applicantId = String(form.get("applicantId") ?? "").trim();
  const eligibilityConfirmed = form.get("eligibilityConfirmed") === "on";

  const permitType = permitTypeId ? getPermitTypeById(permitTypeId) : undefined;
  if (!permitType || !applicantName || !applicantEmail || !applicantId || !eligibilityConfirmed) {
    return new Response("Missing required fields", { status: 400 });
  }

  const application = createApplication({
    permitTypeId,
    applicantName,
    applicantEmail,
    applicantId,
    eligibilityConfirmed,
  });
  createPayment(application.id, permitType.priceCents);

  return redirect(`/pay/${application.id}`, 303);
};
