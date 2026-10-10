import { parseHTML } from "linkedom";
import { extractHtmlText, extractPdfText } from "../lib/sources/extract";
import { USER_AGENT } from "../lib/sources/fetch";

const CANDIDATES = ["main", "#main", "article", "#content", ".content", "#contents", ".entry-content", "[role=main]"];

async function main() {
  const [url, selector] = process.argv.slice(2);
  const res = await fetch(url, { headers: { "user-agent": USER_AGENT } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  if ((res.headers.get("content-type") ?? "").includes("pdf")) {
    console.log(await extractPdfText(new Uint8Array(await res.arrayBuffer())));
    return;
  }
  const html = await res.text();
  if (selector) {
    console.log(extractHtmlText(html, selector));
    return;
  }
  const { document } = parseHTML(html);
  for (const s of CANDIDATES) {
    const el = document.querySelector(s);
    if (el) console.log(`${s}\t${(el.textContent ?? "").replace(/\s+/g, " ").length} chars`);
  }
}

main();
