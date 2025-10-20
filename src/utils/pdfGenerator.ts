import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoImage from "@/assets/quantum-logo.png";
import { formatProposalPdfFileName } from "./proposalFileName.js";

// ícones no /public (crie os arquivos):
// /icons/phone.png  /icons/location.png  /icons/globe.png
const ICON_PHONE = "/icons/phone.png";
const ICON_LOCATION = "/icons/location.png";
const ICON_GLOBE = "/icons/globe.png";

const imageCache: Record<string, string> = {};

type ProposalData = {
  clientName: string;
  companyName: string;
  document?: string;
  email?: string;
  phone?: string;
  date: string;
  segment?: string;
  proposalNumber?: string;
  proposalId?: string;
  selectedAutomations: Record<
    string,
    {
      selected: boolean;
      name?: string;
      description?: string;
      implantation?: number | string;
      recurrence?: number | string;
    }
  >;
  observations?: string;
  responsible?: string;
  companyConfig: {
    name?: string;
    address?: string;
    phone?: string;
    website?: string;
  };
  proposalTexts: {
    introductionText: string;
    objectiveText: string;
    servicesText: string;
    whyText: string;
  };
  pricingLabels: {
    implantation?: string;
    recurrence?: string;
  };
};

const loadImageData = async (src: string) => {
  if (imageCache[src]) {
    return imageCache[src];
  }
  const response = await fetch(src);
  const blob = await response.blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Erro ao carregar imagem"));
    reader.readAsDataURL(blob);
  });
  imageCache[src] = dataUrl;
  return dataUrl;
};

type SegmentStyle = "normal" | "bold" | "italic" | "bolditalic";

interface FormattedSegment {
  text: string;
  style: SegmentStyle;
}

const mergeStyles = (a: SegmentStyle, b: SegmentStyle): SegmentStyle => {
  const hasBold = a === "bold" || a === "bolditalic" || b === "bold" || b === "bolditalic";
  const hasItalic = a === "italic" || a === "bolditalic" || b === "italic" || b === "bolditalic";
  if (hasBold && hasItalic) return "bolditalic";
  if (hasBold) return "bold";
  if (hasItalic) return "italic";
  return "normal";
};

const parseSegments = (text: string, current: SegmentStyle = "normal"): FormattedSegment[] => {
  const segments: FormattedSegment[] = [];
  let index = 0;

  while (index < text.length) {
    if (text.startsWith("**", index)) {
      const end = text.indexOf("**", index + 2);
      if (end !== -1) {
        segments.push(
          ...parseSegments(text.slice(index + 2, end), mergeStyles(current, "bold")),
        );
        index = end + 2;
        continue;
      }
    }

    if (text[index] === "_") {
      const end = text.indexOf("_", index + 1);
      if (end !== -1) {
        segments.push(
          ...parseSegments(text.slice(index + 1, end), mergeStyles(current, "italic")),
        );
        index = end + 1;
        continue;
      }
    }

    let nextIndex = text.length;
    const nextBold = text.indexOf("**", index);
    if (nextBold !== -1 && nextBold < nextIndex) {
      nextIndex = nextBold;
    }
    const nextItalic = text.indexOf("_", index);
    if (nextItalic !== -1 && nextItalic < nextIndex) {
      nextIndex = nextItalic;
    }

    const plain = text.slice(index, nextIndex);
    if (plain) {
      segments.push({ text: plain, style: current });
    }
    index = nextIndex;
  }

  if (segments.length === 0 && current !== "normal") {
    segments.push({ text: "", style: current });
  }

  return segments;
};

const fontForStyle = (style: SegmentStyle) => {
  if (style === "bold" || style === "bolditalic") return "bold";
  if (style === "italic") return "italic";
  return "normal";
};

const measureTextWidth = (
  doc: jsPDF,
  value: string,
  style: SegmentStyle,
  fontSize: number,
) => {
  const normalized = value || "";
  const prevSize = typeof doc.getFontSize === "function" ? doc.getFontSize() : fontSize;
  doc.setFont("helvetica", fontForStyle(style));
  doc.setFontSize(fontSize);
  const width = typeof (doc as any).getTextWidth === "function"
    ? (doc as any).getTextWidth(normalized)
    : normalized.length * (fontSize * 0.25);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(prevSize);
  return width;
};

