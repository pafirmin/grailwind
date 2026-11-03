import rule from "../src/rules/modifier-needs-target.js";
import { run } from "./run.js";

const noDivision = (cls) => ({ messageId: "noDivision", data: { cls } });
const noOrdinary = (cls) => ({ messageId: "noOrdinary", data: { cls } });
const transformed = (cls) => ({ messageId: "transformed", data: { cls } });

run("modifier-needs-target", rule, {
  valid: [
    `<div class="escutcheon per-pale-argent-gules chevron-counterchanged"></div>`,
    `<div class="escutcheon quarterly-or-gules chief-counterchanged"></div>`,
    `<div class="escutcheon barry-argent-gules fess-counterchanged"></div>`,
    `<div class="escutcheon paly-of-eight-or-azure"><div class="charges counterchanged"><i class="roundel"></i></div></div>`,
    `<div class="escutcheon gules cross-azure fimbriated-argent"></div>`,
    `<div class="escutcheon or chevron-sable chief-azure fimbriated-argent"></div>`,
    `<div class="escutcheon gules pile-azure fimbriated-argent"></div>`,
    `<div class="escutcheon per-pale-argent-gules"><div class="charges counterchanged"><i class="roundel"></i></div></div>`,
    `<div class="escutcheon per-bend-or-vert"><div class="charges"><i class="mullet counterchanged"></i></div></div>`,
    // A plain field is fine for charges that aren't counterchanged.
    `<div class="escutcheon azure"><div class="charges"><i class="mullet or"></i></div></div>`,
    // The top level of a file may be inside a divided field elsewhere.
    `<div class="charges counterchanged"><i class="roundel"></i></div>`,
    // A fur division is divided.
    `<div class="escutcheon per-pale-ermine-gules chevron-counterchanged"></div>`,
    `<div class="escutcheon quarterly-azure-ermine"><div class="charges counterchanged"><i class="roundel"></i></div></div>`,
    // A transform is fine on a charge that isn't counterchanged, and variants are ignored.
    `<div class="escutcheon per-pale-or-gules"><div class="charges"><i class="mullet azure rotate-45"></i></div></div>`,
    `<div class="escutcheon per-pale-or-gules"><div class="charges"><i class="mullet counterchanged hover:rotate-45"></i></div></div>`,
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
      errors: [
        {
          message:
            "`fimbriated-argent` needs a plain tinctured ordinary to edge: a chief, and an engrailed, invected, fur or counterchanged ordinary, aren't fimbriated",
        },
      ],
    },
    {
      code: `<div class="escutcheon azure chief-or fimbriated-argent"></div>`,
      errors: [noOrdinary("fimbriated-argent")],
    },
    {
      code: `<div class="escutcheon per-pale-or-gules chevron-counterchanged fimbriated-argent"></div>`,
      errors: [noOrdinary("fimbriated-argent")],
    },

    {
      code: `<div class="escutcheon gules fess-engrailed-or fimbriated-argent"></div>`,
      errors: [noOrdinary("fimbriated-argent")],
    },
    {
      code: `<div class="escutcheon gules pile-engrailed-azure fimbriated-argent"></div>`,
      errors: [noOrdinary("fimbriated-argent")],
    },
    {
      code: `<div class="escutcheon gules fess-ermine fimbriated-argent"></div>`,
      errors: [noOrdinary("fimbriated-argent")],
    },
    {
      // A fur field isn't divided.
      code: `<div class="escutcheon ermine chevron-counterchanged"></div>`,
      errors: [noDivision("chevron-counterchanged")],
    },
    {
      code: `<div class="escutcheon per-pale-or-gules"><div class="charges"><i class="mullet counterchanged rotate-45"></i></div></div>`,
      errors: [
        {
          message:
            "`rotate-45` breaks `counterchanged`: a transformed charge shows its own small copy of the field",
        },
      ],
    },
    {
      code: `<div class="escutcheon per-pale-or-gules"><div class="charges counterchanged"><i class="mullet -rotate-12"></i><i class="mullet scale-x-75"></i><i class="mullet"></i></div></div>`,
      errors: [transformed("-rotate-12"), transformed("scale-x-75")],
    },
    {
      code: `<div class="escutcheon per-pale-or-gules"><div class="charges counterchanged"><i class="mullet translate-x-1/2"></i><i class="mullet rotate-[10deg]"></i><i class="mullet skew-y-3"></i></div></div>`,
      errors: [
        transformed("translate-x-1/2"),
        transformed("rotate-[10deg]"),
        transformed("skew-y-3"),
      ],
    },
  ],
  jsxOnly: {
    valid: [
      `<Shield><div className="charges counterchanged"><i className="roundel" /></div></Shield>`,
      `<div className={field}><div className="charges counterchanged"><i className="roundel" /></div></div>`,
    ],
  },
});
