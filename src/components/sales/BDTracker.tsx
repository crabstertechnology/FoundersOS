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
  Handshake, Trash2, Edit2, Target, DollarSign, TrendingUp, AlertCircle, Clock
} from 'lucide-react';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { DocumentReference } from 'firebase/firestore';

export interface BDLead {
  id: string;
  partnerName: string;
  type: 'reseller' | 'integration' | 'co-marketing' | 'enterprise' | 'other';
  contactPerson: string;
  potentialValue: number;
  stage: 'outreach' | 'intro-call' | 'mou' | 'pilot' | 'active' | 'stalled' | 'closed';
  lastActivity: string;
  nextAction: string;
  notes: string;
}

const BD_TYPE_COLORS: Record<string, string> = {
  reseller: 'bg-blue-50 text-blue-700 border-blue-100',
  integration: 'bg-purple-50 text-purple-700 border-purple-100',
  'co-marketing': 'bg-pink-50 text-pink-700 border-pink-100',
  enterprise: 'bg-amber-50 text-amber-700 border-amber-100',
  other: 'bg-slate-50 text-slate-700 border-slate-200',
};

const BD_STAGE_COLORS: Record<string, string> = {
  outreach: 'bg-slate-100 text-slate-700 border-slate-200',
  'intro-call': 'bg-blue-50 text-blue-700 border-blue-100',
  mou: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  pilot: 'bg-amber-50 text-amber-700 border-amber-100',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  stalled: 'bg-orange-50 text-orange-700 border-orange-100',
  closed: 'bg-rose-50 text-rose-700 border-rose-100',
};

interface BDTrackerProps {
  profileRef: DocumentReference | null;
  bdLeads: BDLead[];
}

