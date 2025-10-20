import assert from "node:assert/strict";
import { test, mock } from "node:test";

class RecordingJsPDF {
  static instances: RecordingJsPDF[] = [];
  textCalls: { text: string; x: number; y: number }[] = [];
  fontCalls: { font: string; style: string }[] = [];
  addImageCalls: { x: number; y: number; w: number; h: number }[] = [];
  lastAutoTable: { finalY: number } | null = null;
  fontSize = 11;
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
  triangle() {}
  setGState() {}
  GState(options: any) {
    return options;
  }
  addImage(_data: any, _format: any, x: number, y: number, w: number, h: number) {
    this.addImageCalls.push({ x, y, w, h });
  }
  setFont(font: string, style: string) {
    this.fontCalls.push({ font, style });
  }
  setFontSize(size: number) {
    this.fontSize = size;
  }
  getFontSize() {
    return this.fontSize;
  }
  setTextColor() {}
  text(content: string | string[], x: number, y: number, _options?: any) {
    const values = Array.isArray(content) ? content : [content];
    values.forEach((value, index) => {
      this.textCalls.push({ text: value, x, y: y + index * 4.5 });
    });
  }
  setDrawColor() {}
  setLineWidth() {}
  line() {}
  circle() {}
  addPage() {}
  getTextWidth(text: string) {
    return text.length * (this.fontSize * 0.25 || 1);
  }
  save() {}
  output() {
    return "";
  }
}

test("renderiza formatações de texto e enumera observações", async () => {
  RecordingJsPDF.instances = [];
  mock.module("jspdf", { defaultExport: RecordingJsPDF });
  mock.module("jspdf-autotable", {
    defaultExport: (doc: any) => {
      doc.lastAutoTable = { finalY: 120 };
    },
  });

  const fetchMock = mock.method(globalThis, "fetch", async () => ({
    blob: async () => ({ mockSrc: "mock" }),
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
    clientName: "Marco Aurélio",
    companyName: "SIPI Sistemas",
    companyConfig: {
      name: "SIPI Sistemas",
      address: "Rua Teste, 123",
      phone: "31993054200",
      website: "www.sipi.com.br",
    },
    responsible: "Time Comercial",
    proposalNumber: "#0016/2025",
    proposalTexts: {
      introductionText: "Introdução com **destaque** e _ênfase_.",
      objectiveText: "- Meta inicial\n- Meta secundária",
      servicesText: "Serviço principal com **qualidade**.",
      whyText: "- Benefício 1\nTexto adicional para detalhar.",
    },
    observations: "Primeira nota\nSegunda nota",
    selectedAutomations: {},
    pricingLabels: {
      implantation: "Implantação (R$)",
      recurrence: "Recorrência",
    },
  } as any, { returnData: "datauristring" });

  const instance = RecordingJsPDF.instances[0];
  assert.ok(instance, "instância do PDF não foi criada");

  const texts = instance.textCalls.map((entry) => entry.text);
  assert.ok(texts.includes("•"), "bullet não foi renderizado");
  assert.ok(texts.some((value) => typeof value === "string" && value.startsWith("1.")), "observações não foram enumeradas");
  assert.ok(texts.some((value) => typeof value === "string" && value.startsWith("2.")), "segunda observação não foi enumerada");
  assert.ok(!texts.some((value) => typeof value === "string" && value.includes("**")), "marcadores de negrito permanecem no texto");

  const hasItalic = instance.fontCalls.some((entry) => entry.style === "italic");
  assert.ok(hasItalic, "formatação itálica não foi aplicada");

  fetchMock.mock.restore();
  if (originalFileReader) {
    (globalThis as any).FileReader = originalFileReader;
  } else {
    delete (globalThis as any).FileReader;
  }
  mock.reset();
});
