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

  // Header compacto
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 20, "F");
  
  doc.addImage(logoImage, "PNG", 8, 4, 12, 12);
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(data.companyConfig.name, 25, 10);
  doc.setFontSize(12);
  doc.text("PROPOSTA COMERCIAL", 25, 16);

  // Informações do cliente - Coluna esquerda
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("CLIENTE:", 8, 28);
  doc.setFont("helvetica", "normal");
  doc.text(data.clientName, 8, 32);
  doc.text(data.companyName, 8, 36);
  if (data.document) {
    doc.text(`${data.document.length > 14 ? "CNPJ" : "CPF"}: ${data.document}`, 8, 40);
  }
  if (data.segment) {
    doc.text(`Segmento: ${data.segment}`, 8, 44);
  }

  // Informações da empresa - Coluna direita
  doc.setFont("helvetica", "bold");
  doc.text("CONTATO:", 110, 28);
  doc.setFont("helvetica", "normal");
  doc.text(data.companyConfig.email, 110, 32);
  doc.text(data.companyConfig.phone, 110, 36);
  doc.text(`Data: ${formattedDate}`, 110, 40);

  // Seção de Investimento - Tabela compacta
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("INVESTIMENTO", 8, 52);

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
    startY: 56,
    head: [["Automação", "Implantação", "Recorrência"]],
    body: tableData,
    theme: "grid",
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
    },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 40, halign: "right" },
      2: { cellWidth: 45, halign: "right" },
    },
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontSize: 7,
      fontStyle: "bold",
    },
    margin: { left: 8, right: 8 },
  });

  const finalY = (doc as any).lastAutoTable.finalY || 56;

  // Layout em 2 colunas para o conteúdo textual
  const leftColX = 8;
  const rightColX = 110;
  const colWidth = 95;
  let currentY = finalY + 6;

  // Coluna Esquerda - Introdução
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("PROPOSTA", leftColX, currentY);
  
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  const splitIntro = doc.splitTextToSize(data.proposalTexts.introductionText, colWidth);
  doc.text(splitIntro, leftColX, currentY + 4);
  
  const introHeight = splitIntro.length * 2.5;
  let leftY = currentY + 4 + introHeight + 3;

  // Ferramentas
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("Ferramentas:", leftColX, leftY);
  doc.setFont("helvetica", "normal");
  doc.text("n8n, Typebot, Evolution API", leftColX, leftY + 3);
  leftY += 8;

  // Objetivo
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("OBJETIVO", leftColX, leftY);
  
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  const splitObjective = doc.splitTextToSize(data.proposalTexts.objectiveText, colWidth);
  doc.text(splitObjective, leftColX, leftY + 4);

  // Coluna Direita - Serviços
  let rightY = currentY;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("SERVIÇOS", rightColX, rightY);
  
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  const splitServices = doc.splitTextToSize(data.proposalTexts.servicesText, colWidth);
  doc.text(splitServices, rightColX, rightY + 4);
  
  const servicesHeight = splitServices.length * 2.5;
  rightY = rightY + 4 + servicesHeight + 5;

  // Por que contratar
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("POR QUE CONTRATAR?", rightColX, rightY);
  
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  const splitWhy = doc.splitTextToSize(data.proposalTexts.whyText, colWidth);
  doc.text(splitWhy, rightColX, rightY + 4);

  rightY = rightY + 4 + splitWhy.length * 2.5 + 5;

  // Observações (se houver)
  if (data.observations) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("OBSERVAÇÕES", rightColX, rightY);
    
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    const splitObs = doc.splitTextToSize(data.observations, colWidth);
    doc.text(splitObs, rightColX, rightY + 4);
  }

  // Footer
  doc.setFontSize(6);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 100, 100);
  doc.text(`Proposta elaborada por: ${data.responsible} | Válida por 30 dias a partir de ${formattedDate}`, 105, 290, { align: "center" });

  const fileName = `Proposta_${data.clientName.replace(/\s+/g, "_")}_${formattedDate.replace(/\//g, "-")}.pdf`;
  doc.save(fileName);
};
