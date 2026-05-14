import { posTemplate } from "./pos";
import { imersaoTemplate } from "./imersao";
import { perfilTemplate } from "./perfil";
import {
  buildPersonalizadoTemplate,
  DEFAULT_PERSONALIZADO_CONFIG,
  ALL_KPI_OPTIONS,
  ALL_FUNNEL_OPTIONS,
  KPI_GROUPS,
} from "./personalizado";
import type { Template, TemplateId, PersonalizadoConfig } from "./types";

export const TEMPLATES: Record<Exclude<TemplateId, "personalizado">, Template> = {
  pos:     posTemplate,
  imersao: imersaoTemplate,
  perfil:  perfilTemplate,
};

// Stub used only for display in TemplateSelector; actual rendering uses buildPersonalizadoTemplate
const personalizadoStub: Template = buildPersonalizadoTemplate(DEFAULT_PERSONALIZADO_CONFIG);

export const TEMPLATE_LIST: Template[] = [
  ...Object.values(TEMPLATES),
  personalizadoStub,
];

export function getTemplate(id: TemplateId | undefined, personalizadoConfig?: PersonalizadoConfig): Template {
  if (id === "personalizado") {
    return buildPersonalizadoTemplate(personalizadoConfig ?? DEFAULT_PERSONALIZADO_CONFIG);
  }
  if (id && id in TEMPLATES) return TEMPLATES[id as keyof typeof TEMPLATES];
  return posTemplate;
}

export type { Template, TemplateId, PersonalizadoConfig };
export { ALL_KPI_OPTIONS, ALL_FUNNEL_OPTIONS, KPI_GROUPS, DEFAULT_PERSONALIZADO_CONFIG, buildPersonalizadoTemplate };
