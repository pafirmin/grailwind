import { getElements } from "../tree.js";
import { arrangementsOf, ordinariesOf, pointOf } from "../blazon.js";

const quote = (names) => names.map((n) => `\`${n}\``).join(" and ");

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Allow one ordinary plus a chief per element, and one arrangement per `charges` container",
      url: "https://github.com/pafirmin/grailwind/tree/main/packages/eslint-plugin#one-ordinary",
    },
    schema: [],
    messages: {
      ordinaries: "{{classes}} both draw an ordinary; only one will show.",
      chiefs: "{{classes}} both draw a chief; only one will show",
      arrangements: "{{classes}} both place these charges",
      pointed:
        "`{{cls}}` sets this charge apart from the others in its container; give it a `charges` container of its own",
    },
  },

  create(context) {
    return {
      Program() {
        for (const el of getElements(context.sourceCode)) {
          if (!el.classes) {
            continue;
          }
          const { ordinaries, chiefs } = ordinariesOf(el.classes);
          const report = (messageId, names) =>
            context.report({ node: el.reportNode, messageId, data: { classes: quote(names) } });

          if (ordinaries.length > 1) {
            report(
              "ordinaries",
              ordinaries.map((o) => o.cls),
            );
          }
          if (chiefs.length > 1) {
            report(
              "chiefs",
              chiefs.map((o) => o.cls),
            );
          }
          if (el.classes.has("charges")) {
            const arrangements = arrangementsOf(el.classes);
            if (arrangements.length > 1) {
              report("arrangements", arrangements);
            }
            // A pointed charge still counts towards, and shifts, the others' positions.
            const charges = el.children.filter((child) => child.classes);
            const pointed = charges.filter((child) => pointOf(child.classes));
            if (pointed.length && pointed.length < charges.length) {
              for (const charge of pointed) {
                context.report({
                  node: charge.reportNode,
                  messageId: "pointed",
                  data: { cls: pointOf(charge.classes) },
                });
              }
            }
          }
        }
      },
    };
  },
};
