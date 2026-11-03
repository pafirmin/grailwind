import rule from "../src/rules/rule-of-tincture.js";
import { run } from "./run.js";

const error = (message) => ({ message });

run("rule-of-tincture", rule, {
  valid: [
    `<div class="escutcheon or fess-azure"></div>`,
    `<div class="escutcheon azure bordure-argent"></div>`,
    `<div class="escutcheon or chevron-gules chief-azure"></div>`,
    // A divided field has no single tincture.
    `<div class="escutcheon per-pale-or-gules fess-argent"></div>`,
    // The division paints over a bare tincture on the same element.
    `<div class="escutcheon or per-pale-or-gules fess-argent"></div>`,
    `<div class="escutcheon quarterly bend-sable"><div class="or"></div><div class="gules"></div></div>`,
    // Not a tincture, e.g. a Tailwind colour without strict mode.
    `<div class="escutcheon or bordure-red-500"></div>`,
    `<div class="escutcheon azure"><div class="charges"><i class="mullet or"></i></div></div>`,
    `<div class="escutcheon azure"><div class="charges"><i class="bezant"></i></div></div>`,
    `<div class="escutcheon or"><div class="charges"><img class="charge" src="lion.svg" /></div></div>`,
    // Variant-prefixed tinctures are ignored.
    `<div class="escutcheon azure"><div class="charges *:gules"><i class="mullet"></i></div></div>`,
    `<div class="escutcheon azure md:gules fess-or"></div>`,
    `<div class="escutcheon azure bend-or"><div class="charges on"><i class="lozenge gules"></i></div></div>`,
    // A charge at a chief point sits on the chief, not the field.
    `<div class="escutcheon or chief-azure"><div class="charges"><i class="mullet argent in-chief"></i></div></div>`,
    // Charges at other points stay on the field.
    `<div class="escutcheon gules chief-or"><div class="charges"><i class="mullet or in-base"></i></div></div>`,
    // Counterchanged ordinaries and charges have no tincture of their own.
    `<div class="escutcheon per-pale-argent-gules chevron-counterchanged"></div>`,
    `<div class="escutcheon per-pale-or-argent bend-counterchanged"><div class="charges on"><i class="mullet or"></i></div></div>`,
    `<div class="escutcheon per-pale-argent-gules"><div class="charges counterchanged"><i class="bezant"></i></div></div>`,
    `<div class="escutcheon or"><div class="charges"><i class="mullet argent counterchanged"></i></div></div>`,
    // Fimbriation separates the ordinary from the field; each pair that touches is checked.
    `<div class="escutcheon gules cross-azure fimbriated-argent"></div>`,
    `<div class="escutcheon vert saltire-gules fimbriated-or"></div>`,
    // A counterchanged ordinary isn't fimbriated, so the fimbriation touches nothing.
    `<div class="escutcheon or chevron-counterchanged fimbriated-argent"></div>`,
    // The chief isn't fimbriated, so it is still checked against the field only.
    `<div class="escutcheon gules chevron-azure chief-or fimbriated-argent"></div>`,
    // `on` with no ordinary falls back to the field.
    `<div class="escutcheon azure"><div class="charges on"><i class="mullet or"></i></div></div>`,
    `<div class="escutcheon azure fess-engrailed-or"></div>`,
    `<div class="escutcheon azure chief-invected-argent"></div>`,
    // Furs count by their ground: ermine and erminois as metals, ermines and pean as colours.
    `<div class="escutcheon ermines fess-argent"></div>`,
    `<div class="escutcheon azure chief-ermine"></div>`,
    `<div class="escutcheon gules cross-engrailed-erminois"></div>`,
    `<div class="escutcheon pean bend-or"></div>`,
    `<div class="escutcheon gules"><div class="charges"><i class="mullet ermine"></i></div></div>`,
    `<div class="escutcheon azure fess-ermine"><div class="charges on"><i class="mullet gules"></i></div></div>`,
    `<div class="escutcheon per-pale-ermine-gules fess-or"></div>`,
    // Engrailed and fur ordinaries aren't fimbriated, so the fimbriation touches nothing.
    `<div class="escutcheon gules fess-ermine fimbriated-gules"></div>`,
    `<div class="escutcheon azure fess-engrailed-or fimbriated-azure"></div>`,
    { code: `<div class="escutcheon ermine fess-argent"></div>`, options: [{ furs: "exempt" }] },
    {
      code: `<div class="escutcheon ermine fess-argent"></div>`,
      options: [{ furs: { ermine: "colour" } }],
    },
    {
      code: `<div class="escutcheon erminois fess-or"></div>`,
      options: [{ furs: { erminois: "exempt" } }],
    },
    // Two exempt furs aren't the same kind as each other.
    {
      code: `<div class="escutcheon ermine fess-erminois"></div>`,
      options: [{ furs: { ermine: "exempt", erminois: "exempt" } }],
    },
  ],
  invalid: [
    {
      code: `<div class="escutcheon or fess-argent"></div>`,
      errors: [error("`fess-argent` puts a fess Argent on Or: metal on metal")],
    },
    {
      code: `<div class="escutcheon gules bordure-azure"></div>`,
      errors: [error("`bordure-azure` puts a bordure Azure on Gules: colour on colour")],
    },
    {
      code: `<div class="escutcheon argent chief-or"></div>`,
      errors: [error("`chief-or` puts a chief Or on Argent: metal on metal")],
    },
    {
      code: `<div class="escutcheon vert bend-sinister-sable"></div>`,
      errors: [error("`bend-sinister-sable` puts a bend sinister Sable on Vert: colour on colour")],
    },
    {
      code: `<div class="escutcheon azure"><div class="charges"><i class="mullet gules"></i></div></div>`,
      errors: [error("`gules` puts a mullet Gules on Azure: colour on colour")],
    },
    {
      code: `<div class="escutcheon or"><div class="charges"><i class="bezant"></i></div></div>`,
      errors: [error("`bezant` puts a bezant Or on Or: metal on metal")],
    },
    {
      code: `<div class="escutcheon azure"><div class="charges"><i class="annulet sable"></i></div></div>`,
      errors: [error("`sable` puts an annulet Sable on Azure: colour on colour")],
    },
    {
      // Against the bend, not the field.
      code: `<div class="escutcheon azure bend-or"><div class="charges on"><i class="lozenge argent"></i></div></div>`,
      errors: [error("`argent` puts a lozenge Argent on Or: metal on metal")],
    },
    {
      code: `<div class="escutcheon or chief-azure"><div class="charges"><i class="mullet gules in-chief"></i></div></div>`,
      errors: [error("`gules` puts a mullet Gules on Azure: colour on colour")],
    },
    {
      // Children of a `charges` container are charges even without a shape class.
      code: `<div class="escutcheon azure"><div class="charges"><span class="gules"></span></div></div>`,
      errors: [error("`gules` puts a charge Gules on Azure: colour on colour")],
    },
    {
      // The fimbriation touches the field.
      code: `<div class="escutcheon or chevron-sable fimbriated-argent"></div>`,
      errors: [error("`fimbriated-argent` puts a fimbriation Argent on Or: metal on metal")],
    },
    {
      // Reported once, however many ordinaries share the fimbriation.
      code: `<div class="escutcheon or chevron-sable fess-sable fimbriated-argent"></div>`,
      errors: [error("`fimbriated-argent` puts a fimbriation Argent on Or: metal on metal")],
    },
    {
      // The ordinary touches its fimbriation.
      code: `<div class="escutcheon or cross-gules fimbriated-azure"></div>`,
      errors: [error("`cross-gules` puts a cross Gules on Azure: colour on colour")],
    },
    {
      code: `<div class="per-pale"><div class="or fess-argent"></div><div class="gules"></div></div>`,
      errors: [error("`fess-argent` puts a fess Argent on Or: metal on metal")],
    },

    {
      code: `<div class="escutcheon or fess-engrailed-argent"></div>`,
      errors: [error("`fess-engrailed-argent` puts a fess engrailed Argent on Or: metal on metal")],
    },
    {
      code: `<div class="escutcheon argent chief-invected-or"></div>`,
      errors: [error("`chief-invected-or` puts a chief invected Or on Argent: metal on metal")],
    },
    {
      // Not fimbriated, so checked against the field.
      code: `<div class="escutcheon or fess-engrailed-argent fimbriated-gules"></div>`,
      errors: [error("`fess-engrailed-argent` puts a fess engrailed Argent on Or: metal on metal")],
    },
    {
      code: `<div class="escutcheon ermine fess-argent"></div>`,
      errors: [
        error(
          "`fess-argent` puts a fess Argent on Ermine: metal on metal (ermine counts as a metal)",
        ),
      ],
    },
    {
      code: `<div class="escutcheon or fess-ermine"></div>`,
      errors: [
        error("`fess-ermine` puts a fess Ermine on Or: metal on metal (ermine counts as a metal)"),
      ],
    },
    {
      code: `<div class="escutcheon azure chief-pean"></div>`,
      errors: [
        error(
          "`chief-pean` puts a chief Pean on Azure: colour on colour (pean counts as a colour)",
        ),
      ],
    },
    {
      code: `<div class="escutcheon ermine fess-engrailed-erminois"></div>`,
      errors: [
        error(
          "`fess-engrailed-erminois` puts a fess engrailed Erminois on Ermine: metal on metal (ermine and erminois count as metals)",
        ),
      ],
    },
    {
      code: `<div class="escutcheon gules"><div class="charges"><i class="mullet ermines"></i></div></div>`,
      errors: [
        error(
          "`ermines` puts a mullet Ermines on Gules: colour on colour (ermines counts as a colour)",
        ),
      ],
    },
    {
      // Against the fur fess, not the field.
      code: `<div class="escutcheon azure fess-ermine"><div class="charges on"><i class="mullet argent"></i></div></div>`,
      errors: [
        error("`argent` puts a mullet Argent on Ermine: metal on metal (ermine counts as a metal)"),
      ],
    },
    {
      // Charges on an engrailed ordinary.
      code: `<div class="escutcheon azure bend-engrailed-or"><div class="charges on"><i class="mullet argent"></i></div></div>`,
      errors: [error("`argent` puts a mullet Argent on Or: metal on metal")],
    },
    {
      code: `<div class="escutcheon pean fess-sable"></div>`,
      options: [{ furs: "ground" }],
      errors: [
        error("`fess-sable` puts a fess Sable on Pean: colour on colour (pean counts as a colour)"),
      ],
    },
    {
      // A fur missing from the map counts by its ground.
      code: `<div class="escutcheon ermine fess-argent"></div>`,
      options: [{ furs: { erminois: "exempt" } }],
      errors: [{ messageId: "violation" }],
    },
    {
      code: `<div class="escutcheon ermine fess-azure"></div>`,
      options: [{ furs: { ermine: "colour" } }],
      errors: [
        error(
          "`fess-azure` puts a fess Azure on Ermine: colour on colour (ermine counts as a colour)",
        ),
      ],
    },
  ],
  jsxOnly: {
    valid: [
      // Dynamic classes are unknown.
      `<div className={"escutcheon " + field}><div className="charges"><i className="mullet or" /></div></div>`,
      `<div className={\`escutcheon \${field} fess-argent\`} />`,
      `<div {...props} className="escutcheon or fess-argent" />`,
      // Charges inside a component, or an expression, can't be seen.
      `<Shield className="escutcheon or"><div className="charges"><i className="mullet argent" /></div></Shield>`,
      `<div className="escutcheon or"><div className="charges">{items.map(() => <i className="mullet argent" />)}</div></div>`,
    ],
    invalid: [
      {
        code: "<div className={`escutcheon or fess-argent`} />",
        errors: [error("`fess-argent` puts a fess Argent on Or: metal on metal")],
      },
      {
        // Fragments don't render an element.
        code: `<div className="escutcheon azure"><div className="charges"><><i className="mullet gules" /></></div></div>`,
        errors: [error("`gules` puts a mullet Gules on Azure: colour on colour")],
      },
    ],
  },
});
