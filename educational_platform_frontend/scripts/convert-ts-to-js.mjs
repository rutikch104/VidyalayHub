/**
 * One-time migration: emit .js / .jsx from .ts / .tsx via TypeScript transpileModule.
 * Run from project root: node scripts/convert-ts-to-js.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function walk(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === "dist") continue;
      walk(p, out);
    } else if (/\.(ts|tsx)$/.test(ent.name) && !ent.name.endsWith(".d.ts")) {
      out.push(p);
    }
  }
  return out;
}

const files = walk(root);
const compilerOptions = {
  jsx: ts.JsxEmit.ReactJSX,
  module: ts.ModuleKind.ESNext,
  target: ts.ScriptTarget.ES2020,
  esModuleInterop: true,
  allowSyntheticDefaultImports: true,
  isolatedModules: true,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
};

for (const filePath of files) {
  const source = fs.readFileSync(filePath, "utf8");
  const result = ts.transpileModule(source, {
    compilerOptions,
    fileName: filePath,
    reportDiagnostics: true,
  });

  const diags = result.diagnostics?.filter((d) => d.category === ts.DiagnosticCategory.Error) ?? [];
  if (diags.length) {
    const msg = diags.map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n")).join("\n");
    throw new Error(`Transpile failed for ${filePath}:\n${msg}`);
  }

  const outPath = filePath.replace(/\.tsx$/, ".jsx").replace(/\.ts$/, ".js");
  fs.writeFileSync(outPath, result.outputText, "utf8");
  fs.unlinkSync(filePath);
  console.log("converted:", path.relative(root, filePath), "->", path.relative(root, outPath));
}

// Remove TypeScript-only declaration file(s)
const viteEnv = path.join(root, "src", "vite-env.d.ts");
if (fs.existsSync(viteEnv)) {
  fs.unlinkSync(viteEnv);
  console.log("removed:", path.relative(root, viteEnv));
}

console.log("done:", files.length, "files");
