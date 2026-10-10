import { parseHTML } from "linkedom";

const BLOCK_TAGS = new Set([
  "ADDRESS", "ARTICLE", "ASIDE", "BLOCKQUOTE", "BR", "CAPTION", "DD", "DIV", "DL", "DT",
  "FIGCAPTION", "FIGURE", "FOOTER", "H1", "H2", "H3", "H4", "H5", "H6", "HEADER", "HR",
  "LI", "MAIN", "NAV", "OL", "P", "PRE", "SECTION", "TABLE", "TD", "TH", "TR", "UL",
]);
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "SVG", "BUTTON"]);

const cleanLine = (line: string) => line.replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/\s+/g, " ").trim();

export function extractHtmlText(html: string, selector: string): string {
  const { document } = parseHTML(html);
  const root = document.querySelector(selector);
  if (!root) throw new Error(`Selector "${selector}" matched no element`);

  const parts: string[] = [];
  const walk = (node: Node) => {
    if (node.nodeType === 3) {
      parts.push(node.textContent ?? "");
      return;
    }
    if (node.nodeType !== 1) return;
    const tag = (node as Element).tagName.toUpperCase();
    if (SKIP_TAGS.has(tag)) return;
    const block = BLOCK_TAGS.has(tag);
    if (block) parts.push("\n");
    node.childNodes.forEach(walk);
    if (block) parts.push("\n");
  };
  walk(root);

  return parts
    .join("")
    .split("\n")
    .map(cleanLine)
    .filter(Boolean)
    .join("\n");
}

export async function extractPdfText(data: Uint8Array): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(data);
  const { text } = await extractText(pdf, { mergePages: false });
  return text
    .flatMap((page) => page.split("\n"))
    .map(cleanLine)
    .filter(Boolean)
    .join("\n");
}
