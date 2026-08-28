/**
 * Contact form backend — Google Apps Script Web App.
 *
 * Receives the POST the edge worker forwards from /api/contact, appends a row
 * to the sheet, and emails the enquiry to you. Setup instructions are in
 * README.md step 6.
 *
 * THIS FILE IS THE SOURCE OF TRUTH. Apps Script lives in Google's editor, which
 * has no diffs, no review and no history anyone will read. Change it here, then
 * paste it there — otherwise the only copy of the logic that handles inbound
 * leads is in a web IDE nobody has open.
 *
 * ------------------------------------------------------------------------
 * THREE DESIGN RULES, each of them the answer to a way this loses a lead.
 *
 * 1. THE EMAIL IS THE DURABLE RECORD, NOT THE SHEET. The sheet is nicer to work
 *    from, but it is the part that can fail: renamed tab, moved file, revoked
 *    access, quota. So the two writes are independent — a sheet failure still
 *    sends the email, and a mail failure still leaves the row. Only both
 *    failing loses anything, and that case emails a plain-text dump.
 *
 * 2. THE VISITOR ALWAYS SEES SUCCESS. There is nothing useful a stranger can do
 *    with "row 41 could not be appended", and an error page on a marketing site
 *    reads as "this company is broken". Failures are our problem and they go to
 *    our inbox. The only thing the visitor ever gets back is the thank-you page.
 *
 * 3. IT NEVER THROWS. An uncaught exception in doPost returns Google's own
 *    error page, on a script.googleusercontent.com URL, to someone who was
 *    trying to buy something. Every path is wrapped.
 * ------------------------------------------------------------------------
 */

/**
 * ─── EDIT FOR YOUR SITE ─────────────────────────────────────────────────────
 * Apps Script cannot import site.ts, so the values it needs live here. Change:
 *   SHEET_ID   — the spreadsheet this script writes to
 *   NOTIFY_TO  — where enquiry emails go
 *   NOTIFY_BCC — colleagues copied on every enquiry
 *   THANKS     — your live thank-you page URL
 * plus the 'Example Co' placeholder in the email subjects (sendNotification,
 * lastResort, selfTest) and the doGet() title.
 */

/** The spreadsheet's ID — the long string in its URL between /d/ and /edit. */
var SHEET_ID = 'PASTE_THE_SPREADSHEET_ID_HERE';

/** Tab names. Both are created automatically, with headers, if missing. */
var TAB = 'Leads';

/**
 * Everything the filters reject lands here instead of being discarded.
 *
 * WHY A REJECTED SUBMISSION IS STILL WORTH KEEPING. A honeypot assumes the only
 * thing that fills an invisible field is a bot. That assumption is aging badly:
 * buyers increasingly send an AI agent to do the first pass of vendor research,
 * and an agent fills every field in the form because it is reading the DOM, not
 * looking at the page. So a tripped honeypot is now a mix of spam AND of exactly
 * the technically-forward buyer we most want to talk to.
 *
 * Discarding a submission purely because an agent made it would be a strange
 * way to treat that buyer.
 *
 * So: filtered rows are stored with a reason, and they do NOT email anyone. The
 * inbox stays clean and quiet, which is what the filter is for; the evidence
 * stays available, which is what the filter was throwing away. Read this tab
 * occasionally — a real name and a real company address in it is a lead.
 */
var FILTERED_TAB = 'Filtered';

/**
 * Where enquiries go. One To, the rest Bcc — and the split matters.
 *
 * replyTo is the prospect, so Reply answers them. If a colleague were in To or
 * Cc, Reply All would answer the prospect AND expose that colleague's address
 * to them. On Bcc it cannot: a Bcc recipient is not in the headers the prospect
 * would ever see, and Reply All from a Bcc'd copy does not reach the others.
 *
 * QUOTA IS COUNTED IN RECIPIENTS, NOT MESSAGES, so Bcc costs a send too. A
 * consumer Gmail account allows 100 recipients a day, a Workspace account
 * 1,500 — at two names, ~50 or ~750 enquiries a day. Far above current volume,
 * but it is what breaks first if this list grows.
 */
var NOTIFY_TO = 'hello@example.com';
var NOTIFY_BCC = 'colleague@example.com';

