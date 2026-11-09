import { getElements, UNKNOWN } from "../tree.js";
import { fimbriationOf, isDivided, isFimbriable, ordinariesOf } from "../blazon.js";

// Any transform makes a charge the containing block for its fixed, swapped layer.
const TRANSFORM = /^-?(rotate|scale|skew|translate)(-|$)/;

export default {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow counterchanged or fimbriated classes that have nothing to apply to",
      url: "https://github.com/pafirmin/grailwind/tree/main/packages/eslint-plugin#modifier-needs-target",
    },
    schema: [],
    messages: {
      noDivision: "`{{cls}}` needs a divided field to swap, e.g. `per-pale-argent-gules`",
      noOrdinary:
        "`{{cls}}` needs a plain tinctured ordinary to edge: a chief, and an engrailed, invected, wavy, fur or counterchanged ordinary, aren't fimbriated",
      transformed:
        "`{{cls}}` breaks `counterchanged`: a transformed charge shows its own small copy of the field",
    },
  },

  create(context) {
    return {
      Program() {
        for (const el of getElements(context.sourceCode)) {
          if (!el.classes) {
            continue;
          }
          const report = (node, messageId, cls) =>
            context.report({ node, messageId, data: { cls } });

          // A counterchanged ordinary's ::before inherits the swap from its own element.
          const { ordinaries, chiefs } = ordinariesOf(el.classes);
          if (!isDivided(el.classes)) {
            for (const { cls } of [...ordinaries, ...chiefs].filter((o) => o.counterchanged)) {
              report(el.reportNode, "noDivision", cls);
            }
          }

          const fimbriation = fimbriationOf(el.classes);
          if (fimbriation && !ordinaries.some(isFimbriable)) {
            report(el.reportNode, "noOrdinary", fimbriation.cls);
          }

          if (el.classes.has("charges")) {
            for (const charge of el.children) {
              if (!charge.classes) {
                continue;
              }
              const transform = [...charge.classes].find((cls) => TRANSFORM.test(cls));
              if (
                transform &&
                (el.classes.has("counterchanged") || charge.classes.has("counterchanged"))
              ) {
                report(charge.reportNode, "transformed", transform);
              }
            }
          }

          // Counterchanged charges get the swap from the container's parent only.
          if (el.classes.has("charges") && el.parent !== UNKNOWN && el.parent.classes) {
            if (isDivided(el.parent.classes)) {
              continue;
            }
            if (el.classes.has("counterchanged")) {
              report(el.reportNode, "noDivision", "counterchanged");
            }
            for (const charge of el.children) {
              if (charge.classes?.has("counterchanged")) {
                report(charge.reportNode, "noDivision", "counterchanged");
              }
            }
          }
        }
      },
    };
  },
};
