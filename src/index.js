const SKILL_MD = `---
name: obsid-link-builder
description: Create and normalize shareable obsid.net links for Obsidian notes. Use when asked to generate links like https://obsid.net/?vault=...&file=... for chat/messages, convert obsidian://open links to obsid.net links, or verify URL encoding of vault/file parameters.
---

# Obsid Link Builder

Create canonical links in this format:

https://obsid.net/?vault=<ENCODED_VAULT>&file=<ENCODED_FILE_PATH>

## Workflow

1. Gather input in one of these forms:
- vault + file values
- existing obsidian://open?vault=...&file=... URL

2. Normalize file separators to '/'.
3. URL-encode vault and file values.
4. Output only the final obsid.net URL unless explanation is requested.

## CLI Helper

"$CODEX_HOME/skills/obsid-link-builder/scripts/build_obsid_link.sh" \\
  --vault "Obsidian" \\
  --file "Sites/Joost.blog/Posts"

"$CODEX_HOME/skills/obsid-link-builder/scripts/build_obsid_link.sh" \\
  --obsidian-url "obsidian://open?vault=Obsidian&file=Sites%2FJoost.blog%2FPosts"
`;

const BUILD_SCRIPT = `#!/usr/bin/env bash
set -euo pipefail

node - "$@" <<'NODE'
const args = process.argv.slice(2);
let vault = "";
let file = "";
let obsidianUrl = "";
let host = "https://obsid.net/";

function usage() {
  console.error("Usage:");
  console.error("  build_obsid_link.sh --vault <vault> --file <file-path> [--host https://obsid.net/]");
  console.error("  build_obsid_link.sh --obsidian-url <obsidian://open?...> [--host https://obsid.net/]");
}

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === "--vault") {
    vault = args[i + 1] || "";
    i += 1;
  } else if (arg === "--file") {
    file = args[i + 1] || "";
    i += 1;
  } else if (arg === "--obsidian-url") {
    obsidianUrl = args[i + 1] || "";
    i += 1;
  } else if (arg === "--host") {
    host = args[i + 1] || host;
    i += 1;
  } else if (arg === "-h" || arg === "--help") {
    usage();
    process.exit(0);
  } else {
    console.error("Unknown argument: " + arg);
    usage();
    process.exit(1);
  }
}

if (obsidianUrl) {
  let parsed;
  try {
    parsed = new URL(obsidianUrl);
  } catch {
    console.error("Error: invalid --obsidian-url value");
    process.exit(1);
  }

  if (parsed.protocol !== "obsidian:" || parsed.hostname !== "open") {
    console.error("Error: --obsidian-url must start with obsidian://open");
    process.exit(1);
  }

  vault = parsed.searchParams.get("vault") || vault;
  file = parsed.searchParams.get("file") || file;
}

if (!vault || !file) {
  console.error("Error: both vault and file are required.");
  usage();
  process.exit(1);
}

if (!host.endsWith("/")) {
  host += "/";
}

const normalizedFile = file.replace(/\\\\/g, "/");
const output =
  host +
  "?vault=" + encodeURIComponent(vault) +
  "&file=" + encodeURIComponent(normalizedFile);

console.log(output);
NODE
`;

const SKILL_FILES = {
  "/skills/obsid-link-builder/SKILL.md": {
    filename: "SKILL.md",
    contentType: "text/markdown; charset=utf-8",
    body: SKILL_MD,
  },
  "/skills/obsid-link-builder/scripts/build_obsid_link.sh": {
    filename: "build_obsid_link.sh",
    contentType: "text/x-shellscript; charset=utf-8",
    body: BUILD_SCRIPT,
  },
};

