
import React from 'react';
import { ReceiptData } from '../types';

interface ReceiptTableProps {
  data: ReceiptData;
}

const ReceiptTable: React.FC<ReceiptTableProps> = ({ data }) => {
  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 shadow-inner">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 text-left">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">店名</label>
          <p className="text-sm font-bold text-gray-800 border-b border-gray-200 pb-1 truncate" title={data.shopName}>
            {data.shopName}
          </p>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">取引日</label>
          <p className="text-sm font-bold text-gray-800 border-b border-gray-200 pb-1">{data.transactionDate}</p>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">合計金額</label>
          <p className="text-sm font-bold text-blue-600 border-b border-blue-100 pb-1">
            {new Intl.NumberFormat('ja-JP', { style: 'currency', currency: data.currency }).format(data.amount)}
          </p>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">インボイス番号</label>
          <p className="text-sm font-bold text-gray-600 border-b border-gray-200 pb-1">
            {data.invoiceId || '未登録'}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="text-gray-400 uppercase border-b border-gray-200">
              <th className="py-2 font-bold">品目</th>
              <th className="py-2 font-bold text-right">単価</th>
              <th className="py-2 font-bold text-right">数量</th>
              <th className="py-2 font-bold text-right">小計</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.items.map((item, i) => (
              <tr key={i} className="text-gray-700">
                <td className="py-2 font-medium">{item.name}</td>
                <td className="py-2 text-right">{item.price.toLocaleString()}</td>
                <td className="py-2 text-right">{item.quantity || 1}</td>
                <td className="py-2 text-right font-bold">
                  {(item.price * (item.quantity || 1)).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200">
              <td colSpan={3} className="py-2 text-right font-bold text-gray-500 italic">内消費税</td>
              <td className="py-2 text-right font-bold text-gray-500 italic">
                {data.taxAmount.toLocaleString()}
              </td>
            </tr>
            <tr>
              <td colSpan={3} className="py-2 text-right font-bold text-gray-900 text-sm">税込合計</td>
              <td className="py-2 text-right font-bold text-blue-700 text-sm">
                {data.amount.toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      
      {(data.memo || data.accountTitle) && (
        <div className="mt-4 pt-3 border-t border-gray-100 flex gap-4">
          {data.accountTitle && (
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">推奨科目</label>
              <p className="text-xs font-semibold text-gray-700">{data.accountTitle}</p>
            </div>
          )}
          {data.memo && (
            <div className="flex-[2]">
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">メモ</label>
              <p className="text-xs text-gray-600 italic">"{data.memo}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReceiptTable;
