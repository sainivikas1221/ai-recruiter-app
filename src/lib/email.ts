import "server-only";
import nodemailer from "nodemailer";

/** True when an SMTP sender is configured (any provider: Gmail, Hostinger mail, Brevo, ...). */
export function emailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

let transport: nodemailer.Transporter | undefined;

function getTransport() {
  if (!transport) {
    const port = Number(process.env.SMTP_PORT) || 465;
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transport;
}

export async function sendEmail(to: string, subject: string, text: string) {
  const from = process.env.EMAIL_FROM || `JobPilot <${process.env.SMTP_USER}>`;
  await getTransport().sendMail({ from, to, subject, text });
}
