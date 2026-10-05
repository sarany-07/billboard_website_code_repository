const SHEET_NAME = "Enquiries";

function doPost(event) {
  const lock = LockService.getScriptLock();

  try {
    const data = JSON.parse(event.postData.contents);

    // Hidden honeypot: silently accept bot submissions without saving them.
    if (data.website) return respond({ ok: true });

    if (!data.name || !data.company || !data.email || !data.message || !data.consent) {
      throw new Error("Please complete all required fields.");
    }

    lock.waitLock(10000);

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error(`Create a sheet tab named ${SHEET_NAME}.`);

    const submittedAt = new Date();

    sheet.appendRow([
      submittedAt,
      safe(data.billboard),
      safe(data.name),
      safe(data.company),
      safe(data.email),
      safe(data.phone),
      safe(data.timeline),
      safe(data.locations),
      safe(data.message),
      safe(data.source_page)
    ]);

    try {
      sendNotification(data);
    } catch (emailError) {
      console.error(`Enquiry saved but email failed: ${emailError.message}`);
    }
    return respond({ ok: true });
  } catch (error) {
    return respond({ ok: false, error: error.message });
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function sendNotification(data) {
  const recipients = PropertiesService.getScriptProperties()
    .getProperty("ADMIN_NOTIFICATION_EMAILS");

  // Email is optional; the enquiry is still saved when no recipients are set.
  if (!recipients) return;

  const message = [
    `Billboard: ${data.billboard || "Not selected"}`,
    `Name: ${data.name}`,
    `Company: ${data.company}`,
    `Email: ${data.email}`,
    `Phone: ${data.phone || "Not provided"}`,
    `Timeline: ${data.timeline || "Not provided"}`,
    `Preferred screen: ${data.locations || "Not provided"}`,
    "",
    "Message:",
    data.message
  ].join("\n");

  MailApp.sendEmail({
    to: recipients,
    subject: `New website enquiry · ${data.company}`,
    body: message,
    replyTo: data.email,
    name: "tūvi pixel Website"
  });
}

// Prevent visitor text from becoming a Google Sheets formula.
function safe(value) {
  const text = String(value || "").trim();
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function respond(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
