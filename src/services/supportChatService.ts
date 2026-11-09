import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { rtdbGet, rtdbSet, rtdbUpdate, rtdbPush, rtdbSubscribe, rtdbRemove } from '../lib/rtdb';

export type SupportRole = 'customer' | 'vendor' | 'reseller' | 'physical';

export interface PhysicalSupportRequest {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  userEmail?: string;
  subject: string;
  description: string;
  imageUrl?: string | null;
  status: 'open' | 'scheduled' | 'resolved';
  adminNotes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface SupportThreadInfo {
  threadId: string;
  role: SupportRole;
  userId: string;
  userName: string;
  userEmail?: string;
  userPhone?: string;
  userAvatar?: string;
  subject?: string;
  status: 'open' | 'resolved';
  lastMessage: string;
  lastMessageTime: number;
  lastSenderType: 'user' | 'admin';
  unreadAdmin: number;
  unreadUser: number;
  createdAt: number;
  updatedAt: number;
}

export interface SupportMessage {
  id: string;
  threadId: string;
  senderId: string;
  senderType: 'user' | 'admin';
  senderName: string;
  text: string;
  imageUrl?: string | null;
  createdAt: number;
  read: boolean;
}

export function getThreadId(role: SupportRole, userId: string): string {
  return `${role}_${userId}`;
}

/**
 * Send a message from a user (Customer, Vendor, or Reseller) to Admin
 * Saved directly in Firestore with instant optimistic write and asynchronous RTDB backup
 */
export async function sendUserSupportMessage(params: {
  role: SupportRole;
  userId: string;
  userName: string;
  userEmail?: string;
  userPhone?: string;
  userAvatar?: string;
  subject?: string;
  text: string;
  imageUrl?: string | null;
}): Promise<string> {
  const { role, userId, userName, userEmail, userPhone, userAvatar, subject, text, imageUrl } = params;
  const threadId = getThreadId(role, userId);
  const now = Date.now();
  const displayMessage = imageUrl && !text.trim() ? '📷 [ছবি সংযুক্ত করা হয়েছে]' : text.trim();

  // 1. Check existing thread in Firestore to maintain unread count
  let currentUnreadAdmin = 0;
  let existingCreatedAt = now;
  try {
    const threadDocRef = doc(db, 'support_threads', threadId);
    const snap = await Promise.race([
      getDoc(threadDocRef),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 1200))
    ]);
    if (snap && snap.exists()) {
      const data = snap.data();
      currentUnreadAdmin = Number(data?.unreadAdmin) || 0;
      existingCreatedAt = Number(data?.createdAt) || now;
    }
  } catch (err) {
    console.warn('[sendUserSupportMessage] Firestore read existing thread warning:', err);
  }

  // 2. Prepare message document in subcollection
  const messagesColRef = collection(db, 'support_threads', threadId, 'messages');
  const msgDocRef = doc(messagesColRef);
  const msgId = msgDocRef.id;

  const messageData: SupportMessage = {
    id: msgId,
    threadId,
    senderId: userId,
    senderType: 'user',
    senderName: userName || 'ব্যবহারকারী',
    text: text.trim(),
    imageUrl: imageUrl || null,
    createdAt: now,
    read: false
  };

  // 3. Prepare updated thread document
  const threadInfo: SupportThreadInfo = {
    threadId,
    role,
    userId,
    userName: userName || 'ব্যবহারকারী',
    userEmail: userEmail || '',
    userPhone: userPhone || '',
    userAvatar: userAvatar || '',
    subject: subject || 'সহায়তা প্রয়োজন',
    status: 'open',
    lastMessage: displayMessage,
    lastMessageTime: now,
    lastSenderType: 'user',
    unreadAdmin: currentUnreadAdmin + 1,
    unreadUser: 0,
    createdAt: existingCreatedAt,
    updatedAt: now
  };

  // 4. Save to Firestore (Primary source of truth)
  try {
    await Promise.all([
      setDoc(msgDocRef, messageData),
      setDoc(doc(db, 'support_threads', threadId), threadInfo, { merge: true })
    ]);
  } catch (firestoreErr) {
    console.error('[sendUserSupportMessage] Firestore write error:', firestoreErr);
    // If strict rules reject, throw formatted error
    handleFirestoreError(firestoreErr, OperationType.WRITE, `support_threads/${threadId}`);
  }

  // 5. Asynchronous background mirror to RTDB (Never blocks user UI or stalls network)
  void (async () => {
    try {
      await Promise.race([
        Promise.all([
          rtdbSet(`support_messages/${threadId}/${msgId}`, messageData),
          rtdbSet(`support_threads/${role}/${userId}`, threadInfo)
        ]),
        new Promise((_, reject) => setTimeout(() => reject(new Error('RTDB mirror timeout')), 2500))
      ]);
    } catch (_) {
      // Non-blocking background sync warning
    }
  })();

  return msgId;
}

