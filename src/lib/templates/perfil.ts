import type { Template } from "./types";
import { formatBRL, formatInt, safeDivide } from "@/lib/format";

export const perfilTemplate: Template = {
  id: "perfil",
  label: "Perfil",
  description: "Visibilidade e crescimento de perfil de criador",
  color: "#059669",
  kpis: [
    { id: "spend",           label: "Investimento",       format: formatBRL, color: "brand" },
    { id: "reach",           label: "Alcance",            format: formatInt, color: "sky" },
    { id: "profile_visits",  label: "Visitas ao perfil",  format: formatInt, color: "green" },
    { id: "new_followers",   label: "Novos seguidores",   format: formatInt, color: "green" },
    { id: "cpf",             label: "Custo por seguidor", format: formatBRL, color: "rose", invert: true, tooltip: "Custo por Novo Seguidor = Investimento ÷ Novos Seguidores" },
  ],
  funnel: [
    { id: "reach",          label: "Alcance",           bg: "#D1FAE5" },
    { id: "impressions",    label: "Impressões",        bg: "#A7F3D0" },
    { id: "clicks",         label: "Cliques no link",   bg: "#6EE7B7", rateFromPrev: "CTR" },
    { id: "profile_visits", label: "Visitas ao perfil", bg: "#34D399", rateFromPrev: "Tx. Visita" },
    { id: "new_followers",  label: "Novos seguidores",  bg: "#10B981", rateFromPrev: "Tx. Follow" },
  ],
  table: {
    title: "Performance por Conjunto Criativo",
    columns: [
      { id: "campaign",       label: "Nome da campanha",  align: "left" },
      { id: "adset",          label: "Conjunto criativo", align: "left" },
      { id: "reach",          label: "Alcance",           align: "right", format: formatInt },
      { id: "impressions",    label: "Impressões",        align: "right", format: formatInt },
      { id: "clicks",         label: "Cliques",           align: "right", format: formatInt },
      { id: "profile_visits", label: "Visitas",           align: "right", format: formatInt },
      { id: "new_followers",  label: "Seguidores",        align: "right", format: formatInt },
      { id: "spend",          label: "Investimento",      align: "right", format: formatBRL },
    ],
  },
  derive: (raw) => ({
    cpf: safeDivide(raw.spend, raw.new_followers),
  }),
};
