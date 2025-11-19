import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoImage from "@/assets/quantum-logo.png";

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

export type ContractItem = {
  name: string;
  description?: string;
  implantation?: number | string;
  recurrence?: number | string;
};

export type ContractPdfData = {
  contractNumber?: string;
  contractDate: string;
  contractStatus?: string;
  client: {
    name: string;
    companyName: string;
    document?: string | null;
    email?: string | null;
    phone?: string | null;
    segment?: string | null;
  };
  company: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    responsible?: string;
  };
  proposal?: {
    id?: string;
    number?: string;
    date?: string;
    responsible?: string;
    introText?: string;
    objectiveText?: string;
    servicesText?: string;
    whyText?: string;
    items?: ContractItem[];
  };
  clauses?: { title: string; content: string }[];
  signatures?: {
    companySigner?: string;
    clientSigner?: string;
    companyRole?: string;
    clientRole?: string;
  };
};

const formatContractPdfFileName = (
  clientName: string,
  date: string,
  contractNumber?: string,
) => {
  const formattedDate = new Date(date).toLocaleDateString("pt-BR");
  const number = contractNumber ? `${contractNumber}_` : "";
  return `Contrato_${number}${clientName.replace(/\s+/g, "_")}_${formattedDate.replace(/\//g, "-")}.pdf`;
};

const ensureSpace = (doc: jsPDF, currentY: number, needed: number) => {
  const pageHeight = (doc as any).internal?.pageSize?.height || 297;
  if (currentY + needed < pageHeight - 20) {
    return currentY;
  }
  doc.addPage();
  return 20;
};

