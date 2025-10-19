import assert from "node:assert/strict";
import { test, mock } from "node:test";

const collectNodesByType = (node: any, type: string, found: any[] = []) => {
  if (!node) return found;
  if (Array.isArray(node)) {
    for (const item of node) {
      collectNodesByType(item, type, found);
    }
    return found;
  }
  if (node.type === type) {
    found.push(node);
  }
  const children = node.props?.children;
  if (children !== undefined && children !== null) {
    collectNodesByType(children, type, found);
  }
  return found;
};

test("renderiza Textarea quando ReactQuill não está disponível", async () => {
  const stateOverrides: any[] = [
    [],
    false,
    false,
    [],
    false,
    [],
    [],
    false,
    "",
    false,
    "",
    "",
    "",
    "",
    [],
    null,
  ];

  let stateIndex = 0;
  let effectIndex = 0;
  mock.module("react", {
    namedExports: {
      useState: (initial: any) => {
        const index = stateIndex++;
        if (index >= stateOverrides.length) {
          stateOverrides.push(initial);
        }
        const value = stateOverrides[index] ?? initial;
        const setState = (next: any) => {
          const current = stateOverrides[index] ?? value;
          stateOverrides[index] = typeof next === "function" ? next(current) : next;
        };
        return [value, setState];
      },
      useEffect: (fn: () => void) => {
        if (effectIndex === 1) {
          fn();
        }
        effectIndex++;
      },
    },
  });

  const simpleComponent = (name: string) => (props: any) => ({
    type: name,
    props: { ...(props ?? {}) },
  });
  const register = (specifier: string, exports: Record<string, any>) => {
    mock.module(specifier, { namedExports: exports });
  };

  register("@/components/ui/button", { Button: simpleComponent("Button") });
  register("@/components/ui/input", { Input: simpleComponent("Input") });
  register("@/components/ui/label", { Label: simpleComponent("Label") });
  register("@/components/ui/textarea", { Textarea: simpleComponent("Textarea") });
  register("@/components/ui/select", {
    Select: simpleComponent("Select"),
    SelectContent: simpleComponent("SelectContent"),
    SelectItem: simpleComponent("SelectItem"),
    SelectTrigger: simpleComponent("SelectTrigger"),
    SelectValue: simpleComponent("SelectValue"),
  });
  register("@/components/ui/tabs", {
    Tabs: simpleComponent("Tabs"),
    TabsContent: simpleComponent("TabsContent"),
    TabsList: simpleComponent("TabsList"),
    TabsTrigger: simpleComponent("TabsTrigger"),
  });
  register("@/components/ui/table", {
    Table: simpleComponent("Table"),
    TableBody: simpleComponent("TableBody"),
    TableCell: simpleComponent("TableCell"),
    TableHead: simpleComponent("TableHead"),
    TableHeader: simpleComponent("TableHeader"),
    TableRow: simpleComponent("TableRow"),
  });
  register("@/components/ui/badge", { Badge: simpleComponent("Badge") });
  register("lucide-react", {
    Send: simpleComponent("SendIcon"),
    Paperclip: simpleComponent("PaperclipIcon"),
    X: simpleComponent("XIcon"),
    Mail: simpleComponent("MailIcon"),
    History: simpleComponent("HistoryIcon"),
  });
  register("sonner", { toast: { error: () => {}, success: () => {} } });
  register("@/utils/pdfGenerator", { generateProposalPDF: async () => new Blob() });
  register("@/utils/proposalFileName", { formatProposalPdfFileName: () => "arquivo.pdf" });
  register("@/utils/resolveProposalNumber", { resolveProposalNumber: () => "PN-1" });

  const supabaseMock = {
    from: () => ({
      select: () => ({ order: () => ({ data: [], error: null }), maybeSingle: () => ({ data: null, error: null }) }),
      order: () => ({ data: [], error: null }),
      limit: () => ({ data: [], error: null }),
      insert: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }),
      update: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }) }),
    }),
    auth: {
      getSession: async () => ({ data: { session: { access_token: "token" } } }),
    },
  };
  register("@/integrations/supabase/client", { supabase: supabaseMock });

  mock.module("react-quill", () => {
    throw new Error("indisponível");
  });
  mock.module("react-quill/dist/quill.snow.css", {});

  const Fragment = Symbol.for("Fragment");
  const jsxFactory = (type: any, props: any) => {
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
      jsx: jsxFactory,
      jsxs: jsxFactory,
      Fragment,
    },
  });

  const module = await import("../SendEmail.js");
  const SendEmail = module.default;
  const tree = SendEmail();

  const textareas = collectNodesByType(tree, "Textarea");
  assert.ok(textareas.length > 0);
});
