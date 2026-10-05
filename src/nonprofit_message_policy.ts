import { z } from "zod";

const receiptSchema = z.object({
  kind: z.literal("donor_receipt"),
  donorName: z.string().min(1).max(120),
  amount: z.number().positive(),
  currency: z.string().length(3),
  receivedOn: z.iso.date(),
  campaignName: z.string().min(1).max(160),
  receiptId: z.string().min(1).max(80),
  internalNote: z.string().max(500).optional()
});

const reminderSchema = z.object({
  kind: z.literal("volunteer_reminder"),
  volunteerName: z.string().min(1).max(120),
  shiftName: z.string().min(1).max(160),
  startsAt: z.iso.datetime({ offset: true }),
  location: z.string().min(1).max(240),
  coordinatorName: z.string().min(1).max(120)
});

const reportSchema = z.object({
  kind: z.literal("campaign_report"),
  campaignName: z.string().min(1).max(160),
  reportingPeriod: z.string().min(1).max(80),
  donationsTotal: z.number().nonnegative(),
  currency: z.string().length(3),
  donors: z.number().int().nonnegative(),
  volunteerHours: z.number().nonnegative(),
  audience: z.enum(["board", "staff"])
});

export const nonprofitMessageSchema = z.discriminatedUnion("kind", [
  receiptSchema,
  reminderSchema,
  reportSchema
]);

export type NonprofitMessage = z.infer<typeof nonprofitMessageSchema>;

export type MessagePlan = {
  systemInstruction: string;
  facts: Record<string, string | number>;
};

export function planMessage(input: NonprofitMessage): MessagePlan {
  if (input.kind === "donor_receipt") {
    return {
      systemInstruction:
        "Write a warm, concise donation receipt email. State that this is a receipt, include every supplied fact, and do not invent tax guidance or mention internal notes.",
      facts: {
        donorName: input.donorName,
        amount: input.amount,
        currency: input.currency.toUpperCase(),
        receivedOn: input.receivedOn,
        campaignName: input.campaignName,
        receiptId: input.receiptId
      }
    };
  }

  if (input.kind === "volunteer_reminder") {
    return {
      systemInstruction:
        "Write a friendly volunteer shift reminder. Keep the date, time, location, and coordinator exactly as supplied. Ask the volunteer to reply if plans change.",
      facts: {
        volunteerName: input.volunteerName,
        shiftName: input.shiftName,
        startsAt: input.startsAt,
        location: input.location,
        coordinatorName: input.coordinatorName
      }
    };
  }

  return {
    systemInstruction:
      `Write a factual campaign update for the ${input.audience}. Use a short heading and bullets. Compare nothing that was not supplied and do not invent outcomes.`,
    facts: {
      campaignName: input.campaignName,
      reportingPeriod: input.reportingPeriod,
      donationsTotal: input.donationsTotal,
      currency: input.currency.toUpperCase(),
      donors: input.donors,
      volunteerHours: input.volunteerHours
    }
  };
}
