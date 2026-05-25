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
import { Trash2, Edit2, AlertCircle, Phone, Mail, Calendar, Target, TrendingUp, Users, IndianRupee } from 'lucide-react';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { DocumentReference } from 'firebase/firestore';

export type LeadType = 'school' | 'college' | 'student' | 'other';
export type LeadStatus = 'new-lead' | 'contacted' | 'meeting-scheduled' | 'proposal-sent' | 'follow-up' | 'negotiation' | 'won' | 'lost' | 'on-hold';
export type LeadSource = 'cold-call' | 'referral' | 'instagram' | 'whatsapp' | 'website' | 'event' | 'other';

export interface EZLead {
  id: string;
  date: string;
  leadType: LeadType;
  organization: string;
  contactPerson: string;
  phone: string;
  email: string;
  source: LeadSource;
  requirement: string;
  status: LeadStatus;
  nextAction: string;
  followUpDate: string;
  expectedRevenue: number;
  actualRevenue: number;
  remarks: string;
}

const LEAD_TYPE_COLORS: Record<string, string> = {
  school: 'bg-blue-50 text-blue-700 border-blue-100',
  college: 'bg-purple-50 text-purple-700 border-purple-100',
  student: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  other: 'bg-slate-50 text-slate-600 border-slate-200',
};

const STATUS_COLORS: Record<string, string> = {
  'new-lead': 'bg-slate-100 text-slate-700 border-slate-200',
  contacted: 'bg-blue-50 text-blue-700 border-blue-100',
  'meeting-scheduled': 'bg-indigo-50 text-indigo-700 border-indigo-100',
  'proposal-sent': 'bg-amber-50 text-amber-700 border-amber-100',
  'follow-up': 'bg-cyan-50 text-cyan-700 border-cyan-100',
  negotiation: 'bg-orange-50 text-orange-700 border-orange-100',
  won: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  lost: 'bg-rose-50 text-rose-700 border-rose-100',
  'on-hold': 'bg-gray-50 text-gray-600 border-gray-200',
};

const STATUS_LABELS: Record<LeadStatus, string> = {
  'new-lead': 'New Lead',
  contacted: 'Contacted',
  'meeting-scheduled': 'Meeting Scheduled',
  'proposal-sent': 'Proposal Sent',
  'follow-up': 'Follow-up',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
  'on-hold': 'On Hold',
};

interface Props {
  profileRef: DocumentReference | null;
  leads: EZLead[];
}

