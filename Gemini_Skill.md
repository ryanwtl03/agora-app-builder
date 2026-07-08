---
name: agora-dev-workflow
description: Use this skill for any software development task in a codebase that integrates Agora products (Video Calling, Voice Calling, RTC, RTM/Signaling, Agora Chat/IM, Interactive Whiteboard, Cloud Recording, Speech-to-Text, Conversational AI). Trigger whenever the user asks to build, fix, debug, extend, or review Agora integration code (e.g. "add screen sharing to my Agora video call", "why is my RTM connection dropping", "set up cloud recording", "integrate Agora voice AI agent"), even if they don't mention "Agora" tools by name but reference App ID, App Certificate, channel tokens, RTC/RTM engines, or Agora SDK classes. Assumes the Agora MCP server, Agora Skills, and Agora CLI are already installed and configured — this skill governs *how* to work efficiently with them, not how to install them. Always consult this skill before writing or modifying Agora-related code, even for small changes, to avoid API hallucination and wasted iteration.
---

# Agora Development Workflow

A disciplined, efficiency-first workflow for developing with Agora's SDKs and dev tools. The goal is to minimize wasted iteration: don't guess at APIs, don't skip the tools that are already sitting there configured, and don't research more than the task actually needs.

Assume Agora MCP (`https://mcp.agora.io`), Agora Skills, and Agora CLI (`agoraio-cli`) are already installed. Do not attempt to install or reconfigure them unless a checkup (Step 0) reveals they're missing or broken.

## The Workflow

Follow these steps in order for every non-trivial Agora task. Don't skip steps, but don't over-invest in any single one either — this is meant to speed things up, not add ceremony.

### Step 0: Checkup (only if something seems off)

Don't run diagnostics by default. Only run a checkup when there's a concrete signal something is broken or missing:
- A tool call to the Agora MCP server fails or times out
- Environment variables (App ID / App Certificate) appear missing or invalid
- The Agora CLI isn't recognized, or `agora project doctor` hasn't been run yet in this session
- The user reports connection failures, invalid credentials, or SDK mismatch symptoms

If a checkup is warranted, run:
```bash
agora project doctor --feature <relevant-feature>
```
Fix anything it flags (credentials, enabled product features, network port reachability) before proceeding. If everything is already known-good from earlier in the session, skip this step entirely and move on.

### Step 1: Identify the outcome required

Before touching anything, pin down concretely:
- What product(s) are involved (RTC/video, voice, RTM/signaling, chat, whiteboard, cloud recording, STT, conversational AI)?
- What platform(s) (Web, iOS/macOS, Android, Flutter, React Native, Unity, Unreal, Electron, Windows, Linux)?
- What is the actual end state — a working feature, a bug fix, a refactor, a diagnostic answer?

If the user's request is ambiguous on product or platform, infer from the existing codebase first (check imports, SDK dependencies, project files) rather than asking — only ask if the codebase gives no signal at all.

### Step 2: Take a look at the available tools

Check what's actually available in this environment before planning:
- Is the Agora MCP server connected and responsive?
- Is the Agora CLI available for credential/env management and diagnostics?
- Are Agora Skills (structured `SKILL.md` rule files for specific products) present in the repo or environment? If so, read the relevant product-specific one before writing code — they encode the sanctioned SDK patterns and prevent API hallucination.

Don't assume — a quick check now avoids planning around a tool that isn't actually there.

### Step 3: Plan the process, with or without the tools

Decide, based on Step 1 and Step 2, whether this task needs research at all:
- **Familiar, low-risk change** (e.g. adjusting existing, already-correct SDK calls, simple config tweaks) → skip straight to Step 5 (modify code). Don't research things you already know are correct in this codebase.
- **Anything touching an SDK method signature, callback, event, product you haven't confirmed for this platform/version, or anything security/token-related** → plan to research via Agora MCP (Step 4) before writing code, because hallucinated method names or wrong callback signatures are exactly the failure mode this workflow prevents.

State the plan briefly (to yourself, or to the user if it's a multi-step task) before proceeding: what will change, which files, which SDK surfaces are touched.

### Step 4: Research using Agora MCP (only if needed)

If Step 3 flagged research as necessary, use the MCP tools deliberately rather than broadly:

1. **Unsure what's available?** Use `algolia_search_for_facet_values` to browse products/platforms before deep-searching.
2. **Need a guide, quickstart, or conceptual/architecture answer, or REST API docs (Cloud Recording, STT)?** Use `algolia_search_index_docs_portal_en`, and pass `facet_platform` / `facet_product` to keep results tight to the actual target platform — don't search generically when you know the platform.
3. **Need an exact method signature, class, or callback for non-Swift platforms?** Use `algolia_search_index_agora_api_refapirefcrawler`.
4. **Need Swift/iOS/macOS symbols specifically?** Use `algolia_search_index_agora_swift_api_ref`, filtering `facet_symbol_kind` where useful.
5. **Multi-turn research in the same task?** Reuse a single `sessionId` (UUID) across related calls so relevance improves as you go — don't generate a new one per call.

Keep research scoped to what Step 1 actually requires. One or two well-targeted searches (with the right platform/product facets) beat a broad unfiltered one. Stop researching once you have what you need to write correct code — this workflow optimizes for speed, not exhaustive documentation review.

### Step 5: Modify the code

With the outcome (Step 1) and confirmed API surface (Step 3/4) in hand:
- Make the change directly and precisely — avoid speculative refactors outside the requested scope.
- Match existing project conventions (SDK version, naming, error handling style) already present in the codebase.
- If the change involves credentials, tokens, or environment config, prefer the Agora CLI (`agora project env`) over hand-editing secrets when the CLI is available and already configured.
- After modifying, do a quick sanity pass: does this match what MCP research returned (correct method names, parameters, callback signatures)? If anything was inferred rather than confirmed, flag that to the user rather than presenting it as verified.

## Efficiency principles

- **Don't research what you already know is right.** If existing, working code in the repo already demonstrates the pattern needed, reuse it instead of re-querying MCP.
- **Don't skip research when confidence is actually low.** Guessing at Agora SDK signatures is the single biggest source of wasted iteration — a 10-second MCP lookup is cheaper than a wrong edit and a debug cycle.
- **Match platform and product facets precisely.** Untargeted searches return noisy, cross-platform results that slow down the very next step.
- **Escalate to a checkup only on real signals**, not preemptively — Step 0 exists to catch broken setups, not to be run as ritual.