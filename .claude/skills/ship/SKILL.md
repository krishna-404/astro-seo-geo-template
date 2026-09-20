---
name: ship
description: Merge the current PR to main and deploy the site to Cloudflare Workers in one go — squash-merge, build, wrangler deploy, cache purge, live verification. Use when the user says "ship", "merge and deploy", or "release".
---

# Ship: merge to main + deploy to Cloudflare

One command-shaped workflow. Every step verifies before the next; stop and
report at the first failure rather than pushing on. This is THE deploy path:
the template ships no automatic GitHub Actions (CHECKLIST §3 — metered
minutes), so nothing deploys a merge except this sequence run from a session
that holds the Cloudflare token.

## Preconditions — check, don't assume

1. The working tree is clean and pushed; `npm run verify` has passed on the
   branch head (the pre-push hook runs it — a recent successful push is the
   evidence). If verify has not run on this exact head, run it now.
2. There is an open PR for the branch. If not, create one first (draft is
   fine; mark ready before merge).
3. Actions note: there are no automatic checks to wait for — `npm run verify`
   on the branch head is the evidence. If a site has enabled CI and it fails with the no-runner signature
   (job dies in seconds, `runner_id: 0`, no logs — an account billing issue,
   not the diff), local verify green is the gate that counts. A *real* CI
   failure (a runner ran and a step failed) blocks the merge — fix it first.

## Steps

1. **Merge**: squash-merge the PR via the GitHub MCP tools
   (`update_pull_request` draft:false if needed, then `merge_pull_request`
   with `merge_method: "squash"`, title styled like the repo's history:
   `<PR title> (#<n>)`).
2. **Sync main**: `git fetch origin main && git checkout main && git pull origin main`.
3. **Build**: `npm run build` — the full build (astro check, sheets, llms.txt,
   markdown twins, pagefind, CSP). A failure here means stop.
4. **Deploy**: `CLOUDFLARE_API_TOKEN="$CLOUDFLARE_DEPLOY_TOKEN" npm run deploy`.
   Success prints the workers.dev URL and a version id. The token is scoped
   Edit Workers on this account only — never a Global API Key.
5. **Purge**: `CLOUDFLARE_API_TOKEN="$CLOUDFLARE_DEPLOY_TOKEN" CLOUDFLARE_ZONE_ID=<zone id> npm run purge`
   (the zone id is in the Cloudflare dashboard's overview; record it in
   PLAYBOOK §6 the first time). If purge 401s, say so and note pages
   self-refresh in ≤5 min (`max-age=300`) — do not treat it as a deploy
   failure.
6. **IndexNow**: `npm run indexnow` — submits the live sitemap to Bing,
   Yandex and Seznam; nothing else pings them (the workflow is manual-only).
7. **Verify live**: `curl -sI <origin>/ | grep -i cf-cache-status` twice —
   expect MISS then HIT — and spot-check one piece of content this deploy
   actually changed (grep the live HTML for it). Then
   `node scripts/smoke-live.mjs` for the full live smoke.
8. **Report**: merged SHA, deployed version id, what was spot-checked. If the
   branch is the designated working branch, restart it from the new main
   (`git checkout -B <branch> origin/main`) so follow-up work never stacks on
   merged history (PLAYBOOK §11: squash merges make stacked branches a
   guaranteed conflict).

## Never

- Never merge over a *real* CI failure or a red local verify.
- Never deploy a dist/ built from a different commit than what was merged —
  build after the main checkout, not before.
- Never skip the live spot-check: "wrangler said success" is not "the change
  is serving".
