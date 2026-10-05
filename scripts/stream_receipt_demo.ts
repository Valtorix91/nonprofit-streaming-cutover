const response = await fetch("http://localhost:3000/drafts/stream", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Idempotency-Key": "receipt-demo-2026-001"
  },
  body: JSON.stringify({
    kind: "donor_receipt",
    donorName: "Maya Chen",
    amount: 125,
    currency: "USD",
    receivedOn: "2026-09-29",
    campaignName: "September Pantry Drive",
    receiptId: "R-2026-1042",
    internalNote: "Introduced by board member; keep for staff follow-up"
  })
});

if (!response.ok || !response.body) throw new Error(`Local service returned ${response.status}`);

const decoder = new TextDecoder();
for await (const chunk of response.body) process.stdout.write(decoder.decode(chunk));
