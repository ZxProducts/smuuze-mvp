'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { isAfter } from "date-fns"
import { Loader2 } from 'lucide-react';
import { ja } from 'date-fns/locale';
import { useState } from 'react';
import { Calendar } from "@/components/ui/calendar"

interface ExportInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoadingExportInvoice: boolean;
  dateRange: {
    from: Date;
    to: Date;
  }; 
  setDateRange: (dateRange: { from: Date; to: Date }) => void;
  onExportInvoice: () => void;
}

export function ExportInvoiceDialog({
  open,
  onOpenChange,
  isLoadingExportInvoice,
  dateRange,
  setDateRange,
  onExportInvoice
}: ExportInvoiceDialogProps) {
  // 日付選択の状態を管理（none: 未選択、start-selected: 開始日選択済み）
  const [dateSelectionState, setDateSelectionState] = useState<'none' | 'start-selected'>('none')
  
  // 一時的な開始日を保存
  const [tempStartDate, setTempStartDate] = useState<Date | null>(null)
  
  // 日付を選択する処理
  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    // 未来の日付は選択できないように制限
    const now = new Date();
    if (isAfter(date, now)) {
      date = now;
    }
    // 開始日選択モードの場合
    if (dateSelectionState === 'none') {
      setTempStartDate(date);
      setDateSelectionState('start-selected');
    } 
    // 終了日選択モードの場合
    else if (tempStartDate) {
      // 開始日より前の日付が選択された場合は、開始日と終了日を入れ替える
      let from = tempStartDate;
      let to = date; 
      if (date < tempStartDate) {
        from = date;
        to = tempStartDate;
      }
      // 日付範囲を更新し、データを取得する
      setDateRange({ from, to });
      setDateSelectionState('none');
      setTempStartDate(null);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <div>
          <DialogHeader>
            <DialogTitle>請求書の作成</DialogTitle>
            <DialogDescription>
              発行期間を選択してください。
            </DialogDescription>
          </DialogHeader>
          {/* 日付の選択 */}
          <div>
            <Calendar
              mode="single"
              selected={tempStartDate || undefined}
              onSelect={(date: Date | undefined) => handleDateSelect(date || undefined)}
              modifiers={{
                range: {
                  from: dateSelectionState === 'start-selected' ? (tempStartDate || dateRange.from) : dateRange.from,
                  to: dateRange.to
                }
              }}
              modifiersStyles={{
                range: {
                  backgroundColor: 'rgba(59, 130, 246, 0.1)'
                }
              }}
              locale={ja}
              numberOfMonths={2}
              disabled={(date) => isAfter(date, new Date())}
              defaultMonth={dateRange.from}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              キャンセル
            </Button>
            <Button
              onClick={onExportInvoice}
              disabled={isLoadingExportInvoice}
            >
              {
                isLoadingExportInvoice
                  ? <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      請求書を作成中...
                    </div>
                  : '請求書を作成する'
              }
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
