import test from "node:test";
import assert from "node:assert/strict";
import { mock } from "node:test";
import type { ProposalData } from "../components/ProposalForm";

test("remove a sessão fixa de Serviços do PDF", async () => {
  const recordedTextEntries: Array<{ text: string }> = [];

  class RecordingJsPDF {
    static instances: RecordingJsPDF[] = [];
    lastAutoTable: { finalY: number } | null = null;
    internal = {
      pageSize: {
        getWidth: () => 210,
        getHeight: () => 297,
      },
    };

    constructor() {
      RecordingJsPDF.instances.push(this);
    }

    setFillColor() {}
    rect() {}
    addImage() {}
    setFont() {}
    setFontSize() {}
    setTextColor() {}
    circle() {}
    setDrawColor() {}
    setLineWidth() {}
    line() {}
    addPage() {}
    setGState() {}
    triangle() {}
    GState(options: any) {
      return options;
    }
    getTextWidth(text: string) {
      return text.length;
    }
    text(content: string | string[], _x: number, _y: number) {
      const values = Array.isArray(content) ? content : [content];
      values.forEach((value) => {
        recordedTextEntries.push({ text: value });
      });
    }
    splitTextToSize(text: string) {
      return [text];
    }
    save() {}
    output() {
      return "";
    }
  }

  mock.module("jspdf", {
    defaultExport: RecordingJsPDF,
    recordedTextEntries,
  });

  mock.module("jspdf-autotable", {
    defaultExport: (doc: any) => {
      doc.lastAutoTable = { finalY: 100 };
    },
  });

  mock.method(globalThis, "fetch", async () => ({
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

  const { generateProposalPDF } = await import("./pdfGenerator.js");

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

  const forbiddenTexts = [
    "• Automação total",
    "• Redução de custos",
    "• Decisões inteligentes",
    "• Integração com outras plataformas",
  ];

  forbiddenTexts.forEach((item) => {
    const found = recordedTextEntries.some((entry) => entry.text === item);
    assert.equal(found, false, `Texto inesperado encontrado: ${item}`);
  });

  mock.restoreAll();
  mock.reset();
  if (originalFileReader) {
    (globalThis as any).FileReader = originalFileReader;
  } else {
    delete (globalThis as any).FileReader;
  }
});
