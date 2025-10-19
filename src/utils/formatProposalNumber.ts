export const formatProposalNumber = (id: number, date: string | Date) => {
  const parsedDate = typeof date === "string" ? new Date(date) : date;
  const year = parsedDate.getFullYear();
  const sequence = String(id).padStart(4, "0");
  return `#${sequence}/${year}`;
};
