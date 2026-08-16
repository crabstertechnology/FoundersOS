'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { fmtINR } from '@/lib/utils/formatters';
import { BookOpen, Trash2, Users, TrendingUp, DollarSign, Lightbulb, AlertCircle, Plus, X } from 'lucide-react';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { DocumentReference } from 'firebase/firestore';

export interface Workshop {
  id: string; title: string; date: string; format: 'online' | 'in-person' | 'hybrid';
  attendees: number; revenue: number; leadsGenerated: number; status: 'planned' | 'completed' | 'cancelled'; notes: string;
}

const FORMAT_CLR: Record<string, string> = {
  online: 'bg-blue-50 text-blue-700 border-blue-100',
  'in-person': 'bg-emerald-50 text-emerald-700 border-emerald-100',
  hybrid: 'bg-purple-50 text-purple-700 border-purple-100',
};

const STATUS_CLR: Record<string, string> = {
  planned: 'bg-amber-50 text-amber-700 border-amber-100',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  cancelled: 'bg-rose-50 text-rose-700 border-rose-100',
};

interface F { title: string; date: string; format: Workshop['format']; attendees: number | ''; revenue: number | ''; leadsGenerated: number | ''; status: Workshop['status']; notes: string; }
const blank = (d: string): F => ({ title: '', date: d, format: 'online', attendees: '', revenue: '', leadsGenerated: '', status: 'planned', notes: '' });

function WorkshopForm({ f, setF, onSubmit, onCancel, isEdit, readOnly }: { f: F; setF: React.Dispatch<React.SetStateAction<F>>; onSubmit: (e: React.FormEvent) => void; onCancel: () => void; isEdit: boolean; readOnly?: boolean; }) {
  const s = (k: keyof F) => (v: any) => setF(p => ({ ...p, [k]: v }));
  return (
    <form onSubmit={onSubmit} className="space-y-3 [&_*]:!rounded-none">
      <div className="space-y-1">
        <Label className="font-bold text-xs">Workshop Title</Label>
        <Input placeholder="e.g. SaaS Pricing Masterclass" value={f.title} onChange={e => s('title')(e.target.value)} required disabled={readOnly} className="rounded-none text-xs" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="font-bold text-xs">Date</Label>
          <Input type="date" value={f.date} onChange={e => s('date')(e.target.value)} disabled={readOnly} className="rounded-none text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="font-bold text-xs">Format</Label>
          <Select value={f.format} onValueChange={s('format')} disabled={readOnly}>
            <SelectTrigger className="rounded-none text-xs"><SelectValue /></SelectTrigger>
            <SelectContent className="rounded-none">
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="in-person">In-Person</SelectItem>
              <SelectItem value="hybrid">Hybrid</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="font-bold text-xs">Attendees</Label>
          <Input type="number" placeholder="e.g. 45" value={f.attendees} onChange={e => s('attendees')(e.target.value === '' ? '' : Number(e.target.value))} disabled={readOnly} className="rounded-none text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="font-bold text-xs">Revenue (₹)</Label>
          <Input type="number" placeholder="e.g. 25000" value={f.revenue} onChange={e => s('revenue')(e.target.value === '' ? '' : Number(e.target.value))} disabled={readOnly} className="rounded-none text-xs" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="font-bold text-xs">Leads Generated</Label>
          <Input type="number" placeholder="e.g. 12" value={f.leadsGenerated} onChange={e => s('leadsGenerated')(e.target.value === '' ? '' : Number(e.target.value))} disabled={readOnly} className="rounded-none text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="font-bold text-xs">Status</Label>
          <Select value={f.status} onValueChange={s('status')} disabled={readOnly}>
            <SelectTrigger className="rounded-none text-xs"><SelectValue /></SelectTrigger>
            <SelectContent className="rounded-none">
              <SelectItem value="planned">Planned</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1">
        <Label className="font-bold text-xs">Notes</Label>
        <Input placeholder="e.g. High engagement, follow-up pending..." value={f.notes} onChange={e => s('notes')(e.target.value)} disabled={readOnly} className="rounded-none text-xs" />
      </div>
      {!readOnly && (
        <div className="flex gap-2 pt-1">
          <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-none">
            {isEdit ? 'Update Workshop' : 'Add Workshop'}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="rounded-none">Cancel</Button>
        </div>
      )}
    </form>
  );
}

interface WorkshopTrackerProps { profileRef: DocumentReference | null; workshops: Workshop[]; readOnly?: boolean; }

