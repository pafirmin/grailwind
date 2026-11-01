import rule from "../src/rules/modifier-needs-target.js";
import { run } from "./run.js";

const noDivision = (cls) => ({ messageId: "noDivision", data: { cls } });
const noOrdinary = (cls) => ({ messageId: "noOrdinary", data: { cls } });

run("modifier-needs-target", rule, {
  valid: [
    `<div class="escutcheon per-pale-argent-gules chevron-counterchanged"></div>`,
    `<div class="escutcheon quarterly-or-gules chief-counterchanged"></div>`,
    `<div class="escutcheon gules cross-azure fimbriated-argent"></div>`,
    `<div class="escutcheon or chevron-sable chief-azure fimbriated-argent"></div>`,
    `<div class="escutcheon per-pale-argent-gules"><div class="charges counterchanged"><i class="roundel"></i></div></div>`,
    `<div class="escutcheon per-bend-or-vert"><div class="charges"><i class="mullet counterchanged"></i></div></div>`,
    // A plain field is fine for charges that aren't counterchanged.
    `<div class="escutcheon azure"><div class="charges"><i class="mullet or"></i></div></div>`,
    // The top level of a file may be inside a divided field elsewhere.
    `<div class="charges counterchanged"><i class="roundel"></i></div>`,
  ],
  invalid: [
    {
      code: `<div class="escutcheon azure chevron-counterchanged"></div>`,
      errors: [
        {
          message:
            "`chevron-counterchanged` needs a divided field to swap, e.g. `per-pale-argent-gules`",
        },
      ],
    },
    {
      // The grid layout divides the shield into quarters, but publishes no swap.
      code: `<div class="escutcheon per-pale chief-counterchanged"><div class="or"></div><div class="gules"></div></div>`,
      errors: [noDivision("chief-counterchanged")],
    },
    {
      code: `<div class="escutcheon azure"><div class="charges counterchanged"><i class="roundel"></i></div></div>`,
      errors: [noDivision("counterchanged")],
    },
    {
      code: `<div class="escutcheon azure"><div class="charges"><i class="mullet counterchanged"></i><i class="mullet or"></i></div></div>`,
      errors: [noDivision("counterchanged")],
    },
    {
      code: `<div class="escutcheon azure fimbriated-argent"></div>`,
      errors: [{ message: "`fimbriated-argent` needs a tinctured ordinary other than a chief" }],
    },
    {
      code: `<div class="escutcheon azure chief-or fimbriated-argent"></div>`,
      errors: [noOrdinary("fimbriated-argent")],
    },
    {
      code: `<div class="escutcheon per-pale-or-gules chevron-counterchanged fimbriated-argent"></div>`,
      errors: [noOrdinary("fimbriated-argent")],
    },
  ],
  jsxOnly: {
    valid: [
      `<Shield><div className="charges counterchanged"><i className="roundel" /></div></Shield>`,
      `<div className={field}><div className="charges counterchanged"><i className="roundel" /></div></div>`,
    ],
  },
});
