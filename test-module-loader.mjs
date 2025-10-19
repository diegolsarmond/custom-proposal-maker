const projectRoot = new URL("./", import.meta.url);
const aliasMap = new Map([
  ["integrations/supabase/client", "dist-tests/src/test-stubs/supabaseClient.js"],
  ["hooks/useAuth", "dist-tests/src/test-stubs/useAuth.js"],
  ["utils/pdfGenerator", "dist-tests/src/test-stubs/pdfGenerator.js"],
  ["components/ui/button", "dist-tests/src/test-stubs/components/ui/button.js"],
  ["components/ui/input", "dist-tests/src/test-stubs/components/ui/input.js"],
  ["components/ui/label", "dist-tests/src/test-stubs/components/ui/label.js"],
  ["components/ui/checkbox", "dist-tests/src/test-stubs/components/ui/checkbox.js"],
  ["components/ui/textarea", "dist-tests/src/test-stubs/components/ui/textarea.js"],
  ["components/ui/card", "dist-tests/src/test-stubs/components/ui/card.js"],
  ["components/ui/select", "dist-tests/src/test-stubs/components/ui/select.js"],
  ["assets/quantum-logo.png", "dist-tests/src/test-stubs/assets/quantum-logo.png.js"],
  ["jspdf", "dist-tests/src/test-stubs/jspdf.js"],
  ["jspdf-autotable", "dist-tests/src/test-stubs/jspdf-autotable.js"],
  ["utils/formatProposalNumber", "dist-tests/src/utils/formatProposalNumber.js"],
  ["components/ProposalForm", "dist-tests/src/test-stubs/components/ProposalForm.js"],
  ["assets/quantum-logo.png", "dist-tests/src/test-stubs/assets/quantum-logo.png.js"],
  ["utils/resolveProposalNumber", "dist-tests/src/utils/resolveProposalNumber.js"],
]);

export async function resolve(specifier, context, defaultResolve) {
  const mappedSpecifier = aliasMap.get(specifier);
  if (mappedSpecifier) {
    const targetUrl = new URL(mappedSpecifier, projectRoot);
    return { url: targetUrl.href, shortCircuit: true };
  }
  if (specifier.startsWith("@/")) {
    const target = specifier.slice(2);
    const mapped = aliasMap.get(target);
    if (mapped) {
      const targetUrl = new URL(mapped, projectRoot);
      return { url: targetUrl.href, shortCircuit: true };
    }
    const fallback = new URL(`dist-tests/src/${target}.js`, projectRoot);
    return { url: fallback.href, shortCircuit: true };
  }
  return defaultResolve(specifier, context, defaultResolve);
}
