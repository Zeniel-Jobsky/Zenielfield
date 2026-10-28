import vinext from "vinext";
import { existsSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { defineConfig } from "vite";
import hostingConfig from "./.openai/hosting.json";
import { readExecutionProfile } from "./scripts/execution-profile.mjs";
import { configureToolEnvironment } from "./scripts/tool-environment.mjs";
import { sites } from "./scripts/vite/sites-vite-plugin";
import { connectorPreview } from "./scripts/vite/connector-preview-plugin.mjs";
import cloudflareDeployment from "./wrangler.cloudflare.json";

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

const { d1, r2 } = hostingConfig;

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";
const managedLinux = readExecutionProfile() === "managed-linux";

const localBindingConfig = {
  main: "./worker/index.ts",
  compatibility_flags: ["nodejs_compat"],
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: "site-creator-d1",
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: "site-creator-r2",
        },
      ]
    : [],
};

// Build stamp shown in the app footer: package version, short commit and build time (KST). Dev shows the server start time.
function buildInfo() {
  let commit = "";
  try {
    commit = execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    // 커밋되지 않은 변경이 있으면 표기에 "+수정"을 붙여 커밋과 다른 코드임을 알린다.
    if (execSync("git status --porcelain --untracked-files=no -- . \":(exclude)package.json\"", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim()) commit += "+수정";
  } catch {}
  const version = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8")).version ?? "";
  const at = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", dateStyle: "short", timeStyle: "short" }).format(new Date());
  return { version, commit, at };
}

// /version.json: 지금 서버가 내보내는 버전. 화면은 이 값을 주기적으로 읽어 자기 빌드와 다르면 "새 버전" 알림을 띄운다.
// 빌드: 클라이언트 산출물에 파일로 넣는다. 개발 서버: 요청마다 현재 HEAD 기준으로 계산한다(pull 뒤 재시작 필요 여부 확인용).
function versionFile(build: ReturnType<typeof buildInfo>) {
  return {
    name: "zf-version-file",
    configureServer(server: { middlewares: { use: (fn: (req: { url?: string }, res: { setHeader: (k: string, v: string) => void; end: (s: string) => void }, next: () => void) => void) => void } }) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split("?")[0] !== "/version.json") return next();
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        res.end(JSON.stringify({ ...buildInfo(), dev: true }));
      });
    },
    generateBundle(this: { environment?: { name?: string }; emitFile: (f: { type: "asset"; fileName: string; source: string }) => void }) {
      if (this.environment && this.environment.name !== "client") return;
      this.emitFile({ type: "asset", fileName: "version.json", source: JSON.stringify({ ...build, dev: false }) });
    },
  };
}

export default defineConfig(async ({ command }) => {
  configureToolEnvironment(process.cwd());
  const build = buildInfo();

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  // Per-machine dev server overrides (host, https, ...). vite.config.local.mjs is git-ignored; see vite.config.local.example.mjs.
  const localFile = resolve(process.cwd(), "vite.config.local.mjs");
  const local = command === "serve" && existsSync(localFile)
    ? ((await import(pathToFileURL(localFile).href)).default ?? {})
    : {};

  return {
    define: { __ZF_BUILD__: JSON.stringify({ ...build, dev: command === "serve" }) },
    server: {
      ...(managedLinux
        ? { host: "0.0.0.0", allowedHosts: ["terminal.local"] }
        : {}),
      ...(isCodexSeatbeltSandbox
        ? { watch: { useFsEvents: false, usePolling: true } }
        : {}),
      ...(local.server ?? {}),
    },
    plugins: [
      versionFile(build),
      vinext(),
      sites({ mockAuth: !managedLinux }),
      connectorPreview(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        inspectorPort: false,
        config: {
          ...localBindingConfig,
          ...(process.env.ZENIFIELD_DEPLOY_TARGET === "cloudflare" ? cloudflareDeployment : {}),
          ...(command === "serve"
            ? {
                services: [
                  {
                    binding: "CONNECTORS",
                    service: "sites-connector-preview",
                    entrypoint: "ConnectorPreview",
                  },
                ],
              }
            : {}),
        },
        ...(command === "serve"
          ? {
              auxiliaryWorkers: [
                {
                  config: {
                    name: "sites-connector-preview",
                    main: "./scripts/connector-preview/worker.mjs",
                    compatibility_date: "2026-05-15",
                  },
                },
              ],
            }
          : {}),
      }),
    ],
  };
});
