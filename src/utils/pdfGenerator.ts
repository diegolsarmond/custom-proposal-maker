import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ProposalData } from "@/components/ProposalForm";
import logoImage from "@/assets/quantum-logo.png";

const availableAutomations = [
  {
    id: "atendimento",
    name: "Atendimento ao cliente humanizado",
    description: "Atendimento com IA e armazenamento de informações de leads",
  },
  {
    id: "agendamento",
    name: "Marcação de visitas",
    description: "Cadastro, confirmação, cancelamento e lembretes de agendamento",
  },
  {
    id: "mensagens",
    name: "Disparo de mensagens",
    description: "Sinalização de imóveis e felicitações de datas comemorativas",
  },
  {
    id: "financeiro",
    name: "Assuntos financeiros",
    description: "Emissão de boletos, avaliação de crédito e contratos",
  },
  {
    id: "suporte",
    name: "Suporte a usuários",
    description: "Abertura de chamados, acompanhamento e tira-dúvidas com IA",
  },
  {
    id: "adicionais",
    name: "Automações adicionais",
    description: "Leitura de e-mail, redirecionamento e integrações com CRM",
  },
];

export const generateProposalPDF = (data: ProposalData) => {
  const doc = new jsPDF();
  const primaryColor: [number, number, number] = [37, 99, 235];
  const textColor: [number, number, number] = [30, 41, 59];
  const formattedDate = new Date(data.date).toLocaleDateString("pt-BR");
  const proposalLabel = data.proposalNumber
    ? `PROPOSTA COMERCIAL ${data.proposalNumber}`
    : "PROPOSTA COMERCIAL";

  // Header moderno
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 25, "F");
  
  doc.addImage(logoImage, "PNG", 10, 5, 15, 15);
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(data.companyConfig.name, 30, 13);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(proposalLabel, 30, 19);

  // Informações do cliente
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("CLIENTE", 10, 35);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(data.clientName, 10, 42);
  doc.text(data.companyName, 10, 48);
  if (data.document) {
    doc.text(`${data.document.length > 14 ? "CNPJ" : "CPF"}: ${data.document}`, 10, 54);
  }
  if (data.segment) {
    doc.text(`Segmento: ${data.segment}`, 10, 60);
  }
  doc.text(`Data: ${formattedDate}`, 10, 66);
  if (data.proposalNumber) {
    doc.text(`Proposta nº: ${data.proposalNumber}`, 10, 72);
  }

  // Seção de Investimento - Tabela compacta
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("INVESTIMENTO", 10, 75);

  const tableData: any[] = [];
  let totalImplantation = 0;
  let totalRecurrence = 0;

  Object.entries(data.selectedAutomations).forEach(([automationId, values]) => {
    if (values.selected) {
      const automation = availableAutomations.find((a) => a.id === automationId);
      if (automation) {
        tableData.push([
          automation.name,
          `R$ ${values.implantation.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
          `R$ ${values.recurrence.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mês`,
        ]);
        totalImplantation += values.implantation;
        totalRecurrence += values.recurrence;
      }
    }
  });

  tableData.push([
    { content: "TOTAL", styles: { fontStyle: "bold", fillColor: [240, 248, 255] } },
    {
      content: `R$ ${totalImplantation.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      styles: { fontStyle: "bold", fillColor: [240, 248, 255], halign: "right" },
    },
    {
      content: `R$ ${totalRecurrence.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mês`,
      styles: { fontStyle: "bold", fillColor: [240, 248, 255], halign: "right" },
    },
  ]);

  autoTable(doc, {
    startY: 80,
    head: [["Automação", "Implantação", "Recorrência"]],
    body: tableData,
    theme: "grid",
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 95 },
      1: { cellWidth: 45, halign: "right" },
      2: { cellWidth: 50, halign: "right" },
    },
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
    },
    margin: { left: 10, right: 10 },
  });

  const finalY = (doc as any).lastAutoTable.finalY || 80;

  // Layout em coluna única para melhor legibilidade
  const textWidth = 190;
  let currentY = finalY + 8;

  // Introdução
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("PROPOSTA", 10, currentY);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  const splitIntro = doc.splitTextToSize(data.proposalTexts.introductionText, textWidth);
  doc.text(splitIntro, 10, currentY + 6);
  
  currentY += 6 + splitIntro.length * 3.5 + 4;

  // Ferramentas
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Ferramentas:", 10, currentY);
  doc.setFont("helvetica", "normal");
  doc.text(" n8n, Typebot, Evolution API", 32, currentY);
  currentY += 6;

  // Objetivo
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("OBJETIVO", 10, currentY);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  const splitObjective = doc.splitTextToSize(data.proposalTexts.objectiveText, textWidth);
  doc.text(splitObjective, 10, currentY + 6);

  currentY += 6 + splitObjective.length * 3.5 + 4;

  // Serviços
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("SERVIÇOS", 10, currentY);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  const splitServices = doc.splitTextToSize(data.proposalTexts.servicesText, textWidth);
  doc.text(splitServices, 10, currentY + 6);
  
  currentY += 6 + splitServices.length * 3.5 + 4;

  // Por que contratar
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("POR QUE CONTRATAR?", 10, currentY);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  const splitWhy = doc.splitTextToSize(data.proposalTexts.whyText, textWidth);
  doc.text(splitWhy, 10, currentY + 6);

  currentY += 6 + splitWhy.length * 3.5 + 4;

  // Observações (se houver)
  if (data.observations) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("OBSERVAÇÕES", 10, currentY);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    const splitObs = doc.splitTextToSize(data.observations, textWidth);
    doc.text(splitObs, 10, currentY + 6);
  }

  // Rodapé moderno com informações de contato
  doc.setFillColor(245, 245, 245);
  doc.rect(0, 270, 210, 27, "F");
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text(data.companyConfig.name, 105, 276, { align: "center" });
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(data.companyConfig.address, 105, 281, { align: "center" });
  doc.text(`${data.companyConfig.email} | ${data.companyConfig.phone}`, 105, 286, { align: "center" });
  
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 100, 100);
  doc.text(`Proposta elaborada por: ${data.responsible} | Válida por 30 dias a partir de ${formattedDate}`, 105, 291, { align: "center" });

  const fileName = `Proposta_${data.clientName.replace(/\s+/g, "_")}_${formattedDate.replace(/\//g, "-")}.pdf`;
  doc.save(fileName);
};
