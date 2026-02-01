import { ReceiptData } from "./types";
import { CSV_HEADERS } from "./constants";

export const generateMFCSVContent = (data: ReceiptData[]): string => {
  const invoiceRegex = /^T\d{13}$/;
  const nowStr = new Date().toLocaleString('ja-JP');

  const rows = data.map((item, index) => {
    const sequenceNumber = (index + 1).toString();
    const displayDate = (item.transactionDate || "").replace(/-/g, '/');
    const shopName = item.shopName || "名称未設定";
    
    // 借方税区分 (Column 7)
    let debitTaxCategory = "対象外";
    if (item.taxRateType === '10') {
      debitTaxCategory = "課税仕入 10%";
    } else if (item.taxRateType === '8') {
      debitTaxCategory = "課税仕入 8%";
    }

    // 借方インボイス (Column 8)
    // T13形式の登録番号があり、かつ税区分が「対象外」でない場合にのみ「適格」を出力。それ以外は「対象外」。
    const isEligible = !!(item.invoiceId && invoiceRegex.test(item.invoiceId) && item.taxRateType !== 'none');
    const debitInvoiceStatus = isEligible ? "適格" : "対象外";

    // 貸方勘定科目 (Column 11)
    const creditAccount = item.paymentMethod === 'card' ? '未払金' : '現金';
    
    // 摘要欄 (Column 19)
    let description = "";
    const invoiceStr = item.invoiceId ? ` / ${item.invoiceId}` : "";
    const taxNote = item.taxRateType === '8' ? "（軽減税率）" : "";

    if (item.accountTitle === '会議費') {
      const participants = item.participants ? ` / ${item.participants}` : "";
      description = `${shopName} / ${item.peopleCount || 1}名${participants}${invoiceStr}${taxNote}`;
    } else {
      const remarks = item.remarks ? ` / ${item.remarks}` : "";
      description = `${shopName}${remarks}${invoiceStr}${taxNote}`;
    }

    // 27列のデータ配列を構築
    return [
      sequenceNumber,         // 1:取引No
      displayDate,            // 2:取引日
      item.accountTitle || "雑費", // 3:借方勘定科目
      "",                     // 4:借方補助科目
      "",                     // 5:借方部門
      shopName,               // 6:借方取引先
      debitTaxCategory,       // 7:借方税区分
      debitInvoiceStatus,     // 8:借方インボイス
      (item.amount || 0).toString(), // 9:借方金額(円)
      "0",                    // 10:借方税額
      creditAccount,          // 11:貸方勘定科目
      "",                     // 12:貸方補助科目
      "",                     // 13:貸方部門
      "",                     // 14:貸方取引先
      "対象外",               // 15:貸方税区分
      "対象外",               // 16:貸方インボイス
      (item.amount || 0).toString(), // 17:貸方金額(円)
      "0",                    // 18:貸方税額
      description,            // 19:摘要
      "",                     // 20:仕訳メモ
      item.tag || "",         // 21:タグ
      "",                     // 22:MF仕訳タイプ
      "",                     // 23:決算整理仕訳
      nowStr,                 // 24:作成日時
      "System",               // 25:作成者
      nowStr,                 // 26:最終更新日時
      "System"                // 27:最終更新者
    ];
  });

  return [
    CSV_HEADERS.join(","),
    ...rows.map(row => row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(","))
  ].join("\n");
};
