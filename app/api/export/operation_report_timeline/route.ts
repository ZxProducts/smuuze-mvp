import { NextRequest, NextResponse } from 'next/server';
import PDFDocument, { moveDown } from 'pdfkit';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { any } from 'zod';

interface TimelineEntry {
  date: string;
  taskTitle: string;
  projectName: string;
  duration: string;
  userName: string;
  timestamp: number;
}

const formatProjectUserTime = (data: any) => {
  // 全エントリーを時系列順に整理
  const timelineEntries = data.entries.map((entry: any) => {
    const { projectName, userName, duration, taskTitle, startTime } = entry;
    
    // 日付と時間を抽出
    const date = new Date(startTime);
    const formattedDate = date.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
    
    return {
      date: formattedDate,
      taskTitle,
      projectName,
      duration,
      userName,
      timestamp: date.getTime() // ソート用
    };
  });

  // 時系列順にソート（新しい順）
  timelineEntries.sort((a: TimelineEntry, b: TimelineEntry) => b.timestamp - a.timestamp);

  // 合計時間を計算
  const totalSeconds = timelineEntries.reduce((total: number, entry: TimelineEntry) => {
    const [hours, minutes, seconds] = entry.duration.split(':').map(Number);
    return total + (hours * 3600 + minutes * 60 + seconds);
  }, 0);

  return {
    entries: timelineEntries,
    totalSeconds
  };
};

// 時間フォーマット用のヘルパー関数
const formatTime = (seconds: any) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

// 日付フォーマット用のヘルパー関数
const formatDate = (date: Date) => {
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
};

export async function POST(request: NextRequest, response: NextResponse): Promise<NextResponse> {
  try {
    const data = await request.json();
    const reportData = data.reportData;
    const { entries, totalSeconds } = formatProjectUserTime(reportData);

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
    doc.font(notoSansJPRegular)
      .fontSize(24)
      .text('詳細レポート', { align: 'left' });
    
    doc.moveDown(0.1);

    // 期間
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    doc.fontSize(12)
      .text(`${formatDate(firstDayOfMonth)} - ${formatDate(lastDayOfMonth)}`, { align: 'left' });
    
    doc.moveDown(1);
    
    doc.font(notoSansJPRegular)
      .moveDown(0.3)
      .fontSize(12)
      .fillColor('gray')
      .text('合計', { continued: true, baseline: 'bottom' })
      .moveDown(0.1)
      .fontSize(16)
      .fillColor('black')
      .text(` ${formatTime(totalSeconds)}`, { baseline: 'bottom' });

    // カラム設定
    const columns = {
      date: { x: 40, width: 100 },
      description: { x: 140, width: 250 },
      duration: { x: 390, width: 80 },
      user: { x: 470, width: 100 }
    };

    // ヘッダー
    doc.font(notoSansJPRegular)
      .fontSize(10)
      .fillColor('gray');

    const headerOffset = doc.y;
    doc.text('日付', columns.date.x, headerOffset);
    doc.text('説明', columns.description.x, headerOffset);
    doc.text('時間', columns.duration.x, headerOffset);
    doc.text('ユーザー', columns.user.x, headerOffset);

    // 罫線
    doc.moveDown(0.2);
    doc.moveTo(40, doc.y)
      .lineTo(565, doc.y)
      .strokeColor('#D3D3D3') // 色を薄く
      .lineWidth(0.5) // 罫線を細く
      .stroke();
    doc.moveDown(0.2);

    // エントリーの表示
    doc.font(notoSansJPRegular)
      .fontSize(10)
      .fillColor('black');

    let currentY = doc.y;
    const lineHeight = 40; // 1エントリーの高さを広げる

    entries.forEach((entry: any) => {
      // 日付
      doc.text(entry.date, columns.date.x, currentY + 5, {
        width: columns.date.width,
        align: 'left'
      });

      // 説明（タスク名）
      doc.text(`${entry.taskTitle}`, columns.description.x, currentY + 5, {
        width: columns.description.width,
        align: 'left'
      });

      // 説明（プロジェクト名）
      doc.fontSize(8).fillColor('gray').text(`${entry.projectName}`, columns.description.x, currentY + 20, {
        width: columns.description.width,
        align: 'left'
      }).fillColor('black').fontSize(10); // 元のフォントサイズと色に戻す

      // 時間
      doc.text(entry.duration, columns.duration.x, currentY + 5, {
        width: columns.duration.width,
        align: 'left'
      });

      // ユーザー
      doc.text(entry.userName, columns.user.x, currentY + 5, {
        width: columns.user.width,
        align: 'left'
      });

      // 次の行の位置を計算
      currentY += lineHeight;

      // 罫線を追加
      doc.moveTo(40, currentY)
        .lineTo(565, currentY)
        .strokeColor('#D3D3D3') // 色を薄く
        .lineWidth(0.5) // 罫線を細く
        .stroke();

      // ページをまたぐ場合の処理
      if (currentY > doc.page.height - 50) {
        doc.addPage();
        currentY = 50; // 新しいページの開始位置
      }
    });

    // 最後の位置を更新
    doc.y = currentY;

    return new Promise((resolve, reject) => {
      doc.on('end', () => {
        let pdfData = Buffer.concat(buffers);
        const response = new NextResponse(pdfData, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="output.pdf"',
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