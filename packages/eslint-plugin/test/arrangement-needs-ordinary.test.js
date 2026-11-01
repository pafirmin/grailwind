import rule from "../src/rules/arrangement-needs-ordinary.js";
import { run } from "./run.js";

const missing = (arrangement) => ({ messageId: "missing", data: { arrangement } });

run("arrangement-needs-ordinary", rule, {
  valid: [
    `<div class="escutcheon azure chevron-or"><div class="charges between"><i class="mullet or"></i></div></div>`,
    `<div class="escutcheon azure bend-or chief-argent"><div class="charges on"></div></div>`,
    `<div class="escutcheon azure"><div class="charges in-pale"></div></div>`,
    `<div class="charges between"></div>`,
  ],
  invalid: [
    {
      code: `<div class="escutcheon azure"><div class="charges between"></div></div>`,
      errors: [missing("between")],
    },
    {
      code: `<div class="escutcheon azure chief-or"><div class="charges between"></div></div>`,
      errors: [missing("between")],
    },
    {
      code: `<div class="escutcheon azure bordure-or"><div class="charges on"></div></div>`,
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