export function BDTracker({ profileRef, bdLeads }: BDTrackerProps) {
  const [partnerName, setPartnerName] = useState('');
  const [type, setType] = useState<BDLead['type']>('enterprise');
  const [contactPerson, setContactPerson] = useState('');
  const [potentialValue, setPotentialValue] = useState<number | ''>('');
  const [stage, setStage] = useState<BDLead['stage']>('outreach');
  const [lastActivity, setLastActivity] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [notes, setNotes] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const kpis = useMemo(() => {
    const active = bdLeads.filter(b => b.stage === 'active');
    const pipeline = bdLeads.filter(b => !['stalled', 'closed'].includes(b.stage));
    const totalPotential = pipeline.reduce((s, b) => s + (Number(b.potentialValue) || 0), 0);
    const activePotential = active.reduce((s, b) => s + (Number(b.potentialValue) || 0), 0);
    return { total: bdLeads.length, active: active.length, pipeline: pipeline.length, totalPotential, activePotential };
  }, [bdLeads]);

  const resetForm = () => {
    setPartnerName(''); setType('enterprise'); setContactPerson('');
    setPotentialValue(''); setStage('outreach'); setLastActivity('');
    setNextAction(''); setNotes(''); setEditingId(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileRef || !partnerName) return;

    const item: BDLead = {
      id: editingId || Math.random().toString(36).substr(2, 9),
      partnerName, type, contactPerson,
      potentialValue: Number(potentialValue) || 0,
      stage, lastActivity, nextAction, notes,
    };

    const updated = editingId
      ? bdLeads.map(b => b.id === editingId ? item : b)
      : [...bdLeads, item];

    setDocumentNonBlocking(profileRef, { bdLeads: updated }, { merge: true });
    resetForm();
  };

  const handleEdit = (b: BDLead) => {
    setEditingId(b.id); setPartnerName(b.partnerName); setType(b.type);
    setContactPerson(b.contactPerson); setPotentialValue(b.potentialValue);
    setStage(b.stage); setLastActivity(b.lastActivity);
    setNextAction(b.nextAction); setNotes(b.notes);
  };

  const handleDelete = (id: string) => {
    if (!profileRef) return;
    setDocumentNonBlocking(profileRef, { bdLeads: bdLeads.filter(b => b.id !== id) }, { merge: true });
    if (editingId === id) resetForm();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total BD Leads', value: kpis.total, sub: `${kpis.pipeline} in active pipeline`, icon: Handshake, color: 'text-orange-600', bg: 'bg-orange-50/30 border-orange-100' },
          { label: 'Active Partners', value: kpis.active, sub: 'confirmed and live', icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-50/20 border-emerald-100' },
          { label: 'Pipeline Value', value: fmtINR(kpis.totalPotential), sub: 'all non-stalled/closed', icon: DollarSign, color: 'text-indigo-600', bg: '' },
          { label: 'Active Partner Value', value: fmtINR(kpis.activePotential), sub: 'confirmed revenue potential', icon: TrendingUp, color: 'text-blue-600', bg: '' },
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
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
              {editingId ? 'Edit BD Lead' : 'Add BD Lead'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-3">
              <div className="space-y-1">
                <Label className="font-bold text-xs">Partner / Company Name</Label>
                <Input placeholder="e.g. Zoho Corp, AWS India..." value={partnerName} onChange={e => setPartnerName(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="font-bold text-xs">Partnership Type</Label>
                  <Select value={type} onValueChange={(v: any) => setType(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reseller">Reseller</SelectItem>
                      <SelectItem value="integration">Integration</SelectItem>
                      <SelectItem value="co-marketing">Co-Marketing</SelectItem>
                      <SelectItem value="enterprise">Enterprise Deal</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="font-bold text-xs">Stage</Label>
                  <Select value={stage} onValueChange={(v: any) => setStage(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="outreach">Outreach</SelectItem>
                      <SelectItem value="intro-call">Intro Call</SelectItem>
                      <SelectItem value="mou">MOU / NDA</SelectItem>
                      <SelectItem value="pilot">Pilot</SelectItem>
                      <SelectItem value="active">Active Partner</SelectItem>
                      <SelectItem value="stalled">Stalled</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="font-bold text-xs">Contact Person</Label>
                  <Input placeholder="e.g. Priya Menon" value={contactPerson} onChange={e => setContactPerson(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="font-bold text-xs">Potential Value (₹)</Label>
                  <Input type="number" placeholder="e.g. 500000" value={potentialValue} onChange={e => setPotentialValue(e.target.value === '' ? '' : Number(e.target.value))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="font-bold text-xs">Last Activity Date</Label>
                  <Input type="date" value={lastActivity} onChange={e => setLastActivity(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="font-bold text-xs">Next Action</Label>
                  <Input placeholder="e.g. Send MOU draft..." value={nextAction} onChange={e => setNextAction(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="font-bold text-xs">Notes</Label>
                <Input placeholder="e.g. Warm intro via XYZ..." value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs">
                  {editingId ? 'Update BD Lead' : 'Add BD Lead'}
                </Button>
                {editingId && <Button type="button" variant="ghost" size="sm" onClick={resetForm}>Cancel</Button>}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border shadow-sm bg-white overflow-hidden lg:col-span-2">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-black text-slate-900">Business Development Pipeline</CardTitle>
            <CardDescription>Track all partnership outreach, pilots, and signed deals.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {bdLeads.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground flex flex-col items-center gap-3">
                <AlertCircle className="w-9 h-9 text-orange-200" />
                <p className="text-sm font-semibold">No BD leads yet. Start tracking your partnership pipeline.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      {['Partner', 'Type', 'Stage', 'Potential', 'Contact', 'Next Action', ''].map(h => (
                        <TableHead key={h} className="font-black text-xs uppercase text-slate-500">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bdLeads.map(b => (
                      <TableRow key={b.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="font-bold py-3">
                          <div className="text-slate-900 truncate max-w-[120px]">{b.partnerName}</div>
                          {b.notes && <div className="text-[10px] text-muted-foreground truncate max-w-[120px]">{b.notes}</div>}
                        </TableCell>
                        <TableCell>
                          <Badge className={`border text-[9px] font-black uppercase ${BD_TYPE_COLORS[b.type]}`}>{b.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`border text-[9px] font-black uppercase ${BD_STAGE_COLORS[b.stage]}`}>{b.stage}</Badge>
                        </TableCell>
                        <TableCell className="font-code font-bold text-indigo-700">{fmtINR(b.potentialValue)}</TableCell>
                        <TableCell className="text-xs text-slate-600 font-medium">{b.contactPerson || '—'}</TableCell>
                        <TableCell className="text-xs text-slate-500 max-w-[120px] truncate">
                          {b.nextAction ? (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                              <span className="truncate">{b.nextAction}</span>
                            </div>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="pr-4">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-orange-500 rounded-full" onClick={() => handleEdit(b)}>
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-rose-600 rounded-full" onClick={() => handleDelete(b.id)}>
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
