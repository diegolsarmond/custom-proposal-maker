const textEntries: Array<{ text: string; x: number; y: number }> = [];

export const recordedTextEntries = textEntries;

class MockJsPDF {
  lastAutoTable: any;
  internal = {
    pageSize: {
      getWidth: () => 420,
      getHeight: () => 297,
    },
  };

  setFillColor() {}
  rect() {}
  addImage() {}
  setFont() {}
  setFontSize() {}
  setTextColor() {}
  getTextWidth(text: string) {
    return String(text).length;
  }
  text(content: any, x: number, y: number) {
    const lines = Array.isArray(content) ? content : [content];
    lines.forEach((line) => {
      textEntries.push({ text: String(line), x, y });
    });
  }
  setLineWidth() {}
  line() {}
  splitTextToSize(value: any) {
    if (Array.isArray(value)) {
      return value.map((item) => String(item));
    }
    return [String(value ?? "")];
  }
  circle() {}
  triangle() {}
  setGState() {}
  GState(options: any) {
    return options;
  }
  addPage() {}
  setDrawColor() {}
  output() {
    return "output";
  }
  save() {}
}

export default MockJsPDF;