export function WorkshopTracker({ profileRef, workshops, readOnly }: WorkshopTrackerProps) {
  const today = new Date().toISOString().split('T')[0];
  const [showAdd, setShowAdd] = useState(false);
  const [addF, setAddF] = useState<F>(blank(today));
  const [sel, setSel] = useState<Workshop | null>(null);
  const [editF, setEditF] = useState<F>(blank(today));

  useEffect(() => {
    if (sel) {
      setEditF({ title: sel.title, date: sel.date, format: sel.format, attendees: sel.attendees, revenue: sel.revenue, leadsGenerated: sel.leadsGenerated, status: sel.status, notes: sel.notes });
    }
  }, [sel]);

  const kpis = useMemo(() => {
    const completed = workshops.filter(w => w.status === 'completed');
    const totalAttendees = completed.reduce((s, w) => s + (Number(w.attendees) || 0), 0);
    const totalRevenue = completed.reduce((s, w) => s + (Number(w.revenue) || 0), 0);
    const totalLeads = workshops.reduce((s, w) => s + (Number(w.leadsGenerated) || 0), 0);
    return { total: workshops.length, completed: completed.length, totalAttendees, totalRevenue, totalLeads };
  }, [workshops]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileRef || !addF.title) return;
    const item: Workshop = {
      id: Math.random().toString(36).substr(2, 9),
      title: addF.title, date: addF.date, format: addF.format,
      attendees: Number(addF.attendees) || 0,
      revenue: Number(addF.revenue) || 0,
      leadsGenerated: Number(addF.leadsGenerated) || 0,
      status: addF.status, notes: addF.notes,
    };
    setDocumentNonBlocking(profileRef, { workshops: [...workshops, item] }, { merge: true });
    setAddF(blank(today)); setShowAdd(false);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileRef || !sel) return;
    const item: Workshop = {
      id: sel.id,
      title: editF.title, date: editF.date, format: editF.format,
      attendees: Number(editF.attendees) || 0,
      revenue: Number(editF.revenue) || 0,
      leadsGenerated: Number(editF.leadsGenerated) || 0,
      status: editF.status, notes: editF.notes,
    };
    setDocumentNonBlocking(profileRef, { workshops: workshops.map(w => w.id === sel.id ? item : w) }, { merge: true });
    setSel(null);
  };

  const handleDelete = (id: string) => {
    if (!profileRef || !window.confirm('Delete this workshop?')) return;
    setDocumentNonBlocking(profileRef, { workshops: workshops.filter(w => w.id !== id) }, { merge: true });
    if (sel?.id === id) setSel(null);
  };

  return (
    <div className="space-y-6">

      {/* Add Workshop Modal */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto p-0 border border-slate-200 shadow-2xl rounded-none">
          <DialogHeader className="p-5 pb-4 border-b">
            <DialogTitle className="text-base font-black text-slate-900">Log a Workshop</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">Track learning sessions and generate leads.</DialogDescription>
          </DialogHeader>
          <div className="p-5 pt-4">
            <WorkshopForm f={addF} setF={setAddF} onSubmit={handleAdd} onCancel={() => setShowAdd(false)} isEdit={false} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Workshop Detail / Edit Panel */}
      <Dialog open={!!sel} onOpenChange={(open) => { if (!open) setSel(null); }}>
        <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto p-0 border border-slate-200 shadow-2xl rounded-none">
          <DialogHeader className="p-5 pb-4 border-b shrink-0 flex flex-row items-center justify-between gap-3">
            {sel && (
              <div className="flex items-center gap-3">
                <Badge className={`border text-[9px] font-black uppercase rounded-none ${FORMAT_CLR[sel.format]}`}>{sel.format}</Badge>
                <div>
                  <DialogTitle className="text-base font-black text-slate-900">{sel.title}</DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">{sel.date}</DialogDescription>
                </div>
              </div>
            )}
            {!readOnly && sel && (
              <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-500 hover:bg-rose-50 rounded-none shrink-0" onClick={() => handleDelete(sel.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </DialogHeader>
          <div className="p-5 pt-4">
            <WorkshopForm f={editF} setF={setEditF} onSubmit={handleUpdate} onCancel={() => setSel(null)} isEdit={true} readOnly={readOnly} />
          </div>
        </DialogContent>
      </Dialog>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Workshops', value: kpis.total, sub: `${kpis.completed} completed`, icon: BookOpen, color: 'text-violet-600', bg: 'bg-violet-50/30 border-violet-100' },
          { label: 'Total Attendees', value: kpis.totalAttendees, sub: 'across completed sessions', icon: Users, color: 'text-blue-600', bg: '' },
          { label: 'Workshop Revenue', value: fmtINR(kpis.totalRevenue), sub: 'from completed workshops', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50/20 border-emerald-100' },
          { label: 'Leads Generated', value: kpis.totalLeads, sub: 'total pipeline leads', icon: Lightbulb, color: 'text-amber-600', bg: 'bg-amber-50/20 border-amber-100' },
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
              <CardTitle className="text-base font-black text-slate-900">Workshop Log</CardTitle>
              <CardDescription>Click any workshop to view details, update, or delete.</CardDescription>
            </div>
            {!readOnly && (
              <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs gap-1.5 h-8" onClick={() => setShowAdd(true)}>
                <Plus className="w-3.5 h-3.5" /> Log Workshop
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {workshops.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground flex flex-col items-center gap-3">
              <AlertCircle className="w-9 h-9 text-violet-200" />
              <p className="text-sm font-semibold">No workshops tracked yet. {!readOnly && 'Click "Log Workshop" to get started.'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    {['Workshop', 'Date', 'Format', 'Attendees', 'Revenue', 'Leads', 'Status'].map(h => (
                      <TableHead key={h} className="font-black text-[10px] uppercase text-slate-500 whitespace-nowrap">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workshops.map(w => (
                    <TableRow key={w.id} className="hover:bg-violet-50/30 cursor-pointer transition-colors" onClick={() => setSel(w)}>
                      <TableCell className="font-bold py-3">
                        <div className="text-slate-900 truncate max-w-[180px]">{w.title}</div>
                        {w.notes && <div className="text-[10px] text-muted-foreground truncate max-w-[180px]">{w.notes}</div>}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-slate-600 whitespace-nowrap">{w.date || '—'}</TableCell>
                      <TableCell>
                        <Badge className={`border text-[9px] font-black uppercase ${FORMAT_CLR[w.format]}`}>{w.format}</Badge>
                      </TableCell>
                      <TableCell className="font-code font-bold">{w.attendees}</TableCell>
                      <TableCell className="font-code font-bold text-emerald-700">{fmtINR(w.revenue)}</TableCell>
                      <TableCell className="font-code font-bold text-amber-700">{w.leadsGenerated}</TableCell>
                      <TableCell>
                        <Badge className={`border text-[9px] font-black uppercase ${STATUS_CLR[w.status]}`}>{w.status}</Badge>
                      </TableCell>
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
