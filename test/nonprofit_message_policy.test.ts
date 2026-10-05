import { describe, expect, it } from "vitest";
import { nonprofitMessageSchema, planMessage } from "../src/nonprofit_message_policy.js";

describe("donor receipt policy", () => {
  it("keeps an internal note out of donor-facing model facts", () => {
    const input = nonprofitMessageSchema.parse({
      kind: "donor_receipt",
      donorName: "Maya Chen",
      amount: 125,
      currency: "usd",
      receivedOn: "2026-09-29",
      campaignName: "September Pantry Drive",
      receiptId: "R-2026-1042",
      internalNote: "Introduced by a board member"
    });

    const plan = planMessage(input);

    expect(plan.facts).toEqual({
      donorName: "Maya Chen",
      amount: 125,
      currency: "USD",
      receivedOn: "2026-09-29",
      campaignName: "September Pantry Drive",
      receiptId: "R-2026-1042"
    });
    expect(JSON.stringify(plan.facts)).not.toContain("board member");
  });
});
