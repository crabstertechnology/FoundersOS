'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
import { 
  User, Settings, Users, Key, Plus, Trash2, ShieldCheck, LogOut, Copy, Check,
  Bell, Video, MessageSquare, ListChecks, Target, ShieldAlert, Loader2
} from 'lucide-react';
import type { Employee } from './TaskManager';

interface SettingsPageProps {
  userId: string;
  userRole?: string;
}

interface NotificationSettings {
  browserNotificationsEnabled: boolean;
  notifyChat: boolean;
  notifyMeetings: boolean;
  notifyTasks: boolean;
  notifyLeads: boolean;
}

function NotificationSettingsSection() {
  const [settings, setSettings] = useState<NotificationSettings>({
    browserNotificationsEnabled: false,
    notifyChat: true,
    notifyMeetings: true,
    notifyTasks: true,
    notifyLeads: true
  });
  const [permissionStatus, setPermissionStatus] = useState<string>('default');
  const [testTriggered, setTestTriggered] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('founderOS_notification_settings');
      if (saved) {
        try {
          setSettings(JSON.parse(saved));
        } catch (e) {
          console.error(e);
        }
      }
      if ('Notification' in window) {
        setPermissionStatus(Notification.permission);
      }
    }
  }, []);

  const saveSettings = (updated: NotificationSettings) => {
    setSettings(updated);
    localStorage.setItem('founderOS_notification_settings', JSON.stringify(updated));
    // Emit custom event to sync real-time listeners immediately
    window.dispatchEvent(new Event('founderOS_notification_settings_changed'));
  };

  const handleToggleBrowser = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('Browser notifications are not supported by this browser.');
      return;
    }

    if (Notification.permission === 'denied') {
      alert('Browser notification permissions are currently blocked in your browser settings. Please enable them manually in your address bar/browser settings.');
      return;
    }

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
      if (permission === 'granted') {
        saveSettings({ ...settings, browserNotificationsEnabled: true });
      } else {
        saveSettings({ ...settings, browserNotificationsEnabled: false });
      }
    } else if (Notification.permission === 'granted') {
      const newVal = !settings.browserNotificationsEnabled;
      saveSettings({ ...settings, browserNotificationsEnabled: newVal });
    }
  };

  const handleToggle = (key: keyof Omit<NotificationSettings, 'browserNotificationsEnabled'>) => {
    const updated = { ...settings, [key]: !settings[key] };
    saveSettings(updated);
  };

  const triggerTestNotification = () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    
    if (Notification.permission !== 'granted') {
      alert('Please enable browser notifications first.');
      return;
    }

    setTestTriggered(true);
    setTimeout(() => setTestTriggered(false), 2000);

    const title = 'FounderOS Workspace Test 🚀';
    const options = {
      body: 'Notifications are synchronized! You will receive push updates outside the application for meetings, chats, and tasks.',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'founder-os-test-notif',
      renotify: true
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, options);
      }).catch((err) => {
        console.warn('Service worker fallback triggered during test:', err);
        try {
          new Notification(title, options);
        } catch (e) {
          console.error(e);
        }
      });
    } else {
      try {
        new Notification(title, options);
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-slate-900 mb-1">Notification System Settings</h3>
        <p className="text-xs text-muted-foreground font-medium">Configure real-time push alerts and in-app updates for chats, tasks, and sales tracking.</p>
      </div>

      {/* Browser Notification Switch */}
      <div className="border rounded-2xl p-5 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <Bell className="w-4 h-4 text-indigo-600 animate-pulse" /> Desktop/Browser Push Notifications
          </h4>
          <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
            Receive real-time sound and banner alerts on your desktop even when the application is running in the background.
          </p>
          <div className="flex items-center gap-2 pt-1 text-[10px] font-bold">
            <span className="text-slate-400">Permission:</span>
            {permissionStatus === 'granted' ? (
              <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-250 uppercase font-code">Allowed</span>
            ) : permissionStatus === 'denied' ? (
              <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-250 uppercase font-code">Blocked ⚠</span>
            ) : (
              <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-250 uppercase font-code">Not Requested</span>
            )}
          </div>
        </div>

        <div className="flex gap-2 shrink-0 w-full sm:w-auto">
          <Button
            onClick={handleToggleBrowser}
            className={`w-full sm:w-auto font-bold text-xs h-9 ${
              settings.browserNotificationsEnabled
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                : 'bg-white border text-slate-700 hover:bg-slate-50'
            }`}
          >
            {settings.browserNotificationsEnabled ? 'Disable Browser Alerts' : 'Enable Browser Alerts'}
          </Button>

          {settings.browserNotificationsEnabled && (
            <Button
              variant="outline"
              onClick={triggerTestNotification}
              disabled={testTriggered}
              className="font-bold text-xs h-9 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
            >
              {testTriggered ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Send Test'}
            </Button>
          )}
        </div>
      </div>

      {/* Preferences Checklist */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Notification Preferences</h4>
        
        <div className="border rounded-2xl divide-y divide-slate-100 overflow-hidden bg-white shadow-sm">
          {/* Chat Messages */}
          <div className="p-4 flex items-center justify-between hover:bg-slate-50/40 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 border border-blue-100">
                <MessageSquare className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">Team & Private Chats</div>
                <div className="text-[10px] text-slate-400 font-medium">Alert when a team member sends an encrypted chat message.</div>
              </div>
            </div>
            <button
              onClick={() => handleToggle('notifyChat')}
              className={`w-11 h-6 rounded-full transition-colors relative ${settings.notifyChat ? 'bg-indigo-600' : 'bg-slate-200'}`}
            >
              <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.notifyChat ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          {/* Assigned Tasks */}
          <div className="p-4 flex items-center justify-between hover:bg-slate-50/40 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50 border border-amber-100">
                <ListChecks className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">Assigned Tasks</div>
                <div className="text-[10px] text-slate-400 font-medium">Notify when a new task is assigned or its status is modified.</div>
              </div>
            </div>
            <button
              onClick={() => handleToggle('notifyTasks')}
              className={`w-11 h-6 rounded-full transition-colors relative ${settings.notifyTasks ? 'bg-indigo-600' : 'bg-slate-200'}`}
            >
              <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.notifyTasks ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          {/* Meetings */}
          <div className="p-4 flex items-center justify-between hover:bg-slate-50/40 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-50 border border-purple-100">
                <Video className="w-4 h-4 text-purple-500" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">Meetings & Calendar Events</div>
                <div className="text-[10px] text-slate-400 font-medium">Alert when a workspace meeting is scheduled or modified.</div>
              </div>
            </div>
            <button
              onClick={() => handleToggle('notifyMeetings')}
              className={`w-11 h-6 rounded-full transition-colors relative ${settings.notifyMeetings ? 'bg-indigo-600' : 'bg-slate-200'}`}
            >
              <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.notifyMeetings ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          {/* Lead Tracker Updates */}
          <div className="p-4 flex items-center justify-between hover:bg-slate-50/40 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-100">
                <Target className="w-4 h-4 text-indigo-500" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">Lead updates & Sales Pipeline</div>
                <div className="text-[10px] text-slate-400 font-medium">Notify when a new lead is added or a lead status changes.</div>
              </div>
            </div>
            <button
              onClick={() => handleToggle('notifyLeads')}
              className={`w-11 h-6 rounded-full transition-colors relative ${settings.notifyLeads ? 'bg-indigo-600' : 'bg-slate-200'}`}
            >
              <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.notifyLeads ? 'translate-x-5' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SettingsPage({ userId, userRole = 'admin' }: SettingsPageProps) {
  const { user } = useFirebase();
  const auth = useAuth();
  const firestore = useFirestore();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const isAdmin = userRole.toLowerCase() === 'admin';

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
    <div className="space-y-6 animate-in fade-in duration-500 w-full">
      <div>
        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 leading-[1.1] mb-2">
          Founder <span className="text-primary">Settings</span>
        </h1>
        <p className="text-muted-foreground font-medium text-lg">
          Configure credentials, generate onboarding links, and authorize team access.
        </p>
      </div>

      <div className="mt-6">
        <Tabs defaultValue="profile" className="flex flex-col md:flex-row w-full gap-8">
          {/* Left Nav */}
          <div className="w-full md:w-64 border bg-slate-50/50 p-5 rounded-2xl shrink-0 flex flex-col justify-between h-[450px]">
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
                  value="notifications"
                  className="w-full justify-start rounded-lg px-3 py-2.5 text-xs font-bold gap-2.5 data-[state=active]:bg-white data-[state=active]:text-primary border border-transparent data-[state=active]:border-slate-200 transition-all text-slate-600"
                >
                  <Bell className="w-4 h-4 text-slate-500" />
                  Notifications
                </TabsTrigger>
                {isAdmin && (
                  <>
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
                  </>
                )}
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
          <div className="flex-1 bg-white border p-8 rounded-2xl shadow-sm min-h-[500px]">
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
              
              <TabsContent value="notifications" className="mt-0 h-full focus-visible:outline-none">
                <NotificationSettingsSection />
              </TabsContent>

              {isAdmin && (
                <>
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
                </>
              )}
            </div>
          </Tabs>
        </div>
      </div>
  );
}
