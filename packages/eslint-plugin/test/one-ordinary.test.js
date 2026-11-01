import rule from "../src/rules/one-ordinary.js";
import { run } from "./run.js";

run("one-ordinary", rule, {
  valid: [
    `<div class="escutcheon or chevron-gules chief-azure"></div>`,
    `<div class="escutcheon or fess-gules bordure-azure"></div>`,
    `<div class="charges in-pale"><i class="mullet in-chief"></i></div>`,
    `<div class="charges between"></div>`,
    // Only a `charges` container is arranged.
    `<div class="between on"></div>`,
  ],
  invalid: [
    {
      code: `<div class="escutcheon or fess-azure chevron-gules"></div>`,
      errors: [
        { message: "`fess-azure` and `chevron-gules` both draw an ordinary; only one will show." },
      ],
    },
    {
      code: `<div class="escutcheon or bend-or bend-sable"></div>`,
      errors: [{ messageId: "ordinaries" }],
    },
    {
      code: `<div class="escutcheon or chief-or chief-azure"></div>`,
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
  ],
});
