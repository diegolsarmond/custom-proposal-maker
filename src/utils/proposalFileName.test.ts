import test from "node:test";
import assert from "node:assert/strict";
import { formatProposalPdfFileName } from "./proposalFileName.js";

test("formata nome de arquivo de proposta com cliente e data", () => {
  const result = formatProposalPdfFileName("João da Silva", "2024-03-10T12:00:00Z");
  assert.equal(result, "Proposta_João_da_Silva_10-03-2024.pdf");
});

test("substitui multiplos espacos por underscore", () => {
  const result = formatProposalPdfFileName("Empresa   Exemplo", "2024-12-05T12:00:00Z");
  assert.equal(result, "Proposta_Empresa_Exemplo_05-12-2024.pdf");
});
