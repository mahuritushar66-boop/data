export const DEFAULT_MODULE_TITLE = "General";
export const DEFAULT_MODULE_PRICE = 0; // Admin-defined; fallback only if no price set yet
export const DEFAULT_GLOBAL_PRICE = 0; // Admin-defined; fallback only if no price set yet
export const MODULE_PRICING_COLLECTION = "modulePricing";
export const GLOBAL_PRICING_DOC = "globalPricing"; // Avoid reserved doc IDs like "__global__"

export const normalizeModuleTitle = (title?: string | null) => {
  const trimmed = title?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_MODULE_TITLE;
};

export const getModulePricingDocId = (title?: string | null) =>
  encodeURIComponent(normalizeModuleTitle(title).toLowerCase());

