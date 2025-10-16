import { FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary to-primary-dark rounded-2xl mb-6 shadow-lg">
        <FileText className="w-10 h-10 text-primary-foreground" />
      </div>
      <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
        Sistema de Propostas Comerciais
      </h1>
      <p className="text-lg text-muted-foreground max-w-2xl mb-8">
        Gerencie clientes, produtos e crie propostas profissionais de forma rápida e eficiente.
      </p>
      <div className="flex gap-4">
        <Button size="lg" onClick={() => navigate("/proposals/new")}>
          Criar Nova Proposta
        </Button>
        <Button size="lg" variant="outline" onClick={() => navigate("/clients")}>
          Gerenciar Clientes
        </Button>
      </div>
    </div>
  );
};

export default Index;
