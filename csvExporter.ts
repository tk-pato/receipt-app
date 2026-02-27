import { ReceiptData } from "./types";
import { CSV_HEADERS } from "./constants";

export const generateMFCSVContent = (data: ReceiptData[]): string => {
  const invoiceRegex = /^T\d{13}$/;
  const nowStr = new Date().toLocaleString('ja-JP');

  const rows = data.map((item, index) => {
    const sequenceNumber = (index + 1).toString();
    const displayDate = (item.transactionDate || "").replace(/-/g, '/');
    const shopName = item.shopName || "名称未設定";
    
    // 借方税区分
    let debitTaxCategory = "対象外";
    if (item.taxRateType === '10') {
      debitTaxCategory = "課税仕入 10%";
    } else if (item.taxRateType === '8') {
      debitTaxCategory = "課税仕入 8%";
    }

    // 借方インボイス（isQualifiedInvoice が明示設定されていればそれを優先、未設定ならinvoiceIdから判定）
    const autoEligible = !!(item.invoiceId && invoiceRegex.test(item.invoiceId));
    const isEligible = (item.isQualifiedInvoice ?? autoEligible) && item.taxRateType !== 'none';
    const debitInvoiceStatus = isEligible ? "適格" : "対象外";

    // 貸方勘定科目
    const creditAccount = item.paymentMethod === 'card' ? '未払金' : '現金';
    
    // 摘要欄
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

    // データ配列構築
    return [
      sequenceNumber,
      displayDate,
      item.accountTitle || "雑費",
      "",
      "",
      shopName,
      debitTaxCategory,
      debitInvoiceStatus,
      (item.amount || 0).toString(),
      "0",
      creditAccount,
      "",
      "",
      "",
      "対象外",
      "対象外",
      (item.amount || 0).toString(),
      "0",
      description,
      "",
      item.tag || "",
      "",
      "",
      nowStr,
      "System",
      nowStr,
      "System"
    ];
  });

  // 【重要】Mac Excel対策: BOM (\uFEFF) を先頭に付与
  // これがないとMac Excelで開いた際にShift-JISと誤認されて文字化けします
  return "\uFEFF" + [
    CSV_HEADERS.join(","),
    ...rows.map(row => row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(","))
  ].join("\n");
};