'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, UserPlus, Copy, Check, AlertCircle, Trash2, RefreshCw, Link2, Shield, ShieldAlert } from 'lucide-react';
import { useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, query, where, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { Employee } from './TaskManager';

interface AdminPanelProps {
  userId: string;
  companyProfileId: string;
  companyName: string;
  employees: Employee[];
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const seg = (n: number) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `EZC-${seg(4)}-${seg(4)}`;
}

export function AdminPanel({ userId, companyProfileId, companyName, employees }: AdminPanelProps) {
  const firestore = useFirestore();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [lastCode, setLastCode] = useState('');
  const [signupLink, setSignupLink] = useState('');

  // Invite codes collection
  const inviteCodesRef = useMemoFirebase(() => {
    if (!firestore || !userId) return null;
    return collection(firestore, 'inviteCodes');
  }, [firestore, userId]);

  const inviteCodesQuery = useMemoFirebase(() => {
    if (!inviteCodesRef) return null;
    return query(inviteCodesRef, where('adminUid', '==', userId));
  }, [inviteCodesRef, userId]);

  const { data: inviteCodesRaw } = useCollection(inviteCodesQuery);
  const inviteCodes = inviteCodesRaw || [];

  const handleGenerateCode = async () => {
    if (!firestore || !userId) return;
    setGeneratingCode(true);
    try {
      const code = generateCode();
      const codeRef = doc(firestore, 'inviteCodes', code);
      await setDoc(codeRef, {
        code,
        adminUid: userId,
        companyName: companyName || 'EZCirkit',
        companyProfileId,
        used: false,
        createdAt: serverTimestamp(),
      });
      setLastCode(code);
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      setSignupLink(`${origin}/employee-signup`);
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(key);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleDeleteCode = (code: string) => {
    if (!firestore) return;
    deleteDocumentNonBlocking(doc(firestore, 'inviteCodes', code));
  };

  const handleToggleEmployee = (emp: Employee) => {
    if (!firestore) return;
    setDocumentNonBlocking(
      doc(firestore, 'employees', emp.uid),
      { isActive: !emp.isActive },
      { merge: true }
    );
  };

  const handleUpdateDepartment = (emp: Employee, dept: string) => {
    if (!firestore) return;
    setDocumentNonBlocking(doc(firestore, 'employees', emp.uid), { department: dept }, { merge: true });
  };

  const handleUpdateRole = (emp: Employee, role: string) => {
    if (!firestore) return;
    setDocumentNonBlocking(doc(firestore, 'employees', emp.uid), { role }, { merge: true });
  };

  const activeCodes = (inviteCodes as any[]).filter((c: any) => !c.used);
  const usedCodes = (inviteCodes as any[]).filter((c: any) => c.used);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-100 rounded-xl">
        <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center shrink-0">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="font-black text-sm text-teal-900">Admin Control Panel</div>
          <div className="text-xs text-teal-700 font-medium">You are the admin for <span className="font-black">{companyName}</span>. Manage your team and access below.</div>
        </div>
        <Badge className="ml-auto bg-teal-600 text-white border-0 font-black text-[9px] uppercase tracking-widest">Admin</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invite Code Generator */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-teal-600" />
              Invite Team Members
            </CardTitle>
            <CardDescription>Generate single-use invite codes for employee sign-up.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleGenerateCode}
              disabled={generatingCode}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold gap-2"
            >
              {generatingCode ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Generate New Invite Code
            </Button>

            {lastCode && (
              <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl space-y-3 animate-in slide-in-from-top-4 duration-300">
                <p className="text-[10px] uppercase font-black text-teal-700 tracking-widest">New Code Generated!</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-white border border-teal-200 rounded-lg px-4 py-2.5 font-mono font-black text-lg text-teal-900 tracking-[0.2em] text-center">
                    {lastCode}
                  </div>
                  <Button size="icon" variant="outline" className="border-teal-200 hover:bg-teal-50 shrink-0" onClick={() => handleCopy(lastCode, 'code')}>
                    {copiedCode === 'code' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-teal-600" />}
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Link2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <div className="flex-1 text-xs font-mono text-teal-800 truncate">{signupLink}</div>
                  <Button size="icon" variant="outline" className="border-teal-200 hover:bg-teal-50 h-7 w-7 shrink-0" onClick={() => handleCopy(signupLink, 'link')}>
                    {copiedCode === 'link' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-teal-600" />}
                  </Button>
                </div>
                <p className="text-[10px] text-teal-600 font-medium">Share both the code and link with the new employee. Code is single-use only.</p>
              </div>
            )}

            {/* Active Codes */}
            {activeCodes.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Active Codes ({activeCodes.length})</p>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {activeCodes.map((c: any) => (
                    <div key={c.id} className="flex items-center gap-2 px-3 py-2 bg-slate-50 border rounded-lg">
                      <span className="font-mono font-black text-xs text-slate-800 flex-1 tracking-wider">{c.code || c.id}</span>
                      <Badge className="bg-amber-50 text-amber-700 border-amber-100 border text-[8px] font-black">Unused</Badge>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-400 hover:text-rose-500" onClick={() => handleDeleteCode(c.code || c.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {usedCodes.length > 0 && (
              <p className="text-[10px] text-muted-foreground font-semibold">{usedCodes.length} code(s) already used by employees.</p>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Total Members', value: employees.length, icon: Users, color: 'text-teal-600' },
              { label: 'Active', value: employees.filter(e => e.isActive).length, icon: Shield, color: 'text-emerald-600' },
              { label: 'Invite Codes', value: activeCodes.length, icon: UserPlus, color: 'text-indigo-600' },
              { label: 'Inactive', value: employees.filter(e => !e.isActive).length, icon: ShieldAlert, color: 'text-amber-600' },
            ].map(({ label, value, icon: Icon, color }) => (
              <Card key={label} className="border-2 shadow-sm">
                <CardHeader className="pb-1 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">{label}</CardTitle>
                  <Icon className={`w-4 h-4 ${color}`} />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-code font-black ${color}`}>{value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Employee Sign-Up Link</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 bg-slate-50 border rounded-lg px-3 py-2">
                <Link2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span className="text-xs font-mono text-slate-700 flex-1 truncate">
                  {typeof window !== 'undefined' ? window.location.origin : 'https://yourapp.com'}/employee-signup
                </span>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleCopy(`${typeof window !== 'undefined' ? window.location.origin : ''}/employee-signup`, 'page')}>
                  {copiedCode === 'page' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 font-medium">Share this link with new employees. They'll need an invite code to complete sign-up.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Employee Table */}
      <Card className="border shadow-sm bg-white overflow-hidden">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base font-black text-slate-900">Team Members</CardTitle>
          <CardDescription>Manage employee access, roles, and departments.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {employees.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground flex flex-col items-center gap-3">
              <AlertCircle className="w-9 h-9 text-teal-200" />
              <p className="text-sm font-semibold">No employees yet. Generate an invite code and share it with your team.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    {['Member', 'Email', 'Department', 'Role', 'Status', 'Actions'].map(h => (
                      <TableHead key={h} className="font-black text-[10px] uppercase text-slate-500 whitespace-nowrap">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map(emp => (
                    <TableRow key={emp.uid} className="hover:bg-slate-50 transition-colors">
                      <TableCell className="font-bold py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center font-black text-sm text-teal-700 shrink-0">
                            {emp.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-slate-900">{emp.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 font-mono">{emp.email}</TableCell>
                      <TableCell>
                        <Input
                          className="h-7 text-xs w-28 border-slate-200"
                          placeholder="e.g. Sales"
                          defaultValue={emp.department}
                          onBlur={e => handleUpdateDepartment(emp, e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          defaultValue={emp.role || 'Employee'}
                          onValueChange={(val) => handleUpdateRole(emp, val)}
                        >
                          <SelectTrigger className="h-7 text-xs w-28 border-slate-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Employee">Employee</SelectItem>
                            <SelectItem value="Manager">Manager</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge className={`border text-[9px] font-black uppercase ${emp.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                          {emp.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          className={`text-[10px] font-black h-7 px-2 ${emp.isActive ? 'border-rose-200 text-rose-600 hover:bg-rose-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}
                          onClick={() => handleToggleEmployee(emp)}
                        >
                          {emp.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
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
