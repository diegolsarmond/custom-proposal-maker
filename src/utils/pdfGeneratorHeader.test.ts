import test from "node:test";
import assert from "node:assert/strict";
import { mock } from "node:test";
import type { ProposalData } from "../components/ProposalForm";

test("remove a data do cabeçalho do PDF", async () => {
  mock.method(globalThis as any, "fetch", async () => ({
    blob: async () => new Blob(["binary"]),
  }));

  class FileReaderMock {
    result: string | ArrayBuffer | null = null;
    onloadend: (() => void) | null = null;
    onerror: (() => void) | null = null;

    readAsDataURL() {
      this.result = "data:image/png;base64,AAA";
      this.onloadend?.();
    }
  }

  const originalFileReader = (globalThis as any).FileReader;
  (globalThis as any).FileReader = FileReaderMock as any;

  const { recordedTextEntries } = (await import("jspdf")) as unknown as {
    recordedTextEntries: Array<{ text: string; x: number; y: number }>;
  };
  recordedTextEntries.length = 0;
  const { generateProposalPDF } = await import("./pdfGenerator.js");
  const textEntries = recordedTextEntries;
  textEntries.length = 0;

  const data: ProposalData = {
    clientName: "João da Silva",
    companyName: "Empresa Exemplo",
    document: "12345678900",
    email: "joao@example.com",
    phone: "31999999999",
    date: "2024-03-10",
    segment: "Tecnologia",
    proposalNumber: "123",
    pricingLabels: {
      implantation: "Implantação (R$)",
      recurrence: "Recorrência",
    },
    selectedAutomations: {},
    observations: "",
    responsible: "Consultor",
    companyConfig: {
      name: "Quantum Tecnologia",
      address: "Rua A, 100",
      email: "contato@example.com",
      phone: "31990000000",
    },
    proposalTexts: {
      introductionText: "Introdução",
      objectiveText: "Objetivo",
      servicesText: "Serviços",
      whyText: "Motivos",
    },
  };

  await generateProposalPDF(data, { returnData: "datauristring" });

  const headerEntries = textEntries.filter((entry) => entry.y === 25);

  assert.ok(headerEntries.length > 0, "Cabeçalho deve possuir textos registrados.");
  assert.ok(
    headerEntries.every((entry) => !entry.text.includes("10/03/2024")),
    "A data não deve aparecer no cabeçalho."
  );

  mock.restoreAll();
  mock.reset();
  (globalThis as any).FileReader = originalFileReader;
});
