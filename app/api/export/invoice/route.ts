import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';

interface InvoiceData {
  reportData: {
    entries: Array<{
      projectName: string;
      duration: string;
    }>;
  };
  hourlyRate: number;
  billingInfo: {
    companyName: string;
    address: string;
    postalCode: string;
  };
  paymentInfo: {
    companyName: string;
    address: string;
    postalCode: string;
    email: string;
  };
  from: string;
  to: string;
  billingBankInfo: {
    bankName: string;
    bankBranchName: string;
    bankBranchCode: string;
    bankAccountType: string;
    bankAccountNumber: string;
    notes: string;
  };
  paymentBankInfo: {
    bankName: string;
    bankBranchName: string;
    bankBranchCode: string;
    bankAccountType: string;
    bankAccountNumber: string;
    notes: string;
  };
  paymentDate: string;
}

export async function POST(request: NextRequest, response: NextResponse): Promise<NextResponse> {
  try {
    const data = await request.json();
    const invoiceData: InvoiceData = data;

    // 合計時間と金額の計算
    let totalSeconds = 0;
    const projectTotals = new Map<string, { seconds: number; amount: number }>();

    invoiceData.reportData.entries.forEach(entry => {
      const [hours, minutes, seconds] = entry.duration.split(':').map(Number);
      const entrySeconds = hours * 3600 + minutes * 60 + seconds;
      totalSeconds += entrySeconds;

      // プロジェクトごとの集計
      const current = projectTotals.get(entry.projectName) || { seconds: 0, amount: 0 };
      current.seconds += entrySeconds;
      projectTotals.set(entry.projectName, current);
    });

    // プロジェクトごとの金額計算
    projectTotals.forEach((value, key) => {
      const hours = value.seconds / 3600;
      value.amount = Math.floor(hours * invoiceData.hourlyRate);
    });

    // 合計金額
    const totalAmount = Array.from(projectTotals.values()).reduce((sum, current) => sum + current.amount, 0);
    const taxAmount = Math.floor(totalAmount * 0.1); // 10%の消費税

    // PDFを生成
    let buffers: Uint8Array[] = [];
    const notoSansJPRegular = path.join(process.cwd(), 'public/fonts', 'NotoSansJP-Regular.ttf');
    const notoSansJPBold = path.join(process.cwd(), 'public/fonts', 'NotoSansJP-Bold.ttf');

    const doc = new PDFDocument({
      size: 'A4',
      font: notoSansJPRegular,
      margins: {
        top: 40,
        bottom: 40,
        left: 40,
        right: 40,
      },
    });

    doc.on('data', buffers.push.bind(buffers));

    // タイトル
    doc.fontSize(24)
      .text('請求書', { align: 'center' });
    
    doc.moveDown(1);

    // 左側の情報（宛先）
    doc.fontSize(15)
      .text(invoiceData.billingInfo.companyName + ' 御中', { continued: false })
      .moveDown(0.3)
      .fontSize(12)
      .text('〒' + invoiceData.billingInfo.postalCode || '')
      .moveDown(0.3)
      .text(invoiceData.billingInfo.address || '', {
        width: 200,
        align: 'left'
      })
      .moveDown(0.7)
      .text('振込先')
      .moveDown(0.3)
      .text(invoiceData.billingBankInfo.bankName || '')
      .moveDown(0.3)
      .text((invoiceData.billingBankInfo.bankBranchName || '') + '(' + (invoiceData.billingBankInfo.bankBranchCode || '') + ')')
      .moveDown(0.3)
      .text((invoiceData.billingBankInfo.bankAccountType || '') + ' ' + (invoiceData.billingBankInfo.bankAccountNumber || ''))
      .moveDown(0.3)
      .text(invoiceData.billingInfo.companyName || '')
      .moveDown(1)
      .fontSize(9)
      .text('備考')
      .moveDown(0.3)
      .text((invoiceData.billingBankInfo.notes || ''), {
        width: 200,
        align: 'left'
      })
      .moveDown(1)
      .fontSize(14)
      .text('業務委託料（' + format(new Date(invoiceData.from), 'yyyy/MM/dd') + '-' + format(new Date(invoiceData.to), 'yyyy/MM/dd') + '）', {
        align: 'left',
      })
      .moveDown(1);

    // 請求日（yyyy/MM/ddの形式）
    const billingDate = format(new Date(invoiceData.to), 'yyyy/MM/dd');
    // 支払期限はinvoiceData.toの翌月末（yyyy/MM/ddの形式）
    const paymentDate = format(new Date(invoiceData.paymentDate), 'yyyy/MM/dd');

    // 右側の情報（請求元）
    doc.fontSize(12)
      .text(invoiceData.paymentInfo.companyName || '', 300, 150)
      .moveDown(0.3)
      .text('〒' + invoiceData.paymentInfo.postalCode || '', 300)
      .moveDown(0.3)
      .text(invoiceData.paymentInfo.address || '', 300)
      .moveDown(0.5)
      .text('メール: ' + invoiceData.paymentInfo.email || '', 300)
      .moveDown(1)
      .text('請求書番号: ' + format(new Date(), 'yyyyMMdd-HHmmss'), 300)
      .moveDown(0.3)
      .text('請求日: ' + billingDate || '', 300)
      .moveDown(0.3)
      .text('お支払期限: ' + paymentDate || '', 300);

    // 金額テーブルのヘッダー
    doc.moveDown(1);
    const tableTop = doc.y + 70;
    const tableLeft = 40;
    const columnWidth = 100;

    // 小計
    doc.lineWidth(1)
      .rect(tableLeft, tableTop, columnWidth, 30)
      .fillAndStroke('#f8f8f8', '#000000');
    doc.fillColor('black').text('小計', tableLeft + 10, tableTop + 6);

    // うち消費税
    doc.rect(tableLeft + columnWidth, tableTop, columnWidth, 30)
      .fillAndStroke('#f8f8f8', '#000000');
    doc.fillColor('black').text('うち消費税', tableLeft + columnWidth + 10, tableTop + 6);

    // 小計金額
    doc.rect(tableLeft, tableTop + 30, columnWidth, 30).stroke();
    doc.text(totalAmount.toLocaleString() + ' 円', tableLeft + 10, tableTop + 34);

    // うち消費税金額
    doc.rect(tableLeft + columnWidth, tableTop + 30, columnWidth, 30).stroke();
    doc.text(taxAmount.toLocaleString() + ' 円', tableLeft + columnWidth + 10, tableTop + 34);

    // ご請求
    doc.rect(400, tableTop, 165, 30)
      .fillAndStroke('#f8f8f8', '#000000');
    doc.fillColor('black').text('ご請求金額', 410, tableTop + 6);

    // ご請求金額
    doc.rect(400, tableTop + 30, 165, 30)
      .stroke('#000000');
    doc.fillColor('black').text((totalAmount + taxAmount).toLocaleString() + ' 円', 410, tableTop + 34);

    // 明細テーブル
    const detailsTop = tableTop + 80;
    doc.lineWidth(1);

    // ヘッダー
    doc.rect(tableLeft, detailsTop, 525, 30).fillAndStroke('#f8f8f8', '#000000');
    doc.fillColor('black').text('品目', tableLeft + 10, detailsTop + 6);
    doc.text('単価', 300, detailsTop + 6);
    doc.text('数量', 400, detailsTop + 6);
    doc.text('金額', 500, detailsTop + 6);

    // 明細行
    let currentY = detailsTop + 30;
    for (const [projectName, data] of projectTotals) {
      doc.rect(tableLeft, currentY, 525, 30).stroke();
      doc.text(projectName, tableLeft + 10, currentY + 6);
      doc.text(invoiceData.hourlyRate.toLocaleString(), 300, currentY + 6);
      doc.text((data.seconds / 3600).toFixed(2), 400, currentY + 6);
      doc.text(data.amount.toLocaleString(), 500, currentY + 6);
      currentY += 30;
    }

    // 税率別内訳
    const taxDetailsTop = currentY + 20;
    doc.text('税率別内訳', tableLeft, taxDetailsTop);

    // 税率別内訳ヘッダー
    doc.rect(tableLeft, taxDetailsTop, 525, 30).fillAndStroke('#f8f8f8', '#000000');
    doc.fillColor('black').text('税抜金額', 300, taxDetailsTop + 6);
    doc.text('消費税額', 400, taxDetailsTop + 6);
    doc.text('税込金額', 500, taxDetailsTop + 6);

    // 税率別内訳行
    doc.rect(tableLeft, taxDetailsTop + 30, 525, 30).stroke();
    doc.text('10%', tableLeft + 10, taxDetailsTop + 36);
    doc.text(totalAmount.toLocaleString(), 300, taxDetailsTop + 36);
    doc.text(taxAmount.toLocaleString(), 400, taxDetailsTop + 36);
    doc.text((totalAmount + taxAmount).toLocaleString(), 500, taxDetailsTop + 36);

    return new Promise((resolve, reject) => {
      doc.on('end', () => {
        let pdfData = Buffer.concat(buffers);
        const response = new NextResponse(pdfData, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="invoice.pdf"',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        });
        resolve(response);
      });

      doc.on('error', (err) => {
        reject(err);
      });

      doc.end();
    });
  } catch (error) {
    console.error('エラー:', error);
    return NextResponse.json({ error: 'エラーが発生しました' }, { status: 500 });
  }
}