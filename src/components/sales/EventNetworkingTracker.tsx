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
  Network, Trash2, Edit2, Users, UserPlus, MapPin, AlertCircle, Star
} from 'lucide-react';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { DocumentReference } from 'firebase/firestore';

export interface NetworkingEvent {
  id: string;
  eventName: string;
  date: string;
  type: 'conference' | 'meetup' | 'demo-day' | 'investor-meet' | 'community' | 'other';
  location: string;
  contactsMade: number;
  hotLeads: number;
  investorMeetings: number;
  outcome: 'excellent' | 'good' | 'average' | 'poor';
  followUpStatus: 'pending' | 'in-progress' | 'done' | 'none';
  notes: string;
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  conference: 'bg-blue-50 text-blue-700 border-blue-100',
  meetup: 'bg-teal-50 text-teal-700 border-teal-100',
  'demo-day': 'bg-violet-50 text-violet-700 border-violet-100',
  'investor-meet': 'bg-amber-50 text-amber-700 border-amber-100',
  community: 'bg-green-50 text-green-700 border-green-100',
  other: 'bg-slate-50 text-slate-700 border-slate-200',
};

const OUTCOME_COLORS: Record<string, string> = {
  excellent: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  good: 'bg-blue-50 text-blue-700 border-blue-100',
  average: 'bg-amber-50 text-amber-700 border-amber-100',
  poor: 'bg-rose-50 text-rose-700 border-rose-100',
};

const FOLLOW_UP_COLORS: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-100',
  'in-progress': 'bg-blue-50 text-blue-700 border-blue-100',
  done: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  none: 'bg-slate-50 text-slate-600 border-slate-200',
};

interface EventNetworkingTrackerProps {
  profileRef: DocumentReference | null;
  events: NetworkingEvent[];
}

