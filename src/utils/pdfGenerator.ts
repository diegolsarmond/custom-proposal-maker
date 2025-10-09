import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ProposalData } from "@/components/ProposalForm";

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
  const primaryColor: [number, number, number] = [37, 99, 235]; // RGB for #2563eb
  const textColor: [number, number, number] = [30, 41, 59];

  // Page 1 - Cover
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("Quantum Soluções", 105, 20, { align: "center" });

  doc.setFontSize(32);
  doc.text("PROPOSTA COMERCIAL", 105, 32, { align: "center" });

  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");

  const formattedDate = new Date(data.date).toLocaleDateString("pt-BR");

  doc.text(`Para: ${data.clientName}`, 20, 55);
  doc.text(`Empresa: ${data.companyName}`, 20, 62);
  if (data.document) {
    doc.text(`${data.document.length > 14 ? "CNPJ" : "CPF"}: ${data.document}`, 20, 69);
  }
  if (data.segment) {
    doc.text(`Segmento: ${data.segment}`, 20, 76);
  }
  doc.text(`Data: ${formattedDate}`, 20, 83);

  if (data.email) {
    doc.text(`Email: ${data.email}`, 20, 95);
  }
  if (data.phone) {
    doc.text(`Telefone: ${data.phone}`, 20, 102);
  }

  doc.setFillColor(240, 248, 255);
  doc.roundedRect(15, 115, 180, 25, 3, 3, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "italic");
  doc.text("Rua Antônio de Albuquerque, 330 - Sala 901, BH/MG", 105, 125, { align: "center" });
  doc.text("Email: brenda@quantumtecnologia.com.br", 105, 132, { align: "center" });
  doc.text("Telefone: (31) 9588-5000", 105, 139, { align: "center" });

  // Page 2 - Introduction
  doc.addPage();

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("Proposta", 20, 20);

  doc.setFontSize(14);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text(`Modernize o atendimento da sua ${data.segment || "empresa"} com inteligência artificial`, 20, 30);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const introText = `Em um mercado cada vez mais dinâmico, a agilidade e a personalização do atendimento fazem toda a diferença. Pensando nisso, desenvolvemos soluções de automação que integram tecnologia e inteligência artificial para transformar o relacionamento com seus clientes, otimizar processos e garantir resultados reais.`;

  const splitIntro = doc.splitTextToSize(introText, 170);
  doc.text(splitIntro, 20, 40);

  doc.setFontSize(10);
  const toolsText = `A proposta a seguir apresenta serviços prontos para implementar nas principais rotinas, utilizando ferramentas como:`;
  doc.text(toolsText, 20, 65);

  doc.setFont("helvetica", "bold");
  doc.text("• n8n", 25, 73);
  doc.setFont("helvetica", "normal");
  doc.text(" – Automação de fluxos com total flexibilidade", 40, 73);

  doc.setFont("helvetica", "bold");
  doc.text("• Typebot", 25, 80);
  doc.setFont("helvetica", "normal");
  doc.text(" – Chatbots humanizados que simulam interações reais com IA", 40, 80);

  doc.setFont("helvetica", "bold");
  doc.text("• Evolution API", 25, 87);
  doc.setFont("helvetica", "normal");
  doc.text(" – Integração automatizada com WhatsApp", 40, 87);

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("Objetivo", 20, 105);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  const objectiveText = `Mesmo quem não domina tecnologia possa usufruir de soluções eficientes, escaláveis e simples de operar. Ao escolher implementar essa automação completa, você não está apenas otimizando processos.

Você está eliminando a necessidade de contratar uma nova equipe para realizar tarefas repetitivas e operacionais. Cada um dos fluxos aqui apresentados substitui com eficiência uma parte do trabalho humano, entregando o que nenhuma contratação isolada conseguiria: agilidade, consistência e disponibilidade total.`;

  const splitObjective = doc.splitTextToSize(objectiveText, 170);
  doc.text(splitObjective, 20, 115);

  // Page 3 - Investment
  doc.addPage();

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("Investimento", 20, 20);

  const tableData: any[] = [];
  let totalImplantation = 0;
  let totalRecurrence = 0;
  let index = 1;

  Object.entries(data.selectedAutomations).forEach(([automationId, values]) => {
    if (values.selected) {
      const automation = availableAutomations.find((a) => a.id === automationId);
      if (automation) {
        tableData.push([
          `${index}. Automação`,
          automation.name,
          "Implantação",
          `R$ ${values.implantation.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        ]);
        tableData.push([
          "",
          automation.description,
          "Recorrência:",
          `R$ ${values.recurrence.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        ]);
        totalImplantation += values.implantation;
        totalRecurrence += values.recurrence;
        index++;
      }
    }
  });

  tableData.push([
    { content: "Total", colSpan: 3, styles: { fontStyle: "bold", fillColor: [240, 248, 255] } },
    {
      content: `R$ ${totalImplantation.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      styles: { fontStyle: "bold", fillColor: [240, 248, 255] },
    },
  ]);

  autoTable(doc, {
    startY: 30,
    head: [],
    body: tableData,
    theme: "grid",
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 80 },
      2: { cellWidth: 30 },
      3: { cellWidth: 40, halign: "right" },
    },
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY || 30;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("Recorrência Mensal Total:", 20, finalY + 15);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text(
    `R$ ${totalRecurrence.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    100,
    finalY + 15
  );

  // Page 4 - Additional Information
  doc.addPage();

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("Serviços Atribuídos", 20, 20);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);

  const servicesText = `• Configuração completa das automações selecionadas
• Testes e validação de todos os fluxos
• Treinamento para utilização das ferramentas
• Suporte técnico durante a fase de implantação
• Documentação completa dos processos
• Manutenção e ajustes durante o primeiro mês`;

  const splitServices = doc.splitTextToSize(servicesText, 170);
  doc.text(splitServices, 20, 30);

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("Por que contratar a automação completa?", 20, 75);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);

  const whyText = `Ao contratar todas as automações, você garante:

• Economia de escala nos custos de implantação
• Integração perfeita entre todos os processos
• Visão completa do relacionamento com o cliente
• Máximo retorno sobre o investimento
• Time dedicado ao seu projeto

A automação completa transforma sua operação, liberando sua equipe para focar no que realmente importa: crescer o negócio e atender melhor seus clientes.`;

  const splitWhy = doc.splitTextToSize(whyText, 170);
  doc.text(splitWhy, 20, 85);

  if (data.observations) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("Observações Adicionais", 20, 145);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    const splitObs = doc.splitTextToSize(data.observations, 170);
    doc.text(splitObs, 20, 155);
  }

  // Footer
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 100, 100);
  doc.text(`Proposta elaborada por: ${data.responsible}`, 105, 280, { align: "center" });
  doc.text(`Válida por 30 dias a partir de ${formattedDate}`, 105, 285, { align: "center" });

  const fileName = `Proposta_${data.clientName.replace(/\s+/g, "_")}_${formattedDate.replace(/\//g, "-")}.pdf`;
  doc.save(fileName);
};
