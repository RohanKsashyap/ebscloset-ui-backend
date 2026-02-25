const sgMail = require('@sendgrid/mail');

// Initialize once per process if key provided
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const EMAIL_FROM = process.env.EMAIL_FROM || '';
const EMAIL_ADMIN = process.env.EMAIL_ADMIN || '';
const EMAIL_REPLY_TO = process.env.EMAIL_REPLY_TO || '';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
} else {
  console.warn('SENDGRID_API_KEY not set. Email sending will be skipped.');
}

function isEmailEnabled() {
  return Boolean(SENDGRID_API_KEY && EMAIL_FROM);
}

function formatOrderHtml(order) {
  const itemsRows = (order.products || [])
    .map(
      (p) => `
        <tr>
          <td style="padding:8px 12px;border:1px solid #eee;">
            <div style="display:flex;align-items:center;gap:8px;">
              ${p.image ? `<img src="${p.image}" alt="${p.title}" width="48" height="48" style="border-radius:4px;object-fit:cover;" />` : ''}
              <span>${p.title}${p.variantName ? ` (${p.variantName})` : ''}</span>
            </div>
          </td>
          <td style="padding:8px 12px;border:1px solid #eee;">${p.quantity}</td>
          <td style="padding:8px 12px;border:1px solid #eee;">$${Number(p.price).toFixed(2)}</td>
          <td style="padding:8px 12px;border:1px solid #eee;">$${(Number(p.price) * Number(p.quantity)).toFixed(2)}</td>
        </tr>`
    )
    .join('');

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#333;">
      <h2 style="margin:0 0 12px;">Thank you for your order!</h2>
      <p style="margin:0 0 16px;">Order ID: <strong>${order._id}</strong></p>

      <h3 style="margin:16px 0 8px;">Order Summary</h3>
      <table style="border-collapse:collapse;width:100%;">
        <thead>
          <tr>
            <th style="text-align:left;padding:8px 12px;border:1px solid #eee;">Item</th>
            <th style="text-align:left;padding:8px 12px;border:1px solid #eee;">Qty</th>
            <th style="text-align:left;padding:8px 12px;border:1px solid #eee;">Price</th>
            <th style="text-align:left;padding:8px 12px;border:1px solid #eee;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>

      <p style="margin:16px 0 0;font-size:16px;">Grand Total: <strong>$${Number(order.totalAmount).toFixed(2)}</strong></p>

      <h3 style="margin:16px 0 8px;">Shipping Details</h3>
      <p style="margin:0;">${order.customer?.fullName || ''}</p>
      <p style="margin:0;">${order.customer?.address || ''}</p>
      <p style="margin:0;">${order.customer?.city || ''} ${order.customer?.postalCode || ''}</p>
      <p style="margin:0;">${order.customer?.country || ''}</p>

      <p style="margin:16px 0 0;">We will notify you once your order status changes.</p>
    </div>
  `;
}

async function sendEmail({ to, subject, html, text, bcc, replyTo }) {
  if (!isEmailEnabled()) {
    console.warn('Email not sent: missing SENDGRID_API_KEY or EMAIL_FROM');
    return { skipped: true };
  }
  const msg = {
    to,
    from: EMAIL_FROM,
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, ' '),
    ...(bcc ? { bcc } : {}),
    ...(replyTo ? { replyTo } : (EMAIL_REPLY_TO ? { replyTo: EMAIL_REPLY_TO } : {})),
  };
  try {
    await sgMail.send(msg);
    return { success: true };
  } catch (err) {
    console.error('SendGrid error:', err?.response?.body || err.message || err);
    return { success: false, error: err };
  }
}

async function sendOrderConfirmation(order) {
  const to = order?.customer?.email;
  if (!to) {
    console.warn('Order confirmation skipped: customer email missing');
    return { skipped: true };
  }
  const subject = `Order Confirmed - ${order._id}`;
  const html = formatOrderHtml(order);
  // BCC admin if provided
  const bcc = EMAIL_ADMIN || undefined;
  return sendEmail({ to, subject, html, bcc }); // replyTo is auto-filled from EMAIL_REPLY_TO if set
}

module.exports = {
  sendEmail,
  sendOrderConfirmation,
};