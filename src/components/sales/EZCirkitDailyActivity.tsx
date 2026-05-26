'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, AlertCircle, Phone, Users, FileText, Calendar, TrendingUp, Target, Plus, X } from 'lucide-react';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { DocumentReference } from 'firebase/firestore';

export interface DailyActivity {
  id: string; date: string; callsMade: number; schoolsContacted: number; collegesContacted: number;
  meetings: number; proposalsSent: number; followUps: number; ordersClosed: number; notes: string;
}

interface F { date: string; callsMade: number | ''; schoolsContacted: number | ''; collegesContacted: number | ''; meetings: number | ''; proposalsSent: number | ''; followUps: number | ''; ordersClosed: number | ''; notes: string; }
const blank = (d: string): F => ({ date: d, callsMade: 0, schoolsContacted: 0, collegesContacted: 0, meetings: 0, proposalsSent: 0, followUps: 0, ordersClosed: 0, notes: '' });

function ActivityForm({ f, setF, onSubmit, onCancel, isEdit, readOnly }: { f: F; setF: React.Dispatch<React.SetStateAction<F>>; onSubmit: (e: React.FormEvent) => void; onCancel: () => void; isEdit: boolean; readOnly?: boolean; }) {
  const s = (k: keyof F) => (v: any) => setF(p => ({ ...p, [k]: v }));
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1">
        <Label className="font-bold text-xs">Date</Label>
        <Input type="date" value={f.date} onChange={e => s('date')(e.target.value)} disabled={readOnly} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Calls Made', key: 'callsMade' as keyof F },
          { label: 'Schools Contacted', key: 'schoolsContacted' as keyof F },
          { label: 'Colleges Contacted', key: 'collegesContacted' as keyof F },
          { label: 'Meetings Conducted', key: 'meetings' as keyof F },
          { label: 'Proposals Sent', key: 'proposalsSent' as keyof F },
          { label: 'Follow-ups', key: 'followUps' as keyof F },
          { label: 'Orders Closed', key: 'ordersClosed' as keyof F },
        ].map(({ label, key }) => (
          <div key={key} className="space-y-1">
            <Label className="font-bold text-xs">{label}</Label>
            <Input type="number" min="0" value={f[key]} onChange={e => s(key)(e.target.value === '' ? '' : Number(e.target.value))} disabled={readOnly} />
          </div>
        ))}
      </div>
      <div className="space-y-1">
        <Label className="font-bold text-xs">Notes</Label>
        <Input placeholder="e.g. Good response from Greenfields School" value={f.notes} onChange={e => s('notes')(e.target.value)} disabled={readOnly} />
      </div>
      {!readOnly && (
        <div className="flex gap-2 pt-1">
          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs">
            {isEdit ? 'Update Activity' : 'Save Activity Log'}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        </div>
      )}
    </form>
  );
}

interface DailyActivityProps { profileRef: DocumentReference | null; activities: DailyActivity[]; readOnly?: boolean; }