/**
 * Send a message from Admin to User
 * Saved directly in Firestore with instant optimistic write and asynchronous RTDB backup
 */
export async function sendAdminSupportMessage(params: {
  role: SupportRole;
  userId: string;
  adminId: string;
  adminName?: string;
  text: string;
  imageUrl?: string | null;
}): Promise<string> {
  const { role, userId, adminId, adminName = 'RJ Support Admin', text, imageUrl } = params;
  const threadId = getThreadId(role, userId);
  const now = Date.now();
  const displayMessage = imageUrl && !text.trim() ? '📷 [ছবি সংযুক্ত করা হয়েছে]' : text.trim();

  // 1. Check existing thread
  let currentUnreadUser = 0;
  let existingCreatedAt = now;
  try {
    const threadDocRef = doc(db, 'support_threads', threadId);
    const snap = await Promise.race([
      getDoc(threadDocRef),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 1200))
    ]);
    if (snap && snap.exists()) {
      const data = snap.data();
      currentUnreadUser = Number(data?.unreadUser) || 0;
      existingCreatedAt = Number(data?.createdAt) || now;
    }
  } catch (err) {
    console.warn('[sendAdminSupportMessage] Firestore read existing thread warning:', err);
  }

  // 2. Prepare message doc
  const messagesColRef = collection(db, 'support_threads', threadId, 'messages');
  const msgDocRef = doc(messagesColRef);
  const msgId = msgDocRef.id;

  const messageData: SupportMessage = {
    id: msgId,
    threadId,
    senderId: adminId,
    senderType: 'admin',
    senderName: adminName,
    text: text.trim(),
    imageUrl: imageUrl || null,
    createdAt: now,
    read: false
  };

  const threadUpdate = {
    threadId,
    role,
    userId,
    status: 'open',
    lastMessage: displayMessage,
    lastMessageTime: now,
    lastSenderType: 'admin',
    unreadAdmin: 0,
    unreadUser: currentUnreadUser + 1,
    updatedAt: now
  };

  // 3. Save to Firestore
  try {
    await Promise.all([
      setDoc(msgDocRef, messageData),
      setDoc(doc(db, 'support_threads', threadId), threadUpdate, { merge: true })
    ]);
  } catch (firestoreErr) {
    console.error('[sendAdminSupportMessage] Firestore write error:', firestoreErr);
    handleFirestoreError(firestoreErr, OperationType.WRITE, `support_threads/${threadId}`);
  }

  // 4. Sync physical support requests if role is physical
  if (role === 'physical') {
    void (async () => {
      try {
        const physicalCol = collection(db, 'physical_support_requests');
        const q = query(physicalCol, where('userId', '==', userId));
        const snap = await getDocs(q);
        const replySummary = text.trim() || (imageUrl ? '📷 এডমিন থেকে ছবি পাঠানো হয়েছে' : 'এডমিন সাপোর্ট রেসপন্স প্রদান করা হয়েছে');
        const updates = snap.docs.map((docSnap) =>
          updateDoc(docSnap.ref, {
            adminNotes: replySummary,
            status: docSnap.data().status === 'open' ? 'scheduled' : docSnap.data().status || 'scheduled',
            updatedAt: now
          })
        );
        await Promise.all(updates);
      } catch (e) {
        console.warn('[sendAdminSupportMessage] Physical sync error:', e);
      }
    })();
  }

  // 5. Asynchronous background mirror to RTDB
  void (async () => {
    try {
      await Promise.race([
        Promise.all([
          rtdbSet(`support_messages/${threadId}/${msgId}`, messageData),
          rtdbUpdate(`support_threads/${role}/${userId}`, {
            lastMessage: displayMessage,
            lastMessageTime: now,
            lastSenderType: 'admin',
            unreadAdmin: 0,
            unreadUser: currentUnreadUser + 1,
            updatedAt: now
          })
        ]),
        new Promise((_, reject) => setTimeout(() => reject(new Error('RTDB mirror timeout')), 2500))
      ]);
    } catch (_) {}
  })();

  return msgId;
}

/**
 * Mark thread as read for Admin
 */
