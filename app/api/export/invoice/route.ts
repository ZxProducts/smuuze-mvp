import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

export async function POST(request: NextRequest, response: NextResponse): Promise<NextResponse> {
  try {
    const data = await request.json();
    console.log(data);
    return NextResponse.json({ message: '請求書のエクスポートに成功しました' }, { status: 200 });
  } catch (error) {
    console.error('エラー:', error);
    return NextResponse.json({ error: 'エラーが発生しました' }, { status: 500 });
  }
}