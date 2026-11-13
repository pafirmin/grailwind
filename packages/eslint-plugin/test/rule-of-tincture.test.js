import rule from "../src/rules/rule-of-tincture.js";
import { run } from "./run.js";

const error = (message) => ({ message });

run("rule-of-tincture", rule, {
  valid: [
    `<div class="heater"><div class="or fess-azure"></div></div>`,
    `<div class="heater"><div class="azure bordure-argent"></div></div>`,
    `<div class="heater"><div class="or chevron-gules chief-azure"></div></div>`,
    // A divided field has no single tincture.
    `<div class="heater"><div class="per-pale-or-gules fess-argent"></div></div>`,
    // The division paints over a bare tincture on the same element.
    `<div class="heater"><div class="or per-pale-or-gules fess-argent"></div></div>`,
    `<div class="heater"><div class="quarterly bend-sable"><div class="or"></div><div class="gules"></div></div></div>`,
    // Not a tincture, e.g. a Tailwind colour without strict mode.
    `<div class="heater"><div class="or bordure-red-500"></div></div>`,
    `<div class="heater"><div class="azure"><div class="charges"><i class="mullet or"></i></div></div></div>`,
    `<div class="heater"><div class="azure"><div class="charges"><i class="bezant"></i></div></div></div>`,
    `<div class="heater"><div class="or"><div class="charges"><img class="charge" src="lion.svg" /></div></div></div>`,
    // Variant-prefixed tinctures are ignored.
    `<div class="heater"><div class="azure"><div class="charges *:gules"><i class="mullet"></i></div></div></div>`,
    `<div class="heater"><div class="azure md:gules fess-or"></div></div>`,
    `<div class="heater"><div class="azure bend-or"><div class="charges on"><i class="lozenge gules"></i></div></div></div>`,
    // A charge at a chief point sits on the chief, not the field.
    `<div class="heater"><div class="or chief-azure"><div class="charges"><i class="mullet argent in-chief-point"></i></div></div></div>`,
    // So do charges arranged in chief.
    `<div class="heater"><div class="or chief-azure"><div class="charges in-chief"><i class="mullet argent"></i><i class="mullet argent"></i></div></div></div>`,
    // Charges at other points stay on the field.
    `<div class="heater"><div class="gules chief-or"><div class="charges"><i class="mullet or in-base-point"></i></div></div></div>`,
    `<div class="heater"><div class="gules chief-or"><div class="charges in-base"><i class="mullet or"></i></div></div></div>`,
    // Counterchanged ordinaries and charges have no tincture of their own.
    `<div class="heater"><div class="per-pale-argent-gules chevron-counterchanged"></div></div>`,
    `<div class="heater"><div class="per-pale-or-argent bend-counterchanged"><div class="charges on"><i class="mullet or"></i></div></div></div>`,
    `<div class="heater"><div class="per-pale-argent-gules"><div class="charges counterchanged"><i class="bezant"></i></div></div></div>`,
    `<div class="heater"><div class="or"><div class="charges"><i class="mullet argent counterchanged"></i></div></div></div>`,
    // Fimbriation separates the ordinary from the field; each pair that touches is checked.
    `<div class="heater"><div class="gules cross-azure fimbriated-argent"></div></div>`,
    `<div class="heater"><div class="vert saltire-gules fimbriated-or"></div></div>`,
    // A counterchanged ordinary isn't fimbriated, so the fimbriation touches nothing.
    `<div class="heater"><div class="or chevron-counterchanged fimbriated-argent"></div></div>`,
    // The chief isn't fimbriated, so it is still checked against the field only.
    `<div class="heater"><div class="gules chevron-azure chief-or fimbriated-argent"></div></div>`,
    // `on` with no ordinary falls back to the field.
    `<div class="heater"><div class="azure"><div class="charges on"><i class="mullet or"></i></div></div></div>`,
    `<div class="heater"><div class="azure fess-engrailed-or"></div></div>`,
    `<div class="heater"><div class="azure chief-invected-argent"></div></div>`,
    // Furs count by their ground: ermine and erminois as metals, ermines and pean as colours.
    `<div class="heater"><div class="ermines fess-argent"></div></div>`,
    `<div class="heater"><div class="azure chief-ermine"></div></div>`,
    `<div class="heater"><div class="gules cross-engrailed-erminois"></div></div>`,
    `<div class="heater"><div class="pean bend-or"></div></div>`,
    `<div class="heater"><div class="gules"><div class="charges"><i class="mullet ermine"></i></div></div></div>`,
    `<div class="heater"><div class="azure fess-ermine"><div class="charges on"><i class="mullet gules"></i></div></div></div>`,
    `<div class="heater"><div class="per-pale-ermine-gules fess-or"></div></div>`,
    // Engrailed and fur ordinaries aren't fimbriated, so the fimbriation touches nothing.
    `<div class="heater"><div class="gules fess-ermine fimbriated-gules"></div></div>`,
    `<div class="heater"><div class="azure fess-engrailed-or fimbriated-azure"></div></div>`,
    // The vair family has no single ground, so it isn't checked by default.
    `<div class="heater"><div class="vair chief-or"></div></div>`,
    `<div class="heater"><div class="vair chief-gules"></div></div>`,
    `<div class="heater"><div class="vairy-or-gules fess-azure"></div></div>`,
    `<div class="heater"><div class="gules fess-counter-potent"></div></div>`,
    // `cross-potent` is the charge, not a cross of the fur potent.
    {
      code: `<div class="heater"><div class="azure fess-or"><div class="charges on"><i class="cross-potent gules"></i></div></div></div>`,
      options: [{ furs: { potent: "colour" } }],
    },
    {
      code: `<div class="heater"><div class="ermine fess-argent"></div></div>`,
      options: [{ furs: "exempt" }],
    },
    {
      code: `<div class="heater"><div class="ermine fess-argent"></div></div>`,
      options: [{ furs: { ermine: "colour" } }],
    },
    {
      code: `<div class="heater"><div class="erminois fess-or"></div></div>`,
      options: [{ furs: { erminois: "exempt" } }],
    },
    // Two exempt furs aren't the same kind as each other.
    {
      code: `<div class="heater"><div class="ermine fess-erminois"></div></div>`,
      options: [{ furs: { ermine: "exempt", erminois: "exempt" } }],
    },
    // Of the first: the shield's first tincture, not a canton's own field.
    `<div class="heater"><div class="argent"><div class="canton gules"><div class="charges"><i class="mullet of-the-first"></i></div></div></div></div>`,
    `<div class="heater"><div class="per-pale-or-azure bend-of-the-first"></div></div>`,
    `<div class="heater"><div class="per-pale-or-azure bend-of-the-first"><div class="charges on"><i class="mullet azure"></i></div></div></div>`,
    `<div class="heater"><div class="gules fess-or"><div class="charges on"><i class="mullet of-the-first"></i></div></div></div>`,
    // Each quarter starts its own count.
    `<div class="heater"><div class="quarterly"><div class="gules fess-argent"><div class="charges on"><i class="mullet of-the-first"></i></div></div><div class="or"></div></div></div>`,
    // A fur first is that fur, as in the blazon.
    `<div class="heater"><div class="per-pale-ermine-azure"><div class="charges"><i class="mullet of-the-first"></i></div></div></div>`,
    `<div class="heater"><div class="ermine"><div class="canton of-the-first"><div class="charges"><i class="mullet gules"></i></div></div></div></div>`,
    // A canton or inescutcheon with anything on it looks like arms of its own.
    `<div class="heater"><div class="argent"><div class="canton or"><div class="charges"><i class="mullet gules"></i></div></div></div></div>`,
    `<div class="heater"><div class="argent"><div class="canton argent cross-gules"></div></div></div>`,
    `<div class="heater"><div class="argent"><div class="canton per-pale-or-gules"></div></div></div>`,
    `<div class="heater"><div class="argent"><div class="inescutcheon"><div class="or bend-gules"></div></div></div></div>`,
    `<div class="heater"><div class="or"><div class="inescutcheon"><div class="azure"></div></div></div></div>`,
    // An inescutcheon's charges of the first take the shield's first, not its own.
    `<div class="heater"><div class="or"><div class="inescutcheon"><div class="azure"><div class="charges"><i class="mullet of-the-first"></i></div></div></div></div></div>`,
    // A divided field has no single tincture to lie on.
    `<div class="heater"><div class="per-pale-or-azure"><div class="canton argent"></div></div></div>`,
    // The ground is the field, not a chief under the canton's corner.
    `<div class="heater"><div class="argent chief-azure"><div class="canton gules"></div></div></div>`,
    {
      code: `<div class="heater"><div class="argent"><div class="canton ermine"></div></div></div>`,
      options: [{ furs: "exempt" }],
    },
  ],
  invalid: [
    {
      code: `<div class="heater"><div class="or fess-argent"></div></div>`,
      errors: [error("`fess-argent` puts a fess Argent on Or: metal on metal")],
    },
    {
      code: `<div class="heater"><div class="or cross-voided-argent"></div></div>`,
      errors: [error("`cross-voided-argent` puts a cross voided Argent on Or: metal on metal")],
    },
    {
      code: `<div class="heater"><div class="or pile-reversed-argent"></div></div>`,
      errors: [error("`pile-reversed-argent` puts a pile reversed Argent on Or: metal on metal")],
    },
    {
      code: `<div class="heater"><div class="gules bordure-azure"></div></div>`,
      errors: [error("`bordure-azure` puts a bordure Azure on Gules: colour on colour")],
    },
    {
      code: `<div class="heater"><div class="argent chief-or"></div></div>`,
      errors: [error("`chief-or` puts a chief Or on Argent: metal on metal")],
    },
    {
      code: `<div class="heater"><div class="vert bend-sinister-sable"></div></div>`,
      errors: [error("`bend-sinister-sable` puts a bend sinister Sable on Vert: colour on colour")],
    },
    {
      code: `<div class="heater"><div class="azure"><div class="charges"><i class="mullet gules"></i></div></div></div>`,
      errors: [error("`gules` puts a mullet Gules on Azure: colour on colour")],
    },
    {
      code: `<div class="heater"><div class="azure"><div class="charges semy"><i class="mullet gules"></i></div></div></div>`,
      errors: [error("`gules` puts a mullet Gules on Azure: colour on colour")],
    },
    {
      code: `<div class="heater"><div class="or"><div class="charges"><i class="bezant"></i></div></div></div>`,
      errors: [error("`bezant` puts a bezant Or on Or: metal on metal")],
    },
    {
      code: `<div class="heater"><div class="azure"><div class="charges"><i class="annulet sable"></i></div></div></div>`,
      errors: [error("`sable` puts an annulet Sable on Azure: colour on colour")],
    },
    {
      code: `<div class="heater"><div class="argent"><div class="charges"><i class="cross-potent or"></i></div></div></div>`,
      errors: [error("`or` puts a cross potent Or on Argent: metal on metal")],
    },
    {
      // Against the bend, not the field.
      code: `<div class="heater"><div class="azure bend-or"><div class="charges on"><i class="lozenge argent"></i></div></div></div>`,
      errors: [error("`argent` puts a lozenge Argent on Or: metal on metal")],
    },
    {
      code: `<div class="heater"><div class="or chief-azure"><div class="charges"><i class="mullet gules in-chief-point"></i></div></div></div>`,
      errors: [error("`gules` puts a mullet Gules on Azure: colour on colour")],
    },
    {
      code: `<div class="heater"><div class="or chief-azure"><div class="charges in-chief"><i class="mullet gules"></i></div></div></div>`,
      errors: [error("`gules` puts a mullet Gules on Azure: colour on colour")],
    },
    {
      // Children of a `charges` container are charges even without a shape class.
      code: `<div class="heater"><div class="azure"><div class="charges"><span class="gules"></span></div></div></div>`,
      errors: [error("`gules` puts a charge Gules on Azure: colour on colour")],
    },
    {
      // The fimbriation touches the field.
      code: `<div class="heater"><div class="or chevron-sable fimbriated-argent"></div></div>`,
      errors: [error("`fimbriated-argent` puts a fimbriation Argent on Or: metal on metal")],
    },
    {
      // Reported once, however many ordinaries share the fimbriation.
      code: `<div class="heater"><div class="or chevron-sable fess-sable fimbriated-argent"></div></div>`,
      errors: [error("`fimbriated-argent` puts a fimbriation Argent on Or: metal on metal")],
    },
    {
      // The ordinary touches its fimbriation.
      code: `<div class="heater"><div class="or cross-gules fimbriated-azure"></div></div>`,
      errors: [error("`cross-gules` puts a cross Gules on Azure: colour on colour")],
    },
    {
      code: `<div class="per-pale"><div class="or fess-argent"></div><div class="gules"></div></div>`,
      errors: [error("`fess-argent` puts a fess Argent on Or: metal on metal")],
    },

    {
      code: `<div class="heater"><div class="or fess-engrailed-argent"></div></div>`,
      errors: [error("`fess-engrailed-argent` puts a fess engrailed Argent on Or: metal on metal")],
    },
    {
      code: `<div class="heater"><div class="argent chief-invected-or"></div></div>`,
      errors: [error("`chief-invected-or` puts a chief invected Or on Argent: metal on metal")],
    },
    {
      // Not fimbriated, so checked against the field.
      code: `<div class="heater"><div class="or fess-engrailed-argent fimbriated-gules"></div></div>`,
      errors: [error("`fess-engrailed-argent` puts a fess engrailed Argent on Or: metal on metal")],
    },
    {
      code: `<div class="heater"><div class="ermine fess-argent"></div></div>`,
      errors: [
        error(
          "`fess-argent` puts a fess Argent on Ermine: metal on metal (ermine counts as a metal)",
        ),
      ],
    },
    {
      code: `<div class="heater"><div class="vair chief-or"></div></div>`,
      options: [{ furs: { vair: "metal" } }],
      errors: [
        error("`chief-or` puts a chief Or on Vair: metal on metal (vair counts as a metal)"),
      ],
    },
    {
      code: `<div class="heater"><div class="or fess-ermine"></div></div>`,
      errors: [
        error("`fess-ermine` puts a fess Ermine on Or: metal on metal (ermine counts as a metal)"),
      ],
    },
    {
      code: `<div class="heater"><div class="azure chief-pean"></div></div>`,
      errors: [
        error(
          "`chief-pean` puts a chief Pean on Azure: colour on colour (pean counts as a colour)",
        ),
      ],
    },
    {
      code: `<div class="heater"><div class="ermine fess-engrailed-erminois"></div></div>`,
      errors: [
        error(
          "`fess-engrailed-erminois` puts a fess engrailed Erminois on Ermine: metal on metal (ermine and erminois count as metals)",
        ),
      ],
    },
    {
      code: `<div class="heater"><div class="gules"><div class="charges"><i class="mullet ermines"></i></div></div></div>`,
      errors: [
        error(
          "`ermines` puts a mullet Ermines on Gules: colour on colour (ermines counts as a colour)",
        ),
      ],
    },
    {
      // Against the fur fess, not the field.
      code: `<div class="heater"><div class="azure fess-ermine"><div class="charges on"><i class="mullet argent"></i></div></div></div>`,
      errors: [
        error("`argent` puts a mullet Argent on Ermine: metal on metal (ermine counts as a metal)"),
      ],
    },
    {
      // Charges on an engrailed ordinary.
      code: `<div class="heater"><div class="azure bend-engrailed-or"><div class="charges on"><i class="mullet argent"></i></div></div></div>`,
      errors: [error("`argent` puts a mullet Argent on Or: metal on metal")],
    },
    {
      code: `<div class="heater"><div class="pean fess-sable"></div></div>`,
      options: [{ furs: "ground" }],
      errors: [
        error("`fess-sable` puts a fess Sable on Pean: colour on colour (pean counts as a colour)"),
      ],
    },
    {
      // A fur missing from the map counts by its ground.
      code: `<div class="heater"><div class="ermine fess-argent"></div></div>`,
      options: [{ furs: { erminois: "exempt" } }],
      errors: [{ messageId: "violation" }],
    },
    {
      code: `<div class="heater"><div class="ermine fess-azure"></div></div>`,
      options: [{ furs: { ermine: "colour" } }],
      errors: [
        error(
          "`fess-azure` puts a fess Azure on Ermine: colour on colour (ermine counts as a colour)",
        ),
      ],
    },
    {
      code: `<div class="heater"><div class="or bend-of-the-first"></div></div>`,
      errors: [
        error(
          "`bend-of-the-first` puts a bend of the first on Or, its own tincture: it can't be seen",
        ),
      ],
    },
    {
      code: `<div class="heater"><div class="argent"><div class="canton or"><div class="charges"><i class="mullet of-the-first"></i></div></div></div></div>`,
      errors: [error("`of-the-first` puts a mullet Argent (of the first) on Or: metal on metal")],
    },
    {
      code: `<div class="heater"><div class="argent"><div class="inescutcheon"><div class="or"><div class="charges"><i class="mullet of-the-first"></i></div></div></div></div></div>`,
      errors: [error("`of-the-first` puts a mullet Argent (of the first) on Or: metal on metal")],
    },
    {
      // Against the quarter's own first, gules, not the shield's.
      code: `<div class="heater"><div class="quarterly"><div class="per-pale-gules-or fess-azure"><div class="charges on"><i class="mullet of-the-first"></i></div></div><div class="or"></div></div></div>`,
      errors: [
        error("`of-the-first` puts a mullet Gules (of the first) on Azure: colour on colour"),
      ],
    },
    {
      code: `<div class="heater"><div class="ermine bend-of-the-first"></div></div>`,
      errors: [
        error(
          "`bend-of-the-first` puts a bend of the first on Ermine, its own tincture: it can't be seen",
        ),
      ],
    },
    {
      code: `<div class="heater"><div class="azure"><div class="canton gules"></div></div></div>`,
      errors: [
        error(
          "`gules` puts a plain canton Gules on Azure: colour on colour. Change its tincture, or give it arms of its own",
        ),
      ],
    },
    {
      code: `<div class="heater"><div class="or"><div class="inescutcheon"><div class="argent"></div></div></div></div>`,
      errors: [
        error(
          "`argent` puts a plain inescutcheon Argent on Or: metal on metal. Change its tincture, or give it arms of its own",
        ),
      ],
    },
    {
      // Whitespace is nothing on it.
      code: `<div class="heater"><div class="or"><div class="inescutcheon"><div class="argent">
  </div></div></div></div>`,
      errors: [{ messageId: "plain" }],
    },
    {
      code: `<div class="heater"><div class="or"><div class="canton of-the-first"></div></div></div>`,
      errors: [
        error(
          "`of-the-first` puts a plain canton of the first on Or, its own tincture: it can't be seen",
        ),
      ],
    },
    {
      code: `<div class="heater"><div class="ermine"><div class="canton of-the-first"></div></div></div>`,
      errors: [
        error(
          "`of-the-first` puts a plain canton of the first on Ermine, its own tincture: it can't be seen",
        ),
      ],
    },
    {
      code: `<div class="heater"><div class="azure chief-or"><div class="canton gules"></div></div></div>`,
      errors: [
        error(
          "`gules` puts a plain canton Gules on Azure: colour on colour. Change its tincture, or give it arms of its own",
        ),
      ],
    },
    {
      code: `<div class="heater"><div class="quarterly"><div class="azure"><div class="canton gules"></div></div><div class="or"></div></div></div>`,
      errors: [
        error(
          "`gules` puts a plain canton Gules on Azure: colour on colour. Change its tincture, or give it arms of its own",
        ),
      ],
    },
    {
      code: `<div class="heater"><div class="argent"><div class="canton ermine"></div></div></div>`,
      errors: [
        error(
          "`ermine` puts a plain canton Ermine on Argent: metal on metal (ermine counts as a metal). Change its tincture, or give it arms of its own",
        ),
      ],
    },
  ],
  jsxOnly: {
    valid: [
      // Dynamic classes are unknown.
      `<div className="heater"><div className={field}><div className="charges"><i className="mullet or" /></div></div></div>`,
      `<div className="heater"><div className={\`\${field} fess-argent\`} /></div>`,
      `<div className="heater"><div {...props} className="or fess-argent" /></div>`,
      // Charges inside a component, or an expression, can't be seen.
      `<div className="heater"><Shield className="or"><div className="charges"><i className="mullet argent" /></div></Shield></div>`,
      // A canton without its shield: the first can't be known.
      `<div className="canton gules"><div className="charges"><i className="mullet of-the-first" /></div></div>`,
      `<div className="heater"><div className="or"><div className="charges">{items.map(() => <i className="mullet argent" />)}</div></div></div>`,
      // Its content is unknown, so it may be arms.
      `<div className="heater"><div className="azure"><div className="canton gules">{children}</div></div></div>`,
    ],
    invalid: [
      {
        code: '<div className="heater"><div className={`or fess-argent`} /></div>',
        errors: [error("`fess-argent` puts a fess Argent on Or: metal on metal")],
      },
      {
        // Fragments don't render an element.
        code: `<div className="heater"><div className="azure"><div className="charges"><><i className="mullet gules" /></></div></div></div>`,
        errors: [error("`gules` puts a mullet Gules on Azure: colour on colour")],
      },
      {
        code: `<div className="heater"><div className="azure"><div className="canton gules">{/* empty */}</div></div></div>`,
        errors: [{ messageId: "plain" }],
      },
    ],
  },
});
