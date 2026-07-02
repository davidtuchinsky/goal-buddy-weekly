import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const { default: server } = await import(
  resolve(projectRoot, "dist/server/server.js")
);

const response = await server.fetch(new Request("http://localhost/"));

if (!response.ok) {
  console.error(`Server responded with status ${response.status} ${response.statusText}`);
  process.exit(1);
}

const html = await response.text();

if (!html.includes("<html") && !html.includes("<!DOCTYPE")) {
  console.error("Response does not look like HTML:");
  console.error(html.slice(0, 500));
  process.exit(1);
}

const outDir = resolve(projectRoot, "dist/client");
await mkdir(outDir, { recursive: true });
await writeFile(resolve(outDir, "index.html"), html, "utf-8");

console.log(`Wrote ${html.length} bytes to dist/client/index.html`);
