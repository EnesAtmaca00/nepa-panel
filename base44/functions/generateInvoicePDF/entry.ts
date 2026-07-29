import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { invoice_id } = await req.json();
  if (!invoice_id) return Response.json({ error: 'invoice_id required' }, { status: 400 });

  const invoices = await base44.asServiceRole.entities.Invoice.filter({ id: invoice_id });
  const invoice = invoices[0];
  if (!invoice) return Response.json({ error: 'Invoice not found' }, { status: 404 });

  const settingsList = await base44.asServiceRole.entities.AppSettings.list();
  const settings = settingsList[0] || {};

  const companies = await base44.asServiceRole.entities.Company.filter({ id: invoice.company_id });
  const company = companies[0] || {};

  // Load template if specified
  let template = null;
  const templateId = invoice.template_id || settings.default_invoice_template_id;
  if (templateId) {
    const templates = await base44.asServiceRole.entities.InvoiceTemplate.filter({ id: templateId });
    template = templates[0];
  }
  if (!template) {
    const allTemplates = await base44.asServiceRole.entities.InvoiceTemplate.list();
    template = allTemplates.find(t => t.is_default) || null;
  }

  // Colors from template or defaults
  const primaryHex = template?.primary_color || '#0f172a';
  const accentHex = template?.accent_color || '#3b82f6';

  const hexToRgb = (hex) => {
    const r = parseInt(hex.slice(1,3), 16);
    const g = parseInt(hex.slice(3,5), 16);
    const b = parseInt(hex.slice(5,7), 16);
    return [r, g, b];
  };

  const [pr, pg, pb] = hexToRgb(primaryHex);
  const [ar, ag, ab] = hexToRgb(accentHex);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const margin = 18;
  const cur = invoice.currency === 'EUR' ? '€' : '₺';

  // ---------- HEADER ----------
  doc.setFillColor(pr, pg, pb);
  doc.rect(0, 0, pageW, 38, 'F');

  // Agency name / logo text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.agency_name || 'Ajans', margin, 14);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(ar, ag, ab);
  if (settings.agency_website) doc.text(settings.agency_website, margin, 20);
  if (settings.agency_email) doc.text(settings.agency_email, margin, 25);

  // FATURA label
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('FATURA', pageW - margin, 15, { align: 'right' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const invoiceNum = invoice.invoice_number || `#${invoice_id.slice(-8).toUpperCase()}`;
  doc.text(invoiceNum, pageW - margin, 22, { align: 'right' });
  doc.setFontSize(8);
  doc.text(`Tarih: ${invoice.issue_date || '-'}`, pageW - margin, 28, { align: 'right' });
  doc.text(`Vade: ${invoice.due_date || '-'}`, pageW - margin, 33, { align: 'right' });

  // Header text from template
  if (template?.header_text) {
    doc.setFontSize(8);
    doc.setTextColor(200, 210, 220);
    doc.text(template.header_text, margin, 33);
  }

  doc.setTextColor(0, 0, 0);

  // ---------- PARTIES ----------
  let y = 46;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(ar, ag, ab);
  doc.text('KESİLEN TARAF (AJANS)', margin, y);
  doc.text('MÜŞTERİ', pageW / 2 + 5, y);

  y += 5;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(settings.agency_name || '-', margin, y);
  doc.text(company.name || invoice.company_name || '-', pageW / 2 + 5, y);

  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);

  const agencyLines = [
    settings.agency_tax_number ? `Vergi No: ${settings.agency_tax_number}${settings.agency_tax_office ? ' / ' + settings.agency_tax_office : ''}` : null,
    settings.agency_address || null,
    [settings.agency_city, settings.agency_country].filter(Boolean).join(', ') || null,
    settings.agency_phone || null,
  ].filter(Boolean);

  const taxNum = invoice.tax_number || company.tax_number;
  const billingAddr = invoice.billing_address || company.billing_address;
  const billingCity = invoice.billing_city || company.billing_city;
  const billingCountry = invoice.billing_country || company.billing_country;
  const billingContact = invoice.billing_contact_name || company.billing_contact_name;
  const billingEmail = invoice.billing_email || company.billing_email || company.email;

  const clientLines = [
    billingContact || null,
    taxNum ? `Vergi No: ${taxNum}` : null,
    billingAddr || null,
    [billingCity, billingCountry].filter(Boolean).join(', ') || null,
    billingEmail || null,
  ].filter(Boolean);

  const maxLines = Math.max(agencyLines.length, clientLines.length);
  for (let i = 0; i < maxLines; i++) {
    if (agencyLines[i]) doc.text(agencyLines[i], margin, y + i * 4);
    if (clientLines[i]) doc.text(clientLines[i], pageW / 2 + 5, y + i * 4);
  }

  y += maxLines * 4 + 6;

  // ---------- TABLE HEADER ----------
  doc.setFillColor(ar, ag, ab);
  doc.rect(margin, y, pageW - 2 * margin, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('AÇIKLAMA', margin + 3, y + 4.8);
  doc.text('MİKTAR', margin + 90, y + 4.8, { align: 'center' });
  doc.text('BİRİM FİYAT', margin + 115, y + 4.8, { align: 'center' });
  doc.text('KDV %', margin + 138, y + 4.8, { align: 'center' });
  doc.text('TUTAR', pageW - margin - 3, y + 4.8, { align: 'right' });
  y += 9;

  // ---------- LINE ITEMS ----------
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  let subtotal = 0;
  let totalTax = 0;

  const lineItems = invoice.line_items && invoice.line_items.length > 0
    ? invoice.line_items
    : [{ description: invoice.service_reference || 'Dijital Pazarlama Hizmetleri', quantity: 1, unit_price: invoice.subtotal || invoice.amount || 0, tax_rate: 20, total: invoice.subtotal || invoice.amount || 0 }];

  lineItems.forEach((item, idx) => {
    const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
    const lineTax = lineTotal * ((item.tax_rate || 0) / 100);
    subtotal += lineTotal;
    if (invoice.tax_mode !== 'included' && invoice.tax_mode !== 'none') totalTax += lineTax;

    doc.setTextColor(30, 30, 30);
    if (idx % 2 === 1) {
      doc.setFillColor(248, 249, 250);
      doc.rect(margin, y - 1, pageW - 2 * margin, 6.5, 'F');
    }

    const desc = (item.description || '-').length > 40 ? (item.description || '-').slice(0, 40) + '...' : (item.description || '-');
    doc.text(desc, margin + 3, y + 3.5);
    doc.text(String(item.quantity || 1), margin + 90, y + 3.5, { align: 'center' });
    doc.text(`${cur}${(item.unit_price || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`, margin + 115, y + 3.5, { align: 'center' });
    doc.text(`%${item.tax_rate || 0}`, margin + 138, y + 3.5, { align: 'center' });
    doc.text(`${cur}${lineTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`, pageW - margin - 3, y + 3.5, { align: 'right' });
    y += 6.5;

    if (y > 260) {
      doc.addPage();
      y = 20;
    }
  });

  // ---------- TOTALS ----------
  y += 4;
  const totalsX = pageW - margin - 58;

  doc.setDrawColor(220, 220, 220);
  doc.line(totalsX, y, pageW - margin, y);
  y += 4;

  const taxMode = invoice.tax_mode || 'excluded';
  let displaySubtotal = subtotal;
  let displayTax = totalTax;
  let displayTotal = subtotal + totalTax;

  if (taxMode === 'included') {
    displayTotal = subtotal;
    displayTax = subtotal - subtotal / 1.2;
    displaySubtotal = subtotal / 1.2;
  } else if (taxMode === 'none') {
    displayTax = 0;
    displayTotal = subtotal;
  }

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Ara Toplam:', totalsX, y);
  doc.text(`${cur}${displaySubtotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`, pageW - margin, y, { align: 'right' });
  y += 5;

  if (taxMode !== 'none') {
    doc.text(`KDV${taxMode === 'included' ? ' (dahil)' : ''}:`, totalsX, y);
    doc.text(`${cur}${displayTax.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`, pageW - margin, y, { align: 'right' });
    y += 5;
  }

  doc.setFillColor(pr, pg, pb);
  doc.rect(totalsX - 2, y - 1, pageW - margin - totalsX + 2, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('TOPLAM:', totalsX, y + 4.5);
  doc.text(`${cur}${displayTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`, pageW - margin - 2, y + 4.5, { align: 'right' });
  y += 14;

  // ---------- BANK / NOTES ----------
  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  const bankDetails = template?.bank_details || (settings.agency_iban ? `IBAN: ${settings.agency_iban}${settings.agency_bank_name ? '\nBanka: ' + settings.agency_bank_name : ''}` : null);
  if (bankDetails) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('ÖDEME BİLGİLERİ:', margin, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    const bankLines = bankDetails.split('\n');
    bankLines.forEach(line => {
      doc.text(line, margin, y);
      y += 4;
    });
    y += 2;
  }

  if (invoice.note) {
    doc.setFont('helvetica', 'bold');
    doc.text('NOT:', margin, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    const noteLines = doc.splitTextToSize(invoice.note, pageW - 2 * margin);
    noteLines.forEach(line => {
      doc.text(line, margin, y);
      y += 4;
    });
  }

  // ---------- TERMS ----------
  const terms = template?.terms || settings.invoice_terms;
  if (terms && y < 260) {
    y += 4;
    doc.setFontSize(7.5);
    doc.setTextColor(150, 150, 150);
    const termLines = doc.splitTextToSize(terms, pageW - 2 * margin);
    termLines.slice(0, 4).forEach(line => {
      doc.text(line, margin, y);
      y += 3.5;
    });
  }

  // ---------- FOOTER ----------
  const footerY = 287;
  doc.setFillColor(pr, pg, pb);
  doc.rect(0, footerY - 4, pageW, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  const footerText = template?.footer_text || `${settings.agency_name || 'Ajans'} — Bizi tercih ettiğiniz için teşekkür ederiz.`;
  doc.text(footerText, pageW / 2, footerY + 2, { align: 'center' });

  const pdfBase64 = doc.output('datauristring');
  await base44.asServiceRole.entities.Invoice.update(invoice_id, { pdf_url: pdfBase64 });

  return Response.json({ success: true, pdf_base64: pdfBase64 });
});