/** Must match the live page. The edge worker normally redirects before the
 *  browser ever sees this, so it is the fallback path — see below. */
var THANKS = 'https://example.com/contact/thanks';

/**
 * The automation report channel (/content-cadence skill): a POST with
 * action=report and this token appends the run's summary to the Reports tab
 * and emails it to NOTIFY_TO — same sheet, same mail quota, no new vendor.
 *
 * Empty = feature OFF (every report attempt is quarantined). To enable:
 * generate a long random string (`openssl rand -hex 24`), paste it here,
 * re-deploy the web app, and give the same value to the cadence session as
 * the CADENCE_REPORT_TOKEN env var. The token rides in the POST body because
 * Apps Script cannot read request headers at all (see proxyValue below). It
 * gates WRITES to your inbox and sheet, nothing more — rotate it here if it
 * ever leaks and the old one dies with the redeploy.
 */
var REPORT_TOKEN = '';
var REPORT_TAB = 'Reports';

/**
 * Columns, in the order a person reading the sheet wants them: who, then what
 * they said, then where they came from. Appending a new one here is safe;
 * inserting in the middle is not, because appendRow is positional and old rows
 * do not move.
 */
var HEADERS = [
  'Received',
  'Ref',
  'Name',
  'Email',
  'Email domain',
  'Company',
  'Message',
  'Source',
  'Marketing opt-in',
  'Came from',
  'Campaign',
  'Country',
  'IP',
  'Device',
];

/** Same shape as HEADERS, plus why it was filtered. */
var FILTERED_HEADERS = ['Reason'].concat(HEADERS);

function doPost(e) {
  var p = (e && e.parameter) || {};

  try {
    // What actually arrived. Without this, a doPost that silently rejects the
    // submission is indistinguishable in the Executions list from one that
    // wrote a row — both say "Completed".
    console.log('fields=' + Object.keys(p).join(',') + ' email=' + (p.email || '(none)'));

    // The automation report channel. Checked before every lead heuristic —
    // a report has no email field and must not land in Filtered as a lead.
    if (p.action === 'report') return handleReport(p);

    // Honeypot. Filtered, not discarded — see FILTERED_TAB for why an agent
    // filling this field is not the same thing as a bot filling it.
    //
    // Named `hp`, NOT `website`. Chrome and every password manager happily
    // autofill a field called "website" sitting beside name, email and company,
    // which rejects real people and looks identical to spam.
    if (p.hp) {
      console.warn('FILTERED (honeypot): ' + JSON.stringify(p.hp));
      quarantine('honeypot', p, e);
      return thanksPage();
    }

    // An enquiry with no reply address is one we cannot answer. Still kept —
    // it is the clearest signal that something upstream is dropping fields.
    if (!p.email || p.email.indexOf('@') < 0) {
      console.warn('FILTERED (no email): ' + JSON.stringify(p));
      quarantine('no-email', p, e);
      return thanksPage();
    }

    var row = buildRow(p, e);

    // Independent, in this order: the email is what we must not lose.
    var mailed = sendNotification(row);
    var stored = append(TAB, HEADERS, row);

    console.log('mailed=' + mailed + ' stored=' + stored);
    if (!mailed && !stored) lastResort(p);
  } catch (err) {
    lastResort(p, err);
  }

  return thanksPage();
}

/**
 * The content-cadence run report: subject + markdown body, emailed to
 * NOTIFY_TO and appended to the Reports tab. Token-gated (see REPORT_TOKEN);
 * a bad or absent token quarantines the attempt so probing is visible in the
 * sheet without ever reaching the inbox.
 */
function handleReport(p) {
  if (!REPORT_TOKEN || p.token !== REPORT_TOKEN) {
    console.warn('FILTERED (report token): configured=' + Boolean(REPORT_TOKEN));
    quarantine(REPORT_TOKEN ? 'report-bad-token' : 'report-disabled', p, null);
    return ContentService.createTextOutput('denied');
  }
  var subject = trim(p.subject, 180) || 'Content cadence report';
  // Sheets caps a cell at 50,000 characters; the email carries the full body.
  var body = String(p.body || '').slice(0, 100000);
  var mailed = false;
  try {
    MailApp.sendEmail({
      to: NOTIFY_TO,
      subject: '[cadence] ' + subject,
      body: body,
    });
    mailed = true;
  } catch (err) {
    console.error('REPORT MAIL FAILED: ' + err);
  }
  var stored = append(REPORT_TAB, ['When', 'Subject', 'Report'], [new Date(), subject, body.slice(0, 45000)]);
  console.log('report mailed=' + mailed + ' stored=' + stored);
  return ContentService.createTextOutput(mailed || stored ? 'ok' : 'failed');
}

