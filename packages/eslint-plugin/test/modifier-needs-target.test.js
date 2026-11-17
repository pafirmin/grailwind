import rule from "../src/rules/modifier-needs-target.js";
import { run } from "./run.js";

const noDivision = (cls) => ({ messageId: "noDivision", data: { cls } });
const noOrdinary = (cls) => ({ messageId: "noOrdinary", data: { cls } });
const noCotisable = (cls) => ({ messageId: "noCotisable", data: { cls } });
const transformed = (cls) => ({ messageId: "transformed", data: { cls } });

run("modifier-needs-target", rule, {
  valid: [
    // POWER: an ordinary over all on a child of the field, plain or in a divided field.
    `<div class="heater"><div class="argent two-bars-wavy-sable"><div class="over-all bend-or"></div></div></div>`,
    `<div class="heater"><div class="quarterly"><div class="or"></div><div class="gules"></div><div class="over-all bend-argent"></div></div></div>`,
    `<div class="heater"><div class="per-pale-argent-gules chevron-counterchanged"></div></div>`,
    `<div class="heater"><div class="quarterly-or-gules chief-counterchanged"></div></div>`,
    `<div class="heater"><div class="barry-argent-gules fess-counterchanged"></div></div>`,
    `<div class="heater"><div class="per-pale-or-gules cross-voided-counterchanged"></div></div>`,
    `<div class="heater"><div class="paly-of-eight-or-azure"><div class="charges counterchanged"><i class="roundel"></i></div></div></div>`,
    `<div class="heater"><div class="bendy-sinister-of-eight-or-azure chevron-counterchanged"></div></div>`,
    `<div class="heater"><div class="gules cross-azure fimbriated-argent"></div></div>`,
    `<div class="heater"><div class="or chevron-sable chief-azure fimbriated-argent"></div></div>`,
    `<div class="heater"><div class="gules pile-azure fimbriated-argent"></div></div>`,
    `<div class="heater"><div class="per-pale-argent-gules"><div class="charges counterchanged"><i class="roundel"></i></div></div></div>`,
    `<div class="heater"><div class="per-bend-or-vert"><div class="charges"><i class="mullet counterchanged"></i></div></div></div>`,
    `<div class="heater"><div class="azure bend-argent cotised-or"></div></div>`,
    `<div class="heater"><div class="or fess-azure double-cotised"></div></div>`,
    `<div class="heater"><div class="azure chevron-reversed-argent double-cotised-of-the-first"></div></div>`,
    // Grailwind draws these without their cotises, but they're cotisable in heraldry.
    `<div class="heater"><div class="ermine fess-engrailed-gules cotised-sable"></div></div>`,
    `<div class="heater"><div class="gules bend-ermine cotised"></div></div>`,
    `<div class="heater"><div class="gules cross-voided-or double-cotised"></div></div>`,
    `<div class="heater"><div class="gules fess-chequy-or-azure cotised-argent"></div></div>`,
    `<div class="heater"><div class="per-pale-or-gules saltire-counterchanged cotised"></div></div>`,
    `<div class="heater"><div class="gules bend-or fimbriated-argent cotised-argent"></div></div>`,
    `<div class="heater"><div class="azure pall-argent double-cotised"></div></div>`,
    `<div class="heater"><div class="vert pile-reversed-or cotised-argent"></div></div>`,
    // Grailwind doesn't cotise the diminutives or two and three bars, but heraldry allows it.
    `<div class="heater"><div class="azure bendlet-argent cotised-or"></div></div>`,
    `<div class="heater"><div class="gules three-bars-or double-cotised"></div></div>`,
    // A chief beside a cotisable ordinary: the cotises are the ordinary's.
    `<div class="heater"><div class="azure fess-argent chief-or cotised"></div></div>`,
    // A plain field is fine for charges that aren't counterchanged.
    `<div class="heater"><div class="azure"><div class="charges"><i class="mullet or"></i></div></div></div>`,
    // The top level of a file may be inside a divided field elsewhere.
    `<div class="charges counterchanged"><i class="roundel"></i></div>`,
    // A fur division is divided.
    `<div class="heater"><div class="per-pale-ermine-gules chevron-counterchanged"></div></div>`,
    `<div class="heater"><div class="quarterly-azure-ermine"><div class="charges counterchanged"><i class="roundel"></i></div></div></div>`,
    // A transform is fine on a charge that isn't counterchanged, and variants are ignored.
    `<div class="heater"><div class="per-pale-or-gules"><div class="charges"><i class="mullet azure rotate-45"></i></div></div></div>`,
    `<div class="heater"><div class="per-pale-or-gules"><div class="charges"><i class="mullet counterchanged hover:rotate-45"></i></div></div></div>`,
  ],
  invalid: [
    {
      code: `<div class="heater"><div class="argent"><div class="over-all"></div></div></div>`,
      errors: [{ messageId: "overAll" }],
    },
    {
      code: `<div class="heater"><div class="argent"><div class="over-all chief-or"></div></div></div>`,
      errors: [{ messageId: "overAllChief" }],
    },
    {
      code: `<div class="heater"><div class="argent over-all bend-gules"></div></div>`,
      errors: [{ messageId: "overAll" }],
    },
    {
      code: `<div class="heater"><div class="azure chevron-counterchanged"></div></div>`,
      errors: [
        {
          message:
            "`chevron-counterchanged` needs a divided field to swap, e.g. `per-pale-argent-gules`",
        },
      ],
    },
    {
      // The grid layout divides the shield into quarters, but publishes no swap.
      code: `<div class="heater"><div class="per-pale chief-counterchanged"><div class="or"></div><div class="gules"></div></div></div>`,
      errors: [noDivision("chief-counterchanged")],
    },
    {
      code: `<div class="heater"><div class="azure"><div class="charges counterchanged"><i class="roundel"></i></div></div></div>`,
      errors: [noDivision("counterchanged")],
    },
    {
      code: `<div class="heater"><div class="azure"><div class="charges"><i class="mullet counterchanged"></i><i class="mullet or"></i></div></div></div>`,
      errors: [noDivision("counterchanged")],
    },
    {
      code: `<div class="heater"><div class="azure fimbriated-argent"></div></div>`,
      errors: [
        {
          message:
            "`fimbriated-argent` needs a plain tinctured ordinary to edge: a chief, and an engrailed, invected, wavy, indented, embattled, fur, chequy or counterchanged ordinary, aren't fimbriated",
        },
      ],
    },
    {
      code: `<div class="heater"><div class="azure chief-or fimbriated-argent"></div></div>`,
      errors: [noOrdinary("fimbriated-argent")],
    },
    {
      code: `<div class="heater"><div class="per-pale-or-gules chevron-counterchanged fimbriated-argent"></div></div>`,
      errors: [noOrdinary("fimbriated-argent")],
    },

    {
      code: `<div class="heater"><div class="gules fess-engrailed-or fimbriated-argent"></div></div>`,
      errors: [noOrdinary("fimbriated-argent")],
    },
    {
      code: `<div class="heater"><div class="gules fess-wavy-or fimbriated-argent"></div></div>`,
      errors: [noOrdinary("fimbriated-argent")],
    },
    {
      code: `<div class="heater"><div class="gules fess-embattled-or fimbriated-argent"></div></div>`,
      errors: [noOrdinary("fimbriated-argent")],
    },
    {
      code: `<div class="heater"><div class="gules pile-engrailed-azure fimbriated-argent"></div></div>`,
      errors: [noOrdinary("fimbriated-argent")],
    },
    {
      code: `<div class="heater"><div class="gules fess-chequy-or-azure fimbriated-argent"></div></div>`,
      errors: [noOrdinary("fimbriated-argent")],
    },
    {
      code: `<div class="heater"><div class="gules fess-ermine fimbriated-argent"></div></div>`,
      errors: [noOrdinary("fimbriated-argent")],
    },
    {
      code: `<div class="heater"><div class="gules cross-voided-or fimbriated-argent"></div></div>`,
      errors: [noOrdinary("fimbriated-argent")],
    },
    {
      code: `<div class="heater"><div class="azure cotised-or"></div></div>`,
      errors: [
        {
          message:
            "`cotised-or` needs an ordinary to cotise: a cotise never stands alone, and a chief is never cotised",
        },
      ],
    },
    {
      code: `<div class="heater"><div class="azure chief-or cotised"></div></div>`,
      errors: [noCotisable("cotised")],
    },
    {
      // A fur field isn't divided.
      code: `<div class="heater"><div class="ermine chevron-counterchanged"></div></div>`,
      errors: [noDivision("chevron-counterchanged")],
    },
    {
      code: `<div class="heater"><div class="gules saltire-voided-counterchanged"></div></div>`,
      errors: [noDivision("saltire-voided-counterchanged")],
    },
    {
      code: `<div class="heater"><div class="per-pale-or-gules cross-voided-counterchanged fimbriated-argent"></div></div>`,
      errors: [noOrdinary("fimbriated-argent")],
    },
    {
      code: `<div class="heater"><div class="per-pale-or-gules"><div class="charges"><i class="mullet counterchanged rotate-45"></i></div></div></div>`,
      errors: [
        {
          message:
            "`rotate-45` breaks `counterchanged`: a transformed charge shows its own small copy of the field",
        },
      ],
    },
    {
      code: `<div class="heater"><div class="per-pale-or-gules"><div class="charges counterchanged"><i class="mullet -rotate-12"></i><i class="mullet scale-x-75"></i><i class="mullet"></i></div></div></div>`,
      errors: [transformed("-rotate-12"), transformed("scale-x-75")],
    },
    {
      code: `<div class="heater"><div class="per-pale-or-gules"><div class="charges counterchanged"><i class="mullet translate-x-1/2"></i><i class="mullet rotate-[10deg]"></i><i class="mullet skew-y-3"></i></div></div></div>`,
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
