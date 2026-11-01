import { getElements } from "../tree.js";
import {
  atChiefPoint,
  chargeName,
  chargeTincture,
  describe,
  fieldTincture,
  fimbriationOf,
  kind,
  ordinariesOf,
  sameKind,
  titleCase,
} from "../blazon.js";

const article = (thing) => (/^[aeiou]/.test(thing) ? `an ${thing}` : `a ${thing}`);

export default {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow metal on metal and colour on colour",
      url: "https://github.com/pafirmin/grailwind/tree/main/packages/eslint-plugin#rule-of-tincture",
    },
    schema: [],
    messages: {
      violation: "`{{cls}}` puts {{thing}} {{tincture}} on {{ground}}: {{kind}} on {{kind}}",
    },
  },

  create(context) {
    const check = (node, cls, thing, tincture, ground) => {
      if (!sameKind(tincture, ground)) {
        return;
      }
      context.report({
        node,
        messageId: "violation",
        data: {
          cls,
          thing: article(thing),
          tincture: titleCase(tincture),
          ground: titleCase(ground),
          kind: kind(tincture),
        },
      });
    };

    return {
      Program() {
        for (const el of getElements(context.sourceCode)) {
          if (!el.classes) {
            continue;
          }
          const field = fieldTincture(el.classes);
          const { ordinaries, chiefs, bordures } = ordinariesOf(el.classes);
          const fimbriation = fimbriationOf(el.classes);
          const isFimbriated =
            fimbriation && ordinaries.some((ordinary) => !ordinary.counterchanged);

          if (isFimbriated) {
            check(el.reportNode, fimbriation.cls, "fimbriation", fimbriation.tincture, field);
          }

          for (const { cls, ordinary, tincture } of ordinaries) {
            check(
              el.reportNode,
              cls,
              describe(ordinary),
              tincture,
              isFimbriated ? fimbriation.tincture : field,
            );
          }

          // An ordinary abuts the chief rather than lying on it, so both are checked against the field.
          for (const { cls, ordinary, tincture } of [...chiefs, ...bordures]) {
            check(el.reportNode, cls, describe(ordinary), tincture, field);
          }

          for (const container of el.children) {
            if (!container.classes?.has("charges")) {
              continue;
            }
            for (const charge of container.children) {
              if (!charge.classes || charge.tag === "img") {
                continue;
              }
              // Counterchanged charges take the swapped field, not a tincture of their own.
              if (charge.classes.has("counterchanged") || container.classes.has("counterchanged")) {
                continue;
              }
              const found = chargeTincture(charge.classes);
              if (!found) {
                continue;
              }

              let ground = field;
              if (container.classes.has("on") && ordinaries.length) {
                ground = ordinaries[0].tincture;
              } else if (chiefs.length && atChiefPoint(charge.classes)) {
                ground = chiefs[0].tincture;
              }

              const thing = describe(chargeName(charge.classes) ?? "charge");
              check(charge.reportNode, found.cls, thing, found.tincture, ground);
            }
          }
        }
      },
    };
  },
};
