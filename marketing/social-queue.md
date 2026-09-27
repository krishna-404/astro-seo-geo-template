# Social queue — the posts written for every new piece, waiting to be posted

Every new article ships with its social posts drafted here (content
guidelines § 6). A human posts them and flips the status; `npm run actions`
counts `status: unposted` entries (ACTIONS A-D03) so an unposted draft is
never forgotten. Nothing here renders on the site.

Format, newest first, one block per piece:

```
## YYYY-MM-DD — <slug> — "<title>"
status: unposted | posted:YYYY-MM-DD | dropped:<reason>
url: /blog/<slug>
layer: top | middle | bottom      (the job of the post — content-guidelines § 6)
channel: LinkedIn | X | Reddit | <where STRATEGY.md says the ICP is>
metric: saves and replies, not views

### <channel>
<the post, in the founder's voice, no link in the first line on platforms
that suppress links; the enemy named; one number with its source>
```

Rules: three layers over time, not three posts per piece (a top post for
the strangers, a middle post for the deciders, a bottom post with the ask);
no private individual quoted or screenshotted; every number traces to the
piece's sources; every prompt that drafts a post ends with "Remove all
mannered prose."

---

<!-- Entries land below, newest first. -->