export async function markThreadReadByAdmin(role: SupportRole, userId: string): Promise<void> {
  const threadId = getThreadId(role, userId);
  try {
    await setDoc(doc(db, 'support_threads', threadId), { unreadAdmin: 0, updatedAt: Date.now() }, { merge: true });
  } catch (err) {
    console.warn('[markThreadReadByAdmin] Firestore error:', err);
  }
  void rtdbUpdate(`support_threads/${role}/${userId}`, { unreadAdmin: 0 }).catch(() => {});
}

/**
 * Mark thread as read for User
 */
export async function markThreadReadByUser(role: SupportRole, userId: string): Promise<void> {
  const threadId = getThreadId(role, userId);
  try {
    await setDoc(doc(db, 'support_threads', threadId), { unreadUser: 0, updatedAt: Date.now() }, { merge: true });
  } catch (err) {
    console.warn('[markThreadReadByUser] Firestore error:', err);
  }
  void rtdbUpdate(`support_threads/${role}/${userId}`, { unreadUser: 0 }).catch(() => {});
}

/**
 * Update thread status (Open / Resolved)
 */
export async function updateThreadStatus(
  role: SupportRole,
  userId: string,
  status: 'open' | 'resolved'
): Promise<void> {
  const threadId = getThreadId(role, userId);
  const now = Date.now();
  try {
    await setDoc(doc(db, 'support_threads', threadId), { status, updatedAt: now }, { merge: true });
  } catch (err) {
    console.warn('[updateThreadStatus] Firestore error:', err);
  }
  void rtdbUpdate(`support_threads/${role}/${userId}`, { status, updatedAt: now }).catch(() => {});
}

/**
 * Delete a specific message
 */
export async function deleteSupportMessage(threadId: string, messageId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'support_threads', threadId, 'messages', messageId));
  } catch (err) {
    console.warn('[deleteSupportMessage] Firestore error:', err);
  }
  void rtdbRemove(`support_messages/${threadId}/${messageId}`).catch(() => {});
}

/**
 * Subscribe to messages in a thread
 * Real-time listener on Firestore with fallback to RTDB for backwards compatibility
 */
export function subscribeToThreadMessages(
  threadId: string,
  callback: (messages: SupportMessage[]) => void
): () => void {
  const messagesColRef = collection(db, 'support_threads', threadId, 'messages');

  let firestoreList: SupportMessage[] = [];
  let rtdbListVal: SupportMessage[] = [];
  let isFirestorePopulated = false;

  const emitMerged = () => {
    if (isFirestorePopulated && firestoreList.length > 0) {
      callback(firestoreList);
      return;
    }
    // If Firestore has no messages yet, check if RTDB has legacy messages
    if (rtdbListVal.length > 0) {
      callback(rtdbListVal);
      // Migrate legacy RTDB messages to Firestore in background
      void (async () => {
        try {
          for (const m of rtdbListVal) {
            await setDoc(doc(db, 'support_threads', threadId, 'messages', m.id), m, { merge: true });
          }
        } catch (_) {}
      })();
    } else {
      callback(firestoreList);
    }
  };

  // 1. Listen to Firestore
  const unsubFirestore = onSnapshot(
    messagesColRef,
    (snapshot) => {
      const list: SupportMessage[] = snapshot.docs.map((d) => {
        const val = d.data();
        return {
          id: d.id,
          threadId: val.threadId || threadId,
          senderId: val.senderId || '',
          senderType: (val.senderType || 'user') as 'user' | 'admin',
          senderName: val.senderName || '',
          text: val.text || '',
          imageUrl: val.imageUrl || null,
          createdAt: Number(val.createdAt) || 0,
          read: !!val.read
        };
      });
      list.sort((a, b) => a.createdAt - b.createdAt);
      firestoreList = list;
      isFirestorePopulated = true;
      emitMerged();
    },
    (err) => {
      console.warn('[subscribeToThreadMessages] Firestore snapshot warning:', err);
      // Fallback silently if offline or rules error
      if (!isFirestorePopulated) {
        emitMerged();
      }
    }
  );

  // 2. Listen to RTDB as fallback
  const unsubRtdb = rtdbSubscribe<Record<string, any>>(`support_messages/${threadId}`, (data) => {
    if (!data || typeof data !== 'object') {
      rtdbListVal = [];
    } else {
      const list: SupportMessage[] = Object.entries(data).map(([id, val]) => ({
        id,
        threadId: val.threadId || threadId,
        senderId: val.senderId || '',
        senderType: (val.senderType || 'user') as 'user' | 'admin',
        senderName: val.senderName || '',
        text: val.text || '',
        imageUrl: val.imageUrl || null,
        createdAt: Number(val.createdAt) || 0,
        read: !!val.read
      }));
      list.sort((a, b) => a.createdAt - b.createdAt);
      rtdbListVal = list;
    }
    emitMerged();
  });

  return () => {
    unsubFirestore();
    unsubRtdb();
  };
}

