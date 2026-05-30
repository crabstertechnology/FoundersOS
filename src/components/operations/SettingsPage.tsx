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
import { useFirebase, useFirestore, useMemoFirebase, useCollection, useDoc, useAuth, initiateSignOut } from '@/firebase';
import { setDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { doc, collection, query, where, serverTimestamp } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { 
  User, Settings, Users, Key, Plus, Trash2, ShieldCheck, LogOut, Copy, Check, Clock,
  Bell, Video, MessageSquare, ListChecks, Target, ShieldAlert, Loader2, Pencil, X
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

  // Display name edit state
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);

  // Fetch logged in employee details to determine correct adminUid/workspaceUserId
  const employeeDocRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, 'employees', user.uid);
  }, [firestore, user?.uid]);

  const { data: employeeData } = useDoc(employeeDocRef);
  const workspaceUserId = employeeData?.adminUid || user?.uid || userId || '';

  // Sync name input from firebase auth or employee doc
  useEffect(() => {
    const resolvedName = user?.displayName || employeeData?.name || '';
    setNameInput(resolvedName);
  }, [user?.displayName, employeeData?.name]);

  const handleSaveName = async () => {
    if (!user || !nameInput.trim()) return;
    setNameSaving(true);
    try {
      await updateProfile(user, { displayName: nameInput.trim() });
      // Also update Firestore employee doc if it exists
      if (firestore && employeeDocRef) {
        setDocumentNonBlocking(employeeDocRef, { name: nameInput.trim() }, { merge: true });
      }
      setIsEditingName(false);
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 3000);
    } catch (err) {
      console.error('Error updating display name:', err);
    } finally {
      setNameSaving(false);
    }
  };

  // Fetch tasks assigned to the current user
  const userTasksRef = useMemoFirebase(() => {
    if (!firestore || !workspaceUserId) return null;
    return collection(firestore, 'users', workspaceUserId, 'companyProfiles', 'primary-startup', 'tasks');
  }, [firestore, workspaceUserId]);

  const userTasksQuery = useMemoFirebase(() => {
    if (!userTasksRef || !user?.uid) return null;
    return query(userTasksRef, where('assignedToUid', '==', user.uid));
  }, [userTasksRef, user?.uid]);

  const { data: rawUserTasks } = useCollection(userTasksQuery);
  const userTasks = useMemo(() => {
    return (rawUserTasks || []).map((t: any) => ({
      id: t.id,
      title: t.title || 'Untitled Task',
      description: t.description || '',
      assignedToUid: t.assignedToUid || '',
      assignedToName: t.assignedToName || '',
      assignedToEmail: t.assignedToEmail || '',
      priority: t.priority || 'medium',
      status: t.status || 'todo',
      dueDate: t.dueDate || '',
      category: t.category || '',
      assignedAt: t.assignedAt || '',
      completedAt: t.completedAt || '',
    }));
  }, [rawUserTasks]);

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
          <div className="w-full md:w-64 border bg-slate-50/50 p-5 rounded-2xl shrink-0 flex flex-col justify-between h-[500px]">
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
                <TabsTrigger
                  value="tasks"
                  className="w-full justify-start rounded-lg px-3 py-2.5 text-xs font-bold gap-2.5 data-[state=active]:bg-white data-[state=active]:text-primary border border-transparent data-[state=active]:border-slate-200 transition-all text-slate-600"
                >
                  <ListChecks className="w-4 h-4 text-slate-500" />
                  My Tasks
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
                    <p className="text-xs text-muted-foreground font-medium">Manage your profile details, verify credentials, and update your display name.</p>
                  </div>

                  {/* Display Name Edit Section */}
                  <div className="border-2 border-slate-100 hover:border-indigo-100 transition-all rounded-2xl p-5 bg-white shadow-sm">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-primary text-white font-black text-lg flex items-center justify-center rounded-xl shadow-md">
                          {(nameInput || user.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900">{nameInput || <span className="text-slate-400 italic">No name set</span>}</p>
                          <p className="text-[11px] text-slate-400 font-medium">{user.email}</p>
                        </div>
                      </div>
                      {nameSaved && (
                        <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider animate-in fade-in duration-300">
                          <Check className="w-3 h-3" /> Name Saved
                        </div>
                      )}
                    </div>

                    {isEditingName ? (
                      <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">New Display Name</Label>
                        <div className="flex gap-2">
                          <Input
                            id="display-name-input"
                            value={nameInput}
                            onChange={e => setNameInput(e.target.value)}
                            placeholder="Enter your full name..."
                            className="h-10 text-sm font-semibold border-slate-200 focus:border-indigo-400 focus:ring-indigo-400"
                            onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setIsEditingName(false); }}
                            autoFocus
                            maxLength={60}
                          />
                          <Button
                            onClick={handleSaveName}
                            disabled={nameSaving || !nameInput.trim()}
                            className="h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5 shrink-0"
                          >
                            {nameSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            Save
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => { setIsEditingName(false); setNameInput(user?.displayName || employeeData?.name || ''); }}
                            className="h-10 w-10 p-0 text-slate-400 hover:text-slate-700 shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium">Press Enter to save · Escape to cancel · Max 60 characters</p>
                      </div>
                    ) : (
                      <Button
                        id="edit-display-name-btn"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingName(true)}
                        className="h-8 text-xs font-bold gap-1.5 border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-all"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit Display Name
                      </Button>
                    )}
                  </div>

                  {/* Account Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5 p-4 border rounded-xl bg-slate-50/50">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</Label>
                      <div className="text-xs font-bold text-slate-800">{user.email || 'N/A'}</div>
                    </div>

                    <div className="space-y-1.5 p-4 border rounded-xl bg-slate-50/50">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Role / Access Level</Label>
                      <div className="text-xs font-bold text-slate-800 capitalize">{userRole}</div>
                    </div>

                    <div className="space-y-1.5 p-4 border rounded-xl bg-slate-50/50">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Account Status</Label>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Active Authorized</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 p-4 border rounded-xl bg-slate-50/50">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">User ID Reference</Label>
                      <div className="text-[11px] font-mono text-slate-600 truncate" title={user.uid}>{user.uid}</div>
                    </div>
                  </div>

                  <div className="p-4 border border-teal-100 bg-teal-50/20 rounded-xl flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-teal-900">Security Credentials Verified</h4>
                      <p className="text-[11px] text-teal-700/80 leading-relaxed font-medium">
                        This session is authenticated with direct access privileges. Display name changes are saved to your profile and reflected across the entire workspace.
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="notifications" className="mt-0 h-full focus-visible:outline-none">
                <NotificationSettingsSection />
              </TabsContent>

              {/* My Tasks Tab */}
              <TabsContent value="tasks" className="mt-0 h-full focus-visible:outline-none">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 mb-1">My Task Tracker</h3>
                    <p className="text-xs text-muted-foreground font-medium">Track your assigned tasks and deadlines across Sales, Finance, and Operations.</p>
                  </div>

                  {userTasks.length === 0 ? (
                    <div className="border border-dashed rounded-xl p-8 text-center text-xs text-muted-foreground font-medium">
                      You have no assigned tasks currently.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {userTasks.map((t: any) => (
                        <div key={t.id} className="border rounded-xl p-4 bg-white shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-slate-900 text-sm truncate">{t.title}</h4>
                              <Badge className={`text-[8px] font-black uppercase ${
                                t.category?.toLowerCase() === 'sales' || t.category?.toLowerCase() === 'product' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                                t.category?.toLowerCase() === 'finance' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                'bg-teal-50 text-teal-700 border-teal-100'
                              }`}>
                                {t.category}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{t.description}</p>
                            
                            <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1.5 text-[10px] text-slate-400 font-medium">
                              {t.assignedAt && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                                  Assigned: <span className="font-mono text-slate-655 font-bold">{new Date(t.assignedAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</span>
                                </span>
                              )}
                              {t.completedAt && (
                                <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                  <Check className="w-3 h-3 text-emerald-600 font-black" />
                                  Completed: <span className="font-mono font-bold">{new Date(t.completedAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</span>
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 shrink-0">
                            <Badge className={`border text-[8px] font-black uppercase ${
                              t.priority === 'urgent' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                              t.priority === 'high' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                              'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>
                              {t.priority}
                            </Badge>
                            
                            <Button
                              size="sm"
                              onClick={() => {
                                const newStatus = t.status === 'done' ? 'todo' : 'done';
                                const payload: any = { status: newStatus };
                                if (newStatus === 'done') {
                                  payload.completedAt = new Date().toISOString();
                                } else {
                                  payload.completedAt = null;
                                }
                                if (userTasksRef) {
                                  setDocumentNonBlocking(doc(userTasksRef, t.id), payload, { merge: true });
                                }
                              }}
                              className={`font-bold text-xs h-8 px-3 rounded-lg ${
                                t.status === 'done'
                                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-250'
                                  : 'bg-slate-900 hover:bg-slate-950 text-white'
                              }`}
                            >
                              {t.status === 'done' ? 'Completed ✓' : 'Mark Done'}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
                                        <SelectItem value="Visitor">Visitor</SelectItem>
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
