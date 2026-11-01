import { getElements, UNKNOWN } from "../tree.js";
import { ordinariesOf } from "../blazon.js";

export default {
  meta: {
    type: "problem",
    docs: {
      description: "Require an ordinary on the shield for `between` and `on`",
      url: "https://github.com/pafirmin/grailwind/tree/main/packages/eslint-plugin#arrangement-needs-ordinary",
    },
    schema: [],
    messages: {
      // A chief publishes no `between` or `on` points, so it doesn't count.
      missing: "`{{arrangement}}` needs an ordinary other than a chief on the shield",
    },
  },

  create(context) {
    return {
      Program() {
        for (const el of getElements(context.sourceCode)) {
          if (!el.classes?.has("charges") || el.parent === UNKNOWN || !el.parent.classes) {
            continue;
          }
          if (ordinariesOf(el.parent.classes).ordinaries.length) {
            continue;
          }
          for (const arrangement of ["between", "on"]) {
            if (el.classes.has(arrangement)) {
              context.report({ node: el.reportNode, messageId: "missing", data: { arrangement } });
            }
          }
        }
      },
    };
  },
};
