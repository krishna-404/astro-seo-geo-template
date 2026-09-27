---
name: ingest-playbook
description: Ingest an outside playbook — a link, a pasted thread, a PDF, a screenshot, a checklist — and make the repo better with it. Fetch or read it, sort every move into transfers / already covered / refused, route what transfers into the file that owns it (page-guidelines, content-guidelines, runbook, launch-playbook, ACTIONS, a skill step, a script check), mechanize any rule class, record the sort in marketing/playbook-intake.md, and deliver a PR. Use whenever the owner shares a playbook, a "here's how X does it" post, or asks "should we do this".
---

# Ingest a playbook

The owner will keep finding playbooks. Each one is written for a different
buyer, channel and budget, and half of every one is marketing about
marketing. This skill turns one into repo changes without re-arguing it
later, and without adopting anything from memory of it.

Every prompt this skill writes for content ends with the standing line from
`src/data/voice.json → prompt.standing`: Remove all mannered prose.

## 1. Get the source, whole

- A URL: fetch it. An `x.com` link often returns 402/403 to a fetcher; say
  so and ask the owner to paste the text or a screenshot. Never summarise a
  post you could not read.
- A PDF: extract the text (pdfjs works when poppler is absent; `Read` for
  page images). A screenshot: read it as an image and transcribe the moves.
- Pasted text: read all of it. Playbooks bury the one real move under the
  pitch.
- Record title, author, URL (or "pasted"), date and kind.

## 2. List every move

One line per move the source makes: the mechanic, the claim behind it, the
evidence the source offers (self-reported numbers are noted as such). Keep
the source's wording where it is specific. A playbook of "eight hacks" is
eight moves; a case study is the moves that produced the result plus the
result's provenance.

## 3. Sort each move

Three bins, and every move lands in exactly one:

- **Transfers.** The move applies to THIS site's buyer, channel and stack,
  and is not already done. Translate it into our terms (a local-business
  mechanic becomes a directory-category mechanic; a paid-ads loop becomes
  the title-test loop) and name the file that owns it.
- **Already covered.** We do it, often better. Name where, so nobody
  proposes it again as new work.
- **Refused.** With the reason: outside the stack (no paid, no CMS, no
  client JS), against a rule (no fabricated proof, no undisclosed
  amplification, no doorway pages, no self-written ratings), unsupported
  claim, a product plug.

Where a bin depends on something only the owner knows (is there a real
extension to list? does the strategy add paid?), ask them here with
`AskUserQuestion`; what they defer becomes a `DATA-SHEET.md` question.

## 4. Route what transfers

Each transferring move goes into exactly the file that owns that kind of
thing, in that file's format, and in the same PR:

| Kind of move | Goes to |
|---|---|
| what a page must contain | `marketing/page-guidelines.md` (the checklist, a page type, a pattern) |
| how words are written | `marketing/content-guidelines.md`; a mechanical tell → `src/data/voice.json` via /refresh-anti-ai-rules rules (sourced) |
| something the run does daily/weekly/monthly | `marketing/runbook.md` row + the matching step in `.claude/skills/content-cadence/SKILL.md` + the report section it feeds |
| something a human must do | `marketing/ACTIONS.md` item, with a mechanical `Check` wherever one exists |
| a launch move | `marketing/launch-playbook.md` |
| a query shape, a competitor, a watch term | `src/data/intent.json` |
| a listing or a site to pitch | `marketing/link-targets.md` |
| a page to build | `marketing/keyword-map.md` backlog row (with the data it needs) |
| a data pull from an existing connection (Search Console, Umami, Cloudflare, Bing, the connectors this session holds) | the script: `scripts/insights.mjs` + `scripts/lib/*.mjs`, printed in the report and stored in the snapshot |
| a rule class that could recur unnoticed ("every page…", "these two must agree") | a check at the cheapest rung (AGENTS rule 18): `check-source-rules` / `check-parity` / `check-invariants` / `page-audit` / `actions.mjs`; proven red once; CHECKLIST §9 line with the WHY |
| an off-site channel decision | `marketing/channel-gaps.md` |
| a strategy or positioning claim | a Decision in the report for the owner; never written into `STRATEGY.md` by this skill |

Where a move needs an API the repo has no credential for, it becomes an
`ACTIONS.md` item under **Keys** ("give the script X") or a manual item
("do X yourself"), never a stub that pretends to measure.

## 5. Record the sort

Append the entry to `marketing/playbook-intake.md` in its format: source,
kind, one line, transfers with their destinations, already-covered with
where, refused with why, open questions with their Q-ids. The entry is
the reason a rule exists; write it so a reader in a year can weigh the
source.

## 6. Prove and deliver

- Any new check: break the thing once, watch it go red, restore.
- `npm run check:voice` on any content touched; `npm run verify` before
  the PR.
- One PR: the routed changes, the intake entry, the CHECKLIST line for any
  new check. PR body: the source, the count in each bin, the refusals with
  reasons. A human merges.

## What this skill never does

- Adopt a move because the source is confident. Evidence or a mechanism,
  or it is refused.
- Change `STRATEGY.md`, the voice's `site` layer or the merge model. Those
  are the owner's; propose in Decisions.
- Copy the source's copy. Numbers from a playbook are never site copy
  (AGENTS rule 1); its claims are never our claims.
