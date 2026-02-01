export interface ReceiptItem {
  name: string;
  price: number;
  quantity: number;
}

export interface ReceiptData {
  shopName: string;
  transactionDate: string; // YYYY-MM-DD
  amount: number;
  taxAmount: number;
  taxRateType: '10' | '8' | 'none'; // 税区分
  currency: string;
  items: ReceiptItem[];
  accountTitle?: string;
  paymentMethod?: 'card' | 'cash';
  invoiceId?: string; // インボイス登録番号
  peopleCount: number;
  participants?: string;
  remarks?: string; // 備考
  tag?: string;
  memo?: string;
}

export interface AnalysisResult {
  id: string;
  fileName: string;
  data: ReceiptData | null;
  status: 'pending' | 'processing' | 'success' | 'error';
  error?: string;
  timestampSeconds?: number;
  isConfidenceLow?: boolean;
  originalFile?: File; 
  frameBlob?: Blob; // 1200px extracted image
}