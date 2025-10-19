export const formatProposalPdfFileName = (clientName: string, date: string) => {
  const formattedDate = new Date(date).toLocaleDateString("pt-BR");
  return `Proposta_${clientName.replace(/\s+/g, "_")}_${formattedDate.replace(/\//g, "-")}.pdf`;
};
