import { createFileRoute } from "@tanstack/react-router";
import {
  db,
  desc,
  eq,
  getLeadActivity,
  jsonResponse,
  leads,
  matchBrazilianPhones,
  mapLead,
  optionsResponse,
  possiblePhoneVariants,
  requireExtensionSession,
  withExtensionRouteErrorHandling,
} from "./-utils";

const isDev = process.env.NODE_ENV !== "production";

export const Route = createFileRoute("/api/extension/leads/by-phone/$phone")({
  server: {
    handlers: {
      OPTIONS: ({ request }) => optionsResponse(request),
      GET: async ({ request, params }) => {
        return withExtensionRouteErrorHandling(request, async () => {
          const auth = await requireExtensionSession(request);
          if (auth.response) return auth.response;

          const detectedPhone = params.phone;
          const targetVariants = possiblePhoneVariants(detectedPhone);
          if (isDev) {
            console.log("[LeadLink][by-phone] detected phone", detectedPhone);
            console.log("[LeadLink][by-phone] detected variants", targetVariants);
          }
          if (!targetVariants.length) {
            if (isDev) console.log("[LeadLink][by-phone] no variants generated");
            return jsonResponse(request, { found: false });
          }

          const rows = await db
            .select()
            .from(leads)
            .where(eq(leads.brokerId, auth.session.user.id))
            .orderBy(desc(leads.createdAt));

          const lead = rows.find((row) => {
            const matched = matchBrazilianPhones(detectedPhone, row.phone);
            if (isDev) {
              console.log("[LeadLink][by-phone] compare", {
                detectedPhone,
                leadPhone: row.phone,
                leadVariants: possiblePhoneVariants(row.phone),
                matched,
              });
            }
            return matched;
          });
          if (!lead) {
            if (isDev) console.log("[LeadLink][by-phone] lead not found");
            return jsonResponse(request, { found: false });
          }

          if (isDev) {
            console.log("[LeadLink][by-phone] lead found", {
              leadId: lead.id,
              leadName: lead.name,
              leadPhone: lead.phone,
            });
          }

          const activity = await getLeadActivity(lead.id);
          return jsonResponse(request, { found: true, lead: mapLead({ ...lead, activity }) });
        });
      },
    },
  },
});
