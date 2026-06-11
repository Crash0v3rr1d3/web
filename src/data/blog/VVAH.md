toc    true
title    Visa vulnerability agentic harness
description    release analysis of Visa vulnerability agentic harness
pubDate    2026-06-11
author    Crash0v3rr1d3

# Visa's agentic SAST harness and the metric AppSec has been missing

Visa published VVAH (Visa Vulnerability Agentic Harness) on GitHub under Apache 2.0. The repository carries a 2026 copyright and a quiet release: one star, one fork at the time of writing. The README reads like a serious piece of operational thinking dressed in unassuming language.

Visa built VVAH on top of Anthropic's Project Glasswing research. Glasswing is Anthropic's collaboration program with a handful of trusted organizations exploring frontier models for vulnerability research. Visa took those learnings, generalized the pipeline, removed the proprietary plumbing, and shipped what remains.

What remains is interesting for two reasons: the architecture and the metric.

## Triage is the bottleneck

Discussion about AI-assisted security tooling centers on detection. Can the model find the SQL injection? Can it spot the deserialization flaw? Can it identify the broken auth check?

Visa reframes the question. In AI-assisted vulnerability management, triage is the bottleneck. Models surface candidates faster than humans can confirm them. The volume becomes the problem.

The metric Visa proposes is Mean Time to Adapt (MTTA): the time between an AI-flagged weakness and a validated fix in production. MTTA covers detection, triage, exploit verification, prioritization, fix authoring, and rollout. Until a developer ships a fix, a triage-queue finding has no value. MTTA tracks that lag.

## Nine stages across three phases

VVAH runs in three phases.

Discovery and Modeling (stages S1 to S3) maps the attack surface across code, CMDB records, CVE feeds, and existing controls; builds a STRIDE threat model with explicit trust boundaries; then generates a hunting plan that focuses subsequent work on what matters in business context.

Deep Dive and Verification (S4 to S6) runs specialized analytical lenses. The lens list reflects how real bugs cluster: a language specialist, a crypto specialist, a logic-bug specialist, an access-control specialist, one for batch and ETL pipelines, one for infrastructure as code. Each lens contributes candidates. S6 is the adversarial reviewer that traces trust boundaries and tries to construct an exploit chain. Candidates that fail to chain get dropped.

Synthesis and Reporting (S7 to S9) deduplicates, chains exploit primitives into higher-impact attack paths, and emits SARIF 2.1.0 alongside markdown reports. The output format matters: SARIF means findings flow into GitHub Advanced Security, DefectDojo, or whatever the team already uses without conversion.

## Skills as the unit of composition

Each stage ships as a skill. Skills are tunable, versionable, and replaceable without touching the orchestrator. Anthropic uses the same pattern in Claude Code, where SKILL.md files encode capability-specific instructions the model loads on demand.

When a new bug class emerges, an AppSec team adds a lens. When STRIDE proves too coarse for a product area, the team extends the threat-modeling skill. The pipeline keeps working.

## Limitations Visa names up front

The most credible section of the README is the limitations list.

The pipeline produces non-deterministic findings. Two runs against the same code can return different sets. Majority-vote filtering on the SDK and OpenAI backends helps, but the Claude CLI backend cannot control temperature and runs single-pass. Findings are triage candidates, not confirmed vulnerabilities. Human review is mandatory.

The harness is token-hungry. Caps are per-stage, not global, so a complex repository can burn budget unless operators set step-level limits.

No precision or recall figures are published. The team has not put numbers on the false positive rate or the miss rate. Anyone deploying VVAH at scale should treat the first months as calibration.

The elevated-privilege warning is the one production teams need to hear early. VVAH reads source code and executes analysis with broad filesystem access. Pointing it at untrusted repositories without sandboxing exposes credentials.

## Three operational shifts MTTA forces

Teams adopting MTTA face three shifts.

The first shift is in tooling. When SAST tools report findings without structured exploit context, humans absorb the triage burden. MTTA gets worse. Tools that emit SARIF with reproduction steps, affected trust boundaries, and proposed fixes move MTTA in the right direction.

The second shift is in process. The traditional sprint cadence of "log a ticket, assign to a developer, wait" cannot keep up with AI-generated finding volume. MTTA-conscious teams run a triage rotation, a verification harness, and a fix-authoring loop tight enough to clear the queue.

The third shift is in skill mix. A team optimizing MTTA needs more reviewers and exploit-validators per detector than a team optimizing detection coverage. The center of gravity moves from building better detectors to building a faster validation pipeline.

## Worth reading for threat researchers

For those of us working toward threat research roles at vendor labs, VVAH rewards close reading even without deployment. The skill architecture shows how vulnerability research workflows can integrate frontier models without surrendering rigor. The lens taxonomy maps onto how vendor labs organize specialist teams. The MTTA framing translates to how SOCs measure incident response.

Read AGENTS.md and CLAUDE.md alongside the architecture documentation. They contain the operating rules Visa expects an AI agent to follow when running the tool. That is the kind of artifact that becomes table stakes for any vendor shipping agentic security tooling in the next twelve months.

Repository: https://github.com/visa/visa-vulnerability-agentic-harness

If your team measures detection coverage but not MTTA, what does the number look like for your last critical finding?