/**
 * Subscribe to threads for a specific role (Customer, Vendor, Reseller, Physical)
 * Real-time listener on Firestore with memory sorting to prevent composite index errors
 */
export function subscribeToRoleThreads(
  role: SupportRole,
  callback: (threads: SupportThreadInfo[]) => void
): () => void {
  const threadsColRef = collection(db, 'support_threads');
  const roleQuery = query(threadsColRef, where('role', '==', role));

  let firestoreThreads: SupportThreadInfo[] = [];
  let rtdbThreads: SupportThreadInfo[] = [];
  let isFirestoreReady = false;

  const emit = () => {
    // Build unified map keyed by threadId
    const threadMap = new Map<string, SupportThreadInfo>();

    // Put RTDB legacy threads first
    rtdbThreads.forEach((t) => threadMap.set(t.threadId, t));
    // Overwrite / add Firestore threads
    firestoreThreads.forEach((t) => threadMap.set(t.threadId, t));

    const merged = Array.from(threadMap.values());
    merged.sort((a, b) => (b.lastMessageTime || b.updatedAt) - (a.lastMessageTime || a.updatedAt));
    callback(merged);
  };

  // 1. Firestore listener
  const unsubFirestore = onSnapshot(
    roleQuery,
    (snapshot) => {
      const list: SupportThreadInfo[] = snapshot.docs.map((d) => {
        const val = d.data();
        const tid = val.threadId || d.id;
        const uid = val.userId || (tid.includes('_') ? tid.split('_')[1] : tid);
        return {
          threadId: tid,
          role: (val.role || role) as SupportRole,
          userId: uid,
          userName: val.userName || 'ব্যবহারকারী',
          userEmail: val.userEmail || '',
          userPhone: val.userPhone || '',
          userAvatar: val.userAvatar || '',
          subject: val.subject || 'সহায়তা প্রয়োজন',
          status: (val.status || 'open') as 'open' | 'resolved',
          lastMessage: val.lastMessage || '',
          lastMessageTime: Number(val.lastMessageTime) || Number(val.updatedAt) || 0,
          lastSenderType: (val.lastSenderType || 'user') as 'user' | 'admin',
          unreadAdmin: Number(val.unreadAdmin) || 0,
          unreadUser: Number(val.unreadUser) || 0,
          createdAt: Number(val.createdAt) || 0,
          updatedAt: Number(val.updatedAt) || 0
        };
      });
      firestoreThreads = list;
      isFirestoreReady = true;
      emit();
    },
    (err) => {
      console.warn(`[subscribeToRoleThreads:${role}] Firestore snapshot warning:`, err);
      if (!isFirestoreReady) {
        emit();
      }
    }
  );

  // 2. RTDB listener
  const unsubRtdb = rtdbSubscribe<Record<string, any>>(`support_threads/${role}`, (data) => {
    if (!data || typeof data !== 'object') {
      rtdbThreads = [];
    } else {
      const list: SupportThreadInfo[] = Object.entries(data).map(([userId, val]) => ({
        threadId: val.threadId || getThreadId(role, userId),
        role: val.role || role,
        userId: val.userId || userId,
        userName: val.userName || 'ব্যবহারকারী',
        userEmail: val.userEmail || '',
        userPhone: val.userPhone || '',
        userAvatar: val.userAvatar || '',
        subject: val.subject || 'সহায়তা প্রয়োজন',
        status: val.status || 'open',
        lastMessage: val.lastMessage || '',
        lastMessageTime: Number(val.lastMessageTime) || 0,
        lastSenderType: val.lastSenderType || 'user',
        unreadAdmin: Number(val.unreadAdmin) || 0,
        unreadUser: Number(val.unreadUser) || 0,
        createdAt: Number(val.createdAt) || 0,
        updatedAt: Number(val.updatedAt) || 0
      }));
      rtdbThreads = list;
    }
    emit();
  });

  return () => {
    unsubFirestore();
    unsubRtdb();
  };
}

/**
 * Subscribe to total unread support message counts across all roles for Admin
 */
