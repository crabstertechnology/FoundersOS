'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirebase, useFirestore, useMemoFirebase, useCollection, useAuth, initiateSignOut } from '@/firebase';
import { setDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { doc, collection, query, where, serverTimestamp } from 'firebase/firestore';
import { User, Settings, Users, Key, Plus, Trash2, ShieldCheck, LogOut, Copy, Check } from 'lucide-react';
import type { Employee } from './TaskManager';

interface SettingsPageProps {
  userId: string;
}

export function SettingsPage({ userId }: SettingsPageProps) {
  const { user } = useFirebase();
  const auth = useAuth();
  const firestore = useFirestore();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Firestore collections for Admin Panel controls
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

  const employeesRef = useMemoFirebase(() => {
    if (!firestore || !userId) return null;
    return collection(firestore, 'employees');
  }, [firestore, userId]);

  const employeesQuery = useMemoFirebase(() => {
    if (!employeesRef) return null;
    return query(employeesRef, where('adminUid', '==', userId));
  }, [employeesRef, userId]);

  const { data: rawEmployeesData } = useCollection(employeesQuery);
  const employees = useMemo<Employee[]>(() => (rawEmployeesData || []).map((e: any) => ({
    id: e.id,
    uid: e.uid || e.id,
    name: e.name || 'Unknown',
    email: e.email || '',
    department: e.department || '',
    role: e.role || 'Employee',
    isActive: e.isActive !== false,
  })), [rawEmployeesData]);

  // Invite code actions
  const handleGenerateCode = async () => {
    if (!inviteCodesRef || !userId) return;

    // Generate readable code: EZC-XXXX-XXXX
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const rand = (len: number) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const code = `EZC-${rand(4)}-${rand(4)}`;

    setDocumentNonBlocking(doc(inviteCodesRef, code), {
      code,
      adminUid: userId,
      used: false,
      usedByUid: '',
      usedByEmail: '',
      createdAt: serverTimestamp(),
    }, { merge: true });
  };

  const handleDeleteCode = (code: string) => {
    if (!inviteCodesRef) return;
    deleteDocumentNonBlocking(doc(inviteCodesRef, code));
  };

  const copyToClipboard = (code: string) => {
    const signupLink = `${window.location.origin}/employee-signup?code=${code}`;
    navigator.clipboard.writeText(signupLink);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleToggleActive = (emp: Employee) => {
    if (!firestore) return;
    setDocumentNonBlocking(doc(firestore, 'employees', emp.uid), { isActive: !emp.isActive }, { merge: true });
  };

  const handleRoleChange = (emp: Employee, role: string) => {
    if (!firestore) return;
    setDocumentNonBlocking(doc(firestore, 'employees', emp.uid), { role }, { merge: true });
  };

  const activeCodes = (inviteCodes as any[]).filter((c: any) => !c.used);

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 leading-[1.1] mb-2">
          Founder <span className="text-primary">Settings</span>
        </h1>
        <p className="text-muted-foreground font-medium text-lg">
          Configure credentials, generate onboarding links, and authorize team access.
        </p>
      </div>

      <Card className="border shadow-sm bg-white overflow-hidden">
        <div className="flex flex-col md:flex-row h-[600px] min-h-0">
          <Tabs defaultValue="profile" className="flex w-full h-full">
            {/* Left Nav */}
            <div className="w-full md:w-60 border-r bg-slate-50/50 p-4 shrink-0 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Control Center
                </div>
                <TabsList className="flex flex-col w-full h-auto bg-transparent gap-1 p-0">
                  <TabsTrigger
                    value="profile"
                    className="w-full justify-start rounded-lg px-3 py-2.5 text-xs font-bold gap-2.5 data-[state=active]:bg-white data-[state=active]:text-primary border border-transparent data-[state=active]:border-slate-200 transition-all text-slate-600"
                  >
                    <User className="w-4 h-4 text-slate-500" />
                    My Details
                  </TabsTrigger>
                  <TabsTrigger
                    value="invites"
                    className="w-full justify-start rounded-lg px-3 py-2.5 text-xs font-bold gap-2.5 data-[state=active]:bg-white data-[state=active]:text-primary border border-transparent data-[state=active]:border-slate-200 transition-all text-slate-600"
                  >
                    <Key className="w-4 h-4 text-slate-500" />
                    Invite Links
                  </TabsTrigger>
                  <TabsTrigger
                    value="members"
                    className="w-full justify-start rounded-lg px-3 py-2.5 text-xs font-bold gap-2.5 data-[state=active]:bg-white data-[state=active]:text-primary border border-transparent data-[state=active]:border-slate-200 transition-all text-slate-600"
                  >
                    <Users className="w-4 h-4 text-slate-500" />
                    Team Management
                  </TabsTrigger>
                </TabsList>
              </div>

              <div>
                <div className="h-px bg-slate-200 my-4" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => initiateSignOut(auth)}
                  className="w-full justify-start text-xs font-bold gap-2.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700 h-10 px-3 rounded-lg"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out Account
                </Button>
              </div>
            </div>

            {/* Right Content */}
            <div className="flex-1 p-6 overflow-y-auto h-full min-h-0 bg-white">
              {/* Profile Details Tab */}
              <TabsContent value="profile" className="mt-0 h-full focus-visible:outline-none">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 mb-1">Account Specifications</h3>
                    <p className="text-xs text-muted-foreground font-medium">Verify your active session configuration and credentials.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5 p-4 border rounded-xl bg-slate-50/50">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</Label>
                      <div className="text-xs font-bold text-slate-800">{user.email || 'N/A'}</div>
                    </div>

                    <div className="space-y-1.5 p-4 border rounded-xl bg-slate-50/50">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">User ID Reference</Label>
                      <div className="text-[11px] font-mono text-slate-600 truncate" title={user.uid}>{user.uid}</div>
                    </div>

                    <div className="space-y-1.5 p-4 border rounded-xl bg-slate-50/50">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Account Status</Label>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Active Authorized</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 p-4 border rounded-xl bg-slate-50/50">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Authentication Method</Label>
                      <div className="text-xs font-bold text-slate-800 capitalize">{user.providerId || 'Email/Password'}</div>
                    </div>
                  </div>

                  <div className="p-4 border border-teal-100 bg-teal-50/20 rounded-xl flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-teal-900">Security Credentials Verified</h4>
                      <p className="text-[11px] text-teal-700/80 leading-relaxed font-medium">
                        This session is authenticated with direct access privileges. You can generate invite links and update employee authorization statuses from the other settings tabs.
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Invite Codes Tab */}
              <TabsContent value="invites" className="mt-0 h-full focus-visible:outline-none">
                <div className="space-y-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 mb-1">Onboarding Invite Links</h3>
                      <p className="text-xs text-muted-foreground font-medium">Generate single-use sign-up links for your employee onboarding.</p>
                    </div>
                    <Button onClick={handleGenerateCode} className="bg-primary hover:bg-primary/95 text-white font-bold text-xs gap-1.5">
                      <Plus className="w-3.5 h-3.5" />
                      Create Invite Link
                    </Button>
                  </div>

                  {/* Active Codes */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Active Links ({activeCodes.length})</h4>
                    {activeCodes.length === 0 ? (
                      <div className="border border-dashed rounded-xl p-8 text-center text-xs text-muted-foreground font-medium">
                        No active onboarding links generated. Click "Create Invite Link" to generate one.
                      </div>
                    ) : (
                      <div className="border rounded-xl overflow-hidden shadow-sm">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50">
                              <TableHead className="font-bold text-[10px] uppercase text-slate-500 py-2.5">Sign-up URL Link</TableHead>
                              <TableHead className="font-bold text-[10px] uppercase text-slate-500 py-2.5">Code</TableHead>
                              <TableHead className="font-bold text-[10px] uppercase text-slate-500 py-2.5 text-right pr-4">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {activeCodes.map((c: any) => {
                              const signupLink = typeof window !== 'undefined' ? `${window.location.origin}/employee-signup?code=${c.code}` : `/employee-signup?code=${c.code}`;
                              return (
                                <TableRow key={c.id}>
                                  <TableCell className="text-xs text-slate-600 py-2 max-w-[280px] truncate font-mono">
                                    {signupLink}
                                  </TableCell>
                                  <TableCell className="py-2">
                                    <Badge className="bg-teal-50 text-teal-700 border-teal-100 font-mono text-[9px] uppercase">{c.code}</Badge>
                                  </TableCell>
                                  <TableCell className="text-right pr-4 py-2">
                                    <div className="flex justify-end gap-1.5">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs font-bold gap-1 hover:bg-teal-50 hover:text-teal-700"
                                        onClick={() => copyToClipboard(c.code)}
                                      >
                                        {copiedCode === c.code ? (
                                          <>
                                            <Check className="w-3 h-3 text-emerald-600" />
                                            Copied
                                          </>
                                        ) : (
                                          <>
                                            <Copy className="w-3 h-3" />
                                            Copy Link
                                          </>
                                        )}
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 text-slate-400 hover:text-rose-600 rounded-full"
                                        onClick={() => handleDeleteCode(c.id)}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Employees / Team Members Tab */}
              <TabsContent value="members" className="mt-0 h-full focus-visible:outline-none">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 mb-1">Employee Authorization Roster</h3>
                    <p className="text-xs text-muted-foreground font-medium">Activate, deactivate, or customize access roles for registered employee accounts.</p>
                  </div>

                  {employees.length === 0 ? (
                    <div className="border border-dashed rounded-xl p-8 text-center text-xs text-muted-foreground font-medium">
                      No employee accounts registered yet. Use onboarding links to sign up team members.
                    </div>
                  ) : (
                    <div className="border rounded-xl overflow-hidden shadow-sm">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50">
                            <TableHead className="font-bold text-[10px] uppercase text-slate-500 py-2.5">Name/Email</TableHead>
                            <TableHead className="font-bold text-[10px] uppercase text-slate-500 py-2.5">Department</TableHead>
                            <TableHead className="font-bold text-[10px] uppercase text-slate-500 py-2.5">Role Permission</TableHead>
                            <TableHead className="font-bold text-[10px] uppercase text-slate-500 py-2.5">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {employees.map(emp => (
                            <TableRow key={emp.uid}>
                              <TableCell className="py-2.5">
                                <div className="font-bold text-slate-800 text-xs">{emp.name}</div>
                                <div className="text-[10px] text-muted-foreground">{emp.email}</div>
                              </TableCell>
                              <TableCell className="text-xs text-slate-700 font-medium py-2.5">
                                {emp.department || '—'}
                              </TableCell>
                              <TableCell className="py-2.5">
                                <Select value={emp.role} onValueChange={(val) => handleRoleChange(emp, val)}>
                                  <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Employee">Employee</SelectItem>
                                    <SelectItem value="Manager">Manager</SelectItem>
                                    <SelectItem value="Admin">Admin</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="py-2.5">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleToggleActive(emp)}
                                  className={`h-7 text-[10px] font-black uppercase rounded-full px-2.5 ${
                                    emp.isActive
                                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800'
                                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800'
                                  }`}
                                >
                                  {emp.isActive ? 'Active' : 'Inactive'}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </Card>
    </div>
  );
}
