import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

// E2EE Decrypt helper for server notifications preview
const decryptText = (encrypted: string, key: string): string => {
  if (!encrypted) return '';
  if (!encrypted.startsWith('[E2EE] ')) return encrypted;
  try {
    const base64 = encrypted.replace('[E2EE] ', '');
    // Buffer is Node-compatible replacement for atob
    const xor = Buffer.from(base64, 'base64').toString('utf8');
    return xor.split('').map((char, i) => 
      String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(i % key.length))
    ).join('');
  } catch (e) {
    return '[Secure Message]';
  }
};

// Helper to retrieve FCM tokens for a user
async function getUserFcmTokens(uid: string): Promise<string[]> {
  try {
    const tokenDoc = await admin.firestore().doc(`users/${uid}/fcm/tokens`).get();
    if (tokenDoc.exists) {
      return tokenDoc.data()?.tokens || [];
    }
  } catch (e) {
    console.error(`Error loading FCM tokens for user ${uid}:`, e);
  }
  return [];
}

/**
 * 1. Chat Message Trigger
 * Notifies recipients when a new team chat message is sent
 */
export const onNewChatMessage = functions.firestore
  .document('users/{adminUid}/companyProfiles/{companyId}/teamChats/{messageId}')
  .onCreate(async (snapshot, context) => {
    const message = snapshot.data();
    if (!message) return;

    const { adminUid } = context.params;
    const senderUid = message.senderUid;
    const senderName = message.senderName || 'Team Member';
    const encryptedText = message.text || '';
    const decryptedText = decryptText(encryptedText, 'primary-startup');

    // Retrieve recipient list
    // Include the workspace admin and all registered employees
    const employeesSnapshot = await admin.firestore()
      .collection('employees')
      .where('adminUid', '==', adminUid)
      .get();

    const recipientUids: string[] = [adminUid];
    employeesSnapshot.forEach(doc => {
      const emp = doc.data();
      if (emp.uid) recipientUids.push(emp.uid);
    });

    // Deduplicate and filter out sender
    const targetUids = Array.from(new Set(recipientUids)).filter(uid => uid !== senderUid);

    for (const uid of targetUids) {
      const tokens = await getUserFcmTokens(uid);
      if (tokens.length === 0) continue;

      const payload = {
        notification: {
          title: `Team Chat: ${senderName}`,
          body: decryptedText,
          icon: '/favicon.ico',
        },
        data: {
          url: '/?tab=operations&sub=chat',
          title: `Team Chat: ${senderName}`,
          body: decryptedText
        }
      };

      try {
        await admin.messaging().sendEachForMulticast({
          tokens,
          notification: payload.notification,
          data: payload.data
        });
      } catch (err) {
        console.error(`Failed to send chat FCM to user ${uid}:`, err);
      }
    }
  });

/**
 * 2. Task Assignment & Status Change Trigger
 */
export const onTaskWrite = functions.firestore
  .document('users/{adminUid}/companyProfiles/{companyId}/tasks/{taskId}')
  .onWrite(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // If task was deleted, do nothing
    if (!after) return;

    const assignedToUid = after.assignedToUid;
    if (!assignedToUid) return;

    let title = '';
    let body = '';
    const taskTitle = after.title || 'Untitled Task';

    if (!change.before.exists) {
      // Newly created task
      title = 'Task Assigned ⚠';
      body = `"${taskTitle}" has been assigned to you.`;
    } else if (before && before.status !== after.status) {
      // Status change
      title = 'Task Status Updated';
      body = `"${taskTitle}" status changed to: ${after.status.toUpperCase()}`;
    } else if (before && before.assignedToUid !== after.assignedToUid) {
      // Reassigned task
      title = 'Task Assigned ⚠';
      body = `"${taskTitle}" has been assigned to you.`;
    } else {
      return; // Non-notifiable change
    }

    const tokens = await getUserFcmTokens(assignedToUid);
    if (tokens.length === 0) return;

    const payload = {
      notification: {
        title,
        body,
        icon: '/favicon.ico'
      },
      data: {
        url: '/?tab=operations&sub=tasks',
        title,
        body
      }
    };

    try {
      await admin.messaging().sendEachForMulticast({
        tokens,
        notification: payload.notification,
        data: payload.data
      });
    } catch (err) {
      console.error(`Failed to send task FCM to user ${assignedToUid}:`, err);
    }
  });