export function EZCirkitLeadTracker({ profileRef, leads }: Props) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [leadType, setLeadType] = useState<LeadType>('school');
  const [organization, setOrganization] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [source, setSource] = useState<LeadSource>('cold-call');
  const [requirement, setRequirement] = useState('');
  const [status, setStatus] = useState<LeadStatus>('new-lead');
  const [nextAction, setNextAction] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [expectedRevenue, setExpectedRevenue] = useState<number | ''>('');
  const [actualRevenue, setActualRevenue] = useState<number | ''>('');
  const [remarks, setRemarks] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  const kpis = useMemo(() => {
    const totalExpected = leads.reduce((s, l) => s + (Number(l.expectedRevenue) || 0), 0);
    const totalActual = leads.reduce((s, l) => s + (Number(l.actualRevenue) || 0), 0);
    const won = leads.filter(l => l.status === 'won').length;
    const schools = leads.filter(l => l.leadType === 'school').length;
    const colleges = leads.filter(l => l.leadType === 'college').length;
    const students = leads.filter(l => l.leadType === 'student').length;
    return { total: leads.length, won, schools, colleges, students, totalExpected, totalActual };
  }, [leads]);

  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      if (filterStatus !== 'all' && l.status !== filterStatus) return false;
      if (filterType !== 'all' && l.leadType !== filterType) return false;
      return true;
    });
  }, [leads, filterStatus, filterType]);

  const resetForm = () => {
    setDate(today); setLeadType('school'); setOrganization(''); setContactPerson('');
    setPhone(''); setEmail(''); setSource('cold-call'); setRequirement('');
    setStatus('new-lead'); setNextAction(''); setFollowUpDate('');
    setExpectedRevenue(''); setActualRevenue(''); setRemarks(''); setEditingId(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileRef || !organization) return;
    const item: EZLead = {
      id: editingId || Math.random().toString(36).substr(2, 9),
      date, leadType, organization, contactPerson, phone, email, source,
      requirement, status, nextAction, followUpDate,
      expectedRevenue: Number(expectedRevenue) || 0,
      actualRevenue: Number(actualRevenue) || 0,
      remarks,
    };
    const updated = editingId ? leads.map(l => l.id === editingId ? item : l) : [...leads, item];
    setDocumentNonBlocking(profileRef, { ezLeads: updated }, { merge: true });
    resetForm();
  };

  const handleEdit = (l: EZLead) => {
    setEditingId(l.id); setDate(l.date); setLeadType(l.leadType); setOrganization(l.organization);
    setContactPerson(l.contactPerson); setPhone(l.phone); setEmail(l.email); setSource(l.source);
    setRequirement(l.requirement); setStatus(l.status); setNextAction(l.nextAction);
    setFollowUpDate(l.followUpDate); setExpectedRevenue(l.expectedRevenue);
    setActualRevenue(l.actualRevenue); setRemarks(l.remarks);
  };

  const handleDelete = (id: string) => {
    if (!profileRef) return;
    setDocumentNonBlocking(profileRef, { ezLeads: leads.filter(l => l.id !== id) }, { merge: true });
    if (editingId === id) resetForm();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Leads', value: kpis.total, sub: `${kpis.won} won`, icon: Users, color: 'text-indigo-600', bg: '' },
          { label: 'Schools', value: kpis.schools, sub: `${kpis.colleges} colleges`, icon: Target, color: 'text-blue-600', bg: 'bg-blue-50/20 border-blue-100' },
          { label: 'Student Leads', value: kpis.students, sub: 'direct inquiries', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50/20 border-emerald-100' },
          { label: 'Expected Revenue', value: fmtINR(kpis.totalExpected), sub: `Actual: ${fmtINR(kpis.totalActual)}`, icon: IndianRupee, color: 'text-amber-600', bg: 'bg-amber-50/20 border-amber-100' },
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
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
              {editingId ? 'Edit Lead' : 'Add Lead'}
            </CardTitle>
            <CardDescription>Track from first contact to close.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="font-bold text-xs">Date</Label>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="font-bold text-xs">Lead Type</Label>
                  <Select value={leadType} onValueChange={(v: any) => setLeadType(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="school">School</SelectItem>
                      <SelectItem value="college">College</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="font-bold text-xs">Organization / Person Name</Label>
                <Input placeholder="e.g. ABC Matric School" value={organization} onChange={e => setOrganization(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="font-bold text-xs">Contact Person</Label>
                  <Input placeholder="e.g. Principal Kumar" value={contactPerson} onChange={e => setContactPerson(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="font-bold text-xs">Phone</Label>
                  <Input placeholder="9876543210" value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="font-bold text-xs">Email</Label>
                <Input type="email" placeholder="contact@school.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="font-bold text-xs">Source</Label>
                  <Select value={source} onValueChange={(v: any) => setSource(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cold-call">Cold Call</SelectItem>
                      <SelectItem value="referral">Referral</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="event">Event</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="font-bold text-xs">Requirement</Label>
                  <Input placeholder="e.g. IoT Workshop" value={requirement} onChange={e => setRequirement(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="font-bold text-xs">Status</Label>
                  <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(STATUS_LABELS) as LeadStatus[]).map(s => (
                        <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="font-bold text-xs">Follow-up Date</Label>
                  <Input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="font-bold text-xs">Next Action</Label>
                <Input placeholder="e.g. Send Proposal" value={nextAction} onChange={e => setNextAction(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="font-bold text-xs">Expected Revenue (₹)</Label>
                  <Input type="number" placeholder="15000" value={expectedRevenue} onChange={e => setExpectedRevenue(e.target.value === '' ? '' : Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <Label className="font-bold text-xs">Actual Revenue (₹)</Label>
                  <Input type="number" placeholder="0" value={actualRevenue} onChange={e => setActualRevenue(e.target.value === '' ? '' : Number(e.target.value))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="font-bold text-xs">Remarks</Label>
                <Input placeholder="e.g. Interested, follow up required" value={remarks} onChange={e => setRemarks(e.target.value)} />
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs">
                  {editingId ? 'Update Lead' : 'Add Lead'}
                </Button>
                {editingId && <Button type="button" variant="ghost" size="sm" onClick={resetForm}>Cancel</Button>}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border shadow-sm bg-white overflow-hidden lg:col-span-2">
          <CardHeader className="pb-3 border-b">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-black text-slate-900">Lead Pipeline</CardTitle>
                <CardDescription>Full funnel from first contact to revenue.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="h-8 text-xs w-28"><SelectValue placeholder="All Types" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="school">School</SelectItem>
                    <SelectItem value="college">College</SelectItem>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-8 text-xs w-32"><SelectValue placeholder="All Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {(Object.keys(STATUS_LABELS) as LeadStatus[]).map(s => (
                      <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredLeads.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground flex flex-col items-center gap-3">
                <AlertCircle className="w-9 h-9 text-indigo-200" />
                <p className="text-sm font-semibold">No leads found. Add your first lead to start tracking.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      {['Date', 'Type', 'Organization', 'Contact', 'Requirement', 'Status', 'Next Action', 'Follow-up', 'Exp. Rev', 'Act. Rev', 'Remarks', ''].map(h => (
                        <TableHead key={h} className="font-black text-[10px] uppercase text-slate-500 whitespace-nowrap">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.map(l => (
                      <TableRow key={l.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="text-xs font-mono text-slate-500 whitespace-nowrap">{l.date || '—'}</TableCell>
                        <TableCell>
                          <Badge className={`border text-[9px] font-black uppercase ${LEAD_TYPE_COLORS[l.leadType]}`}>{l.leadType}</Badge>
                        </TableCell>
                        <TableCell className="font-bold py-3 max-w-[130px]">
                          <div className="text-slate-900 truncate">{l.organization}</div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 max-w-[100px]">
                          <div className="font-medium truncate">{l.contactPerson || '—'}</div>
                          {l.phone && (
                            <div className="flex items-center gap-0.5 text-[10px] text-slate-400">
                              <Phone className="w-2.5 h-2.5" />{l.phone}
                            </div>
                          )}
                          {l.email && (
                            <div className="flex items-center gap-0.5 text-[10px] text-slate-400 truncate">
                              <Mail className="w-2.5 h-2.5" />{l.email}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 max-w-[110px] truncate">{l.requirement || '—'}</TableCell>
                        <TableCell>
                          <Badge className={`border text-[9px] font-black whitespace-nowrap ${STATUS_COLORS[l.status]}`}>{STATUS_LABELS[l.status]}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 max-w-[110px] truncate">{l.nextAction || '—'}</TableCell>
                        <TableCell className="text-xs font-mono text-slate-500 whitespace-nowrap">
                          {l.followUpDate ? (
                            <div className="flex items-center gap-0.5">
                              <Calendar className="w-3 h-3 text-amber-500" />{l.followUpDate}
                            </div>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="font-code font-bold text-indigo-700 whitespace-nowrap">{l.expectedRevenue > 0 ? fmtINR(l.expectedRevenue) : '—'}</TableCell>
                        <TableCell className="font-code font-bold text-emerald-700 whitespace-nowrap">{l.actualRevenue > 0 ? fmtINR(l.actualRevenue) : '—'}</TableCell>
                        <TableCell className="text-xs text-slate-500 max-w-[100px] truncate">{l.remarks || '—'}</TableCell>
                        <TableCell className="pr-4">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-indigo-600 rounded-full" onClick={() => handleEdit(l)}>
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-rose-600 rounded-full" onClick={() => handleDelete(l.id)}>
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