export function subscribeToAdminSupportUnreadCounts(
  callback: (counts: { total: number; customer: number; vendor: number; reseller: number; physical: number }) => void
): () => void {
  const threadsColRef = collection(db, 'support_threads');

  let firestoreCounts = { customer: 0, vendor: 0, reseller: 0, physical: 0 };
  let rtdbCounts = { customer: 0, vendor: 0, reseller: 0, physical: 0 };
  let hasFirestore = false;

  const emit = () => {
    const c = hasFirestore ? firestoreCounts : rtdbCounts;
    callback({
      total: c.customer + c.vendor + c.reseller + c.physical,
      customer: c.customer,
      vendor: c.vendor,
      reseller: c.reseller,
      physical: c.physical
    });
  };

  const unsubFirestore = onSnapshot(
    threadsColRef,
    (snapshot) => {
      let cust = 0;
      let vend = 0;
      let resel = 0;
      let phys = 0;

      snapshot.docs.forEach((d) => {
        const val = d.data();
        const unread = Number(val.unreadAdmin) || 0;
        if (unread > 0) {
          if (val.role === 'customer') cust += unread;
          else if (val.role === 'vendor') vend += unread;
          else if (val.role === 'reseller') resel += unread;
          else if (val.role === 'physical') phys += unread;
        }
      });

      firestoreCounts = { customer: cust, vendor: vend, reseller: resel, physical: phys };
      hasFirestore = true;
      emit();
    },
    (err) => {
      console.warn('[subscribeToAdminSupportUnreadCounts] Firestore error:', err);
    }
  );

  const unsubRtdb = rtdbSubscribe<Record<string, Record<string, any>>>('support_threads', (data) => {
    let customerUnread = 0;
    let vendorUnread = 0;
    let resellerUnread = 0;
    let physicalUnread = 0;

    if (data && typeof data === 'object') {
      if (data.customer && typeof data.customer === 'object') {
        Object.values(data.customer).forEach((t: any) => {
          customerUnread += Number(t.unreadAdmin) || 0;
        });
      }
      if (data.vendor && typeof data.vendor === 'object') {
        Object.values(data.vendor).forEach((t: any) => {
          vendorUnread += Number(t.unreadAdmin) || 0;
        });
      }
      if (data.reseller && typeof data.reseller === 'object') {
        Object.values(data.reseller).forEach((t: any) => {
          resellerUnread += Number(t.unreadAdmin) || 0;
        });
      }
      if (data.physical && typeof data.physical === 'object') {
        Object.values(data.physical).forEach((t: any) => {
          physicalUnread += Number(t.unreadAdmin) || 0;
        });
      }
    }

    rtdbCounts = {
      customer: customerUnread,
      vendor: vendorUnread,
      reseller: resellerUnread,
      physical: physicalUnread
    };
    emit();
  });

  return () => {
    unsubFirestore();
    unsubRtdb();
  };
}

/**
 * Submit a Physical Support request from Customer Care / Profile page
 */
export async function submitPhysicalSupportRequest(params: {
  userId: string;
  userName: string;
  userPhone: string;
  userEmail?: string;
  subject: string;
  description: string;
  imageUrl?: string | null;
}): Promise<{ requestId: string; threadId: string }> {
  const { userId, userName, userPhone, userEmail, subject, description, imageUrl } = params;
  const now = Date.now();
  const threadId = getThreadId('physical', userId);

  // 1. Create document in physical_support_requests collection in Firestore
  const reqColRef = collection(db, 'physical_support_requests');
  const reqDocRef = doc(reqColRef);
  const requestId = reqDocRef.id;

  const requestData: PhysicalSupportRequest = {
    id: requestId,
    userId,
    userName: userName.trim(),
    userPhone: userPhone.trim(),
    userEmail: userEmail || '',
    subject: subject.trim(),
    description: description.trim(),
    imageUrl: imageUrl || null,
    status: 'open',
    createdAt: now,
    updatedAt: now
  };

  try {
    await setDoc(reqDocRef, requestData);
  } catch (err) {
    console.warn('[submitPhysicalSupportRequest] Firestore error:', err);
  }

  // 2. Also send message through support thread
  await sendUserSupportMessage({
    role: 'physical',
    userId,
    userName: userName.trim(),
    userPhone: userPhone.trim(),
    userEmail: userEmail || '',
    subject: subject.trim(),
    text: description.trim(),
    imageUrl: imageUrl || null
  });

  // 3. Background mirror to RTDB
  void rtdbSet(`physical_support_requests/${requestId}`, requestData).catch(() => {});

  return { requestId, threadId };
}

