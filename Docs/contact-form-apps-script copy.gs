const SHEET_NAME = "Enquiries";

const EXPECTED_HEADERS = [
  "submitted_at",
  "billboard_id",
  "name",
  "company",
  "email",
  "phone",
  "timeline",
  "target_locations",
  "message",
  "source_page"
];

// Simple health check for confirming that the deployed web app is available.
function doGet() {
  return jsonResponse({ ok: true, service: "tūvi pixel enquiry form" });
}

function doPost(event) {
  const lock = LockService.getScriptLock();

  try {
    const data = parseRequest(event);

    // Bots commonly fill this field; real users never see or complete it.
    if (cleanText(data.website)) {
      return jsonResponse({ ok: true });
    }

    validateSubmission(data);
    lock.waitLock(10000);

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error(`Missing sheet tab: ${SHEET_NAME}`);

    verifyHeaders(sheet);

    const now = new Date();
    const timezone = Session.getScriptTimeZone() || "Asia/Kolkata";
    sheet.appendRow([
      now,
      safeCell(data.billboard),
      safeCell(data.name),
      safeCell(data.company),
      safeCell(data.email).toLowerCase(),
      safeCell(data.phone),
      safeCell(data.timeline),
      safeCell(data.locations),
      safeCell(data.message),
      safeCell(data.source_page)
    ]);

    // Saving the enquiry is primary; a notification failure must not lose the row.
    try {
      notifyAdmins(data, now, timezone);
    } catch (notificationError) {
      console.error(`Enquiry saved, but notification failed: ${notificationError.message}`);
    }

    return jsonResponse({ ok: true });
  } catch (error) {
    console.error(error);
    return jsonResponse({ ok: false, error: error.message || "Unable to save enquiry." });
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function parseRequest(event) {
  if (!event || !event.postData || !event.postData.contents) {
    throw new Error("Empty request.");
  }

  try {
    return JSON.parse(event.postData.contents);
  } catch (_error) {
    throw new Error("Invalid request body.");
  }
}

function validateSubmission(data) {
  const required = ["name", "company", "email", "message"];
  const missing = required.filter((field) => !cleanText(data[field]));
  if (missing.length) throw new Error(`Missing required fields: ${missing.join(", ")}`);

  if (!(data.consent === true || data.consent === "true" || data.consent === "on")) {
    throw new Error("Consent is required.");
  }

  const email = cleanText(data.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Invalid email address.");
  }

  if (cleanText(data.message).length > 5000) {
    throw new Error("Message is too long.");
  }
}

function verifyHeaders(sheet) {
  const actualHeaders = sheet
    .getRange(1, 1, 1, EXPECTED_HEADERS.length)
    .getDisplayValues()[0]
    .map((value) => value.trim());

  if (actualHeaders.join("|") !== EXPECTED_HEADERS.join("|")) {
    throw new Error("The Enquiries header row does not match the required columns.");
  }
}

function cleanText(value) {
  return String(value == null ? "" : value).trim();
}

// Prefix spreadsheet formula characters so visitor input remains plain text.
function safeCell(value) {
  const text = cleanText(value).slice(0, 5000);
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

// Add comma-separated recipients in Script Properties as ADMIN_NOTIFICATION_EMAILS.
function notifyAdmins(data, submittedAt, timezone) {
  const properties = PropertiesService.getScriptProperties();
  const recipients = cleanText(properties.getProperty("ADMIN_NOTIFICATION_EMAILS"));
  if (!recipients) return;

  const recipientList = recipients
    .split(",")
    .map((email) => email.trim())
    .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
  if (!recipientList.length) throw new Error("No valid admin notification emails configured.");

  const submittedLabel = Utilities.formatDate(
    submittedAt,
    timezone,
    "dd MMM yyyy, hh:mm a"
  );
  const billboard = cleanText(data.billboard) || "Not selected";
  const phone = cleanText(data.phone) || "Not provided";
  const timeline = cleanText(data.timeline) || "Not provided";
  const locations = cleanText(data.locations) || "Not provided";
  const subject = `New website enquiry · ${cleanText(data.company)}`;

  const plainBody = [
    "A new campaign enquiry was submitted.",
    "",
    `Submitted: ${submittedLabel}`,
    `Billboard: ${billboard}`,
    `Name: ${cleanText(data.name)}`,
    `Company: ${cleanText(data.company)}`,
    `Email: ${cleanText(data.email)}`,
    `Phone: ${phone}`,
    `Timeline: ${timeline}`,
    `Preferred screen: ${locations}`,
    "",
    "Message:",
    cleanText(data.message),
    "",
    `Source page: ${cleanText(data.source_page) || "Not provided"}`
  ].join("\n");

  const htmlBody = `
    <div style="font-family:Arial,sans-serif;color:#17191f;line-height:1.55;max-width:680px">
      <p style="margin:0 0 8px;color:#666;font-size:12px;text-transform:uppercase;letter-spacing:.08em">tūvi pixel website</p>
      <h2 style="margin:0 0 24px;font-size:24px">New campaign enquiry</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        ${emailRow("Submitted", submittedLabel)}
        ${emailRow("Billboard", billboard)}
        ${emailRow("Name", data.name)}
        ${emailRow("Company", data.company)}
        ${emailRow("Email", data.email)}
        ${emailRow("Phone", phone)}
        ${emailRow("Timeline", timeline)}
        ${emailRow("Preferred screen", locations)}
      </table>
      <div style="margin-top:24px;padding:18px;background:#f4f3ef;border-radius:10px">
        <strong style="display:block;margin-bottom:8px">Campaign message</strong>
        <div style="white-space:pre-wrap">${escapeHtml(data.message)}</div>
      </div>
      <p style="margin:20px 0 0;color:#777;font-size:12px">Source: ${escapeHtml(data.source_page || "Not provided")}</p>
    </div>`;

  MailApp.sendEmail({
    to: recipientList.join(","),
    subject,
    body: plainBody,
    htmlBody,
    name: "tūvi pixel Website",
    replyTo: cleanText(data.email)
  });
}

function emailRow(label, value) {
  return `<tr>
    <td style="width:145px;padding:9px 12px 9px 0;color:#777;border-bottom:1px solid #e6e6e2">${escapeHtml(label)}</td>
    <td style="padding:9px 0;border-bottom:1px solid #e6e6e2;font-weight:600">${escapeHtml(value || "Not provided")}</td>
  </tr>`;
}

function escapeHtml(value) {
  return cleanText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
