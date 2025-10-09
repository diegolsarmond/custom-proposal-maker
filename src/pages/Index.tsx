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
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <header className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-primary-dark rounded-2xl mb-4 shadow-lg">
            <FileText className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
            Gerador de Propostas Comerciais
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Sistema automatizado para criar propostas comerciais profissionais em segundos.
            Preencha os dados abaixo e gere um PDF completo pronto para envio.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>Baseado no template Quantum Soluções</span>
          </div>
        </header>

        <ProposalForm onGeneratePDF={handleGeneratePDF} />

        <footer className="mt-12 text-center text-sm text-muted-foreground">
          <p>© 2025 Quantum Soluções - Sistema de Propostas Automatizado</p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
