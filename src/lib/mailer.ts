import nodemailer from "nodemailer";

// Create reusable transporter
function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendMail({ to, subject, html }: SendMailOptions) {
  // If SMTP not configured, log to console in dev and skip sending
  if (!process.env.SMTP_USER || process.env.SMTP_USER === "your-gmail@gmail.com") {
    console.log("\n📧 [EMAIL NOT SENT – SMTP not configured]");
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log("  Configure SMTP_USER and SMTP_PASS in .env.local to enable email.\n");
    return { success: true, skipped: true };
  }

  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM ?? `QuickIntern <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log("📧 Email sent:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("📧 Email failed:", error);
    // Don't throw – email failure shouldn't break user creation
    return { success: false, error: String(error) };
  }
}

// ── Email Templates ──────────────────────────────────────────

export function internWelcomeEmail({
  name,
  email,
  password,
  internId,
  department,
  manager,
  loginUrl,
}: {
  name: string;
  email: string;
  password: string;
  internId?: string;
  department?: string;
  manager?: string;
  loginUrl: string;
}) {
  return {
    subject: "Welcome to QuickIntern – Your Account Details",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width"/>
  <title>Welcome to QuickIntern</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
        <!-- Header -->
        <tr>
          <td style="background:#0f172a;padding:32px 40px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;letter-spacing:-0.5px;">📋 QuickIntern</h1>
            <p style="color:#94a3b8;margin:6px 0 0;font-size:13px;">Intern Management System</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <h2 style="margin:0 0 8px;color:#0f172a;font-size:20px;">Welcome aboard, ${name}! 🎉</h2>
            <p style="color:#475569;margin:0 0 28px;font-size:15px;line-height:1.6;">
              Your intern account has been created. Use the credentials below to log in and complete your profile.
            </p>

            <!-- Credentials box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:28px;">
              <tr><td style="padding:24px;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Your Login Credentials</p>
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
                  <tr>
                    <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;width:120px;">Email</td>
                    <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:13px;font-weight:600;">${email}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;">Password</td>
                    <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
                      <code style="background:#0f172a;color:#22c55e;padding:3px 10px;border-radius:4px;font-size:14px;font-weight:700;">${password}</code>
                    </td>
                  </tr>
                  ${internId ? `<tr>
                    <td style="padding:8px 0;color:#64748b;font-size:13px;">Intern ID</td>
                    <td style="padding:8px 0;color:#0f172a;font-size:13px;font-weight:600;">${internId}</td>
                  </tr>` : ""}
                </table>
              </td></tr>
            </table>

            <!-- Details -->
            ${(department || manager) ? `
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;margin-bottom:28px;">
              <tr><td style="padding:20px 24px;">
                <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:#3b82f6;text-transform:uppercase;letter-spacing:1px;">Internship Details</p>
                ${department ? `<p style="margin:0 0 6px;font-size:14px;color:#1e3a5f;"><strong>Department:</strong> ${department}</p>` : ""}
                ${manager ? `<p style="margin:0;font-size:14px;color:#1e3a5f;"><strong>Reporting Manager:</strong> ${manager}</p>` : ""}
              </td></tr>
            </table>` : ""}

            <!-- Steps -->
            <p style="margin:0 0 16px;font-size:14px;font-weight:600;color:#0f172a;">Next Steps:</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${["Log in using your credentials below", "Go to <strong>My Documents</strong> to upload required documents", "Complete your profile to get 100% profile completion"].map((step, i) => `
              <tr>
                <td style="padding:6px 0;vertical-align:top;">
                  <span style="display:inline-block;background:#0f172a;color:#fff;border-radius:50%;width:22px;height:22px;text-align:center;line-height:22px;font-size:11px;font-weight:700;margin-right:10px;">${i + 1}</span>
                  <span style="font-size:14px;color:#475569;">${step}</span>
                </td>
              </tr>`).join("")}
            </table>

            <!-- CTA Button -->
            <div style="text-align:center;margin:32px 0 0;">
              <a href="${loginUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:600;letter-spacing:0.2px;">Login to QuickIntern →</a>
            </div>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">Please change your password after your first login. Do not share your credentials with anyone.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}

export function managerWelcomeEmail({
  name,
  email,
  password,
  department,
  designation,
  loginUrl,
}: {
  name: string;
  email: string;
  password: string;
  department?: string;
  designation?: string;
  loginUrl: string;
}) {
  return {
    subject: "Welcome to QuickIntern – Manager Account Created",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width"/>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
        <!-- Header -->
        <tr>
          <td style="background:#4f46e5;padding:32px 40px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">📋 QuickIntern</h1>
            <p style="color:#c7d2fe;margin:6px 0 0;font-size:13px;">Intern Management System</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <h2 style="margin:0 0 8px;color:#0f172a;font-size:20px;">Hello, ${name}!</h2>
            <p style="color:#475569;margin:0 0 28px;font-size:15px;line-height:1.6;">
              A manager account has been created for you on QuickIntern. Use the credentials below to access your dashboard.
            </p>

            <!-- Credentials box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:28px;">
              <tr><td style="padding:24px;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Your Login Credentials</p>
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
                  <tr>
                    <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;width:120px;">Email</td>
                    <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:13px;font-weight:600;">${email}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;">Password</td>
                    <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
                      <code style="background:#4f46e5;color:#ffffff;padding:3px 10px;border-radius:4px;font-size:14px;font-weight:700;">${password}</code>
                    </td>
                  </tr>
                  ${designation ? `<tr>
                    <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;">Designation</td>
                    <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:13px;font-weight:600;">${designation}</td>
                  </tr>` : ""}
                  ${department ? `<tr>
                    <td style="padding:8px 0;color:#64748b;font-size:13px;">Department</td>
                    <td style="padding:8px 0;color:#0f172a;font-size:13px;font-weight:600;">${department}</td>
                  </tr>` : ""}
                </table>
              </td></tr>
            </table>

            <p style="margin:0 0 16px;font-size:14px;font-weight:600;color:#0f172a;">As a Manager you can:</p>
            <ul style="margin:0 0 28px;padding-left:20px;color:#475569;font-size:14px;line-height:2;">
              <li>View and track your assigned interns</li>
              <li>Monitor intern document submission status</li>
              <li>Access your department dashboard</li>
            </ul>

            <div style="text-align:center;margin:32px 0 0;">
              <a href="${loginUrl}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:600;">Login to Dashboard →</a>
            </div>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">Please change your password after your first login. Keep your credentials secure.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}
