import React from 'react';
import { ReceiptData } from '../types';

interface ReceiptTableProps {
  data: ReceiptData;
}

const ReceiptTable: React.FC<ReceiptTableProps> = ({ data }) => {
  return (
    <div className="bg-white/40 rounded-2xl p-6 border border-white/50 shadow-inner backdrop-blur-sm">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 text-left">
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Merchant</label>
          <p className="text-sm font-bold text-slate-800 border-b border-white/60 pb-1 truncate" title={data.shopName}>{data.shopName}</p>
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Date</label>
          <p className="text-sm font-bold text-slate-800 border-b border-white/60 pb-1">{data.transactionDate}</p>
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Total</label>
          <p className="text-sm font-black text-slate-900 border-b border-slate-900/10 pb-1">{new Intl.NumberFormat('ja-JP', { style: 'currency', currency: data.currency }).format(data.amount)}</p>
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Registration</label>
          <p className="text-sm font-mono font-bold text-slate-800 border-b border-white/60 pb-1 tracking-tighter">{data.invoiceId || '---'}</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-white/60">
              <th className="py-2 px-1">Description</th>
              <th className="py-2 px-1 text-right w-16">Unit</th>
              <th className="py-2 px-1 text-center w-12">Qty</th>
              <th className="py-2 px-1 text-right w-20">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {(data.items || []).map((item, idx) => (
              <tr key={idx} className="border-b border-white/40 hover:bg-white/50 transition-colors">
                <td className="py-3 px-1 font-semibold text-slate-700">{item.name}</td>
                <td className="py-3 px-1 text-right text-slate-400">{item.price.toLocaleString()}</td>
                <td className="py-3 px-1 text-center font-mono text-slate-400">{item.quantity}</td>
                <td className="py-3 px-1 text-right font-black text-slate-900">{(item.price * item.quantity).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-white/80">
              <td colSpan={3} className="py-4 text-right font-bold text-slate-400 italic">Tax Included</td>
              <td className="py-4 text-right font-bold text-slate-400 italic">{data.taxAmount.toLocaleString()}</td>
            </tr>
            <tr>
              <td colSpan={3} className="py-2 text-right font-black text-slate-900 text-sm uppercase">Grand Total</td>
              <td className="py-2 text-right font-black text-slate-900 text-sm">{data.amount.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default ReceiptTable;