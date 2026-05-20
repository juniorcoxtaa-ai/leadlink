import { describe, expect, it } from "vitest";
import {
  buildAppointmentActivity,
  buildAppointmentPayload,
  buildScheduleDraft,
  validateAppointmentForm,
} from "@/lib/appointments";

describe("appointments helpers", () => {
  it("builds valid payload with current lead", () => {
    const payload = buildAppointmentPayload({
      title: " Retorno com Ana ",
      type: "retorno",
      date: "2026-05-20",
      time: "10:30",
      propertyId: "p1",
      propertyTitle: "Apartamento Teste",
      currentLead: { id: "l1", name: "Ana", phone: "11999999999" } as never,
    });
    expect(payload.title).toBe("Retorno com Ana");
    expect(payload.leadId).toBe("l1");
    expect(payload.propertyId).toBe("p1");
    expect(payload.date).toContain("2026-05-20");
  });

  it("blocks without title", () => {
    expect(validateAppointmentForm({ title: " ", date: "2026-05-20", time: "10:00" })).toEqual({
      ok: false,
      error: "missing_title",
    });
  });

  it("blocks without date and time", () => {
    expect(validateAppointmentForm({ title: "Teste", date: "", time: "" })).toEqual({
      ok: false,
      error: "missing_datetime",
    });
  });

  it("creates schedule draft from current lead", () => {
    const draft = buildScheduleDraft("visita", { id: "1", name: "Paula" } as never);
    expect(draft.leadId).toBe("1");
    expect(draft.title).toContain("Paula");
  });

  it("builds appointment activity when lead exists", () => {
    const activity = buildAppointmentActivity({
      id: "a1",
      type: "retorno",
      title: "Retorno",
      leadId: "l1",
      date: "2026-05-20T10:00:00.000Z",
    } as never);
    expect(activity?.type).toBe("extension_appointment_created");
    expect(activity?.text).toContain("Agendamento criado");
  });
});
