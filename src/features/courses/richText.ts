const allowedTags = new Set([
  "P", "DIV", "BR", "SPAN", "STRONG", "B", "EM", "I", "U", "S",
  "UL", "OL", "LI", "BLOCKQUOTE",
]);

const allowedStyleProperties = new Set([
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "text-decoration",
  "color",
  "background-color",
  "text-align",
]);

export function plainTextToRichHtml(value: string) {
  const node = document.createElement("div");
  node.textContent = value;
  return node.innerHTML.replace(/\n/g, "<br>");
}

function normalizeFontElement(element: Element) {
  if (element.tagName !== "FONT") return element;
  const span = document.createElement("span");
  const face = element.getAttribute("face");
  const color = element.getAttribute("color");
  if (face) span.style.fontFamily = face;
  if (color) span.style.color = color;
  while (element.firstChild) span.append(element.firstChild);
  element.replaceWith(span);
  return span;
}

function cleanStyle(element: HTMLElement) {
  const safe = document.createElement("span");
  for (const property of allowedStyleProperties) {
    const value = element.style.getPropertyValue(property).trim();
    if (value && !/url\s*\(|expression\s*\(/i.test(value))
      safe.style.setProperty(property, value);
  }
  element.removeAttribute("style");
  if (safe.getAttribute("style")) element.setAttribute("style", safe.getAttribute("style") || "");
}

export function sanitizeRichText(value: string) {
  if (!value) return "";
  const documentNode = new DOMParser().parseFromString(`<div>${value}</div>`, "text/html");
  const root = documentNode.body.firstElementChild as HTMLElement | null;
  if (!root) return "";

  const visit = (element: Element) => {
    const normalized = normalizeFontElement(element);
    for (const child of [...normalized.children]) visit(child);
    if (!allowedTags.has(normalized.tagName)) {
      normalized.replaceWith(...normalized.childNodes);
      return;
    }
    for (const attribute of [...normalized.attributes]) {
      if (attribute.name !== "style") normalized.removeAttribute(attribute.name);
    }
    cleanStyle(normalized as HTMLElement);
  };

  for (const child of [...root.children]) visit(child);
  return root.innerHTML;
}

