# The contact form's Apps Script

Two files, both the source of truth for what lives in Google's editor. The
editor has no diffs, no review and no history anyone will read — change them
here, then paste them there.

| File | What it is |
|---|---|
| `contact-form.gs` | The script: Sheet row + email, honeypot filter, cadence report channel, `selfTest()` |
| `appsscript.json` | The project manifest, and the only reason the consent screen asks for one spreadsheet instead of the whole account |

## Why the manifest matters more than it looks

Left alone, Apps Script decides what to ask the user for by **scanning the
source**, and it rounds up. `SpreadsheetApp.openById()` anywhere in the file
means it must request `https://www.googleapis.com/auth/spreadsheets` — *every*
spreadsheet in the account, in perpetuity, granted by whoever clicks Allow.
That is the prompt people balk at, and it is unnecessary for a script whose job
is one sheet.

So two things are true together, and neither works without the other:

1. **The script is bound to the sheet.** Create it from
   **Extensions → Apps Script inside the spreadsheet**, never as a standalone
   project, and leave `SHEET_ID` empty. `book()` then calls
   `SpreadsheetApp.getActiveSpreadsheet()`, which resolves to the container —
   including inside `doPost`, because the binding belongs to the project, not
   to whoever is signed in.
2. **The manifest pins the scopes**, so inference never runs:
   - `https://www.googleapis.com/auth/spreadsheets.currentonly` — this sheet
   - `https://www.googleapis.com/auth/script.send_mail` — send email as you

   No Drive scope, because nothing here touches Drive.

## Pasting the manifest

Apps Script hides it: **Project Settings → tick "Show `appsscript.json`
manifest file in editor"**, then open it from the file list and paste.

Keep the `timeZone` line the project already shows — it is what `new Date()`
renders as in the sheet, and swapping it silently re-reads every existing
timestamp. Only `oauthScopes` is load-bearing here.

## If it has already been authorized once with the wide scope

A grant is not narrowed by editing the manifest afterwards. After pasting:

1. Revoke the old one at <https://myaccount.google.com/permissions> → find the
   script → Remove access.
2. Run `selfTest()` from the editor and **read the prompt**. It should offer
   exactly two things: this spreadsheet, and sending email as you. Anything
   about Drive or about all your spreadsheets means the manifest did not save,
   or `SHEET_ID` is set.
3. **Deploy → Manage deployments → Edit → New version.** Saving the editor
   changes nothing live; a re-consent does not redeploy either.
4. Submit the real form and confirm the row and the email both land.

## The one case for the wide scope

A standalone script, not bound to any sheet, that must write to a file it does
not contain. Then set `SHEET_ID`, and swap the `currentonly` line in
`appsscript.json` for `https://www.googleapis.com/auth/spreadsheets`. That is
account-wide Sheets access and it is a real cost — take it only when binding
genuinely is not possible.
