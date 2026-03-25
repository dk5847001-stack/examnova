import { env } from "../config/index.js";

const BREVO_TRANSACTIONAL_EMAIL_URL = "https://api.brevo.com/v3/smtp/email";
const BREVO_REQUEST_TIMEOUT_MS = 10_000;

function normalizeRecipients(to) {
  const recipients = Array.isArray(to) ? to : [to];

  return recipients
    .map((recipient) => {
      if (typeof recipient === "string") {
        return { email: recipient.trim() };
      }

      return {
        email: String(recipient?.email || "").trim(),
        ...(recipient?.name ? { name: String(recipient.name).trim() } : {}),
      };
    })
    .filter((recipient) => recipient.email);
}

async function parseBrevoResponse(response) {
  return response.json().catch(() => null);
}

export function createBrevoEmailClient(config = {}) {
  const apiKey = config.apiKey || env.brevoApiKey;
  const senderEmail = config.senderEmail || env.brevoSenderEmail;
  const senderName = config.senderName || env.brevoSenderName;

  return {
    isConfigured() {
      return Boolean(apiKey && senderEmail);
    },

    async send(message) {
      if (!apiKey || !senderEmail) {
        throw new Error("Brevo transactional email is not configured.");
      }

      const recipients = normalizeRecipients(message.to);
      if (!recipients.length) {
        throw new Error("Brevo transactional email requires at least one recipient.");
      }

      const controller = new AbortController();
      const timeoutId = globalThis.setTimeout(() => controller.abort(), BREVO_REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch(BREVO_TRANSACTIONAL_EMAIL_URL, {
          method: "POST",
          headers: {
            accept: "application/json",
            "api-key": apiKey,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            sender: {
              email: senderEmail,
              ...(senderName ? { name: senderName } : {}),
            },
            to: recipients,
            subject: message.subject,
            textContent: message.text,
            htmlContent: message.html,
          }),
          signal: controller.signal,
        });

        const payload = await parseBrevoResponse(response);

        if (!response.ok) {
          const brevoMessage = payload?.message || payload?.code || "Brevo transactional email request failed.";
          throw new Error(`Brevo transactional email request failed with status ${response.status}: ${brevoMessage}`);
        }

        return payload;
      } catch (error) {
        if (error?.name === "AbortError") {
          throw new Error("Brevo transactional email request timed out.");
        }

        throw error;
      } finally {
        globalThis.clearTimeout(timeoutId);
      }
    },
  };
}
