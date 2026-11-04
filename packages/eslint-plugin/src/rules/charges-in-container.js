import { getElements, UNKNOWN } from "../tree.js";
import { arrangementsOf, chargeName } from "../blazon.js";

// The tail of the `arranged` message: where to place one charge instead, or "" for none.
const hint = (cls) => {
  return (
    {
      "in-chief": "; to place one charge, use `in-chief-point`",
      "in-base": "; to place one charge, use `in-base-point`",
    }[cls] ?? ""
  );
};

export default {
  meta: {
    type: "problem",
    docs: {
      description: "Require charges to be inside a `charges` container, and arrangements on it",
      url: "https://github.com/pafirmin/grailwind/tree/main/packages/eslint-plugin#charges-in-container",
    },
    schema: [],
    messages: {
      outside: "`{{charge}}` must be inside a `charges` container",
      arranged: "`{{cls}}` arranges a `charges` container, not a charge{{hint}}",
    },
  },

  create(context) {
    return {
      Program() {
        for (const el of getElements(context.sourceCode)) {
          if (!el.classes || el.parent === UNKNOWN || !el.parent.classes) {
            continue;
          }
          const inContainer = el.parent.classes.has("charges");
          const charge = chargeName(el.classes);
          if (charge && !inContainer) {
            context.report({ node: el.reportNode, messageId: "outside", data: { charge } });
          }
          if (inContainer) {
            for (const cls of arrangementsOf(el.classes)) {
              context.report({
                node: el.reportNode,
                messageId: "arranged",
                data: { cls, hint: hint(cls) },
              });
            }
          }
        }
      },
    };
  },
};
