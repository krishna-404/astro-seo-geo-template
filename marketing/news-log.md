# News log

The record of every news sweep the content engine runs — what was found, what
ran, and above all what was DROPPED and why. The drop-discipline is the whole
point: a news feed that publishes everything it finds is a content farm, and
the log is the memory that stops the same story running twice.

Format, one entry per run, newest first:

```
## YYYY-MM-DD — <cadence> run (<published N | published nothing>)
Published:
1. <slug> — "<title>"
   Primary sources: <the documents themselves — regulator circulars, court
   text, filings, releases — with identifiers; a news article ABOUT a
   document is a pointer to a source, not the source>
   Angle: why this matters to OUR reader, one paragraph.
Dropped, with reasons:
- <candidate> — stale / misdated by aggregators / no operative event yet /
  already covered on <date> / no hook for our reader / press release, not
  reporting / source could not be verified.
Verification catches: <dates that differ across outlets and which was used;
claims that did not survive checking — this section is where trust is built>
```

Rules learned from a production newsdesk:

- **An operative event or nothing.** A bill not yet enacted, a hike not yet
  gazetted, a report "expected soon" — logged as dropped, re-checked next
  run, never written up early.
- **Primary sources only.** If the underlying document cannot be read, the
  piece says so plainly or does not run.
- **Repetition is a drop reason.** "Nothing new since our <date> piece" is a
  finding, not a failure. Publishing 0 is a valid run.
- **Log every drop.** The dropped list is what makes next week's sweep fast
  and keeps the same non-story from being re-litigated forever.

---

<!-- Run entries land below, newest first. -->