/**
 * 3. Meeting Scheduled Trigger
 */
export const onMeetingCreate = functions.firestore
  .document('calendarMeetings/{meetingId}')
  .onCreate(async (snapshot) => {
    const meeting = snapshot.data();
    if (!meeting) return;

    const uid = meeting.uid;
    if (!uid) return;

    const title = 'Meeting Scheduled 📅';
    const body = `"${meeting.title || 'Workspace Meeting'}" is set for ${meeting.date} at ${meeting.time}`;

    const tokens = await getUserFcmTokens(uid);
    if (tokens.length === 0) return;

    const payload = {
      notification: {
        title,
        body,
        icon: '/favicon.ico'
      },
      data: {
        url: '/calendar',
        title,
        body
      }
    };

    try {
      await admin.messaging().sendEachForMulticast({
        tokens,
        notification: payload.notification,
        data: payload.data
      });
    } catch (err) {
      console.error(`Failed to send meeting FCM to user ${uid}:`, err);
    }
  });

/**
 * 4. Lead Added / Status Change Trigger
 */
export const onCompanyProfileWrite = functions.firestore
  .document('users/{adminUid}/companyProfiles/{companyId}')
  .onWrite(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    if (!after) return;

    const beforeLeads = before?.ezLeads || [];
    const afterLeads = after?.ezLeads || [];
    const { adminUid } = context.params;

    // Detect new leads or status changes
    let alertTitle = '';
    let alertBody = '';
    let targetLink = '/?tab=sales&sub=ezcirkit&ez=leads';

    if (afterLeads.length > beforeLeads.length) {
      // New lead registered
      const newLead = afterLeads.find((al: any) => !beforeLeads.some((bl: any) => bl.id === al.id));
      if (newLead) {
        alertTitle = 'New Lead Tracked 🎯';
        alertBody = `Lead from ${newLead.organization || 'Organization'} registered.`;
      }
    } else {
      // Status change comparison
      for (const al of afterLeads) {
        const bl = beforeLeads.find((b: any) => b.id === al.id);
        if (bl && bl.status !== al.status) {
          alertTitle = 'Lead Status Changed';
          alertBody = `"${al.organization || 'Organization'}" status is now: ${al.status.toUpperCase()}`;
          targetLink = `/lead/${al.id}`;
          break;
        }
      }
    }

    if (!alertTitle) return; // No lead changes

    // Get all recipient users (admin and employees)
    const employeesSnapshot = await admin.firestore()
      .collection('employees')
      .where('adminUid', '==', adminUid)
      .get();

    const recipientUids: string[] = [adminUid];
    employeesSnapshot.forEach(doc => {
      const emp = doc.data();
      if (emp.uid) recipientUids.push(emp.uid);
    });

    const targetUids = Array.from(new Set(recipientUids));

    for (const uid of targetUids) {
      const tokens = await getUserFcmTokens(uid);
      if (tokens.length === 0) continue;

      const payload = {
        notification: {
          title: alertTitle,
          body: alertBody,
          icon: '/favicon.ico'
        },
        data: {
          url: targetLink,
          title: alertTitle,
          body: alertBody
        }
      };

      try {
        await admin.messaging().sendEachForMulticast({
          tokens,
          notification: payload.notification,
          data: payload.data
        });
      } catch (err) {
        console.error(`Failed to send lead FCM to user ${uid}:`, err);
      }
    }
  });