/** One row, built the same way whether it is going to Leads or to Filtered. */
function buildRow(p, e) {
  var email = trim(p.email, 180);
  return [
    new Date(),
    ref(),
    trim(p.name, 120),
    email,
    // Split out so the sheet can be sorted and de-duplicated by company, and so
    // a free-mail address is obvious at a glance. Someone writing from
    // gmail.com is worth a different first reply from someone writing from
    // their own company's domain.
    (email.split('@')[1] || '').toLowerCase(),
    trim(p.company, 160),
    trim(p.message, 4000),
    trim(p.source, 60),
    p.optin === 'yes' ? 'yes' : 'no',
    // LAST TOUCH, not original source. document.referrer is the page
    // immediately before the form, so a visitor who came from Google via a
    // blog post shows the blog post. See the note in ContactForm.astro for why
    // the first referrer is not recoverable here.
    trim(p.ref, 300),
    trim(p.campaign, 120),
    // These three come from the edge worker, not the browser — see the note
    // on proxyValue() and the /api/contact block in worker/index.ts.
    proxyValue(e, '_cc', 8),
    proxyValue(e, '_ip', 64),
    proxyValue(e, '_dev', 16),
  ];
}

/**
 * Store a rejected submission. Deliberately silent: no email, ever. The whole
 * point of the filter is that this does not interrupt anyone.
 */
function quarantine(reason, p, e) {
  try {
    append(FILTERED_TAB, FILTERED_HEADERS, [reason].concat(buildRow(p, e)));
  } catch (err) {
    console.error('FILTERED ROW NOT STORED: ' + err);
  }
}

/**
 * RUN THIS FROM THE EDITOR FIRST — choose `selfTest` in the toolbar, press Run.
 *
 * It does what a real submission does but deliberately catches NOTHING, so a
 * missing permission or a wrong SHEET_ID surfaces as a red error instead of a
 * swallowed false. It is also what makes Google show the authorization prompt:
 * a web app deployed without the Sheets and Gmail scopes granted will run,
 * report "Completed", and write nothing at all.
 */
function selfTest() {
  var sheet = SpreadsheetApp.openById(SHEET_ID);
  console.log('Sheet opened: ' + sheet.getName());

  MailApp.sendEmail({
    to: NOTIFY_TO,
    bcc: NOTIFY_BCC,
    subject: 'Example Co contact form \u2014 self test',
    body: 'If you are reading this, the script can reach Gmail and the sheet.',
  });
  console.log('Mail sent. Remaining quota today: ' + MailApp.getRemainingDailyQuota());

  doPost({
    parameter: {
      name: 'Self test', email: 'selftest@example.com', company: 'Example Co',
      message: 'Written by selfTest()', source: 'self-test',
    },
    parameters: { _cc: ['SG'], _ip: ['127.0.0.1'], _dev: ['desktop'] },
  });
  console.log('doPost completed \u2014 check the Leads tab for a "Self test" row.');

  // And the filtered path, so both tabs are proven in one run.
  doPost({
    parameter: { hp: 'filled-by-a-bot-or-an-agent', name: 'Filter test',
                 email: 'filtertest@example.com', source: 'self-test' },
    parameters: {},
  });
  console.log('Filtered path exercised \u2014 check the Filtered tab.');
}

/**
 * A GET is either someone who found the URL, or Google's own health check.
 * Say nothing about what this is or what it writes to.
 */
function doGet() {
  return HtmlService.createHtmlOutput('<!doctype html><title>Example Co</title>');
}

/* ---------------------------------------------------------------- helpers */

