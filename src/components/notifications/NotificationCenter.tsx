'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Bell, MessageSquare, Video, ListChecks, Target, Trash2, 
  Check, CheckSquare, X, Settings, Sparkles, Loader2, Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUser, useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { doc, collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';

export interface AppNotification {
  id: string;
  type: 'chat' | 'meeting' | 'task' | 'lead';
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  link?: string;
}

export interface NotificationSettings {
  browserNotificationsEnabled: boolean;
  notifyChat: boolean;
  notifyMeetings: boolean;
  notifyTasks: boolean;
  notifyLeads: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  browserNotificationsEnabled: false,
  notifyChat: true,
  notifyMeetings: true,
  notifyTasks: true,
  notifyLeads: true,
};

export function getNotificationSettings(): NotificationSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  const saved = localStorage.getItem('founderOS_notification_settings');
  if (saved) {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  }
  return DEFAULT_SETTINGS;
}

const decryptText = (encrypted: string, key: string): string => {
  if (!encrypted) return '';
  if (!encrypted.startsWith('[E2EE] ')) return encrypted;
  try {
    const base64 = encrypted.replace('[E2EE] ', '');
    const xor = decodeURIComponent(escape(atob(base64)));
    return xor.split('').map((char, i) => 
      String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(i % key.length))
    ).join('');
  } catch (e) {
    return '[Encrypted Message]';
  }
};

