import React, { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { rtdbGet } from '../lib/rtdb';
import { checkAccountStatus } from '../services/accountStatusService';
import { isAllowedAdminEmail } from '../constants/adminAllowlist';

export const AccountInactiveScreen = ({ logout }: { logout: () => void }) => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
    <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-red-100 p-8 text-center">
      <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-5">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="text-xl font-extrabold text-slate-900 mb-2">অ্যাকাউন্ট আন-এক্টিভ (Account Inactive)</h2>
      <p className="text-sm text-slate-600 leading-relaxed mb-6">
        আপনার অ্যাকাউন্টটি বর্তমানে আন-এক্টিভ (Inactive) করা হয়েছে। এই অবস্থায় আপনি কোনো কার্যক্রম করতে পারবেন না। অ্যাকাউন্টটি পুনরায় সচল করতে অনুগ্রহ করে অ্যাডমিন বা সাপোর্ট টিমের সাথে যোগাযোগ করুন।
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={() => logout()}
          className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors w-full"
        >
          লগআউট করুন (Logout)
        </button>
      </div>
    </div>
  </div>
);

export const AccountStatusGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userData, loading, isAdmin, logout } = useAuth();

  if (!loading && user && !isAdmin && (userData?.status === 'inactive' || userData?.status === 'suspended')) {
    return <AccountInactiveScreen logout={logout} />;
  }

  return <>{children}</>;
};

export const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userData, isAdmin, loading, logout } = useAuth();
  
  if (loading) {
    return null;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (isAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (userData?.status === 'inactive' || userData?.status === 'suspended') {
    return <AccountInactiveScreen logout={logout} />;
  }

  return <>{children}</>;
};

export const UserPanelRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { userData, isAdmin, loading, logout } = useAuth();
  
  if (loading) {
    return null;
  }

  if (isAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (userData?.status === 'inactive' || userData?.status === 'suspended') {
    return <AccountInactiveScreen logout={logout} />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userData, isAdmin, loading } = useAuth();
  
  if (loading) {
    return null;
  }

  if (user) {
    if (isAdmin) {
      return <Navigate to="/admin/dashboard" replace />;
    }
    if (userData?.role === 'Vendor' && userData?.hasActiveVendor) {
      return <Navigate to="/vendor-dashboard" replace />;
    }
    if (userData?.role === 'Reseller' && userData?.hasActiveReseller) {
      return <Navigate to="/reseller/dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

export const VendorRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userData, loading } = useAuth();
  const [checkingVendor, setCheckingVendor] = useState(true);
  const [isAuthorizedVendor, setIsAuthorizedVendor] = useState(false);

  useEffect(() => {
    let active = true;

    async function verifyVendorAccess() {
      if (!user) {
        if (active) {
          setIsAuthorizedVendor(false);
          setCheckingVendor(false);
        }
        return;
      }

      try {
        const isAdmin = Boolean(isAllowedAdminEmail(user.email) && (userData?.role === 'Admin' || isAllowedAdminEmail(userData?.email)));
        if (isAdmin) {
          if (active) setIsAuthorizedVendor(true);
          return;
        }

        const vData = await rtdbGet<any>(`vendors/${user.uid}`);
        if (!vData) {
          // Check by email in vendors
          if (user.email) {
            const statusResult = await checkAccountStatus(user.email, user.uid);
            if (statusResult.hasActiveVendor) {
              if (active) setIsAuthorizedVendor(true);
              return;
            }
          }
          if (active) {
            setIsAuthorizedVendor(false);
            setCheckingVendor(false);
          }
          return;
        }

        const rawStatus = (vData.status || '').toLowerCase();
        const isApproved = rawStatus === 'active' || rawStatus === 'approved' || rawStatus === 'vacation';
        const isPaid = Boolean(
          vData.registrationPayment === 'completed' ||
          vData.transactionId ||
          vData.verifiedAt ||
          vData.paymentMethod ||
          vData.registrationFee === 0
        );

        if (isApproved && isPaid) {
          if (active) setIsAuthorizedVendor(true);
        } else {
          if (active) setIsAuthorizedVendor(false);
        }
      } catch (e) {
        // Fallback to strict AuthContext check
        if (active) setIsAuthorizedVendor(Boolean(userData?.role === 'Vendor' && userData?.hasActiveVendor));
      } finally {
        if (active) setCheckingVendor(false);
      }
    }

    if (!loading) {
      verifyVendorAccess();
    }

    return () => {
      active = false;
    };
  }, [user, loading, userData]);

  if (loading || checkingVendor) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-9 h-9 border-4 border-primary-main border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-3 text-xs text-slate-500 font-medium">ভেন্ডর একাউন্ট যাচাই করা হচ্ছে...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAuthorizedVendor) {
    return <Navigate to="/become-vendor" replace />;
  }

  return <>{children}</>;
};

export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export const ResellerRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userData, loading } = useAuth();
  
  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const hasReseller = userData?.role === 'Reseller' || userData?.hasActiveReseller === true;
  if (!userData || !hasReseller) {
    return <Navigate to="/reseller/apply" replace />;
  }

  return <>{children}</>;
};
