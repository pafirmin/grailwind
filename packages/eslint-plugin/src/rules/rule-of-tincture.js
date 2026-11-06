import { FURS, OF_THE_FIRST } from "grailwind/data";
import { getElements, UNKNOWN } from "../tree.js";
import {
  chargeName,
  chargeTincture,
  describe,
  fieldTincture,
  fimbriationOf,
  firstOf,
  furKinds,
  inChief,
  isFimbriable,
  isFur,
  isPlain,
  kind,
  ordinariesOf,
  sameKind,
  titleCase,
} from "../blazon.js";

const article = (thing) => (/^[aeiou]/.test(thing) ? `an ${thing}` : `a ${thing}`);

const KINDS = ["metal", "colour", "exempt"];

// e.g. "fess engrailed", as blazoned.
const name = ({ ordinary, line, voided }) =>
  describe([ordinary, line, voided && "voided"].filter(Boolean).join(" "));

// e.g. " (ermine counts as a metal)", or " (ermine and erminois count as metals)".
const furNote = (tinctures, kind) => {
  const furs = [...new Set(tinctures.filter(isFur))];
  if (!furs.length) {
    return "";
  }
  return furs.length === 1
    ? ` (${furs[0]} counts as a ${kind})`
    : ` (${furs.join(" and ")} count as ${kind}s)`;
};

export default {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow metal on metal and colour on colour",
      url: "https://github.com/pafirmin/grailwind/tree/main/packages/eslint-plugin#rule-of-tincture",
    },
    schema: [
      {
        type: "object",
        properties: {
          furs: {
            oneOf: [
              { enum: ["ground", "exempt"] },
              {
                type: "object",
                properties: Object.fromEntries(
                  Object.keys(FURS).map((fur) => [fur, { enum: KINDS }]),
                ),
                additionalProperties: false,
              },
            ],
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      violation:
        "`{{cls}}` puts {{thing}} {{tincture}} on {{ground}}: {{kind}} on {{kind}}{{note}}",
      invisible:
        "`{{cls}}` puts {{thing}} of the first on {{ground}}, its own tincture: it can't be seen",
      plain:
        "`{{cls}}` puts {{thing}} {{tincture}} on {{ground}}: {{kind}} on {{kind}}{{note}}. Change its tincture, or give it arms of its own",
    },
  },

  create(context) {
    const furs = furKinds(context.options[0]?.furs);
    // `el` is the element whose field or ordinary it is, for resolving `of-the-first`.
    const check = (el, node, cls, thing, painted, ground, messageId = "violation") => {
      const first = [painted, ground].includes(OF_THE_FIRST) ? firstOf(el) : null;
      const tincture = painted === OF_THE_FIRST ? first : painted;
      if (ground === OF_THE_FIRST) {
        ground = first;
      }
      if (painted === OF_THE_FIRST && tincture && tincture === ground) {
        context.report({
          node,
          messageId: "invisible",
          data: { cls, thing: article(thing), ground: titleCase(ground) },
        });
        return;
      }
      if (!sameKind(tincture, ground, furs)) {
        return;
      }
      context.report({
        node,
        messageId,
        data: {
          cls,
          thing: article(thing),
          tincture: titleCase(tincture) + (painted === OF_THE_FIRST ? " (of the first)" : ""),
          ground: titleCase(ground),
          kind: kind(tincture, furs),
          note: furNote([ground, tincture], kind(tincture, furs)),
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

          // A plain sub-shield lies on its parent's field. A charged or divided one is arms.
          const sub = ["canton", "inescutcheon"].find((c) => el.classes.has(c));
          if (sub && isPlain(el) && el.parent !== UNKNOWN && el.parent.classes) {
            const ground = fieldTincture(el.parent.classes);
            check(el, el.reportNode, field, `plain ${sub}`, field, ground, "plain");
          }
          const isFimbriated = fimbriation && ordinaries.some(isFimbriable);

          if (isFimbriated) {
            check(el, el.reportNode, fimbriation.cls, "fimbriation", fimbriation.tincture, field);
          }

          for (const o of ordinaries) {
            check(
              el,
              el.reportNode,
              o.cls,
              name(o),
              o.tincture,
              isFimbriated && isFimbriable(o) ? fimbriation.tincture : field,
            );
          }

          // An ordinary abuts the chief rather than lying on it, so both are checked against the field.
          for (const o of [...chiefs, ...bordures]) {
            check(el, el.reportNode, o.cls, name(o), o.tincture, field);
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
              } else if (chiefs.length && inChief(container, charge)) {
                ground = chiefs[0].tincture;
              }

              const thing = describe(chargeName(charge.classes) ?? "charge");
              check(el, charge.reportNode, found.cls, thing, found.tincture, ground);
            }
          }
        }
      },
    };
  },
};