function trim(v, max) {
  return String(v == null ? '' : v)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/**
 * A short reference you can quote in a reply or a call — "your enquiry K3F2QX"
 * — without exposing a row number or a sequence anyone could count.
 */
function ref() {
  var alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1
  var out = '';
  for (var i = 0; i < 6; i++) {
    out += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return out;
}

/**
 * Read one of the values the edge worker appended to the proxied URL.
 *
 * APPS SCRIPT CANNOT SEE REQUEST HEADERS AT ALL — doPost's event object carries
 * parameter, postData, contentLength and little else. There is no way to read
 * the client IP or User-Agent from in here. So the worker, which does have
 * them, puts them on the query string of the URL it proxies to.
 *
 * e.parameter merges the query string with the form body, which means a
 * determined submitter could put `_ip` in their own POST and muddy the record.
 * e.parameters (plural) keeps every value, so two values means someone sent
 * one — say so in the cell rather than silently trusting either. It is a small
 * threat and this is a small answer to it, but a spoofed value that looks
 * genuine is worse than a blank.
 */
function proxyValue(e, key, max) {
  var all = (e && e.parameters && e.parameters[key]) || [];
  if (all.length > 1) return 'spoofed?';
  return trim(all[0], max);
}

function append(tab, headers, row) {
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName(tab);
    if (!sheet) {
      sheet = ss.insertSheet(tab);
      sheet.appendRow(headers);
      sheet.setFrozenRows(1);
    }
    sheet.appendRow(row);
    return true;
  } catch (err) {
    // Executions > click the run > Logs. Silence here was the whole problem:
    // two doPost runs showed "Completed" while writing nothing, because this
    // catch returned false and told nobody.
    console.error('SHEET WRITE FAILED: ' + err);
    return false;
  }
}

/** Look a value up by column name, so adding or moving a column cannot
 *  silently shift what the notification email reports. */
function cell(row, header) {
  var i = HEADERS.indexOf(header);
  return i < 0 ? '' : row[i] || '';
}

function sendNotification(row) {
  try {
    var email = cell(row, 'Email');
    var subject =
      'Example Co enquiry — ' +
      (cell(row, 'Name') || 'someone') +
      (cell(row, 'Company') ? ' \u00b7 ' + cell(row, 'Company') : '');

    var lines = [];
    for (var i = 0; i < HEADERS.length; i++) {
      if (HEADERS[i] === 'Message') continue; // goes at the bottom, in full
      lines.push(pad(HEADERS[i]) + row[i]);
    }

    MailApp.sendEmail({
      to: NOTIFY_TO,
      bcc: NOTIFY_BCC,
      // So hitting reply in Gmail answers the prospect, not yourself. This is
      // the single highest-value line in the file.
      replyTo: email,
      subject: subject,
      body: lines
        .concat([
          '',
          cell(row, 'Message') || '(no message)',
          '',
          '\u2014 reply to this email and it goes straight to them.',
        ])
        .join('\n'),
    });
    return true;
  } catch (err) {
    console.error('EMAIL FAILED: ' + err);
    return false;
  }
}

function pad(s) {
  s = s + ':';
  while (s.length < 20) s += ' ';
  return s;
}

/** Both writes failed. Get the raw payload out of here by any means. */
function lastResort(p, err) {
  try {
    MailApp.sendEmail({
      to: NOTIFY_TO,
      bcc: NOTIFY_BCC,
      subject: 'Example Co contact form FAILED \u2014 payload inside',
      body:
        'Both the sheet write and the notification failed. Raw submission:\n\n' +
        JSON.stringify(p, null, 2) +
        (err ? '\n\nError:\n' + err : ''),
    });
  } catch (ignored) {
    // Nothing left to try. The visitor still gets a thank-you; we lose the lead.
    console.error('LAST RESORT EMAIL ALSO FAILED: ' + ignored);
  }
}

/**
 * What the browser gets back.
 *
 * Normally nobody sees this: the edge worker answers the visitor with its own
 * 303 to /contact/thanks and forwards the POST in the background, so the
 * visitor never leaves your domain. This is the belt to those braces — if the
 * form is ever pointed at the script URL directly, this HTML is what renders. The meta refresh works with JavaScript off; the link covers the case
 * where even that is blocked.
 */
function thanksPage() {
  return HtmlService.createHtmlOutput(
    '<!doctype html><meta charset="utf-8">' +
      '<meta http-equiv="refresh" content="0;url=' +
      THANKS +
      '">' +
      '<title>Thanks</title>' +
      '<p>Thank you — <a href="' +
      THANKS +
      '">continue</a>.</p>'
  ).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
