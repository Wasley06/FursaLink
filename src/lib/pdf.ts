import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getLiveAppUrl } from './liveAppUrl';

type BrandAssets = {
  logoDataUrl?: string | null;
};

let cachedBrand: BrandAssets | null = null;

async function toDataUrlFromUrl(url: string): Promise<string> {
  const res = await fetch(url, { cache: 'force-cache' as any });
  const blob = await res.blob();
  const reader = new FileReader();
  return await new Promise<string>((resolve, reject) => {
    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(blob);
  });
}

export async function getBrandAssets(): Promise<BrandAssets> {
  if (cachedBrand) return cachedBrand;
  try {
    const logoUrl = `${getLiveAppUrl()}/brand/logo.png`;
    const logoDataUrl = await toDataUrlFromUrl(logoUrl);
    cachedBrand = { logoDataUrl };
    return cachedBrand;
  } catch {
    cachedBrand = { logoDataUrl: null };
    return cachedBrand;
  }
}

export function createBrandedPdfDoc(opts?: { title?: string }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  doc.setProperties({ title: opts?.title || 'FursaLink Export' });
  return doc;
}

export async function addFursaLinkHeader(doc: jsPDF, input: { title: string; subtitle?: string }) {
  const { logoDataUrl } = await getBrandAssets();
  const pageWidth = doc.internal.pageSize.getWidth();

  const marginX = 40;
  const y = 34;

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', marginX, y, 34, 34);
    } catch {
      // ignore
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(8, 59, 102); // navy
  doc.text('FursaLink', marginX + 46, y + 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(input.subtitle || 'Zanzibar Employment Portal', marginX + 46, y + 34);

  doc.setDrawColor(226, 232, 240);
  doc.line(marginX, y + 46, pageWidth - marginX, y + 46);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text(input.title, marginX, y + 78);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${new Date().toLocaleString()}`, marginX, y + 96);

  return y + 118;
}

export function addSectionTitle(doc: jsPDF, input: { text: string; y: number }) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(8, 59, 102);
  doc.text(input.text.toUpperCase(), 40, input.y);
  return input.y + 10;
}

export function addKeyValueGrid(doc: jsPDF, input: { y: number; items: Array<{ label: string; value: string }> }) {
  const startY = input.y;
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 40;
  const gap = 10;
  const cols = 3;
  const cardW = (pageWidth - marginX * 2 - gap * (cols - 1)) / cols;
  const cardH = 46;

  doc.setFontSize(9);
  for (let i = 0; i < input.items.length; i += 1) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = marginX + col * (cardW + gap);
    const y = startY + row * (cardH + gap);

    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y, cardW, cardH, 10, 10, 'FD');

    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.text(input.items[i].label.toUpperCase(), x + 10, y + 16);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    const value = input.items[i].value || '-';
    doc.text(doc.splitTextToSize(value, cardW - 20), x + 10, y + 34);
  }

  const rows = Math.ceil(input.items.length / cols);
  return startY + rows * (cardH + gap);
}

export function addTable(doc: jsPDF, input: { startY: number; head: string[][]; body: any[][] }) {
  autoTable(doc, {
    startY: input.startY,
    head: input.head,
    body: input.body,
    theme: 'grid',
    headStyles: { fillColor: [11, 79, 138], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: [15, 23, 42] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: { cellPadding: 6, lineColor: [226, 232, 240], lineWidth: 0.7 },
    margin: { left: 40, right: 40 },
  });
  return (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 18 : input.startY + 40;
}
