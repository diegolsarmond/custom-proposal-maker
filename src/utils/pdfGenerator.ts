import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ProposalData } from "@/components/ProposalForm";
import logoImage from "@/assets/quantum-logo.png";

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
  options?: { openInNewTab?: boolean }
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

  const drawContentHeader = () => {
    doc.setFillColor(primary[0], primary[1], primary[2]);
    doc.rect(0, 0, 210, 35, "F");
    doc.addImage(logoData, "PNG", 175, 7, 25, 25);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.setTextColor(255, 255, 255);
    doc.text("PROPOSTA", 15, 16);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text("Prestação de Serviço de Tecnologia", 15, 25);
  };

  const drawFooter = () => {
    const footerY = 270;
    const iconSize = 5;
    doc.setDrawColor(accent[0], accent[1], accent[2]);
    doc.setLineWidth(0.4);
    doc.line(10, footerY, 200, footerY);

    doc.addImage(phoneIcon, "PNG", 15, footerY + 6, iconSize, iconSize);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(text[0], text[1], text[2]);
    const phoneText = data.companyConfig.phone || "(31) 99248-8512";
    doc.text(phoneText, 21, footerY + 10);

    doc.addImage(locationIcon, "PNG", 85, footerY + 6, iconSize, iconSize);
    const addressText = data.companyConfig.address || "Rua Antônio de Albuquerque, 330 - Sala 901, BH/MG";
    const addressLines = doc.splitTextToSize(addressText, 70);
    addressLines.forEach((line, index) => {
      doc.text(line, 91, footerY + 10 + index * 4.5);
    });

    doc.addImage(globeIcon, "PNG", 155, footerY + 6, iconSize, iconSize);
    const websiteText = (data.companyConfig as any).website || "www.quantumtecnologia.com.br";
    const websiteLines = doc.splitTextToSize(websiteText, 40);
    websiteLines.forEach((line, index) => {
      doc.text(line, 161, footerY + 10 + index * 4.5);
    });
  };

  const CONTENT_START_Y = 50;
  const CONTENT_BOTTOM_LIMIT = 260;
  const TEXT_LINE_HEIGHT = 5.5;

  let y = CONTENT_START_Y;

  const goToNextContentPage = () => {
    drawFooter();
    doc.addPage();
    drawContentHeader();
    y = CONTENT_START_Y;
  };

  const ensureContentSpace = (requiredHeight: number) => {
    if (y + requiredHeight > CONTENT_BOTTOM_LIMIT) {
      goToNextContentPage();
    }
  };

  const writeParagraph = (lines: string[], spacingAfter = 10) => {
    if (!lines.length) {
      y += spacingAfter;
      return;
    }

    const remainingLines = [...lines];
    while (remainingLines.length) {
      const availableHeight = CONTENT_BOTTOM_LIMIT - y;
      const availableLines = Math.floor(availableHeight / TEXT_LINE_HEIGHT);

      if (availableLines <= 0) {
        goToNextContentPage();
        continue;
      }

      const chunk = remainingLines.splice(0, availableLines);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(text[0], text[1], text[2]);
      doc.text(chunk, 20, y);
      y += chunk.length * TEXT_LINE_HEIGHT;

      if (remainingLines.length) {
        goToNextContentPage();
      }
    }

    y += spacingAfter;
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
  doc.setFontSize(32);
  doc.text(year, 35, 120, { align: "center", angle: 90 });
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.8);
  doc.line(70, 95, 70, 165);

  doc.setFontSize(28);
  doc.text("PROPOSTA", 80, 115);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(210, 220, 235);
  doc.setFontSize(12);
  doc.text("C O M E R C I A L", 100, 124);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  const subtitle = `A/C: ${data.clientName} - ${data.companyName} `;
  doc.text(subtitle, 80, 138);

  // Logo no topo direito
  doc.addImage(logoData, "PNG", 168, 14, 22, 22);

  // Rodapé da capa
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(230, 235, 245);
  doc.text("Apresentado por:", 150, 275);
  doc.setFont("helvetica", "bold");
  doc.text(data.responsible || "Equipe Comercial", 150, 282);

  // ========= PÁGINA 2 – CONTEÚDO =========
  doc.addPage();

  drawContentHeader();

  y = CONTENT_START_Y;

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

  y = CONTENT_START_Y;

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
  Object.values(data.selectedAutomations || {}).forEach((v: any) => {
    if (v && v.selected) {
      const serviceName = [v.name, v.description].filter(Boolean).join(" - ") || "Serviço";
      rows.push([
        serviceName,
        `R$ ${Number(v.implantation || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
        `R$ ${Number(v.recurrence || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mês`,
      ]);
      totalImplant += Number(v.implantation || 0);
      totalRec += Number(v.recurrence || 0);
    }
  });
  if (rows.length) {
    rows.push([
      { content: "TOTAL", styles: { fontStyle: "bold", fillColor: light } },
      {
        content: `R$ ${totalImplant.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
        styles: { halign: "right", fontStyle: "bold", fillColor: light },
      },
      {
        content: `R$ ${totalRec.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mês`,
        styles: { halign: "right", fontStyle: "bold", fillColor: light },
      },
    ]);
    autoTable(doc, {
      startY: y + 2,
      head: [["Serviço", "Implantação", "Recorrência"]],
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

  // Seção 5
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(text[0], text[1], text[2]);
  const servicesDetail = doc.splitTextToSize(data.proposalTexts.servicesText || "", 180);
  const minimumServicesHeight = 8 + (servicesDetail.length ? TEXT_LINE_HEIGHT : 0) + 2;
  ensureContentSpace(minimumServicesHeight);
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
  writeParagraph(servicesDetail);

  // Seção 6
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(text[0], text[1], text[2]);
  const whyDetail = doc.splitTextToSize(data.proposalTexts.whyText || "", 180);
  const minimumWhyHeight = 8 + (whyDetail.length ? TEXT_LINE_HEIGHT : 0) + 2;
  ensureContentSpace(minimumWhyHeight);
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
  writeParagraph(whyDetail, 0);

  drawFooter();

  // Salvar
  const fileName = `Proposta_${data.clientName.replace(/\s+/g, "_")}_${formattedDate.replace(/\//g, "-")}.pdf`;
  if (options?.openInNewTab && typeof window !== "undefined") {
    const blobUrl = doc.output("bloburl");
    window.open(blobUrl, "_blank");
  } else {
    doc.save(fileName);
  }
};
