import fs from "fs/promises";
import path from "path";
import { outdir } from "./esbuild.config.mjs";

// 构建完成后自动执行：合并 CSS、清理冗余、复制静态文件
export const postBuildPlugin = {
  name: "post-build-css-merge",
  setup(build) {
    build.onEnd(async (result) => {
      if (result.errors?.length) return;
      await mergeCss();
      await cleanupCssArtifacts();
      await copyStatic();
    });
  },
};

// 强化后的 CSS 合并（递归扫描 outdir 下所有 CSS）
async function mergeCss() {
  const outFinal = path.join(outdir, "styles.css");
  const rootGlobal = path.resolve(process.cwd(), "styles.css");
  const modulesCss = path.join(outdir, "styles.modules.css");

  const cssFiles = [];
  const walk = async (dir) => {
    const items = await fs.readdir(dir, { withFileTypes: true });
    for (const it of items) {
      const full = path.join(dir, it.name);
      if (it.isDirectory()) await walk(full);
      else if (
        it.isFile() &&
        full.endsWith(".css") &&
        !full.endsWith("styles.css") &&
        !full.endsWith("styles.modules.css")
      ) {
        cssFiles.push(full);
      }
    }
  };
  try { await walk(outdir); } catch {
		console.log('walk outdir error')
	}

  const readIfExists = async (p) => {
    try { return await fs.readFile(p, "utf8"); } catch { return ""; }
  };

  const parts = [];
  parts.push(await readIfExists(rootGlobal));
  parts.push(await readIfExists(modulesCss));
  for (const f of cssFiles) parts.push(await readIfExists(f));

  const combined = parts.filter(Boolean).join("\n\n");
  if (combined.trim().length) await fs.writeFile(outFinal, combined, "utf8");
}

async function copyStatic() {
  await fs.mkdir(outdir, { recursive: true });
  await fs.copyFile("manifest.json", path.join(outdir, "manifest.json"));
}

// 触发构建后合并与静态文件复制
async function cleanupCssArtifacts() {
  const outFinal = path.join(outdir, "styles.css");

  const files = [];
  const walk = async (dir) => {
    const items = await fs.readdir(dir, { withFileTypes: true });
    for (const it of items) {
      const full = path.join(dir, it.name);
      if (it.isDirectory()) await walk(full);
      else if (it.isFile() && full.endsWith(".css") && full !== outFinal) {
        files.push(full);
      }
    }
  };

	await walk(outdir)
  for (const f of files) {
		await fs.rm(f, { force: true });
  }
}