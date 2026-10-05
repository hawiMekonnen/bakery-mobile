import { generateReceiptSecurityCode } from '../services/bluetoothPrinterService';
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

/**
 * Generates an ESC/POS styled HTML receipt formatted specifically for
 * 58mm (2.28 inch) continuous thermal receipt roll paper.
 * Width is restricted to 58mm / 216pt to prevent standard A4 page rendering.
 */
export function generateReceiptHTML(order, businessName = 'Bakery', paperWidth = '58mm') {
  const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleString() : new Date().toLocaleString();
  const secCode = generateReceiptSecurityCode(order);
  const items = order.items || [];
  const is80mm = paperWidth === '80mm';
  const widthMm = is80mm ? '80mm' : '58mm';
  const maxPx = is80mm ? '280px' : '204px';

  const itemsRows = items.map(item => `
    <tr>
      <td style="padding: 3px 0; font-size: 11px; word-break: break-word;">${item.name} x${item.quantity}</td>
      <td style="padding: 3px 0; font-size: 11px; text-align: right; white-space: nowrap;">$${(Number(item.price) * Number(item.quantity)).toFixed(2)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>Receipt ${order.id}</title>
        <style>
          @page {
            size: ${widthMm} auto;
            margin: 0mm;
          }
          @media print {
            html, body {
              width: ${widthMm} !important;
              max-width: ${widthMm} !important;
              margin: 0 auto !important;
              padding: 2mm 3mm !important;
            }
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: 'Courier New', Courier, monospace;
            width: ${widthMm};
            max-width: ${maxPx};
            margin: 0 auto;
            padding: 2mm 4mm 6mm 4mm;
            color: #000;
            background: #fff;
            font-size: 11px;
            line-height: 1.25;
            -webkit-print-color-adjust: exact;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .title { font-size: 16px; font-weight: 900; letter-spacing: 0.5px; margin-bottom: 2px; }
          .subtitle { font-size: 10px; color: #333; margin-bottom: 6px; }
          .dashed { border-top: 1px dashed #000; margin: 6px 0; }
          .double-dashed { border-top: 2px dashed #000; margin: 6px 0; }
          table { width: 100%; border-collapse: collapse; }
          .info-table td { font-size: 10px; padding: 1.5px 0; }
          .total-table td { font-size: 11px; padding: 2px 0; }
          .grand-total { font-size: 14px; font-weight: 900; }
          .footer { font-size: 9px; text-align: center; color: #222; margin-top: 10px; line-height: 1.3; }
          .tear-cut { text-align: center; font-size: 8px; color: #666; margin-top: 8px; letter-spacing: 1px; }
        </style>
      </head>
      <body>
        <div class="center">
          <div class="title">${businessName.toUpperCase()}</div>
          <div class="subtitle">Artisan Bakery & Cafe • Fresh Daily</div>
          <div style="font-size: 9px; font-weight: 700; color: #555;">*** THERMAL POS SLIP ***</div>
        </div>

        <div class="dashed"></div>

        <table class="info-table">
          <tr>
            <td><strong>Receipt #:</strong></td>
            <td style="text-align: right;">${order.id}</td>
          </tr>
          <tr>
            <td><strong>Date:</strong></td>
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
          <tr>
            <td><strong>Cashier:</strong></td>
            <td style="text-align: right;">${order.createdBy || order.account || 'Staff'}</td>
          </tr>
          <tr>
            <td><strong>Security Code:</strong></td>
            <td style="text-align: right; font-family: monospace; font-weight: bold;">${secCode}</td>
          </tr>
        </table>

        <div class="dashed"></div>

        <table>
          <thead>
            <tr style="border-bottom: 1px dashed #000;">
              <th style="text-align: left; font-size: 10px; padding-bottom: 3px;">ITEM</th>
              <th style="text-align: right; font-size: 10px; padding-bottom: 3px;">AMOUNT</th>
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
            <td style="padding-top: 4px;">TOTAL:</td>
            <td style="text-align: right; padding-top: 4px;">$${Number(order.total || 0).toFixed(2)}</td>
          </tr>
        </table>

        <div class="double-dashed"></div>

        <div class="footer">
          Thank you for choosing ${businessName}!<br>
          Please come again soon 🥐<br>
          Retain slip for your records
        </div>

        <div class="tear-cut" style="font-weight: bold; margin-bottom: 3px;">*** SEC-VERIFIED: ${secCode} ***</div>
        <div class="tear-cut">- - - - - [ TEAR RECEIPT HERE ] - - - - -</div>
      </body>
    </html>
  `;
}

export function generateReceiptText(order, businessName = 'Bakery') {
  const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleString() : new Date().toLocaleString();
  const secCode = generateReceiptSecurityCode(order);
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
Security: ${secCode} (Anti-Tamper Verified)
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

/**
 * Print directly formatted for 58mm thermal receipt printer roll
 */
export async function printReceipt(order, businessName = 'Bakery', paperWidth = '58mm') {
  const html = generateReceiptHTML(order, businessName, paperWidth);
  const printWidth = paperWidth === '80mm' ? 288 : 216; // 216 pt = 58mm thermal roll standard

  try {
    if (Print && typeof Print.printAsync === 'function') {
      await Print.printAsync({
        html,
        width: printWidth,
      });
      return { success: true };
    }
  } catch (error) {
    console.log('printAsync error, falling back to share:', error);
  }

  // Fallback to PDF share if printAsync fails or on unsupported platform
  return shareReceiptPDF(order, businessName, paperWidth);
}

export async function shareReceiptPDF(order, businessName = 'Bakery', paperWidth = '58mm') {
  const html = generateReceiptHTML(order, businessName, paperWidth);
  const printWidth = paperWidth === '80mm' ? 288 : 216;

  try {
    if (Print && typeof Print.printToFileAsync === 'function') {
      const { uri } = await Print.printToFileAsync({
        html,
        width: printWidth,
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
      });
      if (Sharing && typeof Sharing.isAvailableAsync === 'function' && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(uri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
          dialogTitle: `Receipt ${order.id} (58mm Slip)`,
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