const addSection = (doc: jsPDF, title: string, content: string, y: number) => {
  let cursor = ensureSpace(doc, y, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(title, 15, cursor);
  cursor += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const lines = doc.splitTextToSize(content, 180);
  doc.text(lines, 15, cursor);
  cursor += lines.length * 6 + 6;
  return cursor;
};

export const generateContractPDF = async (
  data: ContractPdfData,
  options?: { openInNewTab?: boolean; returnData?: "blob" | "datauristring" },
) => {
  const logoData = await loadImageData(logoImage);
  const doc = new jsPDF("p", "mm", "a4");

  const primary: [number, number, number] = [10, 45, 90];
  const textColor: [number, number, number] = [33, 37, 41];

  doc.setFillColor(primary[0], primary[1], primary[2]);
  doc.rect(0, 0, 210, 30, "F");
  doc.addImage(logoData, "PNG", 175, 6, 22, 18);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(255, 255, 255);
  doc.text("CONTRATO", 15, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Prestação de Serviços", 15, 24);

  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  let y = 42;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Dados do Contrato", 15, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const metadata = [
    `Número: ${data.contractNumber || "-"}`,
    `Data: ${new Date(data.contractDate).toLocaleDateString("pt-BR")}`,
    `Status: ${data.contractStatus || "Em aberto"}`,
    data.proposal?.number ? `Proposta: ${data.proposal.number}` : "",
  ].filter(Boolean);
  metadata.forEach((item) => {
    doc.text(item, 15, y);
    y += 6;
  });

  y = ensureSpace(doc, y, 40);
  doc.setFont("helvetica", "bold");
  doc.text("Partes", 15, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  const partyLines = [
    `Contratante: ${data.client.companyName} (${data.client.name})`,
    data.client.document ? `Documento: ${data.client.document}` : "",
    data.client.email ? `Email: ${data.client.email}` : "",
    data.client.phone ? `Telefone: ${data.client.phone}` : "",
    data.company.name ? `Contratada: ${data.company.name}` : "",
    data.company.address ? `Endereço: ${data.company.address}` : "",
    data.company.phone ? `Contato: ${data.company.phone}` : "",
    data.company.email ? `Suporte: ${data.company.email}` : "",
  ].filter(Boolean);
  partyLines.forEach((line) => {
    doc.text(line, 15, y);
    y += 6;
  });

  const clauses = data.clauses?.length
    ? data.clauses
    : [
        {
          title: "Objeto",
          content:
            data.proposal?.servicesText ||
            "Prestação de serviços especializados conforme escopo aprovado na proposta comercial, incluindo setup inicial, integrações e acompanhamento das automações contratadas.",
        },
        {
          title: "Responsabilidades",
          content:
            "A contratada deverá executar as atividades com diligência, mantendo comunicação clara e registrando entregas. A contratante deve fornecer as informações necessárias e garantir acesso aos sistemas envolvidos.",
        },
        {
          title: "Prazos e Vigência",
          content:
            "O contrato inicia na data de assinatura e permanece vigente durante a implementação e manutenção recorrente enquanto houver contraprestação financeira acordada pelas partes.",
        },
        {
          title: "Condições Comerciais",
          content:
            data.proposal?.objectiveText ||
            "Valores de implantação e recorrência seguem os termos aprovados na proposta. A inadimplência poderá suspender o atendimento e gerar atualização monetária das parcelas em aberto.",
        },
        {
          title: "Confidencialidade",
          content:
            "As partes comprometem-se a manter sigilo sobre dados técnicos, estratégicos ou pessoais acessados durante a execução do contrato, observando a legislação vigente de privacidade.",
        },
        {
          title: "Rescisão",
          content:
            "O contrato poderá ser rescindido por descumprimento material ou notificação prévia, preservando-se o pagamento proporcional pelos serviços já prestados e eventuais multas previstas entre as partes.",
        },
      ];

  clauses.forEach((clause) => {
    y = addSection(doc, clause.title, clause.content, y);
  });

  const items = data.proposal?.items || [];
  if (items.length) {
    y = ensureSpace(doc, y, 30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Escopo Detalhado", 15, y);
    y += 6;
    autoTable(doc, {
      startY: y,
      head: [["Serviço", "Implantação", "Recorrência"]],
      body: items.map((item) => [
        item.name,
        item.implantation ? `R$ ${item.implantation}` : "-",
        item.recurrence ? `R$ ${item.recurrence}` : "-",
      ]),
      styles: { fontSize: 10 },
      headStyles: { fillColor: primary },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    });
    const finalY = (doc as any).lastAutoTable?.finalY;
    y = typeof finalY === "number" ? finalY + 10 : y + 30;
  }

  const signatureY = ensureSpace(doc, y, 50);
  doc.setFont("helvetica", "bold");
  doc.text("Assinaturas", 15, signatureY);
  let cursorY = signatureY + 12;
  doc.setFont("helvetica", "normal");

  const companySigner = data.signatures?.companySigner || data.company.responsible || "Responsável Contratada";
  const clientSigner = data.signatures?.clientSigner || data.client.name;
  const companyRole = data.signatures?.companyRole || "Representante";
  const clientRole = data.signatures?.clientRole || "Contratante";

  doc.text(companySigner, 20, cursorY);
  doc.line(15, cursorY + 2, 95, cursorY + 2);
  doc.text(companyRole, 20, cursorY + 8);

  doc.text(clientSigner, 120, cursorY);
  doc.line(115, cursorY + 2, 195, cursorY + 2);
  doc.text(clientRole, 120, cursorY + 8);

  const fileName = formatContractPdfFileName(
    data.client.name || data.client.companyName,
    data.contractDate,
    data.contractNumber,
  );
  const returnType = options?.returnData;

  if (options?.openInNewTab) {
    const dataUri = doc.output("datauristring");
    window.open(dataUri, "_blank");
    if (returnType === "datauristring") {
      return dataUri;
    }
    if (returnType === "blob") {
      return doc.output("blob");
    }
    doc.save(fileName);
    return dataUri;
  }

  if (returnType === "datauristring") {
    return doc.output("datauristring");
  }
  if (returnType === "blob") {
    return doc.output("blob");
  }

  doc.save(fileName);
  return doc.output("datauristring");
};
