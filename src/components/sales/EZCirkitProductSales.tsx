'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { fmtINR } from '@/lib/utils/formatters';
import { Trash2, AlertCircle, Package, ShoppingCart, CheckCircle2, Clock, Plus, X } from 'lucide-react';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { DocumentReference } from 'firebase/firestore';

export type PaymentStatus = 'paid' | 'pending' | 'partial' | 'refunded';

export interface ProductSale {
  id: string; date: string; product: string; customer: string; qty: number; unitPrice: number; total: number; paymentStatus: PaymentStatus; notes: string;
}

const PAYMENT_CLR: Record<string, string> = {
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  pending: 'bg-amber-50 text-amber-700 border-amber-100',
  partial: 'bg-blue-50 text-blue-700 border-blue-100',
  refunded: 'bg-rose-50 text-rose-700 border-rose-100',
};

interface F { date: string; product: string; customer: string; qty: number | ''; unitPrice: number | ''; paymentStatus: PaymentStatus; notes: string; }
const blank = (d: string): F => ({ date: d, product: 'EZCirkit Starter Kit', customer: '', qty: 1, unitPrice: 1499, paymentStatus: 'paid', notes: '' });

function SaleForm({ f, setF, onSubmit, onCancel, isEdit, readOnly }: { f: F; setF: React.Dispatch<React.SetStateAction<F>>; onSubmit: (e: React.FormEvent) => void; onCancel: () => void; isEdit: boolean; readOnly?: boolean; }) {
  const s = (k: keyof F) => (v: any) => setF(p => ({ ...p, [k]: v }));
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="font-bold text-xs">Date</Label>
          <Input type="date" value={f.date} onChange={e => s('date')(e.target.value)} disabled={readOnly} />
        </div>
        <div className="space-y-1">
          <Label className="font-bold text-xs">Payment Status</Label>
          <Select value={f.paymentStatus} onValueChange={s('paymentStatus')} disabled={readOnly}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1">
        <Label className="font-bold text-xs">Product</Label>
        <Input placeholder="e.g. EZCirkit Starter Kit" value={f.product} onChange={e => s('product')(e.target.value)} required disabled={readOnly} />
      </div>
      <div className="space-y-1">
        <Label className="font-bold text-xs">Customer Name</Label>
        <Input placeholder="e.g. Arun" value={f.customer} onChange={e => s('customer')(e.target.value)} required disabled={readOnly} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="font-bold text-xs">Qty</Label>
          <Input type="number" min="1" value={f.qty} onChange={e => s('qty')(e.target.value === '' ? '' : Number(e.target.value))} disabled={readOnly} />
        </div>
        <div className="space-y-1">
          <Label className="font-bold text-xs">Unit Price (₹)</Label>
          <Input type="number" value={f.unitPrice} onChange={e => s('unitPrice')(e.target.value === '' ? '' : Number(e.target.value))} disabled={readOnly} />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="font-bold text-xs">Notes</Label>
        <Input placeholder="Optional notes..." value={f.notes} onChange={e => s('notes')(e.target.value)} disabled={readOnly} />
      </div>
      <div className="px-3 py-2 bg-emerald-50 rounded-lg border border-emerald-100 text-xs font-black text-emerald-700">
        Total: {fmtINR((Number(f.qty) || 0) * (Number(f.unitPrice) || 0))}
      </div>
      {!readOnly && (
        <div className="flex gap-2 pt-1">
          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs">
            {isEdit ? 'Update Sale' : 'Record Sale'}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        </div>
      )}
    </form>
  );
}

interface ProductSalesProps { profileRef: DocumentReference | null; productSales: ProductSale[]; readOnly?: boolean; }