export function EZCirkitDailyActivity({ profileRef, activities, readOnly }: DailyActivityProps) {
  const today = new Date().toISOString().split('T')[0];
  const [showAdd, setShowAdd] = useState(false);
  const [addF, setAddF] = useState<F>(blank(today));
  const [sel, setSel] = useState<DailyActivity | null>(null);
  const [editF, setEditF] = useState<F>(blank(today));

  useEffect(() => {
    if (sel) {
      setEditF({ date: sel.date, callsMade: sel.callsMade, schoolsContacted: sel.schoolsContacted, collegesContacted: sel.collegesContacted, meetings: sel.meetings, proposalsSent: sel.proposalsSent, followUps: sel.followUps, ordersClosed: sel.ordersClosed, notes: sel.notes });
    }
  }, [sel]);

  const weeklyTotals = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const weekActivities = activities.filter(a => a.date >= weekAgo);
    return {
      calls: weekActivities.reduce((s, a) => s + (Number(a.callsMade) || 0), 0),
      schools: weekActivities.reduce((s, a) => s + (Number(a.schoolsContacted) || 0), 0),
      colleges: weekActivities.reduce((s, a) => s + (Number(a.collegesContacted) || 0), 0),
      proposals: weekActivities.reduce((s, a) => s + (Number(a.proposalsSent) || 0), 0),
      orders: weekActivities.reduce((s, a) => s + (Number(a.ordersClosed) || 0), 0),
    };
  }, [activities]);

  const n = (v: number | '') => Number(v) || 0;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileRef) return;
    const item: DailyActivity = {
      id: Math.random().toString(36).substr(2, 9),
      date: addF.date, callsMade: n(addF.callsMade), schoolsContacted: n(addF.schoolsContacted),
      collegesContacted: n(addF.collegesContacted), meetings: n(addF.meetings),
      proposalsSent: n(addF.proposalsSent), followUps: n(addF.followUps),
      ordersClosed: n(addF.ordersClosed), notes: addF.notes,
    };
    setDocumentNonBlocking(profileRef, { ezDailyActivities: [...activities, item] }, { merge: true });
    setAddF(blank(today)); setShowAdd(false);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileRef || !sel) return;
    const item: DailyActivity = {
      id: sel.id,
      date: editF.date, callsMade: n(editF.callsMade), schoolsContacted: n(editF.schoolsContacted),
      collegesContacted: n(editF.collegesContacted), meetings: n(editF.meetings),
      proposalsSent: n(editF.proposalsSent), followUps: n(editF.followUps),
      ordersClosed: n(editF.ordersClosed), notes: editF.notes,
    };
    setDocumentNonBlocking(profileRef, { ezDailyActivities: activities.map(a => a.id === sel.id ? item : a) }, { merge: true });
    setSel(null);
  };

  const handleDelete = (id: string) => {
    if (!profileRef || !window.confirm('Delete this daily activity log?')) return;
    setDocumentNonBlocking(profileRef, { ezDailyActivities: activities.filter(a => a.id !== id) }, { merge: true });
    if (sel?.id === id) setSel(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* Add Activity Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <div><h2 className="text-base font-black text-slate-900">Log Outreach Activity</h2><p className="text-xs text-muted-foreground">Keep record of your daily outreach effort.</p></div>
              <Button size="icon" variant="ghost" className="rounded-full" onClick={() => setShowAdd(false)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="p-5">
              <ActivityForm f={addF} setF={setAddF} onSubmit={handleAdd} onCancel={() => setShowAdd(false)} isEdit={false} />
            </div>
          </div>
        </div>
      )}

      {/* Activity Detail / Edit Panel */}
      {sel && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSel(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b shrink-0">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-blue-600" />
                <div><h2 className="text-base font-black text-slate-900">Activity Details</h2><p className="text-xs text-muted-foreground">{sel.date}</p></div>
              </div>
              <div className="flex items-center gap-2">
                {!readOnly && <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-500 hover:bg-rose-50 rounded-full" onClick={() => handleDelete(sel.id)}><Trash2 className="w-3.5 h-3.5" /></Button>}
                <Button size="icon" variant="ghost" className="rounded-full" onClick={() => setSel(null)}><X className="w-4 h-4" /></Button>
              </div>
            </div>
            <div className="p-5">
              <ActivityForm f={editF} setF={setEditF} onSubmit={handleUpdate} onCancel={() => setSel(null)} isEdit={true} readOnly={readOnly} />
            </div>
          </div>
        </div>
      )}

      {/* Weekly summary vs targets */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Calls (7d)', value: weeklyTotals.calls, target: 140, icon: Phone, color: 'text-blue-600' },
          { label: 'Schools (7d)', value: weeklyTotals.schools, target: 20, icon: Target, color: 'text-indigo-600' },
          { label: 'Colleges (7d)', value: weeklyTotals.colleges, target: 10, icon: Users, color: 'text-purple-600' },
          { label: 'Proposals (7d)', value: weeklyTotals.proposals, target: 5, icon: FileText, color: 'text-amber-600' },
          { label: 'Orders (7d)', value: weeklyTotals.orders, target: 5, icon: TrendingUp, color: 'text-emerald-600' },
        ].map(({ label, value, target, icon: Icon, color }) => {
          const pct = Math.min((value / target) * 100, 100);
          return (
            <Card key={label} className="border-2 shadow-sm">
              <CardHeader className="pb-1 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">{label}</CardTitle>
                <Icon className={`w-4 h-4 ${color}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-code font-black ${color}`}>{value}<span className="text-xs text-muted-foreground font-normal ml-1">/ {target}</span></div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-current h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, color: color.replace('text-', '') }} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Table Card */}
      <Card className="border shadow-sm bg-white overflow-hidden">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-black text-slate-900">Daily Activity Log</CardTitle>
              <CardDescription>Click any daily row to view detailed counts, update notes, or delete.</CardDescription>
            </div>
            {!readOnly && (
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5 h-8" onClick={() => setShowAdd(true)}>
                <Plus className="w-3.5 h-3.5" /> Log Today
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {activities.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground flex flex-col items-center gap-3">
              <AlertCircle className="w-9 h-9 text-blue-200" />
              <p className="text-sm font-semibold">No activity logged yet. {!readOnly && 'Click "Log Today" to start tracking.'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    {['Date', 'Calls', 'Schools', 'Colleges', 'Meetings', 'Proposals', 'Follow-ups', 'Orders', 'Notes'].map(h => (
                      <TableHead key={h} className="font-black text-[10px] uppercase text-slate-500 whitespace-nowrap">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...activities].sort((a, b) => b.date.localeCompare(a.date)).map(a => (
                    <TableRow key={a.id} className="hover:bg-blue-50/30 cursor-pointer transition-colors" onClick={() => setSel(a)}>
                      <TableCell className="text-xs font-mono text-slate-500 whitespace-nowrap font-bold">
                        <div className="flex items-center gap-1"><Calendar className="w-3 h-3 text-blue-400" />{a.date}</div>
                      </TableCell>
                      <TableCell className="font-code font-black text-blue-700">{a.callsMade}</TableCell>
                      <TableCell className="font-code font-bold text-indigo-700">{a.schoolsContacted}</TableCell>
                      <TableCell className="font-code font-bold text-purple-700">{a.collegesContacted}</TableCell>
                      <TableCell className="font-code font-bold">{a.meetings}</TableCell>
                      <TableCell className="font-code font-bold text-amber-700">{a.proposalsSent}</TableCell>
                      <TableCell className="font-code font-bold">{a.followUps}</TableCell>
                      <TableCell className="font-code font-black text-emerald-700">{a.ordersClosed}</TableCell>
                      <TableCell className="text-xs text-slate-500 max-w-[150px] truncate">{a.notes || '—'}</TableCell>
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
