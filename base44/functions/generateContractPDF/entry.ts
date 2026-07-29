import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { contract_id } = await req.json();
  if (!contract_id) return Response.json({ error: 'contract_id required' }, { status: 400 });

  const contracts = await base44.asServiceRole.entities.Contract.filter({ id: contract_id });
  const contract = contracts[0];
  if (!contract) return Response.json({ error: 'Contract not found' }, { status: 404 });

  const settingsList = await base44.asServiceRole.entities.AppSettings.list();
  const settings = settingsList[0] || {};

  const companies = await base44.asServiceRole.entities.Company.filter({ id: contract.company_id });
  const company = companies[0] || {};

  let serviceDetails = [];
  if (contract.services && contract.services.length > 0) {
    const allServices = await base44.asServiceRole.entities.ServiceCatalog.list();
    serviceDetails = allServices.filter(s => contract.services.includes(s.id) || contract.services.includes(s.name));
  }

  const typeLabels = { monthly: 'AYLIK HİZMET SÖZLEŞMESİ', yearly: 'YILLIK HİZMET SÖZLEŞMESİ', project: 'PROJE BAZLI SÖZLEŞMESİ' };
  const contractTitle = typeLabels[contract.contract_type] || 'HİZMET SÖZLEŞMESİ';

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const margin = 20;

  // Header band
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageW, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Ne-Pa Panel', margin, 13);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(settings.agency_name || 'Dijital Ajans', margin, 19);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(contractTitle, pageW / 2, 18, { align: 'center' });

  doc.setTextColor(0, 0, 0);

  // Contract ref & date
  let y = 40;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Sözleşme No: #${contract_id.slice(-8).toUpperCase()}`, margin, y);
  doc.text(`Tarih: ${contract.start_date || new Date().toISOString().slice(0, 10)}`, pageW - margin, y, { align: 'right' });

  y += 12;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // Parties
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text('1. TARAFLAR', margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Hizmet Veren (Ajans): ${settings.agency_name || 'Ne-Pa Panel'}`, margin, y);
  y += 5;
  doc.text(`Hizmet Alan (Müşteri): ${company.name || contract.company_name || '-'}`, margin, y);
  if (company.email) { y += 5; doc.text(`E-posta: ${company.email}`, margin, y); }
  if (company.phone) { y += 5; doc.text(`Telefon: ${company.phone}`, margin, y); }

  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('2. SÖZLEŞME SÜRESİ', margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Başlangıç: ${contract.start_date || '-'}   Bitiş: ${contract.end_date || '-'}`, margin, y);

  // Services
  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('3. HİZMETLER', margin, y);
  y += 6;

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, pageW - 2 * margin, 7, 'F');
  doc.setFontSize(9);
  doc.setTextColor(30, 30, 30);
  doc.text('Hizmet', margin + 3, y + 5);
  doc.text('Açıklama', margin + 60, y + 5);
  doc.text('Birim Fiyat', pageW - margin - 3, y + 5, { align: 'right' });
  y += 9;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  const currency = '₺';

  if (serviceDetails.length > 0) {
    serviceDetails.forEach(svc => {
      doc.text(svc.name || '-', margin + 3, y);
      const desc = (svc.description || '').slice(0, 35);
      doc.text(desc, margin + 60, y);
      doc.text(`${currency}${(svc.unit_price || 0).toLocaleString('tr-TR')}`, pageW - margin - 3, y, { align: 'right' });
      y += 6;
    });
  } else {
    doc.text('Dijital Pazarlama Hizmetleri', margin + 3, y);
    doc.text(`${currency}${(contract.monthly_fee || 0).toLocaleString('tr-TR')}/ay`, pageW - margin - 3, y, { align: 'right' });
    y += 6;
  }

  // Fee
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('4. ÜCRET', margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const fee = contract.monthly_fee || 0;
  const kdv = fee * 0.2;
  doc.text(`Aylık Ücret (KDV hariç): ${currency}${fee.toLocaleString('tr-TR')}`, margin, y);
  y += 5;
  doc.text(`KDV (%20): ${currency}${kdv.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`, margin, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(`Toplam (KDV dahil): ${currency}${(fee + kdv).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`, margin, y);

  // Terms
  if (contract.terms) {
    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('5. KOŞULLAR VE ŞARTLAR', margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    const lines = doc.splitTextToSize(contract.terms, pageW - 2 * margin);
    const maxLines = Math.min(lines.length, 15);
    doc.text(lines.slice(0, maxLines), margin, y);
    y += maxLines * 4.5;
  }

  // Signature area
  y = Math.max(y + 10, 230);
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, margin, y + 25);
  doc.line(pageW / 2 + 5, y, pageW / 2 + 5, y + 25);
  y += 28;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(settings.agency_name || 'Ne-Pa Panel', margin + 15, y, { align: 'center' });
  doc.text(company.name || 'Müşteri', pageW / 2 + 5 + 30, y, { align: 'center' });
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('İmza ve Kaşe', margin + 15, y, { align: 'center' });
  doc.text('İmza ve Kaşe', pageW / 2 + 5 + 30, y, { align: 'center' });

  // Footer
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(7);
  doc.text('Ne-Pa Panel | Dijital Ajans Yönetim Sistemi', pageW / 2, 290, { align: 'center' });

  const pdfBase64 = doc.output('datauristring');

  await base44.asServiceRole.entities.Contract.update(contract_id, { pdf_url: pdfBase64 });

  return Response.json({ success: true, pdf_base64: pdfBase64 });
});