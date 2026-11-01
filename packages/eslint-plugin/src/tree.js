/*
 * One element tree for JSX and HTML. `classes` is null when they can't be known statically;
 * `parent` is UNKNOWN when the element renders somewhere this file can't see.
 */

export const UNKNOWN = Symbol("unknown parent");

const cache = new WeakMap();

// Variants (`md:`, `*:`), arbitrary values and modifiers can't be Grailwind classes,
// except image charges written `charge-[url(…)]`.
const STATIC = /^[a-z0-9-]+$/;

export const parseClasses = (value) =>
  new Set(value.split(/\s+/).filter((c) => STATIC.test(c) || c.startsWith("charge-[")));

export function getElements(sourceCode) {
  let elements = cache.get(sourceCode.ast);
  if (!elements) {
    elements = [];
    walk(sourceCode.ast, UNKNOWN, elements, sourceCode.visitorKeys);
    cache.set(sourceCode.ast, elements);
  }
  return elements;
}

function element(node, tag, attribute, classes, parent, elements) {
  const el = { node, reportNode: attribute ?? node, tag, classes, parent, children: [] };
  if (parent !== UNKNOWN) {
    parent.children.push(el);
  }
  elements.push(el);
  return el;
}

function walk(node, context, elements, visitorKeys) {
  if (!node || typeof node.type !== "string") {
    return;
  }

  switch (node.type) {
    case "JSXElement": {
      const { name, attributes } = node.openingElement;
      const isComponent = name.type !== "JSXIdentifier" || /^[A-Z]/.test(name.name);
      const attribute = attributes.find(
        (a) =>
          a.type === "JSXAttribute" && (a.name.name === "className" || a.name.name === "class"),
      );
      const hasSpread = attributes.some((a) => a.type === "JSXSpreadAttribute");
      const classes = isComponent || hasSpread ? null : jsxClasses(attribute);
      const el = element(
        node,
        isComponent ? null : name.name,
        attribute,
        classes,
        context,
        elements,
      );
      walkKeys(node.openingElement, UNKNOWN, elements, visitorKeys);
      for (const child of node.children) {
        walk(child, isComponent ? UNKNOWN : el, elements, visitorKeys);
      }
      return;
    }
    // Fragments don't render an element, so their children belong to the parent.
    case "JSXFragment":
      for (const child of node.children) {
        walk(child, context, elements, visitorKeys);
      }
      return;
    case "Tag": {
      const attribute = node.attributes.find((a) => a.key?.value.toLowerCase() === "class");
      const el = element(
        node,
        node.name.toLowerCase(),
        attribute,
        htmlClasses(attribute),
        context,
        elements,
      );
      for (const child of node.children) {
        walk(child, el, elements, visitorKeys);
      }
      return;
    }
    default:
      walkKeys(node, UNKNOWN, elements, visitorKeys);
  }
}

function walkKeys(node, context, elements, visitorKeys) {
  for (const key of visitorKeys[node.type] ?? []) {
    const value = node[key];
    if (Array.isArray(value)) {
      value.forEach((child) => walk(child, context, elements, visitorKeys));
    } else {
      walk(value, context, elements, visitorKeys);
    }
  }
}

function jsxClasses(attribute) {
  if (!attribute || attribute.value === null) {
    return new Set();
  }
  let value = attribute.value;
  if (value.type === "JSXExpressionContainer") {
    value = value.expression;
  }
  if (value.type === "Literal" && typeof value.value === "string") {
    return parseClasses(value.value);
  }
  if (value.type === "TemplateLiteral" && value.expressions.length === 0) {
    return parseClasses(value.quasis[0].value.cooked);
  }
  return null;
}

function htmlClasses(attribute) {
  if (!attribute) {
    return new Set();
  }
  if (!attribute.value) {
    return new Set();
  }
  // Template engine syntax (`{{ x }}`) makes the value dynamic.
  if (attribute.value.parts?.some((part) => part.type !== "Part")) {
    return null;
  }
  return parseClasses(attribute.value.value);
}
