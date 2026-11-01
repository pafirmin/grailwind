import { getElements, UNKNOWN } from "../tree.js";
import { chargeName } from "../blazon.js";

export default {
  meta: {
    type: "problem",
    docs: {
      description: "Require charges to be inside a `charges` container",
      url: "https://github.com/pafirmin/grailwind/tree/main/packages/eslint-plugin#charges-in-container",
    },
    schema: [],
    messages: {
      outside: "`{{charge}}` must be inside a `charges` container",
    },
  },

  create(context) {
    return {
      Program() {
        for (const el of getElements(context.sourceCode)) {
          if (!el.classes || el.parent === UNKNOWN || !el.parent.classes) continue;
          const charge = chargeName(el.classes);
          if (charge && !el.parent.classes.has("charges")) {
            context.report({ node: el.reportNode, messageId: "outside", data: { charge } });
          }
        }
      },
    };
  },
};
