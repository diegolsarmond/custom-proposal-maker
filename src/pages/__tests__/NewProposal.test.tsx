import assert from "node:assert/strict";
import { test, mock } from "node:test";

const findForm = (node: any): any => {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findForm(item);
      if (found) return found;
    }
    return null;
  }
  if (!node || typeof node !== "object") return null;
  if (node.type === "form") return node;
  const children = node.props?.children;
  if (children === undefined || children === null) return null;
  return findForm(children);
};

test("envio do formulário inclui defaultToNull falso", async () => {
  const stateOverrides: any[] = [
    [],
    [],
    [],
    "client-1",
    {
      id: "client-1",
      name: "Cliente Teste",
      company_name: "Empresa Teste",
      document: null,
      email: "cliente@teste.com",
      phone: null,
      segment: null,
    },
    false,
    {
      date: "2024-01-01",
      observations: "Observações",
      responsible: "Responsável",
      companyConfig: {
        name: "Empresa",
        address: "Endereço",
        email: "empresa@teste.com",
        phone: "123",
      },
      proposalTexts: {
        introductionText: "Introdução",
        objectiveText: "Objetivo",
        servicesText: "Serviços",
        whyText: "Por que",
      },
      pricingLabels: {
        implantation: "Implantação (R$)",
        recurrence: "Recorrência",
      },
      selectedProducts: {
        produto1: {
          selected: true,
          implantation: 100,
          recurrence: 200,
          name: "Produto 1",
        },
      },
    },
  ];

  const proposalInsertMock = mock.fn((rows: any, options?: any) => {
    return {
      select: () => ({
        single: async () => ({
          data: {
            id: "proposal-1",
            date: "2024-01-01",
            proposal_number: null,
          },
          error: null,
        }),
      }),
    };
  });

  const supabaseMock = {
    from: mock.fn((table: string) => {
      if (table === "proposals") {
        return {
          insert: proposalInsertMock,
          update: () => ({
            eq: () => ({
              select: () => ({
                single: async () => ({
                  data: {
                    id: "proposal-1",
                    date: "2024-01-01",
                    proposal_number: "PN-2024",
                  },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === "proposals_number") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
          insert: () => ({
            select: () => ({
              single: async () => ({ data: { id: 10 }, error: null }),
            }),
          }),
        };
      }
      if (table === "proposal_items") {
        return {
          insert: async () => ({ error: null }),
        };
      }
      throw new Error(`Tabela inesperada: ${table}`);
    }),
  };

  let stateCallIndex = 0;
  mock.module("react", {
    namedExports: {
      useState: (initial: any) => {
        const index = stateCallIndex++;
        const value = index < stateOverrides.length ? stateOverrides[index] : initial;
        const setState = (next: any) => {
          const current = index < stateOverrides.length ? stateOverrides[index] : value;
          const newValue = typeof next === "function" ? next(current) : next;
          stateOverrides[index] = newValue;
        };
        return [value, setState];
      },
      useEffect: () => {},
    },
  });

  const simpleComponent = (name: string) => (props: any) => ({
    type: name,
    props: { ...(props ?? {}) },
  });
  const registerModule = (specifier: string, exports: Record<string, any>) => {
    mock.module(specifier, { namedExports: exports });
  };

  const Fragment = Symbol.for("Fragment");
  const createElement = (type: any, props: any) => {
    if (typeof type === "function") {
      return type(props ?? {});
    }
    if (type === Fragment) {
      return { type: Fragment, props: { ...(props ?? {}) } };
    }
    return { type, props: { ...(props ?? {}) } };
  };
  mock.module("react/jsx-runtime", {
    namedExports: {
      jsx: createElement,
      jsxs: createElement,
      Fragment,
    },
  });

  registerModule("@/components/ui/button", { Button: simpleComponent("Button") });
  registerModule("@/components/ui/input", { Input: simpleComponent("Input") });
  registerModule("@/components/ui/label", { Label: simpleComponent("Label") });
  registerModule("@/components/ui/checkbox", { Checkbox: simpleComponent("Checkbox") });
  registerModule("@/components/ui/textarea", { Textarea: simpleComponent("Textarea") });
  registerModule("@/components/ui/card", {
    Card: simpleComponent("Card"),
    CardContent: simpleComponent("CardContent"),
    CardHeader: simpleComponent("CardHeader"),
    CardTitle: simpleComponent("CardTitle"),
  });
  registerModule("@/components/ui/select", {
    Select: simpleComponent("Select"),
    SelectContent: simpleComponent("SelectContent"),
    SelectItem: simpleComponent("SelectItem"),
    SelectTrigger: simpleComponent("SelectTrigger"),
    SelectValue: simpleComponent("SelectValue"),
  });
  registerModule("lucide-react", { ArrowLeft: simpleComponent("ArrowLeft") });
  registerModule("sonner", { toast: { error: () => {}, success: () => {} } });
  registerModule("@/utils/pdfGenerator", { generateProposalPDF: () => {} });
  registerModule("@/utils/formatProposalNumber", {
    formatProposalNumber: () => "PN-2024",
  });
  registerModule("@/hooks/useAuth", {
    useAuth: () => ({ user: { id: "user-1", user_metadata: {} } }),
  });
  registerModule("react-router-dom", {
    useNavigate: () => () => {},
    useParams: () => ({}),
  });
  registerModule("@/integrations/supabase/client", { supabase: supabaseMock });

  const module = await import("../NewProposal.js");
  const NewProposal = module.default;
  const tree = NewProposal();
  const formElement = findForm(tree);
  assert.ok(formElement);

  await formElement.props.onSubmit({ preventDefault: () => {} });

  assert.equal(proposalInsertMock.mock.calls.length, 1);
  assert.deepEqual(proposalInsertMock.mock.calls[0].arguments[1], {
    defaultToNull: false,
  });
});
