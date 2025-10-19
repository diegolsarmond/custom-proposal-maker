import { formatProposalNumber } from "@/utils/formatProposalNumber";

type SequenceRelation = { id?: number | null } | null | undefined;

type ProposalWithSequence = {
  proposal_number?: string | null;
  date: string | Date;
  proposals_number?: SequenceRelation | SequenceRelation[] | null;
};

const extractSequenceId = (relation: ProposalWithSequence["proposals_number"]) => {
  if (!relation) return null;
  const entries = Array.isArray(relation) ? relation : [relation];
  for (const entry of entries) {
    if (entry && typeof entry.id === "number") {
      return entry.id;
    }
  }
  return null;
};

export const resolveProposalNumber = (proposal: ProposalWithSequence) => {
  if (proposal.proposal_number) {
    return proposal.proposal_number;
  }

  const sequenceId = extractSequenceId(proposal.proposals_number);
  if (!sequenceId) {
    return null;
  }

  return formatProposalNumber(sequenceId, proposal.date);
};
