/**
 * E-mail templates: typed functions returning subject, HTML and plain text.
 * Links carry only one-time tokens; no personal data beyond the display name.
 */

export interface MailContent {
  subject: string;
  html: string;
  text: string;
}

export interface MailBrand {
  appName: string;
  appUrl: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function layout(brand: MailBrand, title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:24px;background:#f4f6f8;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1a1b1e">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="560" style="max-width:560px;background:#ffffff;border-radius:12px;padding:32px" cellpadding="0" cellspacing="0">
      <tr><td style="font-size:20px;font-weight:700;padding-bottom:16px"><a href="${escapeHtml(brand.appUrl)}" style="color:#228be6;text-decoration:none">${escapeHtml(brand.appName)} 🚀</a></td></tr>
      <tr><td style="font-size:16px;line-height:1.5">${bodyHtml}</td></tr>
      <tr><td style="padding-top:24px;font-size:12px;color:#868e96">You received this e-mail because of an action on ${escapeHtml(brand.appName)}. If it wasn't you, you can ignore it.</td></tr>
    </table>
  </td></tr></table>
</body>
</html>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:24px 0"><a href="${escapeHtml(href)}" style="display:inline-block;background:#228be6;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:8px">${escapeHtml(label)}</a></p><p style="font-size:13px;color:#868e96">Or paste this link into your browser:<br>${escapeHtml(href)}</p>`;
}

export function verifyEmailMail(brand: MailBrand, link: string): MailContent {
  const title = `Confirm your e-mail for ${brand.appName}`;
  return {
    subject: title,
    html: layout(
      brand,
      title,
      `<p>Welcome! Please confirm your e-mail address to activate your account.</p>${button(link, 'Confirm my e-mail')}<p>This link is valid for 24 hours.</p>`,
    ),
    text: `Welcome to ${brand.appName}!\n\nConfirm your e-mail address by opening this link (valid 24 hours):\n${link}\n\nIf you did not create an account, ignore this message.`,
  };
}

export function accountExistsMail(
  brand: MailBrand,
  signinUrl: string,
  resetUrl: string,
): MailContent {
  const title = `You already have a ${brand.appName} account`;
  return {
    subject: title,
    html: layout(
      brand,
      title,
      `<p>Someone (probably you) tried to register with this e-mail address, but an account already exists.</p><p>You can <a href="${escapeHtml(signinUrl)}">sign in</a> or <a href="${escapeHtml(resetUrl)}">reset your password</a> if you forgot it.</p>`,
    ),
    text: `An account with this e-mail already exists on ${brand.appName}.\n\nSign in: ${signinUrl}\nForgot your password? ${resetUrl}`,
  };
}

export function resetPasswordMail(brand: MailBrand, link: string): MailContent {
  const title = `Reset your ${brand.appName} password`;
  return {
    subject: title,
    html: layout(
      brand,
      title,
      `<p>We received a request to reset the password of your account.</p>${button(link, 'Choose a new password')}<p>This link is valid for 1 hour. If you did not request a reset, your password is unchanged.</p>`,
    ),
    text: `Reset your ${brand.appName} password by opening this link (valid 1 hour):\n${link}\n\nIf you did not request a reset, your password is unchanged.`,
  };
}

export function magicLinkMail(brand: MailBrand, link: string): MailContent {
  const title = `Your ${brand.appName} sign-in link`;
  return {
    subject: title,
    html: layout(
      brand,
      title,
      `<p>Here is your one-time sign-in link.</p>${button(link, 'Sign in')}<p>It is valid for 15 minutes and can be used once.</p>`,
    ),
    text: `Sign in to ${brand.appName} with this one-time link (valid 15 minutes):\n${link}`,
  };
}

export function passwordChangedMail(brand: MailBrand, signinUrl: string): MailContent {
  const title = `Your ${brand.appName} password was changed`;
  return {
    subject: title,
    html: layout(
      brand,
      title,
      `<p>The password of your account was just changed and every other session was signed out.</p><p>If this wasn't you, <a href="${escapeHtml(signinUrl)}">reset your password</a> immediately.</p>`,
    ),
    text: `Your ${brand.appName} password was changed and other sessions were signed out.\nIf this wasn't you, reset your password immediately: ${signinUrl}`,
  };
}

export function notificationMail(
  brand: MailBrand,
  params: {
    heading: string;
    body: string;
    link: string;
    linkLabel: string;
    preferencesUrl: string;
  },
): MailContent {
  return {
    subject: `${params.heading} — ${brand.appName}`,
    html: layout(
      brand,
      params.heading,
      `<p><strong>${escapeHtml(params.heading)}</strong></p><p>${escapeHtml(params.body)}</p>${button(params.link, params.linkLabel)}<p style="font-size:13px;color:#868e96">You can turn these e-mails off in your <a href="${escapeHtml(params.preferencesUrl)}">notification preferences</a>.</p>`,
    ),
    text: `${params.heading}\n\n${params.body}\n\n${params.linkLabel}: ${params.link}\n\nManage notification e-mails: ${params.preferencesUrl}`,
  };
}
