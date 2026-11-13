import rule from "../src/rules/charges-in-container.js";
import { run } from "./run.js";

const outside = (charge) => ({ messageId: "outside", data: { charge } });
const arranged = (message) => ({ message });

run("charges-in-container", rule, {
  valid: [
    `<div class="heater"><div class="azure"><div class="charges"><i class="mullet or"></i></div></div></div>`,
    `<div class="heater"><div class="azure"><div class="charges charge-size-20"><i class="bezant"></i></div></div></div>`,
    // `charge-size-*` is not a charge.
    `<div class="heater"><div class="azure"><div class="charge-size-20"></div></div></div>`,
    // The top level of a file may be rendered inside a container elsewhere.
    `<i class="mullet or"></i>`,
    `<div class="heater"><div class="azure"><div class="charges in-chief"><i class="mullet or in-chief-point"></i></div></div></div>`,
    // Only a charge in a `charges` container is checked.
    `<div class="heater"><div class="azure in-chief"></div></div>`,
  ],
  invalid: [
    {
      code: `<div class="heater"><div class="azure"><i class="mullet or"></i></div></div>`,
      errors: [outside("mullet")],
    },
    {
      code: `<div class="heater"><div class="azure"><i class="plate"></i></div></div>`,
      errors: [outside("plate")],
    },
    {
      code: `<div class="heater"><div class="azure"><div class="charges"><span><i class="fleur-de-lis or"></i></span></div></div></div>`,
      errors: [outside("fleur-de-lis")],
    },
    {
      code: `<div class="heater"><div class="azure"><div class="charges"><i class="mullet or in-chief"></i></div></div></div>`,
      errors: [
        arranged(
          "`in-chief` arranges a `charges` container, not a charge; to place one charge, use `in-chief-point`",
        ),
      ],
    },
    {
      code: `<div class="heater"><div class="azure"><div class="charges"><i class="mullet or in-base"></i></div></div></div>`,
      errors: [
        arranged(
          "`in-base` arranges a `charges` container, not a charge; to place one charge, use `in-base-point`",
        ),
      ],
    },
    {
      code: `<div class="heater"><div class="azure"><div class="charges"><i class="mullet or in-pale"></i></div></div></div>`,
      errors: [arranged("`in-pale` arranges a `charges` container, not a charge")],
    },
    {
      code: `<div class="heater"><div class="azure"><div class="charges"><i class="mullet or semy"></i></div></div></div>`,
      errors: [arranged("`semy` arranges a `charges` container, not a charge")],
    },
  ],
  jsxOnly: {
    valid: [
      `<Charges><i className="mullet or" /></Charges>`,
      `<div className={cls}><i className="mullet or" /></div>`,
      `<div className="heater"><div className="azure">{show && <i className="mullet or" />}</div></div>`,
    ],
    invalid: [
      {
        code: `<div className="heater"><div className="azure"><i className="charge-[url(lion.svg)] or" /></div></div>`,
        errors: [outside("charge")],
      },
    ],
  },
});
