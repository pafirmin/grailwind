import rule from "../src/rules/field-in-shield.js";
import { run } from "./run.js";

const onFrame = (cls, frame = "heater") => ({ messageId: "onFrame", data: { cls, frame } });
const charges = (frame = "heater") => ({ messageId: "charges", data: { frame } });
const escutcheon = { messageId: "escutcheon" };

run("field-in-shield", rule, {
  valid: [
    `<div class="heater w-48"><div class="azure chevron-or bordure-gules"><div class="charges between"><i class="mullet argent"></i></div></div></div>`,
    `<div class="heater"><div class="or"><div class="inescutcheon"><div class="azure bend-or"></div></div></div></div>`,
    `<div class="heater"><div class="quarterly"><div class="or"></div><div class="gules"></div></div></div>`,
    // A canton is a field of its own, not a frame.
    `<div class="heater"><div class="argent"><div class="canton gules cross-or"></div></div></div>`,
    `<div class="heater" role="img" aria-label="Azure"><div class="azure"></div></div>`,
    `<div class="inescutcheon"><div class="or"></div></div>`,
  ],
  invalid: [
    {
      code: `<div class="heater azure"></div>`,
      errors: [onFrame("azure")],
    },
    {
      code: `<div class="heater per-pale-or-gules fess-argent fimbriated-sable bordure-azure"></div>`,
      errors: [
        onFrame("per-pale-or-gules"),
        onFrame("fess-argent"),
        onFrame("fimbriated-sable"),
        onFrame("bordure-azure"),
      ],
    },
    {
      code: `<div class="heater quarterly"><div class="or"></div><div class="gules"></div></div>`,
      errors: [onFrame("quarterly")],
    },
    {
      code: `<div class="heater"><div class="azure"><div class="inescutcheon or"></div></div></div>`,
      errors: [onFrame("or", "inescutcheon")],
    },
    {
      // The charges would be taken for the field.
      code: `<div class="heater azure"><div class="charges"><i class="mullet or"></i></div></div>`,
      errors: [onFrame("azure"), charges()],
    },
    {
      code: `<div class="heater"><div class="charges"><i class="mullet or"></i></div></div>`,
      errors: [charges()],
    },
    {
      code: `<div class="escutcheon azure"></div>`,
      errors: [escutcheon],
    },
    {
      code: `<div class="escutcheon"><div class="azure"></div></div>`,
      errors: [escutcheon],
    },
  ],
  jsxOnly: {
    valid: [`<div className="heater">{children}</div>`, `<Shield className="heater azure" />`],
  },
});
