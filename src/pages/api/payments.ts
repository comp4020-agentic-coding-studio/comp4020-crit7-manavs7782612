import type { APIRoute } from "astro";
import { getApplicationWithDetails, markPaymentSucceeded } from "../../lib/db";

// The mocked payment step: no external gateway, no card fields, but a real
// state transition — payments.status pending -> succeeded and
// applications.status awaiting_payment -> confirmed, in one transaction.
export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const applicationId = Number(form.get("applicationId"));
  const details = applicationId ? getApplicationWithDetails(applicationId) : undefined;

  if (!details || !details.payment || details.payment.status !== "pending") {
    return new Response("Nothing to pay", { status: 400 });
  }

  markPaymentSucceeded(applicationId);
  return redirect(`/status/${applicationId}`, 303);
};