export default {
  async fetch(request) {
    const url = new URL(request.url);

    const skillFile = SKILL_FILES[url.pathname];
    if (skillFile) {
      return new Response(skillFile.body, {
        status: 200,
        headers: {
          "content-type": skillFile.contentType,
          "content-disposition": `attachment; filename="${skillFile.filename}"`,
          "cache-control": "public, max-age=3600",
        },
      });
    }

    const vault = url.searchParams.get("vault");
    const file = url.searchParams.get("file");
    const hasVault = vault !== null;
    const hasFile = file !== null;

    if (url.pathname === "/" && !hasVault && !hasFile) {
      return new Response(renderHomepage(url.origin), {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    if (!vault || !file) {
      return new Response("Missing `vault` or `file` query parameter", {
        status: 400,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    const location =
      `obsidian://open?vault=${encodeURIComponent(vault)}` +
      `&file=${encodeURIComponent(file)}`;

    return Response.redirect(location, 308);
  },
};

function renderHomepage(origin) {
  const sampleVault = "Obsidian";
  const sampleFile = "Sites/Joost.blog/Posts";
  const sampleUrl =
    `${origin}/?vault=${encodeURIComponent(sampleVault)}` +
    `&file=${encodeURIComponent(sampleFile)}`;

  const skillBase = `${origin}/skills/obsid-link-builder`;
  const codexInstall = [
    "mkdir -p \"$CODEX_HOME/skills/obsid-link-builder/scripts\"",
    `curl -fsSL ${skillBase}/SKILL.md -o \"$CODEX_HOME/skills/obsid-link-builder/SKILL.md\"`,
    `curl -fsSL ${skillBase}/scripts/build_obsid_link.sh -o \"$CODEX_HOME/skills/obsid-link-builder/scripts/build_obsid_link.sh\"`,
    "chmod +x \"$CODEX_HOME/skills/obsid-link-builder/scripts/build_obsid_link.sh\"",
  ].join("\n");

  const claudeInstall = [
    "mkdir -p \"$HOME/.claude/skills/obsid-link-builder/scripts\"",
    `curl -fsSL ${skillBase}/SKILL.md -o \"$HOME/.claude/skills/obsid-link-builder/SKILL.md\"`,
    `curl -fsSL ${skillBase}/scripts/build_obsid_link.sh -o \"$HOME/.claude/skills/obsid-link-builder/scripts/build_obsid_link.sh\"`,
    "chmod +x \"$HOME/.claude/skills/obsid-link-builder/scripts/build_obsid_link.sh\"",
  ].join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>obsid.net - Obsidian Link Redirect</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #090a0d;
      --bg-glow: #141227;
      --panel: #17181d;
      --text: #eceef2;
      --muted: #b2b5bd;
      --border: #2b2f39;
      --accent: #a988ff;
      --accent-hover: #c4b1ff;
    }
    body {
      margin: 0;
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
      background:
        radial-gradient(900px 480px at 68% 12%, rgba(75, 42, 148, 0.2), transparent 60%),
        radial-gradient(600px 340px at 95% 48%, rgba(88, 49, 171, 0.16), transparent 65%),
        var(--bg);
      color: var(--text);
    }
    main {
      max-width: 1120px;
      margin: 0 auto;
      padding: 52px 20px 72px;
    }
    h1, h2, h3 { margin-top: 0; line-height: 1.12; }
    h1 {
      font-size: clamp(2.25rem, 7vw, 4.75rem);
      margin-bottom: 12px;
      letter-spacing: -0.03em;
    }
    h2 {
      font-size: clamp(1.35rem, 2.4vw, 2rem);
      margin-bottom: 12px;
    }
    h3 {
      font-size: 1.08rem;
      color: var(--muted);
      margin-bottom: 10px;
    }
    p, li { line-height: 1.5; color: var(--text); font-size: 1.04rem; }
    .muted { color: var(--muted); }
    .hero {
      max-width: 820px;
      margin-bottom: 34px;
    }
    .hero p {
      font-size: clamp(1.25rem, 2.6vw, 1.9rem);
      line-height: 1.28;
      color: var(--muted);
      margin-top: 0;
      margin-bottom: 0;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 18px;
    }
    .full {
      grid-column: 1 / -1;
    }
    .section-title {
      margin: 6px 0 0;
    }
    .panel {
      background: rgba(23, 24, 29, 0.92);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 20px;
      box-shadow: 0 18px 40px rgba(0, 0, 0, 0.25);
    }
    footer {
      max-width: 1120px;
      margin: 0 auto;
      padding: 0 20px 34px;
      color: var(--muted);
      font-size: 0.94rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      flex-wrap: wrap;
    }
    .repo-link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--muted);
    }
    .repo-link:hover {
      color: var(--text);
      text-decoration: none;
    }
    .repo-link svg {
      width: 16px;
      height: 16px;
      fill: currentColor;
    }
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
      font-size: 0.95em;
      background: #241f33;
      border: 0;
      border-radius: 4px;
      padding: 0.02em 0.22em;
      line-height: inherit;
      white-space: normal;
      overflow-wrap: normal;
      word-break: normal;
      vertical-align: inherit;
    }
    a { color: var(--accent); text-decoration: none; }
    a:hover { color: var(--accent-hover); text-decoration: underline; }
    .command {
      position: relative;
    }
    pre {
      overflow-x: auto;
      background: #12141a;
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 12px;
      margin: 0;
    }
    .copy-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      appearance: none;
      border: 1px solid #3a334b;
      background: #1c1828;
      color: var(--muted);
      border-radius: 8px;
      padding: 6px 10px;
      font-size: 0.86rem;
      font-weight: 600;
      cursor: pointer;
      opacity: 0;
      pointer-events: none;
      transition: opacity 120ms ease;
    }
    .command:hover .copy-btn,
    .command:focus-within .copy-btn {
      opacity: 1;
      pointer-events: auto;
    }
    .copy-btn:hover {
      color: var(--text);
      border-color: #55467b;
    }
    .copy-btn[data-state="copied"] {
      color: #d8ccff;
      border-color: #6b53a5;
      background: #261f38;
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .field label {
      color: var(--muted);
      font-size: 0.95rem;
    }
    .field input {
      width: 100%;
      box-sizing: border-box;
      background: #12141a;
      border: 1px solid var(--border);
      border-radius: 10px;
      color: var(--text);
      padding: 10px 12px;
      font-size: 0.96rem;
    }
    .field input:focus {
      outline: 1px solid #6b53a5;
      border-color: #6b53a5;
    }
    .converter-actions {
      margin-top: 10px;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
    }
    .action-btn {
      appearance: none;
      border: 1px solid #4f4275;
      background: #2a2340;
      color: #efe9ff;
      border-radius: 9px;
      padding: 8px 12px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
    }
    .action-btn:hover {
      background: #34294f;
      border-color: #66539a;
    }
    .converter-status {
      margin-top: 10px;
      color: var(--muted);
      font-size: 0.94rem;
      min-height: 1.2em;
    }
    @media (max-width: 860px) {
      .grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <h1>Share Obsidian links that actually work in chat.</h1>
      <p class="muted">Want your bot to share links to Obsidian with you in WhatsApp, Telegram, Slack or elsewhere?</p>
      <br />
      <p>Use <code>https://obsid.net/</code> links that redirect to <code>obsidian://</code> deep links.</p>
    </section>
    <section class="grid">
      <div class="panel" id="usage">
        <h2>How to use</h2>
        <ul>
          <li>Add query parameters <code>vault</code> and <code>file</code>.</li>
          <li>Use the resulting URL in WhatsApp, Slack, email, or notes.</li>
        </ul>
        <h3>Example</h3>
        <pre>${escapeHtml(sampleUrl)}</pre>
      </div>

      <div class="panel" id="use-cases">
        <h2>Use Cases</h2>
        <ul>
          <li>Share clickable Obsidian note links in messengers that do not handle <code>obsidian://</code> URLs well.</li>
          <li>Have agents (Codex, OpenClaw, Claude Code) output safe, canonical note links for reports and task updates.</li>
          <li>Convert existing <code>obsidian://open?vault=...&file=...</code> URIs into public <code>https://obsid.net/...</code> links.</li>
        </ul>
      </div>

      <div class="panel full" id="converter">
        <h2>Obsidian URL converter</h2>
        <p>Paste an <code>obsidian://open?vault=...&file=...</code> URL and generate a shareable <code>obsid.net</code> link.</p>
        <div class="field">
          <label for="obsidian-url">Obsidian URL</label>
          <input id="obsidian-url" type="text" autocomplete="off" spellcheck="false" placeholder="obsidian://open?vault=Obsidian&file=Folder%2FNote" />
        </div>
        <div class="field" style="margin-top: 12px;">
          <label for="obsid-url">obsid.net URL</label>
          <input id="obsid-url" type="text" readonly placeholder="https://obsid.net/?vault=...&file=..." />
        </div>
        <div class="converter-actions">
          <button class="action-btn" id="convert-btn" type="button">Convert</button>
          <button class="action-btn" id="copy-converted-btn" type="button">Copy result</button>
        </div>
        <p class="converter-status" id="converter-status" aria-live="polite"></p>
      </div>

      <div class="panel" id="skill">
        <h2>Agent Skill: obsid-link-builder</h2>
        <p>Use this skill in Codex, OpenClaw, and Claude Code to generate canonical <code>obsid.net</code> links.</p>
        <ul>
          <li><a href="${escapeHtml(skillBase)}/SKILL.md">Download SKILL.md</a></li>
          <li><a href="${escapeHtml(skillBase)}/scripts/build_obsid_link.sh">Download build_obsid_link.sh</a></li>
        </ul>
      </div>
      <h2 class="full section-title" id="install">Install for your agent</h2>
      <div class="panel">
        <h3>Install for Codex / OpenClaw</h3>
        <div class="command">
          <pre id="codex-install">${escapeHtml(codexInstall)}</pre>
          <button class="copy-btn" type="button" data-copy-target="codex-install">Copy</button>
        </div>
      </div>
      <div class="panel">
        <h3>Install for Claude Code</h3>
        <div class="command">
          <pre id="claude-install">${escapeHtml(claudeInstall)}</pre>
          <button class="copy-btn" type="button" data-copy-target="claude-install">Copy</button>
        </div>
      </div>
    </section>
  </main>
  <footer>
    <span>Copyright 2026, <a href="https://joost.blog">Joost de Valk</a></span>
    <a class="repo-link" href="https://github.com/jdevalk/obsid.net" aria-label="View source on GitHub">
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38
        0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52
        -.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.5-1.07
        -1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0
        .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82
        2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87
        3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013
        8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
      </svg>
      <span>GitHub</span>
    </a>
  </footer>
  <script>
    const origin = ${JSON.stringify(origin)};
    const copyButtons = document.querySelectorAll("[data-copy-target]");
    const convertButton = document.getElementById("convert-btn");
    const copyConvertedButton = document.getElementById("copy-converted-btn");
    const obsidianUrlInput = document.getElementById("obsidian-url");
    const obsidUrlInput = document.getElementById("obsid-url");
    const converterStatus = document.getElementById("converter-status");

    async function copyText(text) {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return;
      }

      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "absolute";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }

    copyButtons.forEach((button) => {
      button.addEventListener("click", async () => {
        const targetId = button.getAttribute("data-copy-target");
        const pre = document.getElementById(targetId);
        if (!pre) return;

        const original = button.textContent;
        try {
          await copyText(pre.innerText.trim());
          button.textContent = "Copied";
          button.dataset.state = "copied";
          setTimeout(() => {
            button.textContent = original;
            button.dataset.state = "";
          }, 1200);
        } catch {
          button.textContent = "Failed";
          setTimeout(() => {
            button.textContent = original;
          }, 1200);
        }
      });
    });

    function convertObsidianUrl(rawUrl) {
      let parsed;
      try {
        parsed = new URL(rawUrl);
      } catch {
        return { error: "Enter a valid obsidian URL." };
      }

      if (parsed.protocol !== "obsidian:" || parsed.hostname !== "open") {
        return { error: "URL must start with obsidian://open" };
      }

      const vault = parsed.searchParams.get("vault") || "";
      const file = parsed.searchParams.get("file") || "";

      if (!vault || !file) {
        return { error: "URL must include both vault and file parameters." };
      }

      const normalizedFile = file.replaceAll("\\\\", "/");
      const converted =
        origin +
        "/?vault=" + encodeURIComponent(vault) +
        "&file=" + encodeURIComponent(normalizedFile);

      return { converted };
    }

    function runConversion() {
      const { converted, error } = convertObsidianUrl(obsidianUrlInput.value.trim());

      if (error) {
        obsidUrlInput.value = "";
        converterStatus.textContent = error;
        return false;
      }

      obsidUrlInput.value = converted;
      converterStatus.textContent = "Converted successfully.";
      return true;
    }

    convertButton?.addEventListener("click", () => {
      runConversion();
    });

    obsidianUrlInput?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        runConversion();
      }
    });

    copyConvertedButton?.addEventListener("click", async () => {
      const hasValue = obsidUrlInput.value.trim().length > 0 || runConversion();
      if (!hasValue) {
        return;
      }

      const original = copyConvertedButton.textContent;
      try {
        await copyText(obsidUrlInput.value.trim());
        copyConvertedButton.textContent = "Copied";
        converterStatus.textContent = "Copied converted URL.";
        setTimeout(() => {
          copyConvertedButton.textContent = original;
        }, 1200);
      } catch {
        converterStatus.textContent = "Could not copy URL.";
      }
    });
  </script>
</body>
</html>`;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
