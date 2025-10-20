import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { ProposalData } from "../components/ProposalForm";
import logoImage from "@/assets/quantum-logo.png";
import { formatProposalPdfFileName } from "./proposalFileName.js";

// ícones no /public (crie os arquivos):
// /icons/phone.png  /icons/location.png  /icons/globe.png
const ICON_PHONE = "/icons/phone.png";
const ICON_LOCATION = "/icons/location.png";
const ICON_GLOBE = "/icons/globe.png";

const imageCache: Record<string, string> = {};

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
  doc.setFontSize(34);
  doc.text(year, 66, 120, { align: "center", angle: 90 });
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
  doc.setFontSize(12);
  const subtitle = `A/C: ${data.clientName} - ${data.companyName} `;
  doc.text(subtitle, 90, 166);
  if (proposalIdentifier) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(`PROPOSTA Nº ${proposalIdentifier}`, 90, 176);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
  }
  if (proposalInfoLine) {
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
  const intro = doc.splitTextToSize(data.proposalTexts.introductionText, 180);
  doc.text(intro, 20, y);
  y += intro.length * 5.5 + 10;

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
  const objective = doc.splitTextToSize(data.proposalTexts.objectiveText, 180);
  doc.text(objective, 20, y);
  y += objective.length * 5.5 + 10;

  // Seção 3
  doc.setFillColor(accent[0], accent[1], accent[2]);
  doc.circle(10, y - 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("3", 8.3, y - 1);
  doc.setTextColor(primary[0], primary[1], primary[2]);
  doc.setFontSize(13);
  doc.text("Serviços", 20, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(text[0], text[1], text[2]);
  const serviceTopics = [
    "Automação total",
    "Redução de custos",
    "Decisões inteligentes",
    "Integração com outras plataformas",
  ];
  serviceTopics.forEach((topic) => {
    doc.text(`• ${topic}`, 20, y);
    y += 6;
  });
  y += 6;

  drawFooter();

  // ========= PÁGINA 3 – CONTEÚDO =========
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

  // Seção 5
  doc.setFillColor(accent[0], accent[1], accent[2]);
  doc.circle(10, y - 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("5", 8.3, y - 1);
  doc.setTextColor(primary[0], primary[1], primary[2]);
  doc.setFontSize(13);
  doc.text("Serviços Atribuídos", 20, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(text[0], text[1], text[2]);
  const servicesDetail = doc.splitTextToSize(data.proposalTexts.servicesText || "", 180);
  if (servicesDetail.length) {
    doc.text(servicesDetail, 20, y);
    y += servicesDetail.length * 5.5 + 10;
  } else {
    y += 10;
  }

  // Seção 6
  doc.setFillColor(accent[0], accent[1], accent[2]);
  doc.circle(10, y - 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("6", 8.3, y - 1);
  doc.setTextColor(primary[0], primary[1], primary[2]);
  doc.setFontSize(13);
  doc.text("Por que contratar?", 20, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(text[0], text[1], text[2]);
  const whyDetail = doc.splitTextToSize(data.proposalTexts.whyText || "", 180);
  if (whyDetail.length) {
    doc.text(whyDetail, 20, y);
    y += whyDetail.length * 5.5 + 6;
  } else {
    y += 6;
  }

  if (data.observations) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(primary[0], primary[1], primary[2]);
    doc.text("Observações", 20, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(text[0], text[1], text[2]);
    const observationText = doc.splitTextToSize(data.observations, 180);
    doc.text(observationText, 20, y);
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
