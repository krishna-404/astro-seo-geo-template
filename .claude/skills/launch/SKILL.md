---
name: launch
description: Run the launch of a site built from this template with the owner in the session — the technical gate (every launch action in marketing/ACTIONS.md verified, the live smoke green), then the announcement (marketing/launch-playbook.md — category reframe, the day, the tiers from the founder's own network, the promo kit, the first hour, the first thirty days), each decision asked with AskUserQuestion and every answer written into the file that owns it. Use at /new-site phase 12, when the owner says "we're launching", or when ACTIONS.md's launch items are still open after the site is live.
---

# Launch

`marketing/launch-playbook.md` is the plan; this skill runs it with the
owner present. Two halves, in order, and the second does not start until
the first is green.

Every prompt that drafts copy here ends with the standing line from
`src/data/voice.json → prompt.standing`: Remove all mannered prose.

## 1. The gate

1. `npm run actions -- --phase launch`. Every open item is put to the
   owner: the auto-checked ones say what is missing (a key, a placeholder,
   a token); the manual ones are asked one by one with `AskUserQuestion`
   (done / not yet / not applicable with a reason). A "done" is written
   under **Done:** with today's date; a "not applicable" becomes 🚫 with
   the reason. Nothing is ticked on the owner's behalf without their word.
2. `node scripts/smoke-live.mjs` against the live origin; PLAYBOOK §8's
   manual half walked with the owner (the form to the Sheet and the
   email, JS off, 320px, a phone in their hand).
3. The About page checked against `page-guidelines.md § 3`; every Key Facts
   row confirmed by the owner in writing (their reply in the session
   counts; record the date in ACTIONS A-L13).
4. The one KPI. Ask it, with options drawn from the brief: enquiries
   through the form, demo bookings, sign-ups, pre-orders, investor
   meetings. Write it into `STRATEGY.md § 8` with the date.

A gate item the owner cannot resolve today stops the announcement, not
the session: everything in § 2 that does not depend on it proceeds, and
the item goes to `DATA-SHEET.md` in the owner's words.

## 2. The announcement

Work `launch-playbook.md § 1` day by day, asking at each decision:

- **T-10, the category name.** Show three ways the category is named by
  the sites in `marketing/landscape.md` and ask which one the buyer does
  not feel threatened by. The answer goes to `STRATEGY.md § 1` and the
  About page's first sentence.
- **T-7, the day.** Fetch the week's known launches and news in the
  category; propose two slots with the reason; ask. Record it in the
  playbook's Log.
- **T-5, the tiers.** Ask for the names: five to ten voices the buyer
  follows, the ICP-adjacent layer, the inner circle of 15 to 20. Write
  them into `marketing/launch-playbook.md § 3` as a dated table (names the
  owner marks `[private]` stay out of the repo; keep a count instead).
- **T-3, the copy.** Draft the founder's post (proof or provocation in the
  first line, the enemy named, one CTA), one variant per audience, and
  the promo-kit posts in each backer's voice. Put each to the owner. The
  drafts land in `marketing/social-queue.md` as `status: unposted` with
  `layer: top` and the date they go out.
- **T-1, the invite.** Draft the calendar invite text and the war-room
  chat's first message (who watches what, who replies from which account).
- **T-0.** The minute table from `launch-playbook.md § 2`, filled with
  the names the owner gave, as the run sheet.
- **T+1 to T+30.** Schedule the cadence Routine if ACTIONS A-L15 is still
  open; the daily run does the machine half of § 5. Put the day-30 review
  in the owner's calendar (the Google Calendar connector, if attached;
  otherwise ask them to).

## 3. Finish

- ACTIONS A-L14 dated, with the KPI named.
- `marketing/launch-playbook.md` Log: the date, the slot, the counts per
  tier, what changed from the plan.
- Tell the owner the three things the first daily run after launch will
  do (request indexing, the quick-win block, the first competitor rows)
  and what they do themselves tomorrow (post the queue, paste the
  shortlist, reply to every comment).
