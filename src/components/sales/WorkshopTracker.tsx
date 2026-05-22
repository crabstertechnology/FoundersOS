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
import {
  BookOpen, Trash2, Edit2, Users, TrendingUp, DollarSign, Lightbulb, AlertCircle
} from 'lucide-react';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { DocumentReference } from 'firebase/firestore';

export interface Workshop {
  id: string;
  title: string;
  date: string;
  format: 'online' | 'in-person' | 'hybrid';
  attendees: number;
  revenue: number;
  leadsGenerated: number;
  status: 'planned' | 'completed' | 'cancelled';
  notes: string;
}

const FORMAT_COLORS: Record<string, string> = {
  online: 'bg-blue-50 text-blue-700 border-blue-100',
  'in-person': 'bg-emerald-50 text-emerald-700 border-emerald-100',
  hybrid: 'bg-purple-50 text-purple-700 border-purple-100',
};

const STATUS_COLORS: Record<string, string> = {
  planned: 'bg-amber-50 text-amber-700 border-amber-100',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  cancelled: 'bg-rose-50 text-rose-700 border-rose-100',
};

interface WorkshopTrackerProps {
  profileRef: DocumentReference | null;
  workshops: Workshop[];
}

export function WorkshopTracker({ profileRef, workshops }: WorkshopTrackerProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [format, setFormat] = useState<Workshop['format']>('online');
  const [attendees, setAttendees] = useState<number | ''>('');
  const [revenue, setRevenue] = useState<number | ''>('');
  const [leadsGenerated, setLeadsGenerated] = useState<number | ''>('');
  const [status, setStatus] = useState<Workshop['status']>('planned');
  const [notes, setNotes] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const kpis = useMemo(() => {
    const completed = workshops.filter(w => w.status === 'completed');
    const totalAttendees = completed.reduce((s, w) => s + (Number(w.attendees) || 0), 0);
    const totalRevenue = completed.reduce((s, w) => s + (Number(w.revenue) || 0), 0);
    const totalLeads = workshops.reduce((s, w) => s + (Number(w.leadsGenerated) || 0), 0);
    return { total: workshops.length, completed: completed.length, totalAttendees, totalRevenue, totalLeads };
  }, [workshops]);

  const resetForm = () => {
    setTitle(''); setDate(''); setFormat('online'); setAttendees('');
    setRevenue(''); setLeadsGenerated(''); setStatus('planned'); setNotes('');
    setEditingId(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileRef || !title) return;

    const item: Workshop = {
      id: editingId || Math.random().toString(36).substr(2, 9),
      title, date, format,
      attendees: Number(attendees) || 0,
      revenue: Number(revenue) || 0,
      leadsGenerated: Number(leadsGenerated) || 0,
      status, notes,
    };

    const updated = editingId
      ? workshops.map(w => w.id === editingId ? item : w)
      : [...workshops, item];

    setDocumentNonBlocking(profileRef, { workshops: updated }, { merge: true });
    resetForm();
  };

  const handleEdit = (w: Workshop) => {
    setEditingId(w.id); setTitle(w.title); setDate(w.date);
    setFormat(w.format); setAttendees(w.attendees); setRevenue(w.revenue);
    setLeadsGenerated(w.leadsGenerated); setStatus(w.status); setNotes(w.notes);
  };

  const handleDelete = (id: string) => {
    if (!profileRef) return;
    setDocumentNonBlocking(profileRef, { workshops: workshops.filter(w => w.id !== id) }, { merge: true });
    if (editingId === id) resetForm();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <Card className="border shadow-sm lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-600" />
              {editingId ? 'Edit Workshop' : 'Log a Workshop'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-3">
              <div className="space-y-1">
                <Label className="font-bold text-xs">Workshop Title</Label>
                <Input placeholder="e.g. SaaS Pricing Masterclass" value={title} onChange={e => setTitle(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="font-bold text-xs">Date</Label>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="font-bold text-xs">Format</Label>
                  <Select value={format} onValueChange={(v: any) => setFormat(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
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
                  <Input type="number" placeholder="e.g. 45" value={attendees} onChange={e => setAttendees(e.target.value === '' ? '' : Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <Label className="font-bold text-xs">Revenue (₹)</Label>
                  <Input type="number" placeholder="e.g. 25000" value={revenue} onChange={e => setRevenue(e.target.value === '' ? '' : Number(e.target.value))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="font-bold text-xs">Leads Generated</Label>
                  <Input type="number" placeholder="e.g. 12" value={leadsGenerated} onChange={e => setLeadsGenerated(e.target.value === '' ? '' : Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <Label className="font-bold text-xs">Status</Label>
                  <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planned">Planned</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="font-bold text-xs">Notes</Label>
                <Input placeholder="e.g. High engagement, follow-up pending..." value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs">
                  {editingId ? 'Update Workshop' : 'Add Workshop'}
                </Button>
                {editingId && <Button type="button" variant="ghost" size="sm" onClick={resetForm}>Cancel</Button>}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border shadow-sm bg-white overflow-hidden lg:col-span-2">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-black text-slate-900">Workshop Log</CardTitle>
            <CardDescription>All scheduled and completed learning sessions.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {workshops.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground flex flex-col items-center gap-3">
                <AlertCircle className="w-9 h-9 text-violet-200" />
                <p className="text-sm font-semibold">No workshops tracked yet. Add your first one.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      {['Workshop', 'Date', 'Format', 'Attendees', 'Revenue', 'Leads', 'Status', ''].map(h => (
                        <TableHead key={h} className="font-black text-xs uppercase text-slate-500">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workshops.map(w => (
                      <TableRow key={w.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="font-bold py-3">
                          <div className="text-slate-900 truncate max-w-[140px]">{w.title}</div>
                          {w.notes && <div className="text-[10px] text-muted-foreground truncate max-w-[140px]">{w.notes}</div>}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-slate-600">{w.date || '—'}</TableCell>
                        <TableCell>
                          <Badge className={`border text-[9px] font-black uppercase ${FORMAT_COLORS[w.format]}`}>{w.format}</Badge>
                        </TableCell>
                        <TableCell className="font-code font-bold">{w.attendees}</TableCell>
                        <TableCell className="font-code font-bold">{fmtINR(w.revenue)}</TableCell>
                        <TableCell className="font-code font-bold text-amber-700">{w.leadsGenerated}</TableCell>
                        <TableCell>
                          <Badge className={`border text-[9px] font-black uppercase ${STATUS_COLORS[w.status]}`}>{w.status}</Badge>
                        </TableCell>
                        <TableCell className="pr-4">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-violet-600 rounded-full" onClick={() => handleEdit(w)}>
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-rose-600 rounded-full" onClick={() => handleDelete(w.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
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
    </div>
  );
}
