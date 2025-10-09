import { ProposalForm } from "@/components/ProposalForm";
import { generateProposalPDF } from "@/utils/pdfGenerator";
import type { ProposalData } from "@/components/ProposalForm";
import { toast } from "sonner";
import { FileText, Sparkles } from "lucide-react";

const Index = () => {
  const handleGeneratePDF = (data: ProposalData) => {
    try {
      generateProposalPDF(data);
      toast.success("Proposta gerada com sucesso!", {
        description: "O arquivo PDF foi baixado automaticamente.",
      });
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar proposta", {
        description: "Ocorreu um erro ao criar o arquivo PDF. Tente novamente.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <header className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-primary to-primary-dark rounded-2xl mb-3 shadow-lg">
            <FileText className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
            Gerador de Propostas Comerciais
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            Crie propostas profissionais em segundos. Preencha os dados e gere seu PDF.
          </p>
        </header>

        <ProposalForm onGeneratePDF={handleGeneratePDF} />

        <footer className="mt-6 text-center text-xs text-muted-foreground">
          <p>© 2025 Quantum Soluções - Sistema de Propostas Automatizado</p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
