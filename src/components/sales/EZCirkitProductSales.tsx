'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { fmtINR } from '@/lib/utils/formatters';
import { Trash2, Edit2, AlertCircle, Package, ShoppingCart, CheckCircle2, Clock } from 'lucide-react';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { DocumentReference } from 'firebase/firestore';

export type PaymentStatus = 'paid' | 'pending' | 'partial' | 'refunded';

export interface ProductSale {
  id: string;
  date: string;
  product: string;
  customer: string;
  qty: number;
  unitPrice: number;
  total: number;
  paymentStatus: PaymentStatus;
  notes: string;
}

const PAYMENT_COLORS: Record<string, string> = {
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  pending: 'bg-amber-50 text-amber-700 border-amber-100',
  partial: 'bg-blue-50 text-blue-700 border-blue-100',
  refunded: 'bg-rose-50 text-rose-700 border-rose-100',
};

interface ProductSalesProps {
  profileRef: DocumentReference | null;
  productSales: ProductSale[];
  readOnly?: boolean;
}

export function EZCirkitProductSales({ profileRef, productSales, readOnly }: ProductSalesProps) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [product, setProduct] = useState('EZCirkit Starter Kit');
  const [customer, setCustomer] = useState('');
  const [qty, setQty] = useState<number | ''>(1);
  const [unitPrice, setUnitPrice] = useState<number | ''>(1499);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid');
  const [notes, setNotes] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const kpis = useMemo(() => {
    const totalRevenue = productSales.reduce((s, p) => s + (Number(p.total) || 0), 0);
    const paidRevenue = productSales.filter(p => p.paymentStatus === 'paid').reduce((s, p) => s + (Number(p.total) || 0), 0);
    const totalQty = productSales.reduce((s, p) => s + (Number(p.qty) || 0), 0);
    return { totalRevenue, paidRevenue, totalQty, totalOrders: productSales.length };
  }, [productSales]);

  const resetForm = () => {
    setDate(today); setProduct('EZCirkit Starter Kit'); setCustomer('');
    setQty(1); setUnitPrice(1499); setPaymentStatus('paid'); setNotes(''); setEditingId(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileRef || !customer) return;
    const q = Number(qty) || 1;
    const u = Number(unitPrice) || 0;
    const item: ProductSale = {
      id: editingId || Math.random().toString(36).substr(2, 9),
      date, product, customer, qty: q, unitPrice: u, total: q * u, paymentStatus, notes,
    };
    const updated = editingId ? productSales.map(p => p.id === editingId ? item : p) : [...productSales, item];
    setDocumentNonBlocking(profileRef, { ezProductSales: updated }, { merge: true });
    resetForm();
  };

  const handleEdit = (p: ProductSale) => {
    setEditingId(p.id); setDate(p.date); setProduct(p.product); setCustomer(p.customer);
    setQty(p.qty); setUnitPrice(p.unitPrice); setPaymentStatus(p.paymentStatus); setNotes(p.notes);
  };

  const handleDelete = (id: string) => {
    if (!profileRef) return;
    setDocumentNonBlocking(profileRef, { ezProductSales: productSales.filter(p => p.id !== id) }, { merge: true });
    if (editingId === id) resetForm();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {!readOnly && (
          <Card className="border shadow-sm lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              {editingId ? 'Edit Sale' : 'Record a Sale'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="font-bold text-xs">Date</Label>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="font-bold text-xs">Payment Status</Label>
                  <Select value={paymentStatus} onValueChange={(v: any) => setPaymentStatus(v)}>
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
                <Input placeholder="e.g. EZCirkit Starter Kit" value={product} onChange={e => setProduct(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label className="font-bold text-xs">Customer Name</Label>
                <Input placeholder="e.g. Arun" value={customer} onChange={e => setCustomer(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="font-bold text-xs">Qty</Label>
                  <Input type="number" min="1" value={qty} onChange={e => setQty(e.target.value === '' ? '' : Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <Label className="font-bold text-xs">Unit Price (₹)</Label>
                  <Input type="number" value={unitPrice} onChange={e => setUnitPrice(e.target.value === '' ? '' : Number(e.target.value))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="font-bold text-xs">Notes</Label>
                <Input placeholder="Optional notes..." value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
              <div className="px-3 py-2 bg-emerald-50 rounded-lg border border-emerald-100 text-xs font-black text-emerald-700">
                Total: {fmtINR((Number(qty) || 0) * (Number(unitPrice) || 0))}
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs">
                  {editingId ? 'Update Sale' : 'Record Sale'}
                </Button>
                {editingId && <Button type="button" variant="ghost" size="sm" onClick={resetForm}>Cancel</Button>}
              </div>
            </form>
          </CardContent>
        </Card>
        )}

        <Card className={`border shadow-sm bg-white overflow-hidden ${readOnly ? 'lg:col-span-3' : 'lg:col-span-2'}`}>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-black text-slate-900">Product Sales Log</CardTitle>
            <CardDescription>Track kit and product sales with payment status.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {productSales.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground flex flex-col items-center gap-3">
                <AlertCircle className="w-9 h-9 text-emerald-200" />
                <p className="text-sm font-semibold">No product sales yet. Record your first sale.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      {['Date', 'Product', 'Customer', 'Qty', 'Unit Price', 'Total', 'Payment', 'Notes', ...(!readOnly ? [''] : [])].map(h => (
                        <TableHead key={h} className="font-black text-[10px] uppercase text-slate-500 whitespace-nowrap">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productSales.map(p => (
                      <TableRow key={p.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="text-xs font-mono text-slate-500 whitespace-nowrap">{p.date || '—'}</TableCell>
                        <TableCell className="font-bold text-slate-900 text-sm">{p.product}</TableCell>
                        <TableCell className="text-xs font-medium text-slate-700">{p.customer}</TableCell>
                        <TableCell className="font-code font-bold">{p.qty}</TableCell>
                        <TableCell className="font-code font-bold text-slate-700">{fmtINR(p.unitPrice)}</TableCell>
                        <TableCell className="font-code font-black text-emerald-700">{fmtINR(p.total)}</TableCell>
                        <TableCell>
                          <Badge className={`border text-[9px] font-black uppercase ${PAYMENT_COLORS[p.paymentStatus]}`}>{p.paymentStatus}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 max-w-[100px] truncate">{p.notes || '—'}</TableCell>
                        {!readOnly && (
                          <TableCell className="pr-4">
                            <div className="flex justify-end gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-emerald-600 rounded-full" onClick={() => handleEdit(p)}>
                                <Edit2 className="w-3 h-3" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-rose-600 rounded-full" onClick={() => handleDelete(p.id)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
