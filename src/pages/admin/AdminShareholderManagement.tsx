import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  PieChart, 
  Coins, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldAlert, 
  ShieldCheck, 
  Search, 
  Filter, 
  RefreshCw, 
  ExternalLink, 
  Sliders, 
  FileText, 
  Wallet, 
  Layers, 
  Activity, 
  AlertTriangle, 
  Eye, 
  ArrowUpRight, 
  Check, 
  X, 
  Lock, 
  Calendar, 
  DollarSign, 
  UserCheck, 
  UserX,
  FileCheck2,
  ChevronRight,
  ClipboardList,
  TrendingUp,
  Percent
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { isAllowedAdminEmail } from '../../constants/adminAllowlist';
import toast from 'react-hot-toast';

interface Metrics {
  totalApplications: number;
  pendingApplications: number;
  approvedShareholders: number;
  rejectedApplications: number;
  suspendedAccounts: number;
  totalApprovedSharePercent: number;
  totalAuthorizedSharePercent: number;
  remainingAvailableSharePercent: number;
  totalVerifiedSharePayments: number;
  totalPendingPayments: number;
  totalApprovedCommissionLiabilities: number;
  totalCommissionAlreadyPaid: number;
  pricePerPercent: number;
}

export default function AdminShareholderManagement() {
  const { user } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'applications' | 'availability' | 'commissions' | 'ledger' | 'withdrawals' | 'audit'>('applications');

  // Datasets
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [commissionConfig, setCommissionConfig] = useState<any>(null);
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [appStatusFilter, setAppStatusFilter] = useState<string>('all');

  // Modals & Actions
  const [selectedAppDetail, setSelectedAppDetail] = useState<any | null>(null);
  const [rejectModalApp, setRejectModalApp] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Pool availability form
  const [newAvailableShares, setNewAvailableShares] = useState<number>(40);
  const [poolUpdateNotes, setPoolUpdateNotes] = useState<string>('');

  // Withdrawal action modal
  const [payoutModalWithdrawal, setPayoutModalWithdrawal] = useState<any | null>(null);
  const [payoutReference, setPayoutReference] = useState<string>('');
  const [rejectWithdrawalModal, setRejectWithdrawalModal] = useState<any | null>(null);
  const [withdrawalRejectReason, setWithdrawalRejectReason] = useState<string>('');

  // Ledger Correction Modal
  const [showCorrectionModal, setShowCorrectionModal] = useState<boolean>(false);
  const [correctionTargetId, setCorrectionTargetId] = useState<string>('');
  const [correctionShareholderId, setCorrectionShareholderId] = useState<string>('');
  const [correctionAmount, setCorrectionAmount] = useState<string>('');
  const [correctionReason, setCorrectionReason] = useState<string>('');

  const fetchOverview = async () => {
    if (!user) return;
    try {
      setRefreshing(true);
      const token = await user.getIdToken().catch(() => '');
      const headers: Record<string, string> = {
        'x-admin-email': user.email || ''
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/shareholders/admin/overview', { headers });
      const data = await res.json();

      if (data && data.success) {
        setMetrics(data.metrics || null);
        setApplications(data.applications || []);
        setCommissionConfig(data.commissionConfig || null);
        setLedgerEntries(data.ledgerEntries || []);
        setAuditLogs(data.auditLogs || []);
        setWithdrawals(data.withdrawals || []);
        if (data.metrics?.totalAuthorizedSharePercent) {
          setNewAvailableShares(data.metrics.totalAuthorizedSharePercent);
        }
      } else {
        toast.error(data.error || 'Failed to load shareholder overview');
      }
    } catch (err: any) {
      console.error('Error fetching admin shareholder data:', err);
      toast.error('Network error loading administrative records.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [user]);

  // Handle Application Approval
  const handleApproveApp = async (app: any) => {
    if (!user) return;
    if (metrics && (metrics.totalApprovedSharePercent + app.sharePercent > metrics.totalAuthorizedSharePercent)) {
      toast.error(`Cannot approve: requested ${app.sharePercent}% exceeds remaining pool (${metrics.remainingAvailableSharePercent}%).`);
      return;
    }
    if (!confirm(`Are you sure you want to approve and ratify Application ${app.id} for ${app.sharePercent}% (৳${app.totalAmount?.toLocaleString()})?`)) {
      return;
    }

    try {
      setActionLoading(true);
      const token = await user.getIdToken().catch(() => '');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-admin-email': user.email || ''
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/shareholders/admin/verify-payment', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          applicationId: app.applicationId || app.id,
          action: 'approve'
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Application approved successfully.');
        setSelectedAppDetail(null);
        fetchOverview();
      } else {
        toast.error(data.error || 'Approval failed.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error executing approval.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Application Rejection
  const handleRejectAppSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalApp || !rejectionReason.trim() || !user) return;

    try {
      setActionLoading(true);
      const token = await user.getIdToken().catch(() => '');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-admin-email': user.email || ''
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/shareholders/admin/verify-payment', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          applicationId: rejectModalApp.applicationId || rejectModalApp.id,
          action: 'reject',
          rejectionReason: rejectionReason.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Application rejected.');
        setRejectModalApp(null);
        setRejectionReason('');
        setSelectedAppDetail(null);
        fetchOverview();
      } else {
        toast.error(data.error || 'Rejection failed.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error executing rejection.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Update Share Pool Availability (Task 3)
  const handleUpdateAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      setActionLoading(true);
      const token = await user.getIdToken().catch(() => '');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-admin-email': user.email || ''
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/shareholders/admin/availability', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          availableShares: newAvailableShares,
          notes: poolUpdateNotes
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Share pool updated.');
        setPoolUpdateNotes('');
        fetchOverview();
      } else {
        toast.error(data.error || 'Update failed.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error updating availability pool.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Commission Settings Save (Task 5)
  const handleSaveCommissionConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !commissionConfig) return;
    try {
      setActionLoading(true);
      const token = await user.getIdToken().catch(() => '');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-admin-email': user.email || ''
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/shareholders/admin/commission-settings', {
        method: 'POST',
        headers,
        body: JSON.stringify(commissionConfig)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Commission settings saved.');
        fetchOverview();
      } else {
        toast.error(data.error || 'Failed to save settings.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error saving commission configuration.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Withdrawal Payout (Task 7)
  const handleWithdrawalPayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutModalWithdrawal || !payoutReference.trim() || !user) return;
    try {
      setActionLoading(true);
      const token = await user.getIdToken().catch(() => '');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-admin-email': user.email || ''
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/shareholders/admin/verify-withdrawal', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId: payoutModalWithdrawal.userId,
          withdrawalId: payoutModalWithdrawal.id,
          action: 'pay',
          payoutReference: payoutReference.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Withdrawal marked as paid.');
        setPayoutModalWithdrawal(null);
        setPayoutReference('');
        fetchOverview();
      } else {
        toast.error(data.error || 'Payout recording failed.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error processing payout.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Account Suspension (Task 1 & 9)
  const handleToggleSuspension = async (userId: string, isCurrentlySuspended: boolean) => {
    if (!user) return;
    const actionName = isCurrentlySuspended ? 'reactivate' : 'suspend';
    const reason = prompt(`Enter reason to ${actionName} account ${userId}:`);
    if (reason === null) return;

    try {
      setActionLoading(true);
      const token = await user.getIdToken().catch(() => '');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-admin-email': user.email || ''
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/shareholders/admin/toggle-suspension', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId,
          suspend: !isCurrentlySuspended,
          reason
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `Account ${actionName}d successfully.`);
        fetchOverview();
      } else {
        toast.error(data.error || 'Action failed.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error toggling suspension.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Controlled Ledger Adjustment (Task 6)
  const handleLedgerCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionShareholderId || !correctionAmount || !correctionReason.trim() || !user) return;
    try {
      setActionLoading(true);
      const token = await user.getIdToken().catch(() => '');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-admin-email': user.email || ''
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/shareholders/admin/ledger-correction', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          shareholderId: correctionShareholderId.trim(),
          targetLedgerId: correctionTargetId.trim(),
          amount: Number(correctionAmount),
          reason: correctionReason.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Correction recorded.');
        setShowCorrectionModal(false);
        setCorrectionAmount('');
        setCorrectionReason('');
        setCorrectionTargetId('');
        setCorrectionShareholderId('');
        fetchOverview();
      } else {
        toast.error(data.error || 'Correction failed.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error recording correction.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6">
        <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-primary-main animate-spin"></div>
        <p className="mt-4 text-sm text-slate-600 font-bold">Loading Corporate Shareholder Governance Hub...</p>
      </div>
    );
  }

  // Filter applications
  const filteredApps = applications.filter((app) => {
    const matchesSearch = 
      (app.applicantName || app.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (app.transactionId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (app.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (app.phone || app.payerMobile || '').includes(searchTerm);

    if (!matchesSearch) return false;

    if (appStatusFilter === 'pending') {
      return app.paymentStatus === 'Pending Verification' || app.status === 'pending_verification';
    }
    if (appStatusFilter === 'approved') {
      return app.paymentStatus === 'Approved' || app.status === 'approved';
    }
    if (appStatusFilter === 'rejected') {
      return app.paymentStatus === 'Rejected' || app.status === 'rejected';
    }
    return true;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-900 text-sky-300 border border-slate-700">
              Corporate Governance
            </span>
            <span className="text-xs font-semibold text-slate-500">
              RJ WORLD BD Authorized Executive Access
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2.5">
            <Building2 className="w-8 h-8 text-primary-main" />
            <span>Shareholder Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Audited share allocations, verified capital ledgers, commission configuration, and compliance governance.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={fetchOverview}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-xl shadow-2xs transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-primary-main' : ''}`} />
            <span>Refresh Audit Hub</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          TASK 1: EXACT 11 METRICS SUMMARY BAR
      ========================================================================== */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Applications</span>
            <div className="text-xl font-black text-slate-900 mt-1">{metrics.totalApplications}</div>
            <span className="text-[10px] text-slate-500">All submitted records</span>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">Pending Applications</span>
            <div className="text-xl font-black text-amber-900 mt-1">{metrics.pendingApplications}</div>
            <span className="text-[10px] text-amber-700 font-semibold">Requires verification</span>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Approved Shareholders</span>
            <div className="text-xl font-black text-emerald-900 mt-1">{metrics.approvedShareholders}</div>
            <span className="text-[10px] text-emerald-700 font-semibold">Active equity holders</span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Rejected Applications</span>
            <div className="text-xl font-black text-slate-900 mt-1">{metrics.rejectedApplications}</div>
            <span className="text-[10px] text-slate-500">Ineligible or failed</span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Suspended Accounts</span>
            <div className="text-xl font-black text-slate-900 mt-1">{metrics.suspendedAccounts}</div>
            <span className="text-[10px] text-slate-500">Temporary holds</span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Approved Allocation</span>
            <div className="text-xl font-black text-primary-main mt-1">{metrics.totalApprovedSharePercent}%</div>
            <span className="text-[10px] text-slate-500">Remaining: <strong className="text-emerald-600">{metrics.remainingAvailableSharePercent}%</strong></span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Verified Share Payments</span>
            <div className="text-xl font-black text-slate-900 mt-1">৳{metrics.totalVerifiedSharePayments?.toLocaleString()}</div>
            <span className="text-[10px] text-slate-500">Paid capital @ ৳2,000/1%</span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Pending Payments</span>
            <div className="text-xl font-black text-amber-600 mt-1">৳{metrics.totalPendingPayments?.toLocaleString()}</div>
            <span className="text-[10px] text-slate-500">Awaiting bank verification</span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Commission Liabilities</span>
            <div className="text-xl font-black text-indigo-700 mt-1">৳{metrics.totalApprovedCommissionLiabilities?.toLocaleString()}</div>
            <span className="text-[10px] text-slate-500">On approved revenues</span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs col-span-2 sm:col-span-1 lg:col-span-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Commission Already Paid Out</span>
                <div className="text-xl font-black text-emerald-600 mt-1">৳{metrics.totalCommissionAlreadyPaid?.toLocaleString()}</div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Authorized Pool</span>
                <span className="text-sm font-bold text-slate-800">{metrics.totalAuthorizedSharePercent}% Ceiling</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          NAVIGATION TABS
      ========================================================================== */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-2xl overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('applications')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            activeTab === 'applications' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          1. Share Applications ({applications.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('availability')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            activeTab === 'availability' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          2. Share Availability & Price Pool
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('commissions')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            activeTab === 'commissions' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          3. Commission Sharing Agreements
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ledger')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            activeTab === 'ledger' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          4. Auditable Financial Ledger ({ledgerEntries.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('withdrawals')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            activeTab === 'withdrawals' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          5. Withdrawal Requests ({withdrawals.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            activeTab === 'audit' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          6. Governance Audit Logs ({auditLogs.length})
        </button>
      </div>

      {/* =========================================================================
          TAB 1: SHARE APPLICATIONS & REVIEW (TASK 2 & 4)
      ========================================================================== */}
      {activeTab === 'applications' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Filter Bar */}
          <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by Applicant Name, TrxID, App ID, or Phone..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-main"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold">Filter:</span>
              {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setAppStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                    appStatusFilter === status 
                      ? 'bg-slate-900 text-white shadow-2xs' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Applications Table */}
          <div className="overflow-x-auto">
            {filteredApps.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500">
                No shareholder applications found matching current criteria.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Application ID</th>
                    <th className="py-3 px-4">Applicant & Contact</th>
                    <th className="py-3 px-4">Share % (Units)</th>
                    <th className="py-3 px-4">Payable Amount</th>
                    <th className="py-3 px-4">Method & TrxID</th>
                    <th className="py-3 px-4">Submitted Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredApps.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {app.applicationId || app.id}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          <span>{app.applicantName || app.fullName || 'Registered Investor'}</span>
                          {app.isSuspended && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-800">Suspended</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {app.phone || app.payerMobile || app.email}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-bold text-primary-main">
                        {app.sharePercent}% ({app.shareUnits || app.sharePercent} Units)
                      </td>
                      <td className="py-3 px-4 font-black text-slate-900">
                        ৳{app.totalAmount?.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-800">{app.paymentMethod || 'MFS'}</span>
                        <span className="font-mono text-slate-500 block text-[11px]">{app.transactionId || 'N/A'}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {app.submissionTimestamp ? new Date(app.submissionTimestamp).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          app.paymentStatus === 'Approved' || app.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : app.paymentStatus === 'Rejected'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {app.paymentStatus || app.status || 'Pending'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedAppDetail(app)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                            title="Inspect Details & Proof"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {(app.paymentStatus === 'Pending Verification' || app.status === 'pending_verification') && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleApproveApp(app)}
                                disabled={actionLoading}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => setRejectModalApp(app)}
                                disabled={actionLoading}
                                className="px-2.5 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-800 font-bold text-[11px] transition-colors cursor-pointer"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {app.userId && (
                            <button
                              type="button"
                              onClick={() => handleToggleSuspension(app.userId, Boolean(app.isSuspended))}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                              title={app.isSuspended ? 'Reactivate Account' : 'Suspend Account'}
                            >
                              {app.isSuspended ? <UserCheck className="w-3.5 h-3.5 text-emerald-600" /> : <UserX className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: SHARE AVAILABILITY & PRICE POOL (TASK 3)
      ========================================================================== */}
      {activeTab === 'availability' && metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Percent className="w-5 h-5 text-primary-main" />
                <span>Authorized Share Pool Settings</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure corporate legal equity parameters. Validated strictly on the trusted backend to prevent over-allocation.
              </p>
            </div>

            <form onSubmit={handleUpdateAvailability} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Total Legally Authorized Share Quantity (%)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={metrics.totalApprovedSharePercent}
                    max="100"
                    value={newAvailableShares}
                    onChange={(e) => setNewAvailableShares(Number(e.target.value))}
                    required
                    className="w-32 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-main"
                  />
                  <span className="text-xs text-slate-500">
                    Min allowable: <strong>{metrics.totalApprovedSharePercent}%</strong> (current approved)
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Board Resolution / Update Notes
                </label>
                <textarea
                  value={poolUpdateNotes}
                  onChange={(e) => setPoolUpdateNotes(e.target.value)}
                  placeholder="Record board meeting or corporate resolution notes authorizing this equity quota change..."
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-main"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading || newAvailableShares < metrics.totalApprovedSharePercent}
                className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? 'Updating Pool...' : 'Save Authorized Share Pool'}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Lock className="w-5 h-5 text-slate-700" />
              <span>Fixed Nominal Pricing & Allocation Audit</span>
            </h2>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Nominal Rate</span>
                <div className="text-2xl font-black text-slate-900 mt-1">৳2,000 / 1% Share</div>
                <p className="text-[11px] text-slate-500 mt-0.5">Fixed nominal pricing. Never changes silently without regulatory notification.</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Total Authorized Pool:</span>
                  <strong className="text-slate-900">{metrics.totalAuthorizedSharePercent}%</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Verified Allocated:</span>
                  <strong className="text-primary-main">{metrics.totalApprovedSharePercent}%</strong>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <span className="text-slate-600 font-bold">Remaining Available Pool:</span>
                  <strong className="text-emerald-600 text-sm">{metrics.remainingAvailableSharePercent}%</strong>
                </div>
              </div>

              {/* Progress visual */}
              <div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex">
                  <div 
                    className="bg-primary-main h-full"
                    style={{ width: `${Math.min(100, (metrics.totalApprovedSharePercent / (metrics.totalAuthorizedSharePercent || 1)) * 100)}%` }}
                    title={`Allocated: ${metrics.totalApprovedSharePercent}%`}
                  ></div>
                  <div 
                    className="bg-emerald-400 h-full"
                    style={{ width: `${Math.max(0, 100 - (metrics.totalApprovedSharePercent / (metrics.totalAuthorizedSharePercent || 1)) * 100)}%` }}
                    title={`Remaining: ${metrics.remainingAvailableSharePercent}%`}
                  ></div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>Allocated ({metrics.totalApprovedSharePercent}%)</span>
                  <span>Available ({metrics.remainingAvailableSharePercent}%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: COMMISSION SHARING SETTINGS (TASK 5)
      ========================================================================== */}
      {activeTab === 'commissions' && commissionConfig && (
        <form onSubmit={handleSaveCommissionConfig} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary-main" />
                <span>Corporate Revenue Commission Configurations</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Specify contractual sharing terms and monthly payout ceilings for each corporate channel.
              </p>
            </div>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all cursor-pointer self-start sm:self-auto"
            >
              {actionLoading ? 'Saving...' : 'Save Commission Agreements'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Category 1: Reseller Registration */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">1. Reseller Registration</span>
                <input
                  type="checkbox"
                  checked={commissionConfig.resellerRegistration?.enabled}
                  onChange={(e) => setCommissionConfig({
                    ...commissionConfig,
                    resellerRegistration: { ...commissionConfig.resellerRegistration, enabled: e.target.checked }
                  })}
                  className="w-4 h-4 rounded text-primary-main focus:ring-primary-main cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 font-bold mb-1">Commission Entitlement Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={commissionConfig.resellerRegistration?.ratePercent || 100}
                  onChange={(e) => setCommissionConfig({
                    ...commissionConfig,
                    resellerRegistration: { ...commissionConfig.resellerRegistration, ratePercent: Number(e.target.value) }
                  })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                />
                <span className="text-[10px] text-slate-400">100% = Full shareholder pro-rata stake applied</span>
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 font-bold mb-1">Contractual Agreement Terms</label>
                <textarea
                  value={commissionConfig.resellerRegistration?.agreementTerms || ''}
                  onChange={(e) => setCommissionConfig({
                    ...commissionConfig,
                    resellerRegistration: { ...commissionConfig.resellerRegistration, agreementTerms: e.target.value }
                  })}
                  rows={3}
                  required
                  placeholder="Record agreed legal contract terms..."
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* Category 2: Verified Badge Fees */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">2. Verified Badge Fees</span>
                <input
                  type="checkbox"
                  checked={commissionConfig.verifiedBadge?.enabled}
                  onChange={(e) => setCommissionConfig({
                    ...commissionConfig,
                    verifiedBadge: { ...commissionConfig.verifiedBadge, enabled: e.target.checked }
                  })}
                  className="w-4 h-4 rounded text-primary-main focus:ring-primary-main cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 font-bold mb-1">Commission Entitlement Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={commissionConfig.verifiedBadge?.ratePercent || 100}
                  onChange={(e) => setCommissionConfig({
                    ...commissionConfig,
                    verifiedBadge: { ...commissionConfig.verifiedBadge, ratePercent: Number(e.target.value) }
                  })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 font-bold mb-1">Contractual Agreement Terms</label>
                <textarea
                  value={commissionConfig.verifiedBadge?.agreementTerms || ''}
                  onChange={(e) => setCommissionConfig({
                    ...commissionConfig,
                    verifiedBadge: { ...commissionConfig.verifiedBadge, agreementTerms: e.target.value }
                  })}
                  rows={3}
                  required
                  placeholder="Record agreed legal contract terms..."
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* Category 3: Order Form Fees */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">3. Order Form Fees</span>
                <input
                  type="checkbox"
                  checked={commissionConfig.orderFormFee?.enabled}
                  onChange={(e) => setCommissionConfig({
                    ...commissionConfig,
                    orderFormFee: { ...commissionConfig.orderFormFee, enabled: e.target.checked }
                  })}
                  className="w-4 h-4 rounded text-primary-main focus:ring-primary-main cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 font-bold mb-1">Commission Entitlement Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={commissionConfig.orderFormFee?.ratePercent || 100}
                  onChange={(e) => setCommissionConfig({
                    ...commissionConfig,
                    orderFormFee: { ...commissionConfig.orderFormFee, ratePercent: Number(e.target.value) }
                  })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 font-bold mb-1">Contractual Agreement Terms</label>
                <textarea
                  value={commissionConfig.orderFormFee?.agreementTerms || ''}
                  onChange={(e) => setCommissionConfig({
                    ...commissionConfig,
                    orderFormFee: { ...commissionConfig.orderFormFee, agreementTerms: e.target.value }
                  })}
                  rows={3}
                  required
                  placeholder="Record agreed legal contract terms..."
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>
        </form>
      )}

      {/* =========================================================================
          TAB 4: AUDITABLE FINANCIAL LEDGER (TASK 6)
      ========================================================================== */}
      {activeTab === 'ledger' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary-main" />
                <span>Auditable Financial Ledger</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Immutable, append-only corporate financial ledger. Historical entries cannot be altered directly.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCorrectionModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer self-start sm:self-auto"
            >
              <span>+ Record Controlled Adjustment</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            {ledgerEntries.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500">
                No ledger entries registered yet. Approved share capital contributions and payouts will appear here.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Ledger ID</th>
                    <th className="py-3 px-4">Shareholder ID</th>
                    <th className="py-3 px-4">Category & Source Trx</th>
                    <th className="py-3 px-4">Base Amount</th>
                    <th className="py-3 px-4">Calculated Amount</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Audit Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {ledgerEntries.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{l.id}</td>
                      <td className="py-3 px-4 text-slate-700 font-bold">{l.shareholderId}</td>
                      <td className="py-3 px-4 font-sans">
                        <div className="font-bold text-slate-800">{l.revenueCategory}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{l.sourceTransactionId}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">৳{l.eligibleRevenueAmount?.toLocaleString()}</td>
                      <td className={`py-3 px-4 font-black ${Number(l.calculatedAmount) < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        ৳{l.calculatedAmount?.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          {l.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-600">
                        {l.timestamp ? new Date(l.timestamp).toLocaleString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 5: WITHDRAWAL REQUEST MANAGEMENT (TASK 7)
      ========================================================================== */}
      {activeTab === 'withdrawals' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary-main" />
              <span>Shareholder Withdrawal Requests</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verify available payable balances and record official payment references before marking as paid.
            </p>
          </div>

          <div className="overflow-x-auto">
            {withdrawals.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500">
                No shareholder withdrawal requests found.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Withdrawal ID</th>
                    <th className="py-3 px-4">Shareholder ID</th>
                    <th className="py-3 px-4">Method & Account</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Requested Date</th>
                    <th className="py-3 px-4">Status & Reference</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {withdrawals.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{w.id}</td>
                      <td className="py-3 px-4 font-mono text-slate-700 font-bold">{w.shareholderId}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-800">{w.paymentMethod}</span>
                        <span className="font-mono text-slate-500 block text-[11px]">{w.accountNumber}</span>
                      </td>
                      <td className="py-3 px-4 font-black text-slate-900">৳{w.amount?.toLocaleString()}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {w.requestedAt ? new Date(w.requestedAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          w.status === 'paid'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : w.status === 'rejected'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {w.status}
                        </span>
                        {w.payoutReference && (
                          <span className="text-[10px] font-mono text-slate-500 block mt-0.5">Ref: {w.payoutReference}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {w.status === 'pending' && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setPayoutModalWithdrawal(w)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer"
                            >
                              Mark Paid
                            </button>
                            <button
                              type="button"
                              onClick={() => setRejectWithdrawalModal(w)}
                              className="px-2.5 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-800 font-bold text-[11px] cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 6: GOVERNANCE AUDIT LOGS (TASK 9)
      ========================================================================== */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary-main" />
              <span>Immutable Governance Audit Logs</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Chronological audit log recording every executive shareholder ratification, rejection, allocation, and setting change.
            </p>
          </div>

          <div className="overflow-x-auto">
            {auditLogs.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500">
                No administrative audit entries recorded yet.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Audit ID</th>
                    <th className="py-3 px-4">Admin Email</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Affected Record</th>
                    <th className="py-3 px-4">Details</th>
                    <th className="py-3 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{log.id}</td>
                      <td className="py-3 px-4 text-slate-700 font-sans font-bold">{log.adminEmail}</td>
                      <td className="py-3 px-4 font-sans">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-900 text-sky-300">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">{log.affectedRecordId}</td>
                      <td className="py-3 px-4 text-[11px] text-slate-600 max-w-xs truncate" title={JSON.stringify(log.details)}>
                        {JSON.stringify(log.details)}
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-600">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          APPLICATION DETAILS & SCREENSHOT INSPECTION MODAL
      ========================================================================== */}
      {selectedAppDetail && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div>
                <h3 className="font-black text-slate-900 text-lg">Application & Payment Proof</h3>
                <p className="text-xs text-slate-500 font-mono">{selectedAppDetail.applicationId || selectedAppDetail.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAppDetail(null)}
                className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Applicant Name</span>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">
                    {selectedAppDetail.applicantName || selectedAppDetail.fullName}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Guardian Name</span>
                  <div className="font-bold text-slate-800 text-sm mt-0.5">
                    {selectedAppDetail.guardianName || 'N/A'}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Phone & Email</span>
                  <div className="text-slate-700 mt-0.5">
                    {selectedAppDetail.phone} • {selectedAppDetail.email}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Address</span>
                  <div className="text-slate-700 mt-0.5">
                    {selectedAppDetail.address || 'N/A'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Shares Requested</span>
                  <div className="text-lg font-black text-primary-main mt-0.5">{selectedAppDetail.sharePercent}%</div>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Amount Payable</span>
                  <div className="text-lg font-black text-slate-900 mt-0.5">৳{selectedAppDetail.totalAmount?.toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Status</span>
                  <div className="text-xs font-bold text-slate-800 mt-1">{selectedAppDetail.paymentStatus || selectedAppDetail.status}</div>
                </div>
              </div>

              {/* Payment Proof / TrxID */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-bold">MFS Channel:</span>
                  <span className="font-bold text-slate-900">{selectedAppDetail.paymentMethod}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-bold">Transaction ID:</span>
                  <span className="font-mono font-bold text-primary-main">{selectedAppDetail.transactionId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-bold">Payer Mobile:</span>
                  <span className="font-mono text-slate-800">{selectedAppDetail.payerMobile}</span>
                </div>

                {selectedAppDetail.screenshotUrl && (
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Uploaded Screenshot Proof</span>
                    <a
                      href={selectedAppDetail.screenshotUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block rounded-xl overflow-hidden border border-slate-300 max-h-56"
                    >
                      <img
                        src={selectedAppDetail.screenshotUrl}
                        alt="Payment Proof"
                        className="object-contain max-h-56 w-auto"
                      />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Actions in Modal */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedAppDetail(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Close
              </button>

              {(selectedAppDetail.paymentStatus === 'Pending Verification' || selectedAppDetail.status === 'pending_verification') && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRejectModalApp(selectedAppDetail);
                      setSelectedAppDetail(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-800 font-bold text-xs"
                  >
                    Reject Application
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApproveApp(selectedAppDetail)}
                    disabled={actionLoading}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md"
                  >
                    Approve & Ratify
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REJECT APPLICATION MODAL */}
      {rejectModalApp && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-black text-slate-900 text-base mb-1">Reject Share Application</h3>
            <p className="text-xs text-slate-500 mb-4 font-mono">{rejectModalApp.applicationId || rejectModalApp.id}</p>

            <form onSubmit={handleRejectAppSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Rejection Reason (Required)</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Transaction ID not found in bank records, mismatched deposit amount..."
                  rows={3}
                  required
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setRejectModalApp(null);
                    setRejectionReason('');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !rejectionReason.trim()}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md disabled:opacity-50"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WITHDRAWAL PAYOUT REFERENCE MODAL */}
      {payoutModalWithdrawal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-black text-slate-900 text-base mb-1">Disburse Commission Withdrawal</h3>
            <p className="text-xs text-slate-500 mb-4 font-mono">
              Pay <strong>৳{payoutModalWithdrawal.amount?.toLocaleString()}</strong> to {payoutModalWithdrawal.paymentMethod} ({payoutModalWithdrawal.accountNumber})
            </p>

            <form onSubmit={handleWithdrawalPayoutSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Disbursement Transaction Reference (TrxID)
                </label>
                <input
                  type="text"
                  value={payoutReference}
                  onChange={(e) => setPayoutReference(e.target.value)}
                  placeholder="e.g. bKash TrxID or Bank Transfer Ref"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setPayoutModalWithdrawal(null);
                    setPayoutReference('');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !payoutReference.trim()}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md disabled:opacity-50"
                >
                  Confirm & Mark Paid
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONTROLLED LEDGER CORRECTION MODAL (TASK 6) */}
      {showCorrectionModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-black text-slate-900 text-base mb-1">Record Controlled Ledger Adjustment</h3>
            <p className="text-xs text-slate-500 mb-4">
              Controlled audit correction. Never deletes historical data; appends an adjustment entry.
            </p>

            <form onSubmit={handleLedgerCorrectionSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Shareholder ID</label>
                <input
                  type="text"
                  value={correctionShareholderId}
                  onChange={(e) => setCorrectionShareholderId(e.target.value)}
                  placeholder="e.g. RJ-SH-XXXXXX"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Target Entry ID (Optional)</label>
                <input
                  type="text"
                  value={correctionTargetId}
                  onChange={(e) => setCorrectionTargetId(e.target.value)}
                  placeholder="e.g. LEDGER-..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Adjustment Amount (৳ BDT - use negative to deduct)</label>
                <input
                  type="number"
                  value={correctionAmount}
                  onChange={(e) => setCorrectionAmount(e.target.value)}
                  placeholder="e.g. -500 or 500"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Audit Justification Reason</label>
                <textarea
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="Detailed justification for the audit adjustment..."
                  rows={3}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCorrectionModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md"
                >
                  Record Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
