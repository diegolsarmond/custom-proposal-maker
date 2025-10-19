import assert from "node:assert/strict";
import { test, mock } from "node:test";

class FakeJsPDF {
  static instances: FakeJsPDF[] = [];
  addImageCalls: { data: any; x: number; y: number; w: number; h: number }[] = [];
  textCalls: { text: string; x: number; y: number }[] = [];
  lastAutoTable: { finalY: number } | null = null;

  constructor() {
    FakeJsPDF.instances.push(this);
  }

  setFillColor() {}
  rect() {}
  addImage(data: any, _format: any, x: number, y: number, w: number, h: number) {
    this.addImageCalls.push({ data, x, y, w, h });
  }
  setFont() {}
  setFontSize() {}
  setTextColor() {}
  text(content: string | string[], x: number, y: number) {
    const values = Array.isArray(content) ? content : [content];
    values.forEach((value, index) => {
      this.textCalls.push({ text: value, x, y: y + index * 4.5 });
    });
  }
  setDrawColor() {}
  setLineWidth() {}
  line() {}
  addPage() {}
  circle() {}
  setGState() {}
  triangle() {}
  GState(options: any) {
    return options;
  }
  splitTextToSize(text: string) {
    return [text];
  }
  save() {}
  output() {
    return "";
  }
}

test("posiciona endereço alinhado ao site no rodapé", async () => {
  mock.module("jspdf", { defaultExport: FakeJsPDF });
  mock.module("jspdf-autotable", {
    defaultExport: (doc: any, _options: any) => {
      doc.lastAutoTable = { finalY: 100 };
    },
  });

  const fetchMock = mock.method(globalThis, "fetch", async (src: any) => ({
    blob: async () => ({ mockSrc: typeof src === "string" ? src : String(src) }),
  }));

  const originalFileReader = (globalThis as any).FileReader;
  class StubFileReader {
    result = "";
    onloadend: (() => void) | null = null;
    onerror: (() => void) | null = null;
    readAsDataURL(blob: any) {
      this.result = `data:${blob.mockSrc}`;
      if (this.onloadend) this.onloadend();
    }
  }
  (globalThis as any).FileReader = StubFileReader as any;

  const { generateProposalPDF } = await import("./pdfGenerator.js");

  await generateProposalPDF({
    date: "2024-01-01",
    clientName: "Cliente",
    companyName: "Empresa",
    companyConfig: {
      name: "Empresa",
      address: "Endereco Teste",
      phone: "31993054200",
      website: "www.exemplo.com.br",
    },
    responsible: "Responsável",
    proposalNumber: "001",
    proposalTexts: {
      introductionText: "Introdução",
      objectiveText: "Objetivo",
      servicesText: "Serviços",
      whyText: "Por que",
    },
    selectedAutomations: {},
    pricingLabels: {
      implantation: "Implantação (R$)",
      recurrence: "Recorrência",
    },
    observations: "",
  } as any);

  const instance = FakeJsPDF.instances[0];
  assert.ok(instance);
  const locationImage = instance.addImageCalls.find((entry) => entry.data === "data:/icons/location.png");
  assert.ok(locationImage);
  assert.ok(locationImage.x >= 140);
  const addressText = instance.textCalls.find((entry) => entry.text === "Endereco Teste");
  assert.ok(addressText);
  assert.ok(addressText.x >= 146);
  const globeImage = instance.addImageCalls.find((entry) => entry.data === "data:/icons/globe.png");
  assert.ok(globeImage);
  assert.ok(globeImage.x >= 170);

  fetchMock.mock.restore();
  if (originalFileReader) {
    (globalThis as any).FileReader = originalFileReader;
  } else {
    delete (globalThis as any).FileReader;
  }
});