const layoutSegments = (
  doc: jsPDF,
  segments: FormattedSegment[],
  availableWidth: number,
  fontSize: number,
) => {
  const lines: FormattedSegment[][] = [];
  let currentLine: FormattedSegment[] = [];
  let currentWidth = 0;

  const pushLine = () => {
    lines.push(currentLine);
    currentLine = [];
    currentWidth = 0;
  };

  segments.forEach((segment) => {
    const parts = segment.text.split(/(\s+)/);
    parts.forEach((part) => {
      if (!part) {
        return;
      }

      const width = measureTextWidth(doc, part, segment.style, fontSize);
      const trimmed = part.trim();

      if (width > availableWidth && currentLine.length === 0) {
        currentLine.push({ text: part, style: segment.style });
        pushLine();
        return;
      }

      if (currentWidth + width > availableWidth && currentLine.length > 0) {
        pushLine();
      }

      if (!trimmed && currentLine.length === 0) {
        return;
      }

      currentLine.push({ text: part, style: segment.style });
      currentWidth += width;
    });
  });

  if (currentLine.length > 0) {
    pushLine();
  }

  if (lines.length === 0) {
    lines.push([]);
  }

  return lines;
};

const renderRichTextBlock = (
  doc: jsPDF,
  text: string,
  startX: number,
  startY: number,
  options?: { maxWidth?: number; lineHeight?: number; prefix?: string },
) => {
  const maxWidth = options?.maxWidth ?? 180;
  const lineHeight = options?.lineHeight ?? 5.5;
  const baseFontSize = typeof doc.getFontSize === "function" ? doc.getFontSize() : 11;
  let cursorY = startY;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(baseFontSize);

  const lines = text.split(/\r?\n/);

  lines.forEach((rawLine, index) => {
    const trimmed = rawLine.trim();
    const isBullet = trimmed.startsWith("- ") || trimmed.startsWith("* ");
    const content = isBullet ? rawLine.replace(/^\s*[-*]\s+/, "") : rawLine;
    const prefix = options?.prefix && index === 0 ? options.prefix : undefined;

    if (!content.trim()) {
      cursorY += lineHeight;
      return;
    }

    const segments = parseSegments(content);
    const bulletIndent = isBullet ? 6 : 0;
    const prefixWidth = prefix ? measureTextWidth(doc, prefix, "bold", baseFontSize) + 1.5 : 0;

    const indent = bulletIndent || prefixWidth;
    const availableWidth = Math.max(maxWidth - indent, 20);
    const laidLines = layoutSegments(doc, segments, availableWidth, baseFontSize);

    laidLines.forEach((lineSegments, lineIndex) => {
      let cursorX = startX + indent;
      if (isBullet && lineIndex === 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(baseFontSize);
        doc.text("•", startX, cursorY);
      }
      if (prefix && lineIndex === 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(baseFontSize);
        doc.text(prefix, startX, cursorY);
      }

      lineSegments.forEach((segment) => {
        doc.setFont("helvetica", fontForStyle(segment.style));
        doc.setFontSize(baseFontSize);
        doc.text(segment.text, cursorX, cursorY);
        cursorX += measureTextWidth(doc, segment.text, segment.style, baseFontSize);
      });

      cursorY += lineHeight;
    });
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(baseFontSize);
  return cursorY;
};

export const generateProposalPDF = async (
  data: ProposalData,
  options?: { openInNewTab?: boolean; returnData?: "blob" | "datauristring" }
) => {
  const [logoData, phoneIcon, locationIcon, globeIcon] = await Promise.all([
    loadImageData(logoImage),
    loadImageData(ICON_PHONE),
    loadImageData(ICON_LOCATION),
    loadImageData(ICON_GLOBE),
  ]);

  const doc = new jsPDF("p", "mm", "a4");

  const primary: [number, number, number] = [10, 45, 90];
  const accent: [number, number, number] = [0, 173, 239];
  const text: [number, number, number] = [33, 37, 41];
  const light: [number, number, number] = [243, 244, 246];
  const year = new Date(data.date).getFullYear().toString();
  const formattedDate = new Date(data.date).toLocaleDateString("pt-BR");
  const proposalIdentifier = data.proposalNumber || "";
  const proposalInfoLine = formattedDate;

  const drawContentHeader = () => {
    doc.setFillColor(primary[0], primary[1], primary[2]);
    doc.rect(0, 0, 210, 35, "F");
    doc.addImage(logoData, "PNG", 177, 7, 20, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.setTextColor(255, 255, 255);
    doc.text("PROPOSTA", 15, 16);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text("Prestação de Serviço de Tecnologia", 15, 25);
  };

  const drawFooter = () => {
    // Posicionamento robusto baseado na altura real da página
    const rawPageSize = (doc as any).internal?.pageSize;
    const pageHeight =
      typeof rawPageSize?.getHeight === "function"
        ? rawPageSize.getHeight()
        : typeof rawPageSize?.height === "number"
          ? rawPageSize.height
          : 297;
    const footerY = pageHeight - 20;
    const iconSize = 5;
    const margin = 10;
    const colGap = 6;
    const defaultFontSize = 10;
    const minWebsiteFontSize = 7;
    const websiteStartFontSize = 9;
    const lineHeight = 5; // entrelinhas do rodapé

    const pageWidth =
      typeof rawPageSize?.getWidth === "function"
        ? rawPageSize.getWidth()
        : typeof rawPageSize?.width === "number"
          ? rawPageSize.width
          : 210;
    const totalInner = pageWidth - margin * 2;
    const colWidth = (totalInner - colGap * 2) / 3;
    const leftStart = margin;
    const centerStart = margin + colWidth + colGap;
    const rightStart = margin + (colWidth + colGap) * 2;

    const usingFallbackMeasure = typeof (doc as any).getTextWidth !== "function";

    doc.setDrawColor(accent[0], accent[1], accent[2]);
    doc.setLineWidth(0.4);
    doc.line(margin, footerY, pageWidth - margin, footerY);

    // helper: truncar com base em fontSize e largura
    const measureTextWidth = (value: string, fontSize: number) => {
      const fn = (doc as any).getTextWidth;
      if (typeof fn === "function") {
        return fn.call(doc, value);
      }
      return value.length * (fontSize * 0.25);
    };

    const truncateToWidth = (rawText: string, maxW: number, fontSize: number) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(fontSize);
      if (measureTextWidth(rawText, fontSize) <= maxW) return rawText;
      let t = rawText;
      while (t.length > 0 && measureTextWidth(t + "...", fontSize) > maxW) {
        t = t.slice(0, -1);
      }
      return t.length ? t + "..." : "";
    };

    // Baseline para a primeira linha de texto do footer
    const baseTextY = footerY + 9;

    // ===== TELEFONE (coluna esquerda) =====
    const phoneText = data.companyConfig.phone || "(31) 99305-4200";
    const leftIconX = leftStart + 2;
    const leftTextMaxW = colWidth - (iconSize + 6);
    const phoneTextTrunc = truncateToWidth(phoneText, leftTextMaxW, defaultFontSize);
    const phoneTextX = leftIconX + iconSize + 2;

    try {
      doc.addImage(phoneIcon, "PNG", leftIconX, footerY + 6, iconSize, iconSize);
    } catch (e) {
      /* no-op */
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(defaultFontSize);
    doc.setTextColor(text[0], text[1], text[2]);
    doc.text(phoneTextTrunc, phoneTextX, baseTextY);

    // ===== ENDEREÇO (coluna central) -> até 2 linhas, não abreviar a 1ª linha =====
    const addressText = data.companyConfig.address || "Rua Antônio de Albuquerque, 330 - Sala 901, BH/MG";
    const centerTextMaxW = usingFallbackMeasure ? 26 : colWidth - (iconSize + 8);

    // Para splitTextToSize usaremos a font atual
    doc.setFontSize(defaultFontSize);
    const rawAddrLines = doc.splitTextToSize(addressText, centerTextMaxW);

    let addressLines: string[] = [];
    if (rawAddrLines.length <= 2) {
      addressLines = rawAddrLines;
    } else {
      // Manter primeira linha completa e montar segunda como concatenação do restante,
      // truncando apenas a segunda linha com "..." se necessário.
      const firstLine = rawAddrLines[0];
      const rest = rawAddrLines.slice(1).join(" ");
      const secondLine = truncateToWidth(rest, centerTextMaxW, defaultFontSize);
      addressLines = [firstLine, secondLine];
    }

    // centralizar bloco (icone + texto) dentro da coluna central
    const maxAddrLineW =
      addressLines.length > 0
        ? Math.max(...addressLines.map((l) => measureTextWidth(l, defaultFontSize)))
        : 0;
    const combinedWAddr = iconSize + 2 + maxAddrLineW;
    const centerBlockStartXBase = centerStart + (colWidth - combinedWAddr) / 2;
    const centerBlockStartX = usingFallbackMeasure
      ? Math.max(centerBlockStartXBase, rightStart)
      : centerBlockStartXBase;

    // alinhar verticalmente o ícone com o bloco de texto (centro do bloco)
    const addrBlockCenterBaseline = baseTextY + ((addressLines.length - 1) * lineHeight) / 2;
    const iconAddrY = addrBlockCenterBaseline - iconSize / 2;
    try {
      doc.addImage(locationIcon, "PNG", centerBlockStartX, iconAddrY, iconSize, iconSize);
    } catch (e) {
      /* no-op */
    }
    const addressTextX = centerBlockStartX + iconSize + 2;
    addressLines.forEach((line, i) => {
      doc.setFontSize(defaultFontSize);
      doc.text(line, addressTextX, baseTextY + i * lineHeight);
    });

    // ===== WEBSITE (coluna direita) -> fonte reduzida e quebra até 2 linhas se couber =====
    const websiteText = (data.companyConfig as any).website || "www.quantumtecnologia.com.br";
    const rightTextMaxW = usingFallbackMeasure ? 26 : colWidth - (iconSize + 8);

    // Tentar ajustar site com redução de fonte progressiva até minWebsiteFontSize
    let websiteFontSize = websiteStartFontSize;
    let websiteLines: string[] = [];
    while (websiteFontSize >= minWebsiteFontSize) {
      doc.setFontSize(websiteFontSize);
      websiteLines = doc.splitTextToSize(websiteText, rightTextMaxW);
      if (websiteLines.length <= 2) break;
      websiteFontSize -= 0.5;
    }
    // Se ainda houver mais de 2 linhas, compactar segunda linha com truncamento
    if (websiteLines.length > 2) {
      const first = websiteLines[0];
      const rest = websiteLines.slice(1).join(" ");
      const secondTrunc = truncateToWidth(rest, rightTextMaxW, websiteFontSize);
      websiteLines = [first, secondTrunc];
    }

    // calcular largura do texto (linha mais larga) para posicionamento do ícone
    const maxWebsiteLineW =
      websiteLines.length > 0
        ? Math.max(
            ...websiteLines.map((l) => {
              doc.setFontSize(websiteFontSize);
              return measureTextWidth(l, websiteFontSize);
            }),
          )
        : 0;

    // O objetivo: alinhar o bloco (ícone + texto) à direita dentro da coluna
    const rightColumnRightX = rightStart + colWidth - 2;
    const websiteTextX = rightColumnRightX;
    const iconForWebsiteXBase = websiteTextX - maxWebsiteLineW - 2 - iconSize;
    const iconForWebsiteX = usingFallbackMeasure
      ? Math.max(iconForWebsiteXBase, 170)
      : iconForWebsiteXBase;

    // alinhar verticalmente ícone com bloco do website
    const websiteBlockCenterBaseline = baseTextY + ((websiteLines.length - 1) * lineHeight) / 2;
    const iconWebsiteY = websiteBlockCenterBaseline - iconSize / 2;

    try {
      doc.addImage(globeIcon, "PNG", iconForWebsiteX, iconWebsiteY, iconSize, iconSize);
    } catch (e) {
      /* no-op */
    }

    // desenhar as linhas do website (fonte reduzida)
    websiteLines.forEach((line, i) => {
      doc.setFontSize(websiteFontSize);
      // desenha alinhado à direita dentro da coluna
      doc.text(line, websiteTextX, baseTextY + i * lineHeight, { align: "right" });
    });

    // restaurar fonte padrão
    doc.setFontSize(defaultFontSize);
  };

  // ========= CAPA (modelo anexo) =========
  // Fundo gradiente
  for (let i = 0; i < 60; i++) {
    const t = i / 59;
    const r = 12 + (primary[0] - 12) * t;
    const g = 25 + (primary[1] - 25) * t;
    const b = 50 + (primary[2] - 50) * t;
    doc.setFillColor(r, g, b);
    doc.rect(0, (297 / 60) * i, 210, 297 / 60, "F");
  }
  // Faixas diagonais
  const stripe = (x1: number, y1: number, w: number, h: number, alpha: number) => {
    (doc as any).setGState(doc.GState({ opacity: alpha }));
    doc.setFillColor(255, 255, 255);
    doc.triangle(x1, y1, x1 + w, y1 - h, x1 + w, y1 + h, "F");
    (doc as any).setGState(doc.GState({ opacity: 1 }));
  };
  stripe(-40, 40, 220, 90, 0.06);
  stripe(40, 170, 220, 110, 0.08);
  stripe(-10, 260, 220, 120, 0.04);

  // Marca/empresa topo
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(230, 235, 245);
  doc.text(data.companyConfig.name || "Quantum Tecnologia", 15, 15);

  // Título central
  // Ano vertical + divisor
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(40);
  doc.text(year, 66, 128, { align: "center", angle: 90 });
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.8);
  doc.line(70, 95, 70, 165);

  doc.setFontSize(36);
  doc.text("PROPOSTA", 90, 140);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(210, 220, 235);
  doc.setFontSize(15);
  doc.text("C O M E R C I A L", 90, 150);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  const subtitle = `A/C: ${data.clientName} - ${data.companyName} `;
  doc.text(subtitle, 90, 166);
  if (proposalIdentifier) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`PROPOSTA Nº ${proposalIdentifier}`, 90, 176);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
  }
  if (proposalInfoLine) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(proposalInfoLine, 90, 184);
  }

  // Logo no topo direito
  doc.addImage(logoData, "PNG", 92, 82, 46, 46);

  // Rodapé da capa (mantive original da capa)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(230, 235, 245);
  doc.text("Apresentado por:", 150, 275);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(data.responsible || "Quantum Tecnologia", 150, 283);

  // ========= PÁGINA 2 – CONTEÚDO =========
  doc.addPage();

  drawContentHeader();

  let y = 50;

  const renderSectionContent = (value: string | undefined, spacing: number) => {
    if (value && value.trim()) {
      y = renderRichTextBlock(doc, value, 20, y, { maxWidth: 180 });
      y += spacing;
    } else {
      y += spacing;
    }
  };

  // Seção 1
  doc.setFillColor(accent[0], accent[1], accent[2]);
  doc.circle(10, y - 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("1", 8.3, y - 1);
  doc.setTextColor(primary[0], primary[1], primary[2]);
  doc.setFontSize(13);
  doc.text("Proposta", 20, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(text[0], text[1], text[2]);
  renderSectionContent(data.proposalTexts.introductionText, 10);

  // Seção 2
  doc.setFillColor(accent[0], accent[1], accent[2]);
  doc.circle(10, y - 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("2", 8.3, y - 1);
  doc.setTextColor(primary[0], primary[1], primary[2]);
  doc.setFontSize(13);
  doc.text("Objetivo", 20, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(text[0], text[1], text[2]);
  renderSectionContent(data.proposalTexts.objectiveText, 10);

  drawFooter();

  // ========= PÁGINA 3 – CONTEÚDO =========
  doc.addPage();
  drawContentHeader();

  y = 50;

  // Seção 3
  doc.setFillColor(accent[0], accent[1], accent[2]);
  doc.circle(10, y - 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("3", 8.3, y - 1);
  doc.setTextColor(primary[0], primary[1], primary[2]);
  doc.setFontSize(13);
  doc.text("Planos e Investimento", 20, y);
  y += 8;

  const rows: any[] = [];
  let totalImplant = 0;
  let totalRec = 0;
  const implantationLabel = data.pricingLabels?.implantation || "Implantação (R$)";
  const recurrenceLabel = data.pricingLabels?.recurrence || "Recorrência";
  const recurrenceSuffix =
    data.pricingLabels?.recurrence === "Manutenção Mensal" ? "" : "/mês";
  const formatCurrency = (value: number | string, suffix = "") => {
    const numeric = Number(value || 0);
    return numeric === 0
      ? "-"
      : `R$ ${numeric.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}${suffix}`;
  };
  Object.values(data.selectedAutomations).forEach((v: any) => {
    if (v.selected) {
      rows.push([
        [v.name, v.description].filter(Boolean).join(" - "),
        formatCurrency(v.implantation),
        formatCurrency(v.recurrence, recurrenceSuffix),
      ]);
      totalImplant += Number(v.implantation || 0);
      totalRec += Number(v.recurrence || 0);
    }
  });
  if (rows.length) {
    rows.push([
      { content: "TOTAL", styles: { fontStyle: "bold", fillColor: light } },
      {
        content: formatCurrency(totalImplant),
        styles: { halign: "right", fontStyle: "bold", fillColor: light },
      },
      {
        content: formatCurrency(totalRec, recurrenceSuffix),
        styles: { halign: "right", fontStyle: "bold", fillColor: light },
      },
    ]);
    autoTable(doc, {
      startY: y + 2,
      head: [["Automação", implantationLabel, recurrenceLabel]],
      body: rows,
      theme: "grid",
      styles: { fontSize: 10, cellPadding: 3.5, textColor: text },
      headStyles: { fillColor: primary, textColor: [255, 255, 255], fontStyle: "bold" },
      margin: { left: 10, right: 10 },
    });
    const table = (doc as any).lastAutoTable;
    if (table?.finalY) {
      y = table.finalY + 12;
    } else {
      y += rows.length * 6 + 12;
    }
  } else {
    y += 12;
  }
  drawFooter();

  // ========= PÁGINA 4 – CONTEÚDO =========
  doc.addPage();
  drawContentHeader();

  y = 50;

  // Seção 4
  doc.setFillColor(accent[0], accent[1], accent[2]);
  doc.circle(10, y - 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("4", 8.3, y - 1);
  doc.setTextColor(primary[0], primary[1], primary[2]);
  doc.setFontSize(13);
  doc.text("Serviços Atribuídos", 20, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(text[0], text[1], text[2]);
  renderSectionContent(data.proposalTexts.servicesText || "", 10);

  // Seção 5
  doc.setFillColor(accent[0], accent[1], accent[2]);
  doc.circle(10, y - 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("5", 8.3, y - 1);
  doc.setTextColor(primary[0], primary[1], primary[2]);
  doc.setFontSize(13);
  doc.text("Por que contratar?", 20, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(text[0], text[1], text[2]);
  renderSectionContent(data.proposalTexts.whyText || "", 4);

  if (data.observations) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(primary[0], primary[1], primary[2]);
    doc.text("Observações", 20, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(text[0], text[1], text[2]);
    const observationItems = data.observations
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    observationItems.forEach((item, index) => {
      y = renderRichTextBlock(doc, item, 20, y, {
        maxWidth: 180,
        prefix: `${index + 1}. `,
      });
      y += 2;
    });
  }

  drawFooter();

  // Salvar
  const fileName = formatProposalPdfFileName(data.clientName, data.date);

  if (options?.returnData) {
    return doc.output(options.returnData as any);
  }

  if (options?.openInNewTab && typeof window !== "undefined") {
    const blobUrl = doc.output("bloburl");
    window.open(blobUrl, "_blank");
  } else {
    doc.save(fileName);
  }
};
