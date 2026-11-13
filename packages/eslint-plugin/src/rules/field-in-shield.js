import { getElements } from "../tree.js";
import { fieldClassesOf, frameOf } from "../blazon.js";

export default {
  meta: {
    type: "problem",
    docs: {
      description: "Require the blazon on a frame's one child, the field, not on the frame",
      url: "https://github.com/pafirmin/grailwind/tree/main/packages/eslint-plugin#field-in-shield",
    },
    schema: [],
    messages: {
      onFrame: "`{{cls}}` goes on the {{frame}}'s one child, the field",
      charges: "`charges` goes in the {{frame}}'s one child, the field, not on the {{frame}}",
      escutcheon: "`escutcheon` is now `heater`, with the blazon on its one child",
    },
  },

  create(context) {
    return {
      Program() {
        for (const el of getElements(context.sourceCode)) {
          if (!el.classes) {
            continue;
          }
          if (el.classes.has("escutcheon")) {
            context.report({ node: el.reportNode, messageId: "escutcheon" });
          }
          const frame = frameOf(el.classes);
          if (!frame) {
            continue;
          }
          for (const cls of fieldClassesOf(el.classes)) {
            context.report({ node: el.reportNode, messageId: "onFrame", data: { cls, frame } });
          }
          for (const child of el.children) {
            if (child.classes?.has("charges")) {
              context.report({ node: child.reportNode, messageId: "charges", data: { frame } });
            }
          }
        }
      },
    };
  },
};
