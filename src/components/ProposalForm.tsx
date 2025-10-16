import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Download } from "lucide-react";
import { toast } from "sonner";

export interface Automation {
  id: string;
  name: string;
  description: string;
  defaultImplantation: number;
  defaultRecurrence: number;
}

export interface CompanyConfig {
  name: string;
  address: string;
  email: string;
  phone: string;
}

export interface ProposalTexts {
  introductionText: string;
  objectiveText: string;
  servicesText: string;
  whyText: string;
}

export interface ProposalData {
  clientName: string;
  companyName: string;
  document: string;
  email: string;
  phone: string;
  date: string;
  segment: string;
  proposalNumber: string;
  pricingLabels: {
    implantation: string;
    recurrence: string;
  };
  selectedAutomations: {
    [key: string]: {
      selected: boolean;
      implantation: number;
      recurrence: number;
      name?: string;
      description?: string;
    };
  };
  observations: string;
  responsible: string;
  companyConfig: CompanyConfig;
  proposalTexts: ProposalTexts;
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

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const parseCurrency = (value: string) => {
  const numericValue = value.replace(/\D/g, "");
  return numericValue ? Number(numericValue) / 100 : 0;
};

export const ProposalForm = ({ onGeneratePDF }: ProposalFormProps) => {
  const [formData, setFormData] = useState<ProposalData>({
    clientName: "",
    companyName: "",
    document: "",
    email: "",
    phone: "",
    date: new Date().toISOString().split("T")[0],
    segment: "",
    proposalNumber: "",
    pricingLabels: {
      implantation: "Implantação (R$)",
      recurrence: "Recorrência",
    },
    selectedAutomations: {},
    observations: "",
    responsible: "Rafael Alves",
    companyConfig: {
      name: "Quantum Soluções",
      address: "Rua Antônio de Albuquerque, 330 - Sala 901, BH/MG",
      email: "brenda@quantumtecnologia.com.br",
      phone: "(31) 99305-4200",
    },
    proposalTexts: {
      introductionText: "Em um mercado cada vez mais dinâmico, a agilidade e a personalização do atendimento fazem toda a diferença. Pensando nisso, desenvolvemos soluções de automação que integram tecnologia e inteligência artificial para transformar o relacionamento com seus clientes, otimizar processos e garantir resultados reais.",
      objectiveText: "Mesmo quem não domina tecnologia possa usufruir de soluções eficientes, escaláveis e simples de operar. Ao escolher implementar essa automação completa, você não está apenas otimizando processos.\n\nVocê está eliminando a necessidade de contratar uma nova equipe para realizar tarefas repetitivas e operacionais. Cada um dos fluxos aqui apresentados substitui com eficiência uma parte do trabalho humano, entregando o que nenhuma contratação isolada conseguiria: agilidade, consistência e disponibilidade total.",
      servicesText: "• Configuração completa das automações selecionadas\n• Testes e validação de todos os fluxos\n• Treinamento para utilização das ferramentas\n• Suporte técnico durante a fase de implantação\n• Documentação completa dos processos\n• Manutenção e ajustes durante o primeiro mês",
      whyText: "Ao contratar todas as automações, você garante:\n\n• Economia de escala nos custos de implantação\n• Integração perfeita entre todos os processos\n• Visão completa do relacionamento com o cliente\n• Máximo retorno sobre o investimento\n• Time dedicado ao seu projeto\n\nA automação completa transforma sua operação, liberando sua equipe para focar no que realmente importa: crescer o negócio e atender melhor seus clientes.",
    },
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
              name: automation.name,
            }
          : {
              selected: false,
              implantation: 0,
              recurrence: 0,
              name: automation.name,
            },
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Dados do Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="clientName" className="text-sm">Nome do Cliente *</Label>
              <Input
                id="clientName"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                placeholder="Ex: Rafael Alves"
                required
                className="h-9"
              />
            </div>
            <div>
              <Label htmlFor="companyName" className="text-sm">Nome da Empresa *</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="Ex: Quantum Soluções"
                required
                className="h-9"
              />
            </div>
            <div>
              <Label htmlFor="document" className="text-sm">CNPJ ou CPF</Label>
              <Input
                id="document"
                value={formData.document}
                onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                placeholder="00.000.000/0000-00"
                className="h-9"
              />
            </div>
            <div>
              <Label htmlFor="segment" className="text-sm">Segmento</Label>
              <Input
                id="segment"
                value={formData.segment}
                onChange={(e) => setFormData({ ...formData, segment: e.target.value })}
                placeholder="Ex: Imobiliária"
                className="h-9"
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-sm">E-mail *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="cliente@empresa.com"
                required
                className="h-9"
              />
            </div>
            <div>
              <Label htmlFor="phone" className="text-sm">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(31) 99305-4200"
                className="h-9"
              />
            </div>
            <div>
              <Label htmlFor="date" className="text-sm">Data da Proposta</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="h-9"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Dados da Sua Empresa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="companyConfigName" className="text-sm">Nome da Empresa</Label>
              <Input
                id="companyConfigName"
                value={formData.companyConfig.name}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  companyConfig: { ...formData.companyConfig, name: e.target.value }
                })}
                placeholder="Quantum Soluções"
                className="h-9"
              />
            </div>
            <div>
              <Label htmlFor="companyAddress" className="text-sm">Endereço</Label>
              <Input
                id="companyAddress"
                value={formData.companyConfig.address}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  companyConfig: { ...formData.companyConfig, address: e.target.value }
                })}
                placeholder="Rua, número - cidade/UF"
                className="h-9"
              />
            </div>
            <div>
              <Label htmlFor="companyEmail" className="text-sm">E-mail da Empresa</Label>
              <Input
                id="companyEmail"
                type="email"
                value={formData.companyConfig.email}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  companyConfig: { ...formData.companyConfig, email: e.target.value }
                })}
                placeholder="contato@empresa.com.br"
                className="h-9"
              />
            </div>
            <div>
              <Label htmlFor="companyPhone" className="text-sm">Telefone da Empresa</Label>
              <Input
                id="companyPhone"
                value={formData.companyConfig.phone}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  companyConfig: { ...formData.companyConfig, phone: e.target.value }
                })}
                placeholder="(31) 99305-4200"
                className="h-9"
              />
            </div>
          </CardContent>
        </Card>
      </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Automações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Coluna de Implantação</Label>
                <Select
                  value={formData.pricingLabels.implantation}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      pricingLabels: {
                        ...formData.pricingLabels,
                        implantation: value,
                      },
                    })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Implantação (R$)">Implantação (R$)</SelectItem>
                    <SelectItem value="Desenvolvimento (R$)">Desenvolvimento (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Coluna de Recorrência</Label>
                <Select
                  value={formData.pricingLabels.recurrence}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      pricingLabels: {
                        ...formData.pricingLabels,
                        recurrence: value,
                      },
                    })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Recorrência">Recorrência</SelectItem>
                    <SelectItem value="Manutenção Mensal">Manutenção Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid lg:grid-cols-2 gap-3">
              {availableAutomations.map((automation) => (
                <div
                key={automation.id}
                className="border border-border rounded-lg p-3 space-y-2 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id={automation.id}
                    checked={formData.selectedAutomations[automation.id]?.selected || false}
                    onCheckedChange={(checked) =>
                      handleAutomationToggle(automation.id, checked as boolean)
                    }
                  />
                  <div className="flex-1">
                    <Label htmlFor={automation.id} className="cursor-pointer font-semibold text-sm">
                      {automation.name}
                    </Label>
                    <p className="text-xs text-muted-foreground">{automation.description}</p>
                  </div>
                </div>

                {formData.selectedAutomations[automation.id]?.selected && (
                  <div className="grid grid-cols-2 gap-2 ml-6">
                    <div>
                      <Label className="text-xs">Implantação (R$)</Label>
                      <Input
                        type="text"
                        value={formatCurrency(
                          formData.selectedAutomations[automation.id].implantation
                        )}
                        onChange={(e) =>
                          handleAutomationValueChange(
                            automation.id,
                            "implantation",
                            parseCurrency(e.target.value)
                          )
                        }
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Recorrência (R$)</Label>
                      <Input
                        type="text"
                        value={formatCurrency(
                          formData.selectedAutomations[automation.id].recurrence
                        )}
                        onChange={(e) =>
                          handleAutomationValueChange(
                            automation.id,
                            "recurrence",
                            parseCurrency(e.target.value)
                          )
                        }
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Textos da Proposta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid lg:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="introText" className="text-sm">Texto de Introdução</Label>
              <Textarea
                id="introText"
                value={formData.proposalTexts.introductionText}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  proposalTexts: { ...formData.proposalTexts, introductionText: e.target.value }
                })}
                rows={3}
                className="text-sm"
              />
            </div>
            <div>
              <Label htmlFor="objectiveText" className="text-sm">Texto do Objetivo</Label>
              <Textarea
                id="objectiveText"
                value={formData.proposalTexts.objectiveText}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  proposalTexts: { ...formData.proposalTexts, objectiveText: e.target.value }
                })}
                rows={3}
                className="text-sm"
              />
            </div>
          </div>
          <div className="grid lg:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="servicesText" className="text-sm">Serviços Atribuídos</Label>
              <Textarea
                id="servicesText"
                value={formData.proposalTexts.servicesText}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  proposalTexts: { ...formData.proposalTexts, servicesText: e.target.value }
                })}
                rows={3}
                className="text-sm"
              />
            </div>
            <div>
              <Label htmlFor="whyText" className="text-sm">Por que contratar?</Label>
              <Textarea
                id="whyText"
                value={formData.proposalTexts.whyText}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  proposalTexts: { ...formData.proposalTexts, whyText: e.target.value }
                })}
                rows={3}
                className="text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Informações Adicionais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="responsible" className="text-sm">Responsável pela Proposta</Label>
              <Input
                id="responsible"
                value={formData.responsible}
                onChange={(e) => setFormData({ ...formData, responsible: e.target.value })}
                placeholder="Nome do responsável"
                className="h-9"
              />
            </div>
            <div>
              <Label htmlFor="observations" className="text-sm">Observações</Label>
              <Textarea
                id="observations"
                value={formData.observations}
                onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                placeholder="Observações adicionais sobre a proposta..."
                rows={3}
                className="text-sm"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Resumo Financeiro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center p-3 bg-background/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Total de Implantação:</span>
              <span className="font-bold text-primary">
                R$ {totalImplantation.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-background/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Total de Recorrência Mensal:</span>
              <span className="font-bold text-primary">
                R$ {totalRecurrence.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Button type="submit" size="lg" className="w-full gap-2 py-6">
        <FileText className="w-5 h-5" />
        Gerar Proposta PDF
      </Button>
    </form>
  );
};
