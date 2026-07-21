import nodemailer, { type Transporter } from "nodemailer";

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM } = process.env;
const configured = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS && MAIL_FROM);

// Cache the transport across hot reloads / requests.
const g = globalThis as unknown as { _mailer?: Transporter };

function transport(): Transporter {
  const port = Number(SMTP_PORT ?? 465);
  g._mailer ??= nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465, // 465 = implicit TLS, 587 = STARTTLS
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return g._mailer;
}

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  // ponytail: no SMTP env -> log the code to the server console so the whole
  // signup/verify flow is testable locally without credentials. Set the SMTP_*
  // vars (see .env.example) to send real mail.
  if (!configured) {
    console.log(`[email] OTP for ${to}: ${code}`);
    return;
  }
  await transport().sendMail({
    from: MAIL_FROM,
    to,
    subject: `Your Wins verification code: ${code}`,
    text: `Your verification code is ${code}. It expires in 10 minutes.`,
    html: `<p>Your Wins verification code is <strong style="font-size:1.4em;letter-spacing:0.1em">${code}</strong>.</p><p>It expires in 10 minutes. If you didn't request this, ignore this email.</p>`,
  });
}
