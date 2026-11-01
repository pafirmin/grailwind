import { readFileSync } from "node:fs";
import arrangementNeedsOrdinary from "./rules/arrangement-needs-ordinary.js";
import chargesInContainer from "./rules/charges-in-container.js";
import modifierNeedsTarget from "./rules/modifier-needs-target.js";
import oneOrdinary from "./rules/one-ordinary.js";
import ruleOfTincture from "./rules/rule-of-tincture.js";

const { name, version } = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);

const plugin = {
  meta: { name, version, namespace: "grailwind" },
  rules: {
    "rule-of-tincture": ruleOfTincture,
    "charges-in-container": chargesInContainer,
    "arrangement-needs-ordinary": arrangementNeedsOrdinary,
    "one-ordinary": oneOrdinary,
    "modifier-needs-target": modifierNeedsTarget,
  },
  configs: {},
};

plugin.configs.recommended = {
  name: "grailwind/recommended",
  plugins: { grailwind: plugin },
  rules: Object.fromEntries(
    Object.keys(plugin.rules).map((rule) => [`grailwind/${rule}`, "error"]),
  ),
};

export default plugin;
