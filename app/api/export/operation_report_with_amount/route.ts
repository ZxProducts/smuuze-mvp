import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { any } from 'zod';

const formatProjectUserTime = (data: any) => {
  // プロジェクトごとにグループ化
  const projectMap = new Map();

  // entries配列を処理
  data.entries.forEach((entry: any) => {
    const { projectId, projectName, userId, userName, duration, taskName, date } = entry;
    
    // duration文字列（HH:MM:SS）を秒数に変換
    const [hours, minutes, seconds] = duration.split(':').map(Number);
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    
    // プロジェクトが存在しない場合は新規作成
    if (!projectMap.has(projectId)) {
      projectMap.set(projectId, {
        projectId,
        projectName,
        users: new Map()
      });
    }

    const project = projectMap.get(projectId);
    
    // ユーザーが存在しない場合は新規作成
    if (!project.users.has(userId)) {
      project.users.set(userId, {
        userId,
        userName,
        totalSeconds: 0,
        tasks: new Map() // タスクごとの時間を記録
      });
    }

    const user = project.users.get(userId);
    
    // タスクの時間を記録
    if (!user.tasks.has(taskName)) {
      user.tasks.set(taskName, {
        totalSeconds: 0,
        entries: [] // 日付ごとの記録を保持
      });
    }
    
    const task = user.tasks.get(taskName);
    task.totalSeconds += totalSeconds;
    task.entries.push({
      date,
      seconds,
      time: formatTime(seconds)
    });
    
    // ユーザーの合計時間を更新
    user.totalSeconds += totalSeconds;
  });

  // Mapを配列に変換し、時間文字列を追加
  return Array.from(projectMap.values()).map(project => ({
    ...project,
    users: Array.from(project.users.values()).map((user: any) => ({
      ...user,
      totalTime: formatTime(user.totalSeconds),
      tasks: Array.from(user.tasks.entries() as IterableIterator<[string, any]>).map(([taskName, taskData]) => ({
        taskName,
        totalSeconds: taskData.totalSeconds,
        totalTime: formatTime(taskData.totalSeconds),
        entries: taskData.entries
      }))
    }))
  }));
};

// 時間フォーマット用のヘルパー関数
const formatTime = (seconds: any) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

const createPdf = (reportArray: any) => {
  // メモリ内でPDFデータを保持するためのバッファ
  let buffers: Uint8Array[] = [];

  // フォントファイルを読み込む
  const notoSansJPRegular = path.join(process.cwd(), 'public/fonts', 'NotoSansJP-Regular.ttf');
  const notoSansJPBold = path.join(process.cwd(), 'public/fonts', 'NotoSansJP-Bold.ttf');

  // PDFドキュメントを作成（約595x842ポイント）
  const doc = new PDFDocument({
    size: 'A4',
    font: notoSansJPRegular,
    margins: {
      top: 50,
      bottom: 50,
      left: 50,
      right: 50,
    },
  });

  doc.on('data', buffers.push.bind(buffers));

  // タイトル
  doc.font(notoSansJPBold)
     .fontSize(24)
     .text('稼働レポート', { align: 'center' });
  
  doc.moveDown();

  // 期間
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  doc.fontSize(14)
     .text(`期間: ${formatDate(firstDayOfMonth)} 〜 ${formatDate(lastDayOfMonth)}`, { align: 'center' });
  
  doc.moveDown();

  // 合計稼働時間
  let totalSeconds = 0;
  reportArray.forEach((project: any) => {
    project.users.forEach((user: any) => {
      totalSeconds += user.totalSeconds;
    });
  });
  
  doc.fontSize(16)
     .text(`合計稼働時間: ${formatTime(totalSeconds)}`, { align: 'center' });
  
  doc.moveDown();
  
  // 罫線
  doc.moveTo(50, doc.y)
     .lineTo(545, doc.y)
     .stroke();
  
  doc.moveDown();

  // プロジェクトごとのデータ
  reportArray.forEach((project: any) => {
    // プロジェクト名
    doc.font(notoSansJPBold)
       .fontSize(16)
       .text(project.projectName);
    
    doc.moveDown(0.5);
    
    // ユーザーごとのデータ
    project.users.forEach((user: any) => {
      // ユーザー名と合計時間
      doc.font(notoSansJPBold)
         .fontSize(14)
         .text(`${user.userName}: ${user.totalTime}`);
      
      // タスクごとのデータ
      user.tasks.forEach((task: any) => {
        doc.fontSize(12)
           .text(`  • ${task.taskName}: ${task.totalTime}`);
        
        // 日付ごとのエントリー
        task.entries.forEach((entry: any) => {
          doc.fontSize(10)
             .text(`    - ${entry.date}: ${entry.time}`);
        });
      });
      
      doc.moveDown();
    });
    
    // プロジェクト間の区切り線
    doc.moveTo(50, doc.y)
       .lineTo(545, doc.y)
       .stroke();
    
    doc.moveDown();
  });

  // PDFを終了
  doc.end();
  
  // バッファを結合してBase64エンコード
  const pdfData = Buffer.concat(buffers);
  return pdfData.toString('base64');
};

// 日付フォーマット用のヘルパー関数
const formatDate = (date: Date) => {
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
};

export async function POST(request: NextRequest, response: NextResponse): Promise<NextResponse> {
  try {
    // リクエストデータを取得
    const data = await request.json();

    // メソッド
    const method = data.method;
    
    // レポートデータを取得
    const reportData = data.reportData;
    console.log('reportData====================');
    console.log(JSON.stringify(reportData));
    
    // プロジェクト毎にユーザーの稼働時間を計算
    const reportArray = formatProjectUserTime(reportData);

    console.log('reportArray====================');
    console.log(JSON.stringify(reportArray));

    let pdf;

    // TODO: メソッドによって処理を分岐
    // operation_report, operation_report_with_amount
    pdf = createPdf(reportArray);

    return NextResponse.json({ pdf: pdf }, { status: 200 });
  } catch (error) {
    console.error('エラー:', error);
    return NextResponse.json({ error: 'エラーが発生しました' }, { status: 500 });
  }
}