export function NotificationCenter() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);

  // Retrieve employee record to determine correct workspace admin Uid
  const employeeDocRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, 'employees', user.uid);
  }, [firestore, user?.uid]);

  const { data: employeeData } = useDoc(employeeDocRef);
  const workspaceUserId = employeeData?.adminUid || user?.uid || '';

  // Load notifications from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('founderOS_notifications');
    if (saved) {
      try {
        setNotifications(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse notifications', e);
      }
    }
  }, []);

  // Synchronize settings state
  useEffect(() => {
    setSettings(getNotificationSettings());

    const handleSettingsChange = () => {
      setSettings(getNotificationSettings());
    };
    window.addEventListener('founderOS_notification_settings_changed', handleSettingsChange);
    return () => window.removeEventListener('founderOS_notification_settings_changed', handleSettingsChange);
  }, []);

  const saveNotifications = (updated: AppNotification[]) => {
    setNotifications(updated);
    localStorage.setItem('founderOS_notifications', JSON.stringify(updated));
  };

  const triggerBrowserNotification = (title: string, body: string, linkUrl?: string) => {
    if (!settings.browserNotificationsEnabled) return;

    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        const notif = new Notification(title, {
          body,
          icon: '/favicon.ico',
        });
        if (linkUrl) {
          notif.onclick = () => {
            window.focus();
            if (linkUrl.startsWith('/calendar') || linkUrl.startsWith('/lead/')) {
              router.push(linkUrl);
            } else {
              const urlParams = new URLSearchParams(linkUrl.split('?')[1]);
              window.dispatchEvent(new CustomEvent('navigate-app', {
                detail: {
                  tab: urlParams.get('tab'),
                  sub: urlParams.get('sub'),
                  ez: urlParams.get('ez')
                }
              }));
              router.push('/');
            }
          };
        }
      }
    }
  };

  const addNotification = (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: AppNotification = {
      ...notif,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      read: false
    };

    setNotifications(prev => {
      const updated = [newNotif, ...prev].slice(0, 50); // limit to 50
      localStorage.setItem('founderOS_notifications', JSON.stringify(updated));
      return updated;
    });

    triggerBrowserNotification(newNotif.title, newNotif.body, newNotif.link);
  };

  // Firestore real-time listeners for updates
  useEffect(() => {
    if (!firestore || !user?.uid || !workspaceUserId) return;

    const unsubscribers: (() => void)[] = [];

    // 1. Team Chats Listener
    if (settings.notifyChat) {
      const chatRef = collection(firestore, 'users', workspaceUserId, 'companyProfiles', 'primary-startup', 'teamChats');
      const chatQuery = query(chatRef, orderBy('createdAt', 'desc'));
      let isInitialChat = true;

      const unsubChat = onSnapshot(chatQuery, (snapshot) => {
        if (isInitialChat) {
          isInitialChat = false;
          return;
        }
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            if (data.senderUid !== user.uid) {
              const decryptedText = decryptText(data.text || '', 'primary-startup');
              addNotification({
                type: 'chat',
                title: `Team Chat: ${data.senderName || 'Member'}`,
                body: decryptedText,
                link: '/?tab=operations&sub=chat'
              });
            }
          }
        });
      });
      unsubscribers.push(unsubChat);
    }

    // 2. Tasks Listener
    if (settings.notifyTasks) {
      const tasksRef = collection(firestore, 'users', workspaceUserId, 'companyProfiles', 'primary-startup', 'tasks');
      const tasksQuery = query(tasksRef, where('assignedToUid', '==', user.uid));
      let isInitialTasks = true;

      const unsubTasks = onSnapshot(tasksQuery, (snapshot) => {
        if (isInitialTasks) {
          isInitialTasks = false;
          return;
        }
        snapshot.docChanges().forEach((change) => {
          const data = change.doc.data();
          if (change.type === 'added') {
            addNotification({
              type: 'task',
              title: 'Task Assigned ⚠',
              body: `"${data.title}" has been assigned to you.`,
              link: '/?tab=operations&sub=tasks'
            });
          } else if (change.type === 'modified') {
            addNotification({
              type: 'task',
              title: 'Task Status Updated',
              body: `"${data.title}" status changed to ${data.status}.`,
              link: '/?tab=operations&sub=tasks'
            });
          }
        });
      });
      unsubscribers.push(unsubTasks);
    }

    // 3. Meetings Listener
    if (settings.notifyMeetings) {
      const meetingsRef = collection(firestore, 'calendarMeetings');
      const meetingsQuery = query(meetingsRef, where('uid', '==', user.uid));
      let isInitialMeetings = true;

      const unsubMeetings = onSnapshot(meetingsQuery, (snapshot) => {
        if (isInitialMeetings) {
          isInitialMeetings = false;
          return;
        }
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            addNotification({
              type: 'meeting',
              title: 'Meeting Scheduled',
              body: `"${data.title}" is scheduled for ${data.date} at ${data.time}`,
              link: '/calendar'
            });
          }
        });
      });
      unsubscribers.push(unsubMeetings);
    }

    // 4. Lead Updates Listener
    if (settings.notifyLeads) {
      const profileRef = doc(firestore, 'users', workspaceUserId, 'companyProfiles', 'primary-startup');
      let prevLeads: any[] = [];
      let isInitialProfile = true;

      const unsubProfile = onSnapshot(profileRef, (docSnap) => {
        if (!docSnap.exists()) return;
        const data = docSnap.data();
        const currentLeads = data.ezLeads || [];

        if (isInitialProfile) {
          prevLeads = currentLeads;
          isInitialProfile = false;
          return;
        }

        currentLeads.forEach((lead: any) => {
          const prev = prevLeads.find(l => l.id === lead.id);
          if (!prev) {
            addNotification({
              type: 'lead',
              title: 'New Lead Tracked',
              body: `Lead from ${lead.organization || 'Organization'} has been registered.`,
              link: '/?tab=sales&sub=ezcirkit&ez=leads'
            });
          } else if (prev.status !== lead.status) {
            addNotification({
              type: 'lead',
              title: 'Lead Status Changed',
              body: `"${lead.organization || 'Organization'}" status is now ${lead.status}.`,
              link: `/lead/${lead.id}`
            });
          }
        });

        prevLeads = currentLeads;
      });
      unsubscribers.push(unsubProfile);
    }

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firestore, user?.uid, workspaceUserId, settings.notifyChat, settings.notifyMeetings, settings.notifyTasks, settings.notifyLeads]);

  // Click outside close logic
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = (notif: AppNotification) => {
    const updated = notifications.map(n => n.id === notif.id ? { ...n, read: true } : n);
    saveNotifications(updated);

    if (notif.link) {
      if (notif.link.startsWith('/calendar') || notif.link.startsWith('/lead/')) {
        router.push(notif.link);
      } else {
        const urlParams = new URLSearchParams(notif.link.split('?')[1]);
        const tab = urlParams.get('tab');
        const sub = urlParams.get('sub');
        const ez = urlParams.get('ez');

        window.dispatchEvent(new CustomEvent('navigate-app', { 
          detail: { tab, sub, ez } 
        }));
        router.push('/');
      }
    }
    setIsOpen(false);
  };

  const handleMarkAllRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    saveNotifications(updated);
  };

  const handleClearAll = () => {
    saveNotifications([]);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'chat': return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'meeting': return <Video className="w-4 h-4 text-purple-500" />;
      case 'task': return <ListChecks className="w-4 h-4 text-amber-500" />;
      case 'lead': return <Target className="w-4 h-4 text-indigo-500" />;
      default: return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="h-9 w-9 border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-200 transition-all rounded-lg relative"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-code text-[9px] font-black rounded-full h-4 min-w-4 px-1 flex items-center justify-center animate-pulse border-2 border-white shadow-sm">
            {unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <Card className="absolute right-0 mt-2 w-80 sm:w-96 border shadow-xl bg-white z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <CardHeader className="pb-3 border-b bg-slate-50/50 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-800 flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-indigo-600" /> Notifications
              </CardTitle>
              <CardDescription className="text-[10px] mt-0.5">Workspace activities stream</CardDescription>
            </div>
            {notifications.length > 0 && (
              <div className="flex gap-2">
                <button 
                  onClick={handleMarkAllRead} 
                  className="text-[9px] font-black uppercase text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  Mark All Read
                </button>
                <span className="text-slate-300">|</span>
                <button 
                  onClick={handleClearAll} 
                  className="text-[9px] font-black uppercase text-rose-500 hover:text-rose-700 transition-colors"
                >
                  Clear
                </button>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0 max-h-[350px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-12 px-4 text-center text-slate-400 flex flex-col items-center gap-2">
                <Sparkles className="w-8 h-8 opacity-30 text-indigo-500" />
                <p className="text-xs font-semibold">Workspace is completely quiet.</p>
                <p className="text-[10px]">Real-time activities will stream here.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-150">
                {notifications.map(notif => (
                  <button
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`w-full p-4 flex gap-3 text-left hover:bg-slate-50 transition-colors relative items-start ${
                      !notif.read ? 'bg-indigo-50/20' : ''
                    }`}
                  >
                    {!notif.read && (
                      <span className="absolute top-4 left-1.5 w-1.5 h-1.5 bg-indigo-600 rounded-full" />
                    )}
                    <div className="p-1.5 rounded-lg bg-slate-100/80 shrink-0">
                      {getIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex justify-between items-start gap-1">
                        <h4 className="font-bold text-xs text-slate-800 truncate">{notif.title}</h4>
                        <span className="text-[9px] font-mono text-slate-400 shrink-0">{formatTime(notif.timestamp)}</span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{notif.body}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
