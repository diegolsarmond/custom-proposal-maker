import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download } from "lucide-react";
import { toast } from "sonner";

export interface Automation {
  id: string;
  name: string;
  description: string;
  defaultImplantation: number;
  defaultRecurrence: number;
}

export interface ProposalData {
  clientName: string;
  companyName: string;
  document: string;
  email: string;
  phone: string;
  date: string;
  segment: string;
  selectedAutomations: {
    [key: string]: {
      selected: boolean;
      implantation: number;
      recurrence: number;
    };
  };
  observations: string;
  responsible: string;
}

const availableAutomations: Automation[] = [
  {
    id: "atendimento",
    name: "Atendimento ao cliente humanizado",
    description: "Atendimento com IA e armazenamento de informações de leads",
    defaultImplantation: 1250,
    defaultRecurrence: 125,
  },
  {
    id: "agendamento",
    name: "Marcação de visitas",
    description: "Cadastro, confirmação, cancelamento e lembretes de agendamento",
    defaultImplantation: 3550,
    defaultRecurrence: 355,
  },
  {
    id: "mensagens",
    name: "Disparo de mensagens",
    description: "Sinalização de imóveis e felicitações de datas comemorativas",
    defaultImplantation: 3400,
    defaultRecurrence: 340,
  },
  {
    id: "financeiro",
    name: "Assuntos financeiros",
    description: "Emissão de boletos, avaliação de crédito e contratos",
    defaultImplantation: 4300,
    defaultRecurrence: 360,
  },
  {
    id: "suporte",
    name: "Suporte a usuários",
    description: "Abertura de chamados, acompanhamento e tira-dúvidas com IA",
    defaultImplantation: 1200,
    defaultRecurrence: 120,
  },
  {
    id: "adicionais",
    name: "Automações adicionais",
    description: "Leitura de e-mail, redirecionamento e integrações com CRM",
    defaultImplantation: 2300,
    defaultRecurrence: 300,
  },
];

interface ProposalFormProps {
  onGeneratePDF: (data: ProposalData) => void;
}

export const ProposalForm = ({ onGeneratePDF }: ProposalFormProps) => {
  const [formData, setFormData] = useState<ProposalData>({
    clientName: "",
    companyName: "",
    document: "",
    email: "",
    phone: "",
    date: new Date().toISOString().split("T")[0],
    segment: "",
    selectedAutomations: {},
    observations: "",
    responsible: "Rafael Alves",
  });

  const handleAutomationToggle = (automationId: string, checked: boolean) => {
    const automation = availableAutomations.find((a) => a.id === automationId);
    if (!automation) return;

    setFormData((prev) => ({
      ...prev,
      selectedAutomations: {
        ...prev.selectedAutomations,
        [automationId]: checked
          ? {
              selected: true,
              implantation: automation.defaultImplantation,
              recurrence: automation.defaultRecurrence,
            }
          : { selected: false, implantation: 0, recurrence: 0 },
      },
    }));
  };

  const handleAutomationValueChange = (
    automationId: string,
    field: "implantation" | "recurrence",
    value: number
  ) => {
    setFormData((prev) => ({
      ...prev,
      selectedAutomations: {
        ...prev.selectedAutomations,
        [automationId]: {
          ...prev.selectedAutomations[automationId],
          [field]: value,
        },
      },
    }));
  };

  const calculateTotals = () => {
    let totalImplantation = 0;
    let totalRecurrence = 0;

    Object.entries(formData.selectedAutomations).forEach(([_, values]) => {
      if (values.selected) {
        totalImplantation += values.implantation;
        totalRecurrence += values.recurrence;
      }
    });

    return { totalImplantation, totalRecurrence };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.clientName || !formData.companyName || !formData.email) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    const selectedCount = Object.values(formData.selectedAutomations).filter(
      (a) => a.selected
    ).length;

    if (selectedCount === 0) {
      toast.error("Selecione pelo menos uma automação");
      return;
    }

    onGeneratePDF(formData);
  };

  const { totalImplantation, totalRecurrence } = calculateTotals();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dados do Cliente</CardTitle>
          <CardDescription>Informações básicas para a proposta comercial</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">Nome do Cliente *</Label>
              <Input
                id="clientName"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                placeholder="Ex: Rafael Alves"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName">Nome da Empresa *</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="Ex: Quantum Soluções"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="document">CNPJ ou CPF</Label>
              <Input
                id="document"
                value={formData.document}
                onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                placeholder="00.000.000/0000-00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="segment">Segmento</Label>
              <Input
                id="segment"
                value={formData.segment}
                onChange={(e) => setFormData({ ...formData, segment: e.target.value })}
                placeholder="Ex: Imobiliária"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="cliente@empresa.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(31) 9588-5000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Data da Proposta</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Automações</CardTitle>
          <CardDescription>Selecione as automações desejadas e defina os valores</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {availableAutomations.map((automation) => (
            <div
              key={automation.id}
              className="border border-border rounded-lg p-4 space-y-3 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start space-x-3">
                <Checkbox
                  id={automation.id}
                  checked={formData.selectedAutomations[automation.id]?.selected || false}
                  onCheckedChange={(checked) =>
                    handleAutomationToggle(automation.id, checked as boolean)
                  }
                />
                <div className="flex-1">
                  <Label htmlFor={automation.id} className="cursor-pointer font-semibold">
                    {automation.name}
                  </Label>
                  <p className="text-sm text-muted-foreground">{automation.description}</p>
                </div>
              </div>

              {formData.selectedAutomations[automation.id]?.selected && (
                <div className="grid grid-cols-2 gap-4 ml-8">
                  <div className="space-y-2">
                    <Label className="text-sm">Valor de Implantação (R$)</Label>
                    <Input
                      type="number"
                      value={formData.selectedAutomations[automation.id].implantation}
                      onChange={(e) =>
                        handleAutomationValueChange(
                          automation.id,
                          "implantation",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Valor de Recorrência Mensal (R$)</Label>
                    <Input
                      type="number"
                      value={formData.selectedAutomations[automation.id].recurrence}
                      onChange={(e) =>
                        handleAutomationValueChange(
                          automation.id,
                          "recurrence",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informações Adicionais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="responsible">Responsável pela Proposta</Label>
            <Input
              id="responsible"
              value={formData.responsible}
              onChange={(e) => setFormData({ ...formData, responsible: e.target.value })}
              placeholder="Nome do responsável"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="observations">Observações</Label>
            <Textarea
              id="observations"
              value={formData.observations}
              onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
              placeholder="Observações adicionais sobre a proposta..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">Resumo Financeiro</h3>
              <div className="mt-2 space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">Total de Implantação:</span>{" "}
                  <span className="font-bold text-primary">
                    R$ {totalImplantation.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">Total de Recorrência Mensal:</span>{" "}
                  <span className="font-bold text-primary">
                    R$ {totalRecurrence.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </p>
              </div>
            </div>
            <Button type="submit" size="lg" className="gap-2">
              <FileText className="w-5 h-5" />
              Gerar Proposta PDF
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
};