/**
 * Subscribe to unread messages count for a specific user across all support roles
 */
export function subscribeUserRoleUnreads(
  userId: string,
  callback: (unreads: Record<SupportRole, number>) => void
): () => void {
  const roles: SupportRole[] = ['customer', 'physical', 'vendor', 'reseller'];
  const unreads: Record<SupportRole, number> = {
    customer: 0,
    physical: 0,
    vendor: 0,
    reseller: 0
  };
  const unsubs: (() => void)[] = [];

  roles.forEach((role) => {
    const threadId = getThreadId(role, userId);
    const docRef = doc(db, 'support_threads', threadId);

    const unsubFirestore = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          unreads[role] = Number(snap.data()?.unreadUser) || 0;
        } else {
          unreads[role] = 0;
        }
        callback({ ...unreads });
      },
      () => {
        // Fallback to RTDB
        rtdbGet<SupportThreadInfo>(`support_threads/${role}/${userId}`)
          .then((t) => {
            unreads[role] = Number(t?.unreadUser) || 0;
            callback({ ...unreads });
          })
          .catch(() => {});
      }
    );
    unsubs.push(unsubFirestore);
  });

  return () => {
    unsubs.forEach((u) => u());
  };
}

/**
 * Subscribe to physical support requests by a specific user
 */
export function subscribeUserPhysicalRequests(
  userId: string,
  callback: (requests: PhysicalSupportRequest[]) => void
): () => void {
  const reqColRef = collection(db, 'physical_support_requests');
  const userQuery = query(reqColRef, where('userId', '==', userId));

  const unsub = onSnapshot(
    userQuery,
    (snapshot) => {
      const list: PhysicalSupportRequest[] = snapshot.docs.map((d) => {
        const val = d.data();
        return {
          id: d.id,
          userId: val.userId || '',
          userName: val.userName || '',
          userPhone: val.userPhone || '',
          userEmail: val.userEmail || '',
          subject: val.subject || 'ফিজিক্যাল সাপোর্ট',
          description: val.description || '',
          imageUrl: val.imageUrl || null,
          status: val.status || 'open',
          adminNotes: val.adminNotes || '',
          createdAt: Number(val.createdAt) || 0,
          updatedAt: Number(val.updatedAt) || 0
        };
      });
      list.sort((a, b) => b.createdAt - a.createdAt);
      callback(list);
    },
    () => {
      // Fallback to RTDB
      rtdbSubscribe<Record<string, any>>('physical_support_requests', (data) => {
        if (!data || typeof data !== 'object') {
          callback([]);
          return;
        }
        const list: PhysicalSupportRequest[] = Object.entries(data)
          .map(([id, val]) => ({
            id,
            userId: val.userId || '',
            userName: val.userName || '',
            userPhone: val.userPhone || '',
            userEmail: val.userEmail || '',
            subject: val.subject || 'ফিজিক্যাল সাপোর্ট',
            description: val.description || '',
            imageUrl: val.imageUrl || null,
            status: val.status || 'open',
            adminNotes: val.adminNotes || '',
            createdAt: Number(val.createdAt) || 0,
            updatedAt: Number(val.updatedAt) || 0
          }))
          .filter((item) => item.userId === userId)
          .sort((a, b) => b.createdAt - a.createdAt);
        callback(list);
      });
    }
  );

  return () => unsub();
}

/**
 * Request and trigger AI Assistant reply for live chat
 * Note: STRICTLY skips 'physical' role because physical support is handled manually by admin!
 */
export async function triggerAiSupportReply(params: {
  role: SupportRole;
  userId: string;
  userName?: string;
  message: string;
  history?: Array<{ senderType: 'user' | 'admin'; text: string }>;
}): Promise<string | null> {
  const { role, userId, userName, message, history = [] } = params;

  if (role === 'physical') {
    return null;
  }

  try {
    const res = await fetch('/api/support/ai-reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role,
        userId,
        userName,
        message,
        history
      })
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    if (!data?.reply || data?.skipped) {
      return null;
    }

    const replyText = data.reply;

    await sendAdminSupportMessage({
      role,
      userId,
      adminId: 'rj_ai_assistant',
      adminName: 'RJ World AI অ্যাসিস্ট্যান্ট',
      text: replyText
    });

    return replyText;
  } catch (err) {
    console.warn('Failed to trigger AI support reply:', err);
    return null;
  }
}
