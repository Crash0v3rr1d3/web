---
title: "Bumblebee: when an advisory drops, which laptops have it on disk?"
description: "Perplexity open-sourced a read-only supply-chain scanner that answers one narrow question well. Plus a community desktop UI for those who want one."
pubDate: 2026-05-25
tags: ["supply-chain", "security", "open-source", "perplexity", "mcp"]
author: "Crash0v3rr1d3"
draft: false
---

Perplexity open-sourced [Bumblebee](https://github.com/perplexityai/bumblebee) on May 22. It is a Go binary that reads on-disk metadata across npm, pnpm, Yarn, Bun, PyPI, Go modules, RubyGems, Composer, editor extensions, browser extensions, and MCP host configs, then either emits NDJSON inventory or matches that inventory against an exposure catalog. Apache 2.0, zero non-stdlib dependencies, macOS and Linux.

The scope is the point.

Read the README and the design is aggressive about what Bumblebee does not do. It runs no package managers. It does not call `npm ls`, `pip show`, or `go list`. It does not read source files. It does not network out. It does not resolve transitive dependencies for you. It opens lockfiles, package-manager install records, extension manifests, and the JSON configs of MCP hosts like Claude Desktop, then writes structured records.

That sounds limited. In incident response it is the right amount of limited.

## The question it answers

A new compromise lands in your inbox. Say a malicious version of an npm package ships under a tag that auto-upgrades, or a Cursor extension gets pulled with credential exfiltration in the bundle. The next forty-five minutes look like this: which developer machines have the bad version on disk right now?

SBOMs do not help. SBOMs describe what shipped to production.

EDR helps too late, or not at all in this shape of problem. EDR sees what ran, what touched the network, what wrote a file. The compromised package may sit in `node_modules` on a laptop that did not open the project this week. Nothing executed. Nothing fired.

Bumblebee covers the gap. It walks the lockfile and the install metadata and tells you: this hostname, this user, this path, this exact version. Then it compares that inventory against a JSON catalog you give it and emits findings.

## The exposure catalog model

The catalog format is small enough to read in one screen:

```json
{
  "schema_version": "0.1.0",
  "entries": [
    {
      "id": "advisory-2026-0042",
      "name": "example-pkg 1.2.3 (compromised release)",
      "ecosystem": "npm",
      "package": "example-pkg",
      "versions": ["1.2.3"],
      "severity": "critical"
    }
  ]
}
```

Matching is exact on `(ecosystem, name, version)`. No range logic, no semver gymnastics. The repo's [`threat_intel/`](https://github.com/perplexityai/bumblebee/tree/main/threat_intel) directory ships curated catalogs built from public reporting, updated through PRs as campaigns surface.

This is a deliberate trade. Range matching brings false positives, and incident response cannot eat false positives at fleet scale. If a campaign hits `example-pkg@1.2.3`, you want to find machines that have `1.2.3` and only `1.2.3`. The next campaign gets its own catalog.

## Three profiles for three populations

The scanner runs in one of three modes. The split matches how an endpoint program operates: a cheap recurring sweep, a per-workspace inventory, and an on-demand incident pass.

- `baseline` walks common global and user package roots, language toolchains, editor extensions, browser extensions, and MCP configs. The cheap recurring scan you run from cron, launchd, or your MDM.
- `project` scans configured developer directories like `~/code` or `~/src`.
- `deep` walks explicit `--root` paths and accepts bare-home roots. The on-demand mode for incident sweeps; combine it with `--exposure-catalog` and `--findings-only` to keep output narrow.

`baseline` and `project` refuse to walk `$HOME`. Only `deep` walks the whole user directory. Cadence is the runner's problem: Bumblebee scans once and exits.

## The MCP angle

This is the part that should make AI-tool-shop security teams pay attention. Bumblebee parses the JSON configs of every common MCP host: `mcp.json`, `.mcp.json`, `claude_desktop_config.json`, `mcp_config.json`, `mcp_settings.json`, `cline_mcp_settings.json`, plus `~/.gemini/settings.json` for Gemini CLI and Code Assist. It enumerates configured servers without resolving or invoking them.

A malicious MCP server is one `npx`-style command in a config file, and the developer machine starts speaking to a process the security team has never seen. Bumblebee inventories those configs so you can match them against any future catalog that names a bad MCP server by package or by command. That is a new ecosystem getting first-class treatment in fleet inventory tooling, and it is the most forward-looking piece of v0.1.

One caveat: non-JSON MCP configs (Codex `config.toml`, Continue YAML) are not parsed in v0.1. Worth tracking when v0.2 lands.

## A community UI for the rest of us

Perplexity shipped the scanner. The scanner emits NDJSON. That is the right primitive for fleet pipelines and SIEM receivers, but it is rough for an individual developer who wants to know whether their own laptop is clean.

[`drmhse/bumblebee-ui`](https://github.com/drmhse/bumblebee-ui) wraps the scanner in a Flutter desktop app. It is a community project, Apache 2.0, with signed macOS DMGs (Apple Silicon and Intel) and an early Linux tarball on the releases page. The bundled helper binary is built from upstream `v0.1.1`.

![Bumblebee Desktop dashboard showing scan progress and findings count](https://raw.githubusercontent.com/drmhse/bumblebee-ui/main/screenshots/dashboard.png)

The dashboard shows scan progress as the scanner streams: packages found, findings, files considered, duration, completion state. Inventory browsing gives you package search, ecosystem filters, confidence labels, and root filters.

![Bumblebee Desktop inventory view with package search and ecosystem filters](https://raw.githubusercontent.com/drmhse/bumblebee-ui/main/screenshots/inventory.png)

Scan history persists locally so you can compare runs:

![Bumblebee Desktop scan history view](https://raw.githubusercontent.com/drmhse/bumblebee-ui/main/screenshots/history.png)

The about pane carries attribution, version, and catalog provenance:

![Bumblebee Desktop about pane with attribution and version](https://raw.githubusercontent.com/drmhse/bumblebee-ui/main/screenshots/about.png)

The UI is not from Perplexity. It is a third-party wrapper. The author published it under Apache 2.0 with signed builds, and the source is open, but you are running a binary that calls a binary. Standard rules apply. Read the manifest. Check the helper hash against upstream `v0.1.1`. Then decide for yourself. The README itself frames the project as something to try under your own risk.

If you are evaluating it on a fleet-managed machine, get sign-off. If you are evaluating it on your own laptop, treat it the way you would treat any unsigned-by-your-EDR-vendor app: read the code path first.

## Where this fits in a security program

Bumblebee is not an SCA tool. It does no vulnerability database lookups, no range matching, no transitive resolution. It is an inventory primitive plus an exact-match filter. If you already run Snyk, Dependabot, or a serious SBOM program, Bumblebee does not replace any of that.

It is a strong fit for incident-response cadence. When an advisory drops and you need to know which laptops touch `example-pkg@1.2.3` in the next forty-five minutes, this is the right shape of tool. Pair it with your MDM as the runner and your SIEM as the receiver.

The MCP inventory work is the most interesting part for 2026. Most fleet tooling has zero visibility into which MCP servers a developer has configured in Claude Desktop or Gemini CLI. Bumblebee gives you a starting point that did not exist a week ago.

## Caveats worth naming

Windows is not supported. The roadmap does not promise it. For shops where most developers run Windows on a managed image, that matters.

Codex and Continue MCP configs are not parsed at v0.1, so any MCP inventory you build today is partial for those hosts.

The catalog format requires exact matches and explicit version arrays. Turning messy advisory text into a working catalog is still manual work, even if you script the LLM-assisted pieces.

And the obvious one: Bumblebee is read-only. It detects. It does not remediate. The remediation step still lives in your endpoint management.

## Try it

```bash
go install github.com/perplexityai/bumblebee/cmd/bumblebee@v0.1.1
bumblebee selftest
bumblebee scan --profile baseline > inventory.ndjson
```

The `selftest` runs against embedded fixtures with fake package names and zero network calls. It is a real smoke test you can put in a deployment pipeline before rollout.

For the desktop UI: [github.com/drmhse/bumblebee-ui](https://github.com/drmhse/bumblebee-ui). Read the source first. Decide for yourself.
