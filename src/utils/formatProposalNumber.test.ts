import test from "node:test";
import assert from "node:assert/strict";
import { formatProposalNumber } from "./formatProposalNumber.js";

test("formata número da proposta com zeros à esquerda", () => {
  const result = formatProposalNumber(1, "2025-01-10T00:00:00Z");
  assert.equal(result, "#0001/2025");
});

test("aceita instância de Date", () => {
  const result = formatProposalNumber(125, new Date("2024-07-05T00:00:00Z"));
  assert.equal(result, "#0125/2024");
});
