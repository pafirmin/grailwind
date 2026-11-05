import rule from "../src/rules/charges-in-container.js";
import { run } from "./run.js";

const outside = (charge) => ({ messageId: "outside", data: { charge } });
const arranged = (message) => ({ message });

run("charges-in-container", rule, {
  valid: [
    `<div class="escutcheon azure"><div class="charges"><i class="mullet or"></i></div></div>`,
    `<div class="escutcheon azure"><div class="charges charge-size-20"><i class="bezant"></i></div></div>`,
    // `charge-size-*` is not a charge.
    `<div class="escutcheon azure"><div class="charge-size-20"></div></div>`,
    // The top level of a file may be rendered inside a container elsewhere.
    `<i class="mullet or"></i>`,
    `<div class="escutcheon azure"><div class="charges in-chief"><i class="mullet or in-chief-point"></i></div></div>`,
    // Only a charge in a `charges` container is checked.
    `<div class="escutcheon azure in-chief"></div>`,
  ],
  invalid: [
    {
      code: `<div class="escutcheon azure"><i class="mullet or"></i></div>`,
      errors: [outside("mullet")],
    },
    {
      code: `<div class="escutcheon azure"><i class="plate"></i></div>`,
      errors: [outside("plate")],
    },
    {
      code: `<div class="escutcheon azure"><div class="charges"><span><i class="fleur-de-lis or"></i></span></div></div>`,
      errors: [outside("fleur-de-lis")],
    },
    {
      code: `<div class="escutcheon azure"><div class="charges"><i class="mullet or in-chief"></i></div></div>`,
      errors: [
        arranged(
          "`in-chief` arranges a `charges` container, not a charge; to place one charge, use `in-chief-point`",
        ),
      ],
    },
    {
      code: `<div class="escutcheon azure"><div class="charges"><i class="mullet or in-base"></i></div></div>`,
      errors: [
        arranged(
          "`in-base` arranges a `charges` container, not a charge; to place one charge, use `in-base-point`",
        ),
      ],
    },
    {
      code: `<div class="escutcheon azure"><div class="charges"><i class="mullet or in-pale"></i></div></div>`,
      errors: [arranged("`in-pale` arranges a `charges` container, not a charge")],
    },
    {
      code: `<div class="escutcheon azure"><div class="charges"><i class="mullet or semy"></i></div></div>`,
      errors: [arranged("`semy` arranges a `charges` container, not a charge")],
    },
  ],
  jsxOnly: {
    valid: [
      `<Charges><i className="mullet or" /></Charges>`,
      `<div className={cls}><i className="mullet or" /></div>`,
      `<div className="escutcheon azure">{show && <i className="mullet or" />}</div>`,
    ],
    invalid: [
      {
        code: `<div className="escutcheon azure"><i className="charge-[url(lion.svg)] or" /></div>`,
        errors: [outside("charge")],
      },
    ],
  },
});
