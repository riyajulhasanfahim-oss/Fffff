import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { rtdbSubscribe, rtdbUpdate, rtdbRemove } from '../lib/rtdb';
import { 
  VendorNotification, 
  playNotificationSound, 
  isNotificationSoundMuted, 
  toggleNotificationSound,
  getDeviceNotificationPermission,
  requestMobileNotificationPermission,
  showDeviceNotification,
  formatBengaliNumber
} from '../services/vendorNotificationService';
import {
  subscribeToUserReads,
  markNotificationAsReadInRTDB,
  markAllNotificationsAsReadInRTDB
} from '../services/notificationService';
import { toast } from 'react-hot-toast';
import { isAllowedAdminEmail } from '../constants/adminAllowlist';

interface VendorNotificationContextType {
  notifications: VendorNotification[];
  loading: boolean;
  totalUnreadCount: number;
  unreadNotificationsCount: number;
  unreadOrdersCount: number;
  unreadMessagesCount: number;
  unreadReviewsCount: number;
  unreadWithdrawCount: number;
  bengaliCounts: {
    total: string;
    orders: string;
    messages: string;
    reviews: string;
    withdraw: string;
  };
  soundMuted: boolean;
  toggleSound: () => void;
  testSound: () => void;
  devicePermission: NotificationPermission | 'unsupported';
  requestDevicePermission: () => Promise<NotificationPermission | 'unsupported'>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

const VendorNotificationContext = createContext<VendorNotificationContextType | undefined>(undefined);

export const VendorNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userData } = useAuth();
  const [notifications, setNotifications] = useState<VendorNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [soundMuted, setSoundMuted] = useState(() => isNotificationSoundMuted());
  const [devicePermission, setDevicePermission] = useState<NotificationPermission | 'unsupported'>('unsupported');
  const [userReads, setUserReads] = useState<Record<string, { read: boolean }>>({});

  // Track initial load so we don't spam notifications on page refresh
  const isFirstLoadRef = useRef(true);
  const knownNotificationIdsRef = useRef<Set<string>>(new Set());
  const userReadsRef = useRef<Record<string, { read: boolean }>>(userReads);

  useEffect(() => {
    userReadsRef.current = userReads;
  }, [userReads]);

  // Check initial notification permission
  useEffect(() => {
    setDevicePermission(getDeviceNotificationPermission());
  }, []);

  // Listen to per-user read records in RTDB
  useEffect(() => {
    if (!user) {
      setUserReads({});
      return;
    }
    const unsubReads = subscribeToUserReads(user.uid, (reads) => {
      setUserReads(reads);
      userReadsRef.current = reads;
    });
    return () => unsubReads();
  }, [user?.uid]);

  // Listen to Vendor Notifications in RTDB
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      isFirstLoadRef.current = true;
      knownNotificationIdsRef.current.clear();
      return;
    }

    const isAdmin = Boolean(isAllowedAdminEmail(user?.email)) && (userData?.role?.toLowerCase() === 'admin' || isAllowedAdminEmail(userData?.email));

    isFirstLoadRef.current = true;
    setLoading(true);

    // 1. Subscribe to vendor-specific isolated notifications: vendor_notifications/${user.uid}
    const unsubVendorNotifs = rtdbSubscribe<any>(`vendor_notifications/${user.uid}`, (snap) => {
      setLoading(false);
      handleNotifUpdate(snap, 'vendor_notifications');
    });

    // 2. Subscribe to user's general notifications: notifications/${user.uid}
    const unsubUserNotifs = rtdbSubscribe<any>(`notifications/${user.uid}`, (snap) => {
      handleNotifUpdate(snap, 'user_notifications');
    });

    // 3. Subscribe to admin global notifications: global_notifications
    const unsubGlobalNotifs = rtdbSubscribe<any>('global_notifications', (snap) => {
      handleNotifUpdate(snap, 'global_notifications');
    });

    let currentVendorSnap: any = null;
    let currentUserSnap: any = null;
    let currentGlobalSnap: any = null;

    const handleNotifUpdate = (snap: any, source: string) => {
      if (source === 'vendor_notifications') currentVendorSnap = snap;
      if (source === 'user_notifications') currentUserSnap = snap;
      if (source === 'global_notifications') currentGlobalSnap = snap;

      const combinedMap = new Map<string, any>();

      // Items from vendor's isolated node: vendor_notifications/${user.uid}
      if (currentVendorSnap && typeof currentVendorSnap === 'object') {
        Object.keys(currentVendorSnap).forEach((key) => {
          const item = currentVendorSnap[key];
          if (!item || typeof item !== 'object') return;
          combinedMap.set(key, { id: key, ...item, vendorId: user.uid });
        });
      }

      // Items from user's isolated node: notifications/${user.uid}
      if (currentUserSnap && typeof currentUserSnap === 'object') {
        Object.keys(currentUserSnap).forEach((key) => {
          const item = currentUserSnap[key];
          if (!item || typeof item !== 'object') return;
          combinedMap.set(key, { id: key, ...item });
        });
      }

      // Items from global broadcast: only if targeted to all or vendors
      if (currentGlobalSnap && typeof currentGlobalSnap === 'object') {
        Object.keys(currentGlobalSnap).forEach((key) => {
          const item = currentGlobalSnap[key];
          if (!item || typeof item !== 'object') return;
          const target = String(item.targetType || 'all').toLowerCase();
          const matchesVendor = target === 'all' || target === 'vendors' || target === 'vendor' || item.vendorId === user.uid || item.targetUserId === user.uid || isAdmin;
          if (matchesVendor) {
            combinedMap.set(key, { id: key, ...item });
          }
        });
      }

      const list: VendorNotification[] = [];
      const currentReads = userReadsRef.current;

      combinedMap.forEach((item, key) => {
        // Double-check isolation: never allow another vendor's or user's private notification
        const isGlobal = item.targetType === 'all' || item.isGlobal === true;
        const recipient = item.vendorId || item.userId || item.recipientId || item.targetUserId;
        if (!isGlobal && recipient && recipient !== user.uid && recipient !== 'all' && !isAdmin) {
          return;
        }

        const isRead = Boolean(item.read || currentReads[key]?.read);
        list.push({
          id: key,
          ...item,
          read: isRead
        });
      });

      list.sort((a, b) => {
        const timeA = Number(a.timestamp || a.createdAt || 0);
        const timeB = Number(b.timestamp || b.createdAt || 0);
        return timeB - timeA;
      });

      // Detect newly arrived notifications
      if (!isFirstLoadRef.current) {
        const newItems = list.filter(
          item => !knownNotificationIdsRef.current.has(item.id) && !item.read && !currentReads[item.id]?.read
        );

        if (newItems.length > 0) {
          const newest = newItems[0];
          playNotificationSound();
          showDeviceNotification({
            title: newest.title || 'নতুন ভেন্ডর নোটিফিকেশন',
            body: newest.message || 'আপনার স্টোরে একটি নতুন আপডেট এসেছে।',
            link: newest.link || '/vendor/notifications',
            tag: newest.id
          });

          toast((t) => (
            <div 
              onClick={() => {
                toast.dismiss(t.id);
                if (newest.link) window.location.href = newest.link;
              }}
              className="flex items-start gap-2.5 cursor-pointer max-w-sm"
            >
              <span className="text-xl shrink-0">🔔</span>
              <div className="min-w-0">
                <p className="font-bold text-xs text-gray-900 truncate">{newest.title}</p>
                <p className="text-[11px] text-gray-600 line-clamp-2 mt-0.5">{newest.message}</p>
              </div>
            </div>
          ), {
            duration: 6000,
            position: 'top-right'
          });
        }
      }

      list.forEach(i => knownNotificationIdsRef.current.add(i.id));
      isFirstLoadRef.current = false;
      setNotifications(list);
    };

    return () => {
      unsubVendorNotifs();
      unsubUserNotifs();
      unsubGlobalNotifs();
    };
  }, [user?.uid, userData?.role, user?.email]);

  // Listen to Customer Chats for unread messages count
  useEffect(() => {
    if (!user) {
      setUnreadMessagesCount(0);
      return;
    }

    const vendorKeys = new Set([
      user.uid,
      (userData as any)?.vendorId,
      (userData as any)?.storeId,
      (userData as any)?.id
    ].filter(Boolean));

    const unsubscribe = rtdbSubscribe<any>('chats', (snap) => {
      let count = 0;
      if (snap) {
        Object.keys(snap).forEach((k) => {
          const c = snap[k];
          if (c && (vendorKeys.has(c.vendorId) || vendorKeys.has(c.storeId) || k.endsWith(`_${user.uid}`)) && (c.unreadCountVendor || 0) > 0) {
            count += Number(c.unreadCountVendor) || 0;
          }
        });
      }
      setUnreadMessagesCount(count);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user?.uid, userData]);

  // Derived unread counts
  const unreadNotificationsList = notifications.filter(n => !n.read);
  const unreadNotificationsCount = unreadNotificationsList.length;

  const unreadOrdersCount = unreadNotificationsList.filter(n => n.type === 'order').length;
  const unreadReviewsCount = unreadNotificationsList.filter(n => n.type === 'review').length;
  const unreadWithdrawCount = unreadNotificationsList.filter(n => n.type === 'withdraw').length;

  // Combined total unread (notifications + messages)
  const totalUnreadCount = unreadNotificationsCount + unreadMessagesCount;

  const bengaliCounts = {
    total: formatBengaliNumber(totalUnreadCount),
    orders: formatBengaliNumber(unreadOrdersCount),
    messages: formatBengaliNumber(unreadMessagesCount),
    reviews: formatBengaliNumber(unreadReviewsCount),
    withdraw: formatBengaliNumber(unreadWithdrawCount)
  };

  const handleToggleSound = useCallback(() => {
    const next = toggleNotificationSound();
    setSoundMuted(next);
    toast.success(next ? 'নোটিফিকেশন শব্দ বন্ধ করা হয়েছে' : 'নোটিফিকেশন শব্দ চালু করা হয়েছে');
  }, []);

  const handleTestSound = useCallback(() => {
    playNotificationSound();
    toast.success('শব্দ পরীক্ষা করা হয়েছে (Sound Played)', { icon: '🔔' });
  }, []);

  const handleRequestPermission = useCallback(async () => {
    const perm = await requestMobileNotificationPermission();
    setDevicePermission(perm);
    if (perm === 'granted') {
      toast.success('মোবাইল নোটিফিকেশন সফলভাবে চালু হয়েছে!');
    } else if (perm === 'denied') {
      toast.error('ব্রাউজারে নোটিফিকেশন ব্লক করা রয়েছে। সাইট সেটিংসে গিয়ে অনুমতি দিন।');
    }
    return perm;
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    try {
      if (user) {
        await markNotificationAsReadInRTDB(user.uid, id);
        await rtdbUpdate(`vendor_notifications/${user.uid}/${id}`, {
          read: true,
          updatedAt: Date.now()
        }).catch(() => {});
      }
      await rtdbUpdate(`vendor_notifications/${id}`, {
        read: true,
        updatedAt: Date.now()
      }).catch(() => {});
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.warn('Failed to mark notification as read:', err);
    }
  }, [user]);

  const markAllAsRead = useCallback(async () => {
    try {
      const unread = notifications.filter(n => !n.read);
      if (unread.length === 0) return;

      if (user) {
        await markAllNotificationsAsReadInRTDB(user.uid, unread.map(n => n.id));
        await Promise.allSettled(
          unread.map(n => rtdbUpdate(`vendor_notifications/${user.uid}/${n.id}`, { read: true, updatedAt: Date.now() }))
        );
      }

      await Promise.allSettled(
        unread.map(n => rtdbUpdate(`vendor_notifications/${n.id}`, { read: true, updatedAt: Date.now() }).catch(() => {}))
      );

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      toast.success('সকল নোটিফিকেশন পঠিত হিসেবে চিহ্নিত করা হয়েছে');
    } catch (err) {
      console.warn('Failed to mark all as read:', err);
      toast.error('সব পঠিত হিসেবে চিহ্নিত করা যায়নি');
    }
  }, [user, notifications]);

  const deleteNotification = useCallback(async (id: string) => {
    try {
      if (user) {
        await rtdbRemove(`vendor_notifications/${user.uid}/${id}`).catch(() => {});
      }
      await rtdbRemove(`vendor_notifications/${id}`).catch(() => {});
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success('নোটিফিকেশন মুছে ফেলা হয়েছে');
    } catch (err) {
      console.warn('Failed to delete notification:', err);
      toast.error('মুছে ফেলা যায়নি');
    }
  }, [user]);

  const clearAll = useCallback(async () => {
    try {
      if (user) {
        await Promise.allSettled(
          notifications.map(n => rtdbRemove(`vendor_notifications/${user.uid}/${n.id}`).catch(() => {}))
        );
      }
      await Promise.allSettled(
        notifications.map(n => rtdbRemove(`vendor_notifications/${n.id}`).catch(() => {}))
      );
      setNotifications([]);
      toast.success('সকল নোটিফিকেশন ক্লিয়ার করা হয়েছে');
    } catch (err) {
      console.warn('Failed to clear notifications:', err);
    }
  }, [user, notifications]);

  return (
    <VendorNotificationContext.Provider
      value={{
        notifications,
        loading,
        totalUnreadCount,
        unreadNotificationsCount,
        unreadOrdersCount,
        unreadMessagesCount,
        unreadReviewsCount,
        unreadWithdrawCount,
        bengaliCounts,
        soundMuted,
        toggleSound: handleToggleSound,
        testSound: handleTestSound,
        devicePermission,
        requestDevicePermission: handleRequestPermission,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll
      }}
    >
      {children}
    </VendorNotificationContext.Provider>
  );
};

export const useVendorNotifications = (): VendorNotificationContextType => {
  const context = useContext(VendorNotificationContext);
  if (!context) {
    throw new Error('useVendorNotifications must be used within a VendorNotificationProvider');
  }
  return context;
};
