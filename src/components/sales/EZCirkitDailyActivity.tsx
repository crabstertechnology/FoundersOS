'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Edit2, AlertCircle, Phone, Users, FileText, Calendar, TrendingUp, Target } from 'lucide-react';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { DocumentReference } from 'firebase/firestore';

export interface DailyActivity {
  id: string;
  date: string;
  callsMade: number;
  schoolsContacted: number;
  collegesContacted: number;
  meetings: number;
  proposalsSent: number;
  followUps: number;
  ordersClosed: number;
  notes: string;
}

interface DailyActivityProps {
  profileRef: DocumentReference | null;
  activities: DailyActivity[];
  readOnly?: boolean;
}

export function EZCirkitDailyActivity({ profileRef, activities, readOnly }: DailyActivityProps) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [callsMade, setCallsMade] = useState<number | ''>(0);
  const [schoolsContacted, setSchoolsContacted] = useState<number | ''>(0);
  const [collegesContacted, setCollegesContacted] = useState<number | ''>(0);
  const [meetings, setMeetings] = useState<number | ''>(0);
  const [proposalsSent, setProposalsSent] = useState<number | ''>(0);
  const [followUps, setFollowUps] = useState<number | ''>(0);
  const [ordersClosed, setOrdersClosed] = useState<number | ''>(0);
  const [notes, setNotes] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

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

  const resetForm = () => {
    setDate(today); setCallsMade(0); setSchoolsContacted(0); setCollegesContacted(0);
    setMeetings(0); setProposalsSent(0); setFollowUps(0); setOrdersClosed(0); setNotes(''); setEditingId(null);
  };

  const n = (v: number | '') => Number(v) || 0;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileRef) return;
    const item: DailyActivity = {
      id: editingId || Math.random().toString(36).substr(2, 9),
      date, callsMade: n(callsMade), schoolsContacted: n(schoolsContacted),
      collegesContacted: n(collegesContacted), meetings: n(meetings),
      proposalsSent: n(proposalsSent), followUps: n(followUps),
      ordersClosed: n(ordersClosed), notes,
    };
    const updated = editingId ? activities.map(a => a.id === editingId ? item : a) : [...activities, item];
    setDocumentNonBlocking(profileRef, { ezDailyActivities: updated }, { merge: true });
    resetForm();
  };

  const handleEdit = (a: DailyActivity) => {
    setEditingId(a.id); setDate(a.date); setCallsMade(a.callsMade);
    setSchoolsContacted(a.schoolsContacted); setCollegesContacted(a.collegesContacted);
    setMeetings(a.meetings); setProposalsSent(a.proposalsSent);
    setFollowUps(a.followUps); setOrdersClosed(a.ordersClosed); setNotes(a.notes);
  };

  const handleDelete = (id: string) => {
    if (!profileRef) return;
    setDocumentNonBlocking(profileRef, { ezDailyActivities: activities.filter(a => a.id !== id) }, { merge: true });
    if (editingId === id) resetForm();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Weekly summary vs targets */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Calls (7d)', value: weeklyTotals.calls, target: 140, icon: Phone, color: 'text-blue-600', bg: '' },
          { label: 'Schools (7d)', value: weeklyTotals.schools, target: 20, icon: Target, color: 'text-indigo-600', bg: '' },
          { label: 'Colleges (7d)', value: weeklyTotals.colleges, target: 10, icon: Users, color: 'text-purple-600', bg: '' },
          { label: 'Proposals (7d)', value: weeklyTotals.proposals, target: 5, icon: FileText, color: 'text-amber-600', bg: '' },
          { label: 'Orders (7d)', value: weeklyTotals.orders, target: 5, icon: TrendingUp, color: 'text-emerald-600', bg: '' },
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {!readOnly && (
          <Card className="border shadow-sm lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              {editingId ? 'Edit Day' : 'Log Today'}
            </CardTitle>
            <CardDescription>Record your daily outreach activity.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-3">
              <div className="space-y-1">
                <Label className="font-bold text-xs">Date</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Calls Made', val: callsMade, set: setCallsMade },
                  { label: 'Schools Contacted', val: schoolsContacted, set: setSchoolsContacted },
                  { label: 'Colleges Contacted', val: collegesContacted, set: setCollegesContacted },
                  { label: 'Meetings', val: meetings, set: setMeetings },
                  { label: 'Proposals Sent', val: proposalsSent, set: setProposalsSent },
                  { label: 'Follow-ups', val: followUps, set: setFollowUps },
                  { label: 'Orders Closed', val: ordersClosed, set: setOrdersClosed },
                ].map(({ label, val, set }) => (
                  <div key={label} className="space-y-1">
                    <Label className="font-bold text-xs">{label}</Label>
                    <Input type="number" min="0" value={val} onChange={e => set(e.target.value === '' ? '' : Number(e.target.value))} />
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <Label className="font-bold text-xs">Notes</Label>
                <Input placeholder="e.g. Good response from Greenfields School" value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs">
                  {editingId ? 'Update Log' : 'Save Day Log'}
                </Button>
                {editingId && <Button type="button" variant="ghost" size="sm" onClick={resetForm}>Cancel</Button>}
              </div>
            </form>
          </CardContent>
        </Card>
        )}

        <Card className={`border shadow-sm bg-white overflow-hidden ${readOnly ? 'lg:col-span-3' : 'lg:col-span-2'}`}>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-black text-slate-900">Daily Activity Log</CardTitle>
            <CardDescription>All recorded outreach and sales activity by day.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {activities.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground flex flex-col items-center gap-3">
                <AlertCircle className="w-9 h-9 text-blue-200" />
                <p className="text-sm font-semibold">No activity logged yet. Start tracking your daily grind.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      {['Date', 'Calls', 'Schools', 'Colleges', 'Meetings', 'Proposals', 'Follow-ups', 'Orders', 'Notes', ...(!readOnly ? [''] : [])].map(h => (
                        <TableHead key={h} className="font-black text-[10px] uppercase text-slate-500 whitespace-nowrap">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...activities].sort((a, b) => b.date.localeCompare(a.date)).map(a => (
                      <TableRow key={a.id} className="hover:bg-slate-50 transition-colors">
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
                        <TableCell className="text-xs text-slate-500 max-w-[100px] truncate">{a.notes || '—'}</TableCell>
                        {!readOnly && (
                          <TableCell className="pr-4">
                            <div className="flex justify-end gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-blue-600 rounded-full" onClick={() => handleEdit(a)}>
                                <Edit2 className="w-3 h-3" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-rose-600 rounded-full" onClick={() => handleDelete(a.id)}>
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
