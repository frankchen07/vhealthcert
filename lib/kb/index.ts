import type { KnowledgeBase } from "@/lib/engine/types";
import { countries } from "./countries";
import { coverage } from "./coverage";
import { californiaRules } from "./rules/california";
import { euRules } from "./rules/eu";
import { hawaiiRules } from "./rules/hawaii";
import { japanRules } from "./rules/japan";
import { usReturnRules } from "./rules/us-return";
import { sources } from "./sources";

export const KB: KnowledgeBase = {
  sources,
  rules: [...euRules, ...japanRules, ...usReturnRules, ...hawaiiRules, ...californiaRules],
  countries,
  coverage,
};