export function EventNetworkingTracker({ profileRef, events }: EventNetworkingTrackerProps) {
  const [eventName, setEventName] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState<NetworkingEvent['type']>('meetup');
  const [location, setLocation] = useState('');
  const [contactsMade, setContactsMade] = useState<number | ''>('');
  const [hotLeads, setHotLeads] = useState<number | ''>('');
  const [investorMeetings, setInvestorMeetings] = useState<number | ''>('');
  const [outcome, setOutcome] = useState<NetworkingEvent['outcome']>('good');
  const [followUpStatus, setFollowUpStatus] = useState<NetworkingEvent['followUpStatus']>('pending');
  const [notes, setNotes] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const kpis = useMemo(() => {
    const totalContacts = events.reduce((s, e) => s + (Number(e.contactsMade) || 0), 0);
    const totalHotLeads = events.reduce((s, e) => s + (Number(e.hotLeads) || 0), 0);
    const totalInvestors = events.reduce((s, e) => s + (Number(e.investorMeetings) || 0), 0);
    const excellentCount = events.filter(e => e.outcome === 'excellent').length;
    return { total: events.length, totalContacts, totalHotLeads, totalInvestors, excellentCount };
  }, [events]);

  const resetForm = () => {
    setEventName(''); setDate(''); setType('meetup'); setLocation('');
    setContactsMade(''); setHotLeads(''); setInvestorMeetings('');
    setOutcome('good'); setFollowUpStatus('pending'); setNotes('');
    setEditingId(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileRef || !eventName) return;

    const item: NetworkingEvent = {
      id: editingId || Math.random().toString(36).substr(2, 9),
      eventName, date, type, location,
      contactsMade: Number(contactsMade) || 0,
      hotLeads: Number(hotLeads) || 0,
      investorMeetings: Number(investorMeetings) || 0,
      outcome, followUpStatus, notes,
    };

    const updated = editingId
      ? events.map(ev => ev.id === editingId ? item : ev)
      : [...events, item];

    setDocumentNonBlocking(profileRef, { networkingEvents: updated }, { merge: true });
    resetForm();
  };

  const handleEdit = (ev: NetworkingEvent) => {
    setEditingId(ev.id); setEventName(ev.eventName); setDate(ev.date);
    setType(ev.type); setLocation(ev.location); setContactsMade(ev.contactsMade);
    setHotLeads(ev.hotLeads); setInvestorMeetings(ev.investorMeetings);
    setOutcome(ev.outcome); setFollowUpStatus(ev.followUpStatus); setNotes(ev.notes);
  };

  const handleDelete = (id: string) => {
    if (!profileRef) return;
    setDocumentNonBlocking(profileRef, { networkingEvents: events.filter(ev => ev.id !== id) }, { merge: true });
    if (editingId === id) resetForm();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Events Attended', value: kpis.total, sub: `${kpis.excellentCount} rated excellent`, icon: Network, color: 'text-teal-600', bg: 'bg-teal-50/30 border-teal-100' },
          { label: 'Total Contacts Made', value: kpis.totalContacts, sub: 'across all events', icon: Users, color: 'text-blue-600', bg: '' },
          { label: 'Hot Leads Generated', value: kpis.totalHotLeads, sub: 'from event attendance', icon: UserPlus, color: 'text-emerald-600', bg: 'bg-emerald-50/20 border-emerald-100' },
          { label: 'Investor Interactions', value: kpis.totalInvestors, sub: 'investor meetings at events', icon: Star, color: 'text-amber-600', bg: 'bg-amber-50/20 border-amber-100' },
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
              <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
              {editingId ? 'Edit Event' : 'Log an Event'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-3">
              <div className="space-y-1">
                <Label className="font-bold text-xs">Event Name</Label>
                <Input placeholder="e.g. SaaSBOOMi Chennai 2025" value={eventName} onChange={e => setEventName(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="font-bold text-xs">Date</Label>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="font-bold text-xs">Event Type</Label>
                  <Select value={type} onValueChange={(v: any) => setType(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conference">Conference</SelectItem>
                      <SelectItem value="meetup">Meetup</SelectItem>
                      <SelectItem value="demo-day">Demo Day</SelectItem>
                      <SelectItem value="investor-meet">Investor Meet</SelectItem>
                      <SelectItem value="community">Community</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="font-bold text-xs">Location / Platform</Label>
                <Input placeholder="e.g. Chennai, IIT Madras / Zoom" value={location} onChange={e => setLocation(e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="font-bold text-xs">Contacts</Label>
                  <Input type="number" placeholder="0" value={contactsMade} onChange={e => setContactsMade(e.target.value === '' ? '' : Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <Label className="font-bold text-xs">Hot Leads</Label>
                  <Input type="number" placeholder="0" value={hotLeads} onChange={e => setHotLeads(e.target.value === '' ? '' : Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <Label className="font-bold text-xs">Investors</Label>
                  <Input type="number" placeholder="0" value={investorMeetings} onChange={e => setInvestorMeetings(e.target.value === '' ? '' : Number(e.target.value))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="font-bold text-xs">Outcome</Label>
                  <Select value={outcome} onValueChange={(v: any) => setOutcome(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excellent">Excellent</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="average">Average</SelectItem>
                      <SelectItem value="poor">Poor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="font-bold text-xs">Follow-Up</Label>
                  <Select value={followUpStatus} onValueChange={(v: any) => setFollowUpStatus(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                      <SelectItem value="none">None needed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="font-bold text-xs">Notes</Label>
                <Input placeholder="e.g. Met co-founder of XYZ, warm intro to ABC VC..." value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs">
                  {editingId ? 'Update Event' : 'Log Event'}
                </Button>
                {editingId && <Button type="button" variant="ghost" size="sm" onClick={resetForm}>Cancel</Button>}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border shadow-sm bg-white overflow-hidden lg:col-span-2">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-black text-slate-900">Event & Networking Log</CardTitle>
            <CardDescription>All attended events with contacts, leads, and investor meetings tracked.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {events.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground flex flex-col items-center gap-3">
                <AlertCircle className="w-9 h-9 text-teal-200" />
                <p className="text-sm font-semibold">No events logged yet. Start tracking your community presence.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      {['Event', 'Type', 'Contacts', 'Hot Leads', 'Investors', 'Outcome', 'Follow-Up', ''].map(h => (
                        <TableHead key={h} className="font-black text-xs uppercase text-slate-500">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map(ev => (
                      <TableRow key={ev.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="font-bold py-3">
                          <div className="text-slate-900 truncate max-w-[130px]">{ev.eventName}</div>
                          {ev.location && (
                            <div className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                              <MapPin className="w-2.5 h-2.5" />
                              <span className="truncate max-w-[110px]">{ev.location}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={`border text-[9px] font-black uppercase ${EVENT_TYPE_COLORS[ev.type]}`}>{ev.type}</Badge>
                        </TableCell>
                        <TableCell className="font-code font-bold text-slate-700">{ev.contactsMade}</TableCell>
                        <TableCell className="font-code font-bold text-emerald-700">{ev.hotLeads}</TableCell>
                        <TableCell className="font-code font-bold text-amber-700">{ev.investorMeetings}</TableCell>
                        <TableCell>
                          <Badge className={`border text-[9px] font-black uppercase ${OUTCOME_COLORS[ev.outcome]}`}>{ev.outcome}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`border text-[9px] font-black uppercase ${FOLLOW_UP_COLORS[ev.followUpStatus]}`}>{ev.followUpStatus}</Badge>
                        </TableCell>
                        <TableCell className="pr-4">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-teal-600 rounded-full" onClick={() => handleEdit(ev)}>
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-rose-600 rounded-full" onClick={() => handleDelete(ev.id)}>
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