export function EZCirkitProductSales({ profileRef, productSales, readOnly }: ProductSalesProps) {
  const today = new Date().toISOString().split('T')[0];
  const [showAdd, setShowAdd] = useState(false);
  const [addF, setAddF] = useState<F>(blank(today));
  const [sel, setSel] = useState<ProductSale | null>(null);
  const [editF, setEditF] = useState<F>(blank(today));

  useEffect(() => {
    if (sel) {
      setEditF({ date: sel.date, product: sel.product, customer: sel.customer, qty: sel.qty, unitPrice: sel.unitPrice, paymentStatus: sel.paymentStatus, notes: sel.notes });
    }
  }, [sel]);

  const kpis = useMemo(() => {
    const totalRevenue = productSales.reduce((s, p) => s + (Number(p.total) || 0), 0);
    const paidRevenue = productSales.filter(p => p.paymentStatus === 'paid').reduce((s, p) => s + (Number(p.total) || 0), 0);
    const totalQty = productSales.reduce((s, p) => s + (Number(p.qty) || 0), 0);
    return { totalRevenue, paidRevenue, totalQty, totalOrders: productSales.length };
  }, [productSales]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileRef || !addF.customer) return;
    const q = Number(addF.qty) || 1;
    const u = Number(addF.unitPrice) || 0;
    const item: ProductSale = {
      id: Math.random().toString(36).substr(2, 9),
      date: addF.date, product: addF.product, customer: addF.customer,
      qty: q, unitPrice: u, total: q * u,
      paymentStatus: addF.paymentStatus, notes: addF.notes,
    };
    setDocumentNonBlocking(profileRef, { ezProductSales: [...productSales, item] }, { merge: true });
    setAddF(blank(today)); setShowAdd(false);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileRef || !sel) return;
    const q = Number(editF.qty) || 1;
    const u = Number(editF.unitPrice) || 0;
    const item: ProductSale = {
      id: sel.id,
      date: editF.date, product: editF.product, customer: editF.customer,
      qty: q, unitPrice: u, total: q * u,
      paymentStatus: editF.paymentStatus, notes: editF.notes,
    };
    setDocumentNonBlocking(profileRef, { ezProductSales: productSales.map(p => p.id === sel.id ? item : p) }, { merge: true });
    setSel(null);
  };

  const handleDelete = (id: string) => {
    if (!profileRef || !window.confirm('Delete this product sale record?')) return;
    setDocumentNonBlocking(profileRef, { ezProductSales: productSales.filter(p => p.id !== id) }, { merge: true });
    if (sel?.id === id) setSel(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* Add Sale Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <div><h2 className="text-base font-black text-slate-900">Record a Sale</h2><p className="text-xs text-muted-foreground">Track kit and product sales with payment status.</p></div>
              <Button size="icon" variant="ghost" className="rounded-full" onClick={() => setShowAdd(false)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="p-5">
              <SaleForm f={addF} setF={setAddF} onSubmit={handleAdd} onCancel={() => setShowAdd(false)} isEdit={false} />
            </div>
          </div>
        </div>
      )}

      {/* Sale Detail / Edit Panel */}
      {sel && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSel(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b shrink-0">
              <div className="flex items-center gap-3">
                <Badge className={`border text-[9px] font-black uppercase ${PAYMENT_CLR[sel.paymentStatus]}`}>{sel.paymentStatus}</Badge>
                <div><h2 className="text-base font-black text-slate-900">{sel.product}</h2><p className="text-xs text-muted-foreground">{sel.customer} · {sel.date}</p></div>
              </div>
              <div className="flex items-center gap-2">
                {!readOnly && <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-500 hover:bg-rose-50 rounded-full" onClick={() => handleDelete(sel.id)}><Trash2 className="w-3.5 h-3.5" /></Button>}
                <Button size="icon" variant="ghost" className="rounded-full" onClick={() => setSel(null)}><X className="w-4 h-4" /></Button>
              </div>
            </div>
            <div className="p-5">
              <SaleForm f={editF} setF={setEditF} onSubmit={handleUpdate} onCancel={() => setSel(null)} isEdit={true} readOnly={readOnly} />
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Orders', value: kpis.totalOrders, sub: 'all time', icon: ShoppingCart, color: 'text-indigo-600', bg: '' },
          { label: 'Units Sold', value: kpis.totalQty, sub: 'kits & products', icon: Package, color: 'text-blue-600', bg: 'bg-blue-50/20 border-blue-100' },
          { label: 'Total Revenue', value: fmtINR(kpis.totalRevenue), sub: 'gross sales', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50/20 border-emerald-100' },
          { label: 'Collected (Paid)', value: fmtINR(kpis.paidRevenue), sub: 'confirmed payments', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50/20 border-amber-100' },
        ].map(({ label, value, sub, icon: Icon, color, bg }) => (
          <Card key={label} className={`border-2 shadow-sm ${bg}`}>
            <CardHeader className="pb-1 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">{label}</CardTitle>
              <Icon className={`w-4 h-4 ${color}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-code font-black ${color}`}>{value}</div>
              <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table Card */}
      <Card className="border shadow-sm bg-white overflow-hidden">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-black text-slate-900">Product Sales Log</CardTitle>
              <CardDescription>Click any sale record to view details, update, or delete.</CardDescription>
            </div>
            {!readOnly && (
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 h-8" onClick={() => setShowAdd(true)}>
                <Plus className="w-3.5 h-3.5" /> Record Sale
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {productSales.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground flex flex-col items-center gap-3">
              <AlertCircle className="w-9 h-9 text-emerald-200" />
              <p className="text-sm font-semibold">No product sales yet. {!readOnly && 'Click "Record Sale" to get started.'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    {['Date', 'Product', 'Customer', 'Qty', 'Unit Price', 'Total', 'Payment', 'Notes'].map(h => (
                      <TableHead key={h} className="font-black text-[10px] uppercase text-slate-500 whitespace-nowrap">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productSales.map(p => (
                    <TableRow key={p.id} className="hover:bg-emerald-50/30 cursor-pointer transition-colors" onClick={() => setSel(p)}>
                      <TableCell className="text-xs font-mono text-slate-500 whitespace-nowrap">{p.date || '—'}</TableCell>
                      <TableCell className="font-bold text-slate-900 text-sm">{p.product}</TableCell>
                      <TableCell className="text-xs font-medium text-slate-700">{p.customer}</TableCell>
                      <TableCell className="font-code font-bold">{p.qty}</TableCell>
                      <TableCell className="font-code font-bold text-slate-700">{fmtINR(p.unitPrice)}</TableCell>
                      <TableCell className="font-code font-black text-emerald-700">{fmtINR(p.total)}</TableCell>
                      <TableCell>
                        <Badge className={`border text-[9px] font-black uppercase ${PAYMENT_CLR[p.paymentStatus]}`}>{p.paymentStatus}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 max-w-[150px] truncate">{p.notes || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
