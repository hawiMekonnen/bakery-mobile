import { Share, Alert, Platform } from 'react-native';

// Safe imports for Expo Print & Sharing
let Print = null;
let Sharing = null;

try {
  Print = require('expo-print');
} catch (e) {
  console.log('expo-print not available');
}

try {
  Sharing = require('expo-sharing');
} catch (e) {
  console.log('expo-sharing not available');
}

export function generateReceiptHTML(order, businessName = 'Bakery') {
  const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleString() : new Date().toLocaleString();
  const items = order.items || [];

  const itemsRows = items.map(item => `
    <tr>
      <td style="padding: 4px 0; font-size: 13px;">${item.name} x${item.quantity}</td>
      <td style="padding: 4px 0; font-size: 13px; text-align: right;">$${(Number(item.price) * Number(item.quantity)).toFixed(2)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Receipt ${order.id}</title>
        <style>
          @page { size: auto; margin: 10mm; }
          body {
            font-family: 'Courier New', Courier, monospace;
            width: 100%;
            max-width: 340px;
            margin: 0 auto;
            padding: 16px;
            color: #111;
            background: #fff;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .title { font-size: 22px; font-weight: 900; letter-spacing: 1.5px; margin-bottom: 2px; }
          .subtitle { font-size: 12px; color: #555; margin-bottom: 12px; }
          .dashed { border-top: 1px dashed #222; margin: 10px 0; }
          .double-dashed { border-top: 2px dashed #222; margin: 10px 0; }
          table { width: 100%; border-collapse: collapse; }
          .info-table td { font-size: 12px; padding: 2px 0; }
          .total-table td { font-size: 13px; padding: 3px 0; }
          .grand-total { font-size: 17px; font-weight: 900; }
          .footer { font-size: 11px; text-align: center; color: #444; margin-top: 16px; line-height: 1.4; }
        </style>
      </head>
      <body>
        <div class="center">
          <div class="title">${businessName.toUpperCase()}</div>
          <div class="subtitle">Artisan Bakery & Cafe • Fresh Daily</div>
        </div>

        <div class="dashed"></div>

        <table class="info-table">
          <tr>
            <td><strong>Receipt #:</strong></td>
            <td style="text-align: right;">${order.id}</td>
          </tr>
          <tr>
            <td><strong>Date & Time:</strong></td>
            <td style="text-align: right;">${dateStr}</td>
          </tr>
          <tr>
            <td><strong>Customer:</strong></td>
            <td style="text-align: right;">${order.customerName || 'Walk-in'}</td>
          </tr>
          <tr>
            <td><strong>Payment:</strong></td>
            <td style="text-align: right;">${order.paymentMethod || 'Cash'}</td>
          </tr>
        </table>

        <div class="dashed"></div>

        <table>
          <thead>
            <tr style="border-bottom: 1px solid #ddd;">
              <th style="text-align: left; font-size: 12px; padding-bottom: 4px;">Item</th>
              <th style="text-align: right; font-size: 12px; padding-bottom: 4px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <div class="dashed"></div>

        <table class="total-table">
          <tr>
            <td>Subtotal:</td>
            <td style="text-align: right;">$${Number(order.subtotal || 0).toFixed(2)}</td>
          </tr>
          <tr>
            <td>Tax (5%):</td>
            <td style="text-align: right;">$${Number(order.tax || 0).toFixed(2)}</td>
          </tr>
          <tr class="grand-total">
            <td style="padding-top: 6px;">TOTAL:</td>
            <td style="text-align: right; padding-top: 6px;">$${Number(order.total || 0).toFixed(2)}</td>
          </tr>
        </table>

        <div class="double-dashed"></div>

        <div class="footer">
          Thank you for choosing ${businessName}!<br>
          Please come again soon 🥐<br>
          *** Retain for your records ***
        </div>
      </body>
    </html>
  `;
}

export function generateReceiptText(order, businessName = 'Bakery') {
  const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleString() : new Date().toLocaleString();
  const itemsText = (order.items || [])
    .map(i => `${i.name} x${i.quantity}  $${(Number(i.price) * Number(i.quantity)).toFixed(2)}`)
    .join('\n');

  return `
================================
         ${businessName.toUpperCase()}
   Artisan Bakery & Cafe
================================
Receipt:  ${order.id}
Date:     ${dateStr}
Customer: ${order.customerName || 'Walk-in'}
Payment:  ${order.paymentMethod || 'Cash'}
--------------------------------
${itemsText}
--------------------------------
Subtotal: $${Number(order.subtotal || 0).toFixed(2)}
Tax (5%): $${Number(order.tax || 0).toFixed(2)}
TOTAL:    $${Number(order.total || 0).toFixed(2)}
================================
Thank you for your visit! 🥐
`.trim();
}

export async function printReceipt(order, businessName = 'Bakery') {
  const html = generateReceiptHTML(order, businessName);

  try {
    if (Print && typeof Print.printAsync === 'function') {
      await Print.printAsync({ html });
      return { success: true };
    }
  } catch (error) {
    console.log('printAsync error, falling back to share:', error);
  }

  // Fallback to PDF share if printAsync fails or on unsupported platform
  return shareReceiptPDF(order, businessName);
}

export async function shareReceiptPDF(order, businessName = 'Bakery') {
  const html = generateReceiptHTML(order, businessName);

  try {
    if (Print && typeof Print.printToFileAsync === 'function') {
      const { uri } = await Print.printToFileAsync({ html });
      if (Sharing && typeof Sharing.isAvailableAsync === 'function' && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(uri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
          dialogTitle: `Receipt ${order.id}`,
        });
        return { success: true };
      }
    }
  } catch (error) {
    console.log('PDF generation/share error:', error);
  }

  // Ultimate fallback: Text Share
  return shareReceiptText(order, businessName);
}

export async function shareReceiptText(order, businessName = 'Bakery') {
  const message = generateReceiptText(order, businessName);
  try {
    await Share.share({
      title: `Receipt ${order.id}`,
      message,
    });
    return { success: true };
  } catch (error) {
    Alert.alert('Receipt', message);
    return { success: false };
  }
}
