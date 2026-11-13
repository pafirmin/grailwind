import rule from "../src/rules/one-ordinary.js";
import { run } from "./run.js";

run("one-ordinary", rule, {
  valid: [
    `<div class="heater"><div class="or chevron-gules chief-azure"></div></div>`,
    `<div class="heater"><div class="or fess-gules bordure-azure"></div></div>`,
    `<div class="charges in-pale"><i class="mullet in-chief-point"></i></div>`,
    `<div class="charges between"></div>`,
    // Only a `charges` container is arranged.
    `<div class="between on"></div>`,
    `<div class="heater"><div class="or fess-engrailed-gules chief-ermine"></div></div>`,
    // Pointed charges on their own, or in their own container.
    `<div class="charges"><i class="mullet in-dexter-chief"></i><i class="mullet in-sinister-chief"></i></div>`,
    `<div class="heater"><div class="azure"><div class="charges"><i class="mullet"></i><i class="mullet"></i></div><div class="charges"><i class="crescent in-dexter-chief"></i></div></div></div>`,
  ],
  invalid: [
    {
      code: `<div class="heater"><div class="or fess-azure chevron-gules"></div></div>`,
      errors: [
        { message: "`fess-azure` and `chevron-gules` both draw an ordinary; only one will show." },
      ],
    },
    {
      code: `<div class="heater"><div class="or bend-or bend-sable"></div></div>`,
      errors: [{ messageId: "ordinaries" }],
    },
    {
      code: `<div class="heater"><div class="azure cross-voided-or fess-gules"></div></div>`,
      errors: [{ messageId: "ordinaries" }],
    },
    {
      code: `<div class="heater"><div class="azure pile-reversed-or chevron-reversed-engrailed-gules"></div></div>`,
      errors: [{ messageId: "ordinaries" }],
    },
    {
      code: `<div class="heater"><div class="or chief-or chief-azure"></div></div>`,
      errors: [{ message: "`chief-or` and `chief-azure` both draw a chief; only one will show" }],
    },
    {
      code: `<div class="charges between on"></div>`,
      errors: [{ message: "`between` and `on` both place these charges" }],
    },
    {
      code: `<div class="charges on in-fess"></div>`,
      errors: [{ messageId: "arrangements" }],
    },
    {
      code: `<div class="charges in-chief in-pale"></div>`,
      errors: [{ message: "`in-pale` and `in-chief` both place these charges" }],
    },
    {
      code: `<div class="charges semy in-fess"></div>`,
      errors: [{ message: "`in-fess` and `semy` both place these charges" }],
    },

    {
      code: `<div class="heater"><div class="or fess-engrailed-azure chevron-gules"></div></div>`,
      errors: [{ messageId: "ordinaries" }],
    },
    {
      code: `<div class="heater"><div class="azure fess-ermine bend-invected-or"></div></div>`,
      errors: [{ messageId: "ordinaries" }],
    },
    {
      code: `<div class="heater"><div class="or chief-ermine chief-azure"></div></div>`,
      errors: [{ messageId: "chiefs" }],
    },
    {
      // Three mullets, in dexter chief a crescent: the crescent makes it four.
      code: `<div class="charges"><i class="mullet"></i><i class="mullet"></i><i class="mullet"></i><i class="crescent in-dexter-chief"></i></div>`,
      errors: [
        {
          message:
            "`in-dexter-chief` sets this charge apart from the others in its container; give it a `charges` container of its own",
        },
      ],
    },
    {
      code: `<div class="charges between"><i class="crescent in-chief-point"></i><i class="mullet"></i><i class="mullet"></i></div>`,
      errors: [{ messageId: "pointed" }],
    },
  ],
});
