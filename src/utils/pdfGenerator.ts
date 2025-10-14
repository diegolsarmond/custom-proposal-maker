import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ProposalData } from "@/components/ProposalForm";
import logoImage from "@/assets/quantum-logo.png";
import backgroundImage from "@/assets/background.jpg";

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
  const whiteColor: [number, number, number] = [255, 255, 255];
  const darkBlueOverlay: [number, number, number] = [20, 50, 80];
  const cyanColor: [number, number, number] = [34, 211, 238];
  const formattedDate = new Date(data.date).toLocaleDateString("pt-BR");

  // Background image
  doc.addImage(backgroundImage, "JPEG", 0, 0, 210, 297);

  // Header com logo e informações de contato
  doc.addImage(logoImage, "PNG", 15, 15, 20, 20);
  
  doc.setTextColor(whiteColor[0], whiteColor[1], whiteColor[2]);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text(data.companyConfig.name.toUpperCase(), 40, 28);
  
  // Informações de contato no topo direito
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const rightX = 200;
  doc.text(data.companyConfig.phone, rightX, 18, { align: "right" });
  doc.text(data.companyConfig.address, rightX, 23, { align: "right" });
  doc.text(data.companyConfig.email, rightX, 28, { align: "right" });

  // Card de Automações Selecionadas
  let currentY = 50;
  
  // Background do card principal
  doc.setFillColor(darkBlueOverlay[0], darkBlueOverlay[1], darkBlueOverlay[2]);
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.2);
  doc.roundedRect(15, currentY, 180, 85, 3, 3, "FD");
  
  doc.setTextColor(whiteColor[0], whiteColor[1], whiteColor[2]);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Automações Selecionadas", 25, currentY + 10);
  
  currentY += 18;

  // Lista de automações com checkmarks
  let totalImplantation = 0;
  let totalRecurrence = 0;
  const selectedAutomationsList: Array<{ name: string; implantation: number; recurrence: number }> = [];

  Object.entries(data.selectedAutomations).forEach(([automationId, values]) => {
    if (values.selected) {
      const automation = availableAutomations.find((a) => a.id === automationId);
      if (automation) {
        selectedAutomationsList.push({
          name: automation.name,
          implantation: values.implantation,
          recurrence: values.recurrence,
        });
        totalImplantation += values.implantation;
        totalRecurrence += values.recurrence;
      }
    }
  });

  // Mostrar automações em duas colunas
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const colWidth = 85;
  let itemY = currentY;
  
  selectedAutomationsList.forEach((item, index) => {
    const col = index % 2;
    const x = 25 + (col * colWidth);
    
    if (col === 0 && index > 0) {
      itemY += 6;
    }
    
    // Checkmark
    doc.setFont("helvetica", "bold");
    doc.text("✓", x, itemY);
    
    // Nome da automação
    doc.setFont("helvetica", "normal");
    doc.text(`${index + 1}. ${item.name}`, x + 5, itemY);
  });

  currentY = itemY + 15;

  // Card de resumo com seta
  doc.setFillColor(darkBlueOverlay[0], darkBlueOverlay[1], darkBlueOverlay[2]);
  doc.roundedRect(15, currentY, 180, 30, 3, 3, "FD");
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("➜", 25, currentY + 10);
  doc.text(`${selectedAutomationsList.length} Automações Selecionadas`, 32, currentY + 10);
  
  // Linha divisória
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.3);
  doc.line(25, currentY + 13, 185, currentY + 13);
  
  // Detalhes financeiros
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  selectedAutomationsList.forEach((item, index) => {
    const y = currentY + 18 + (index * 4);
    doc.text(item.name, 25, y);
    doc.text(
      `R$ ${item.implantation.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      185,
      y,
      { align: "right" }
    );
  });
  
  currentY += 30 + (selectedAutomationsList.length * 4) + 8;

  // Total destacado
  doc.setFillColor(darkBlueOverlay[0], darkBlueOverlay[1], darkBlueOverlay[2]);
  doc.roundedRect(15, currentY, 180, 35, 3, 3, "FD");
  
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(cyanColor[0], cyanColor[1], cyanColor[2]);
  const totalValue = `R$ ${(totalImplantation + totalRecurrence).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  doc.text(totalValue, 105, currentY + 22, { align: "center" });
  
  doc.setFontSize(9);
  doc.setTextColor(whiteColor[0], whiteColor[1], whiteColor[2]);
  doc.setFont("helvetica", "normal");
  doc.text(`Implantação: R$ ${totalImplantation.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} | Recorrência: R$ ${totalRecurrence.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mês`, 105, currentY + 30, { align: "center" });
  
  currentY += 45;

  // Observações (se houver)
  if (data.observations) {
    doc.setFillColor(darkBlueOverlay[0], darkBlueOverlay[1], darkBlueOverlay[2]);
    doc.roundedRect(15, currentY, 85, 40, 3, 3, "FD");
    
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(whiteColor[0], whiteColor[1], whiteColor[2]);
    doc.text("Observações", 25, currentY + 10);
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const splitObs = doc.splitTextToSize(data.observations, 70);
    doc.text(splitObs, 25, currentY + 17);
  }

  // Informações adicionais no rodapé
  const footerY = 270;
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(200, 200, 200);
  doc.text(`Cliente: ${data.clientName} | ${data.companyName}`, 105, footerY, { align: "center" });
  doc.text(`Proposta elaborada por: ${data.responsible} | Data: ${formattedDate} | Válida por 30 dias`, 105, footerY + 5, { align: "center" });

  const fileName = `Proposta_${data.clientName.replace(/\s+/g, "_")}_${formattedDate.replace(/\//g, "-")}.pdf`;
  doc.save(fileName);
};
