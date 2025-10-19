import test from "node:test";
import assert from "node:assert/strict";
import { resolveProposalNumber } from "./resolveProposalNumber.js";

const baseDate = "2025-03-15T00:00:00Z";

test("mantém número existente da proposta", () => {
  const result = resolveProposalNumber({ proposal_number: "#1234/2025", date: baseDate });
  assert.equal(result, "#1234/2025");
});

test("formata número a partir de relação direta", () => {
  const result = resolveProposalNumber({
    proposal_number: null,
    date: baseDate,
    proposals_number: { id: 7 },
  });
  assert.equal(result, "#0007/2025");
});

test("aceita relação em lista", () => {
  const result = resolveProposalNumber({
    proposal_number: null,
    date: baseDate,
    proposals_number: [{ id: 12 }],
  });
  assert.equal(result, "#0012/2025");
});

test("retorna null sem sequência disponível", () => {
  const result = resolveProposalNumber({ proposal_number: null, date: baseDate });
  assert.equal(result, null);
});
