const nodemailer = require('nodemailer');

// Initialize transporter
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.zoho.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465');
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const EMAIL_FROM = process.env.EMAIL_FROM || SMTP_USER;
const EMAIL_ADMIN = process.env.EMAIL_ADMIN || '';
const EMAIL_REPLY_TO = process.env.EMAIL_REPLY_TO || '';

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465, // true for 465, false for other ports
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

function isEmailEnabled() {
  return Boolean(SMTP_USER && SMTP_PASS);
}

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'https://www.ebscloset.com.au';

function formatOrderHtml(order) {
  const itemsRows = (order.products || [])
    .map(
      (p) => `
        <tr>
          <td style="padding:12px; border-bottom:1px solid #eee;">
            <div style="display:flex; align-items:center; gap:12px;">
              ${p.image ? `<img src="${p.image}" alt="${p.title}" width="50" height="50" style="border-radius:4px; object-fit:cover; border:1px solid #eee;" />` : ''}
              <div>
                <div style="font-weight:bold; color:#333;">${p.title}</div>
                ${p.variantName ? `<div style="font-size:12px; color:#666;">Variant: ${p.variantName}</div>` : ''}
              </div>
            </div>
          </td>
          <td style="padding:12px; border-bottom:1px solid #eee; text-align:center; color:#333;">${p.quantity}</td>
          <td style="padding:12px; border-bottom:1px solid #eee; text-align:right; color:#333;">$${Number(p.price || 0).toFixed(2)}</td>
          <td style="padding:12px; border-bottom:1px solid #eee; text-align:right; font-weight:bold; color:#333;">$${(Number(p.price || 0) * Number(p.quantity || 0)).toFixed(2)}</td>
        </tr>`
    )
    .join('');

  const paymentMethodDisplay = order.paymentMethod === 'COD' ? 'Cash on Delivery' : (order.paymentMethod || 'Paid');
  const viewOrderUrl = `${FRONTEND_ORIGIN}/order-success?id=${order._id}`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmation</title>
    </head>
    <body style="margin:0; padding:0; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif; background-color:#f6f6f6; -webkit-font-smoothing:antialiased;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f6f6f6; padding:20px 0;">
        <tr>
          <td align="center">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px; background-color:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 4px 6px rgba(0,0,0,0.05);">
              <!-- Header -->
              <tr>
                <td style="padding:40px 20px; text-align:center; background-color:#000000; color:#ffffff;">
                  <h1 style="margin:0; font-size:24px; letter-spacing:2px; text-transform:uppercase;">EBS CLOSET</h1>
                  <p style="margin:10px 0 0; opacity:0.8; font-size:16px;">Order Confirmation</p>
                </td>
              </tr>

              <!-- Order Status -->
              <tr>
                <td style="padding:30px 30px 20px;">
                  <h2 style="margin:0 0 10px; color:#333; font-size:20px;">Thank you for your order!</h2>
                  <p style="margin:0; color:#666; font-size:15px; line-height:1.5;">
                    Hi ${order.customer?.fullName || 'there'}, we've received your order and it's being processed. We'll send you another update when your items are on their way.
                  </p>
                </td>
              </tr>

              <!-- Order Summary Box -->
              <tr>
                <td style="padding:0 30px 30px;">
                  <div style="background-color:#f9f9f9; border-radius:6px; padding:20px; border:1px solid #eee;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-bottom:8px; font-size:14px; color:#666;">Order Number:</td>
                        <td style="padding-bottom:8px; font-size:14px; color:#333; font-weight:bold; text-align:right;">${order.orderId || order._id}</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom:8px; font-size:14px; color:#666;">Order Date:</td>
                        <td style="padding-bottom:8px; font-size:14px; color:#333; font-weight:bold; text-align:right;">${new Date(order.createdAt || Date.now()).toLocaleDateString('en-AU', { day:'numeric', month:'long', year:'numeric' })}</td>
                      </tr>
                      <tr>
                        <td style="font-size:14px; color:#666;">Payment Mode:</td>
                        <td style="font-size:14px; color:#333; font-weight:bold; text-align:right;">${paymentMethodDisplay}</td>
                      </tr>
                    </table>
                  </div>
                </td>
              </tr>

              <!-- Items Table -->
              <tr>
                <td style="padding:0 30px 20px;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                    <thead>
                      <tr>
                        <th style="text-align:left; padding:12px; border-bottom:2px solid #eee; color:#666; font-size:13px; text-transform:uppercase;">Product</th>
                        <th style="text-align:center; padding:12px; border-bottom:2px solid #eee; color:#666; font-size:13px; text-transform:uppercase;">Qty</th>
                        <th style="text-align:right; padding:12px; border-bottom:2px solid #eee; color:#666; font-size:13px; text-transform:uppercase;">Price</th>
                        <th style="text-align:right; padding:12px; border-bottom:2px solid #eee; color:#666; font-size:13px; text-transform:uppercase;">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${itemsRows}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colspan="3" style="padding:20px 12px 8px; text-align:right; color:#666;">Subtotal</td>
                        <td style="padding:20px 12px 8px; text-align:right; color:#333; font-weight:bold;">$${Number(order.subtotal || 0).toFixed(2)}</td>
                      </tr>
                      ${order.shippingFee ? `
                      <tr>
                        <td colspan="3" style="padding:8px 12px; text-align:right; color:#666;">Shipping</td>
                        <td style="padding:8px 12px; text-align:right; color:#333; font-weight:bold;">$${Number(order.shippingFee).toFixed(2)}</td>
                      </tr>` : ''}
                      <tr>
                        <td colspan="3" style="padding:15px 12px; text-align:right; color:#000; font-size:18px; font-weight:bold; border-top:1px solid #eee;">Total</td>
                        <td style="padding:15px 12px; text-align:right; color:#000; font-size:18px; font-weight:bold; border-top:1px solid #eee;">$${Number(order.totalAmount || 0).toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </td>
              </tr>

              <!-- View Order Button -->
              <tr>
                <td style="padding:0 30px 40px; text-align:center;">
                  <a href="${viewOrderUrl}" style="display:inline-block; padding:15px 30px; background-color:#000000; color:#ffffff; text-decoration:none; border-radius:4px; font-weight:bold; font-size:15px; text-transform:uppercase; letter-spacing:1px;">View Your Order</a>
                </td>
              </tr>

              <!-- Shipping Details -->
              <tr>
                <td style="padding:0 30px 40px;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #eee; padding-top:30px;">
                    <tr>
                      <td width="50%" valign="top" style="padding-right:20px;">
                        <h3 style="margin:0 0 10px; color:#333; font-size:14px; text-transform:uppercase; letter-spacing:1px;">Shipping Address</h3>
                        <div style="font-size:14px; color:#666; line-height:1.6;">
                          <strong>${order.customer?.fullName || ''}</strong><br>
                          ${order.customer?.address || ''}<br>
                          ${order.customer?.city || ''}, ${order.customer?.postalCode || ''}<br>
                          ${order.customer?.country || ''}<br>
                          Phone: ${order.customer?.phone || ''}
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding:30px; background-color:#f9f9f9; text-align:center; border-top:1px solid #eee;">
                  <p style="margin:0 0 10px; font-size:14px; color:#666;">Questions? Contact us at <a href="mailto:${EMAIL_REPLY_TO || SMTP_USER}" style="color:#000; text-decoration:none; font-weight:bold;">${EMAIL_REPLY_TO || SMTP_USER}</a></p>
                  <p style="margin:0; font-size:12px; color:#999;">&copy; ${new Date().getFullYear()} EBS Closet. All rights reserved.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

async function sendEmail({ to, subject, html, text, bcc, replyTo }) {
  if (!isEmailEnabled()) {
    console.warn('Email not sent: missing SMTP configuration');
    return { skipped: true };
  }
  
  const mailOptions = {
    from: EMAIL_FROM,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, ' '),
    ...(bcc ? { bcc } : {}),
    ...(replyTo ? { replyTo } : (EMAIL_REPLY_TO ? { replyTo: EMAIL_REPLY_TO } : {})),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('SMTP error:', err.message || err);
    return { success: false, error: err };
  }
}

async function sendOrderConfirmation(order) {
  const to = order?.customer?.email;
  if (!to) {
    console.warn('Order confirmation skipped: customer email missing');
    return { skipped: true };
  }
  const subject = `Order Confirmed - ${order.orderId || order._id}`;
  const html = formatOrderHtml(order);
  // BCC admin if provided
  const bcc = EMAIL_ADMIN || undefined;
  return sendEmail({ to, subject, html, bcc });
}

module.exports = {
  sendEmail,
  sendOrderConfirmation,
};
