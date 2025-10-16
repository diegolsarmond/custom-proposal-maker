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

  // Header barra
  doc.setFillColor(primary[0], primary[1], primary[2]);
  doc.rect(0, 0, 210, 35, "F");
  doc.addImage(logoData, "PNG", 175, 7, 25, 25);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text("PROPOSTA", 15, 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Prestação de Serviço de Tecnologia", 15, 23);

  let y = 50;

  // Seção 1
  doc.setFillColor(accent[0], accent[1], accent[2]);
  doc.circle(10, y - 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("1", 8.3, y - 1);
  doc.setTextColor(primary[0], primary[1], primary[2]);
  doc.setFontSize(12);
  doc.text("Proposta", 20, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(text[0], text[1], text[2]);
  const intro = doc.splitTextToSize(data.proposalTexts.introductionText, 180);
  doc.text(intro, 20, y);
  y += intro.length * 5 + 8;

  // Seção 2
  doc.setFillColor(accent[0], accent[1], accent[2]);
  doc.circle(10, y - 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("2", 8.3, y - 1);
  doc.setTextColor(primary[0], primary[1], primary[2]);
  doc.setFontSize(12);
  doc.text("Objetivo", 20, y);
  y += 10;

  const boxW = 42;
  const boxH = 22;
  const boxes = [
    "Automação de tarefas financeiras",
    "Ferramentas de marketing",
    "Dashboard para gestão do negócio",
    "Atendimento exclusivo",
  ];
  boxes.forEach((t, i) => {
    const x = 10 + i * (boxW + 6);
    doc.setFillColor(light[0], light[1], light[2]);
    doc.rect(x, y, boxW, boxH, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(accent[0], accent[1], accent[2]);
    doc.text("✔", x + 3, y + 9);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(text[0], text[1], text[2]);
    const wrapped = doc.splitTextToSize(t, boxW - 10);
    doc.text(wrapped, x + 10, y + 9);
  });
  y += boxH + 15;

  // Seção 3
  doc.setFillColor(accent[0], accent[1], accent[2]);
  doc.circle(10, y - 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("3", 8.3, y - 1);
  doc.setTextColor(primary[0], primary[1], primary[2]);
  doc.setFontSize(12);
  doc.text("Serviços", 20, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(text[0], text[1], text[2]);
  doc.text("• Automação total;   • Redução de custos;", 20, y);
  y += 6;
  doc.text("• Decisões inteligentes;   • Integração com outras plataformas.", 20, y);
  y += 15;

  // Seção 4
  doc.setFillColor(accent[0], accent[1], accent[2]);
  doc.circle(10, y - 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("4", 8.3, y - 1);
  doc.setTextColor(primary[0], primary[1], primary[2]);
  doc.setFontSize(12);
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
        v.name,
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
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: primary, textColor: [255, 255, 255], fontStyle: "bold" },
      margin: { left: 10, right: 10 },
    });
  }

  // Footer com ícones (imagens da pasta public)
  doc.setDrawColor(accent[0], accent[1], accent[2]);
  doc.setLineWidth(0.4);
  doc.line(10, 270, 200, 270);

  const iconSize = 4.5;
  // Telefone
  doc.addImage(phoneIcon, "PNG", 18, 276, iconSize, iconSize);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(text[0], text[1], text[2]);
  doc.text("(31) 99248-8512", 24, 280);

  // Endereço com quebra de linha
  doc.addImage(locationIcon, "PNG", 88, 276, iconSize, iconSize);
  const addr1 = data.companyConfig.address?.split(",")[0] || "Rua, nº";
  const addr2 = data.companyConfig.address?.split(",").slice(1).join(",").trim() || "Cidade, UF";
  doc.text(addr1 + ",", 105, 278, { align: "center" });
  doc.text(addr2, 105, 283, { align: "center" });

  // Site
  doc.addImage(globeIcon, "PNG", 168, 276, iconSize, iconSize);
  doc.text(data.companyConfig.website || "www.quantumtecnologia.com.br", 174, 280);

  // Salvar
  const fileName = `Proposta_${data.clientName.replace(/\s+/g, "_")}_${formattedDate.replace(/\//g, "-")}.pdf`;
  if (options?.openInNewTab && typeof window !== "undefined") {
    const blobUrl = doc.output("bloburl");
    window.open(blobUrl, "_blank");
  } else {
    doc.save(fileName);
  }
};
