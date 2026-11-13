import rule from "../src/rules/arrangement-needs-ordinary.js";
import { run } from "./run.js";

const missing = (arrangement) => ({ messageId: "missing", data: { arrangement } });

run("arrangement-needs-ordinary", rule, {
  valid: [
    `<div class="heater"><div class="azure chevron-or"><div class="charges between"><i class="mullet or"></i></div></div></div>`,
    `<div class="heater"><div class="azure bend-or chief-argent"><div class="charges on"></div></div></div>`,
    `<div class="heater"><div class="azure"><div class="charges in-pale"></div></div></div>`,
    `<div class="charges between"></div>`,
    `<div class="heater"><div class="azure fess-engrailed-or"><div class="charges between"></div></div></div>`,
    `<div class="heater"><div class="gules chevron-ermine"><div class="charges on"></div></div></div>`,
    `<div class="heater"><div class="gules bend-invected-erminois"><div class="charges on"></div></div></div>`,
  ],
  invalid: [
    {
      code: `<div class="heater"><div class="azure"><div class="charges between"></div></div></div>`,
      errors: [missing("between")],
    },
    {
      code: `<div class="heater"><div class="azure chief-or"><div class="charges between"></div></div></div>`,
      errors: [missing("between")],
    },
    {
      code: `<div class="heater"><div class="azure bordure-or"><div class="charges on"></div></div></div>`,
      errors: [missing("on")],
    },
  ],
  jsxOnly: {
    valid: [
      `<Shield><div className="charges between" /></Shield>`,
      `<div className={field}><div className="charges between" /></div>`,
    ],
  },
});
