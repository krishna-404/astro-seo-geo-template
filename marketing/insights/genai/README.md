# Search Console → Generative AI report exports

**Why a folder of exports.** Search Console's *Generative AI* performance
report (Performance → Generative AI, rolled out to every property on
31 Aug 2026) is the only first-party measure of how often this site is shown
inside **AI Overviews and AI Mode**. It carries impressions by page, country,
device and date — no clicks, no queries — and as of Sep 2026 it is **UI
only**: the Search Analytics API rejects every generative-AI `type` value and
the BigQuery bulk export does not include it. The one door is the report's
**Export** button. So the owner exports, drops the file here, and
`npm run insights` reads the newest one (`scripts/lib/genai.mjs`).

**How to export (two minutes, once a week — the Monday run asks for it).**

1. Search Console → the your Search Console property → **Performance → Generative
   AI**.
2. Set the date range to **Last 28 days** (the same window `npm run insights`
   uses, so the AI-share column joins cleanly).
3. **Export → Download CSV.** Search Console hands back a zip.
4. Save it here as `genai-YYYY-MM-DD.zip` (the date is read from the
   filename; without one the file's modification time is used). Do not
   unzip — the reader opens zips — but an unzipped folder of the CSVs works
   too.
5. Commit. Exports are small and they are the measurement history: the delta
   between two exports is the only trend this report allows.

**What the run does with it** (`.claude/skills/content-cadence/SKILL.md`
step 2e and § The report): pages shown in AI features are strengthened and
linked, not rewritten; pages with web impressions and zero AI impressions get
an answer-shaped opening, a FAQ block in the searcher's words and named
sources; prompt-shaped queries from the ordinary report become FAQ lines.

**Nothing here is site copy.** Numbers from these exports never land on a page.
