import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, 
  Search, 
  Filter, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Eye, 
  ExternalLink, 
  ShieldCheck, 
  DollarSign, 
  Coins, 
  User, 
  Phone, 
  CreditCard, 
  FileText,
  Calendar,
  X,
  Check,
  Image as ImageIcon
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { isAllowedAdminEmail } from '../../constants/adminAllowlist';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface SharePaymentRecord {
  id: string;
  applicationId: string;
  userId: string;
  applicantName: string;
  guardianName?: string;
  address?: string;
  phone?: string;
  email?: string;
  sharePercent: number;
  sharePrice: number;
  shareUnits: number;
  totalAmount: number;
  paymentMethod: string;
  transactionId: string;
  payerMobile: string;
  screenshotUrl?: string;
  submissionTimestamp: number;
  paymentStatus: 'Pending Verification' | 'Approved' | 'Rejected' | string;
  status: string;
  verifiedAt?: number;
  verifiedBy?: string;
  rejectedAt?: number;
  rejectedBy?: string;
  rejectionReason?: string;
  notes?: string;
}

export default function AdminSharePayments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<SharePaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  
  // Selected detail modal
  const [selectedRecord, setSelectedRecord] = useState<SharePaymentRecord | null>(null);
  
  // Rejection modal
  const [rejectingRecord, setRejectingRecord] = useState<SharePaymentRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  
  // Image viewer modal
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState(false);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const token = user ? await user.getIdToken() : '';
      const res = await fetch('/api/shareholders/admin/payments', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-admin-email': user?.email || ''
        }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load shareholder payments');
      }
      setPayments(data.payments || []);
    } catch (err: any) {
      console.error('Error fetching admin share payments:', err);
      toast.error(err.message || 'Error fetching share payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [user]);

  // Statistics
  const stats = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let totalCollected = 0;
    let totalSharesSold = 0;

    payments.forEach(p => {
      const st = (p.paymentStatus || p.status || '').toLowerCase();
      if (st.includes('pending')) pending++;
      else if (st === 'approved') {
        approved++;
        totalCollected += Number(p.totalAmount || 0);
        totalSharesSold += Number(p.sharePercent || 0);
      } else if (st === 'rejected') rejected++;
    });

    return {
      total: payments.length,
      pending,
      approved,
      rejected,
      totalCollected,
      totalSharesSold
    };
  }, [payments]);

  // Filtered payments list
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      // Status filter
      const st = (p.paymentStatus || p.status || '').toLowerCase();
      if (statusFilter === 'pending' && !st.includes('pending')) return false;
      if (statusFilter === 'approved' && st !== 'approved') return false;
      if (statusFilter === 'rejected' && st !== 'rejected') return false;

      // Search filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const appRef = (p.applicationId || p.id || '').toLowerCase();
        const trx = (p.transactionId || '').toLowerCase();
        const name = (p.applicantName || '').toLowerCase();
        const mobile = (p.payerMobile || p.phone || '').toLowerCase();
        return appRef.includes(query) || trx.includes(query) || name.includes(query) || mobile.includes(query);
      }

      return true;
    });
  }, [payments, statusFilter, searchTerm]);

  // Handle Approve Action (Task 5)
  const handleApprove = async (record: SharePaymentRecord) => {
    if (!window.confirm(`Are you sure you want to approve payment for Application ${record.applicationId} (${record.sharePercent}% share = ৳${record.totalAmount?.toLocaleString()})? This will officially activate the user's shareholder status.`)) {
      return;
    }

    setProcessingAction(true);
    try {
      const token = user ? await user.getIdToken() : '';
      const res = await fetch('/api/shareholders/admin/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-admin-email': user?.email || ''
        },
        body: JSON.stringify({
          applicationId: record.applicationId,
          action: 'approve'
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to approve payment.');
      }

      toast.success(data.message || 'Payment successfully approved!');
      setSelectedRecord(null);
      fetchPayments();
    } catch (err: any) {
      console.error('Approval error:', err);
      toast.error(err.message || 'Failed to approve payment.');
    } finally {
      setProcessingAction(false);
    }
  };

  // Handle Reject Action (Task 5)
  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingRecord) return;

    if (!rejectionReason.trim()) {
      toast.error('Please specify a rejection reason.');
      return;
    }

    setProcessingAction(true);
    try {
      const token = user ? await user.getIdToken() : '';
      const res = await fetch('/api/shareholders/admin/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-admin-email': user?.email || ''
        },
        body: JSON.stringify({
          applicationId: rejectingRecord.applicationId,
          action: 'reject',
          rejectionReason: rejectionReason.trim()
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to reject payment.');
      }

      toast.success(data.message || 'Payment has been rejected.');
      setRejectingRecord(null);
      setRejectionReason('');
      setSelectedRecord(null);
      fetchPayments();
    } catch (err: any) {
      console.error('Rejection error:', err);
      toast.error(err.message || 'Failed to reject payment.');
    } finally {
      setProcessingAction(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-primary-main/20 text-primary-main border border-primary-main/30">
              RJ WORLD BD Administration
            </span>
            <span className="text-xs font-bold text-slate-500">
              Equity & Shareholder Verification Portal
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Share Payment Verification
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Review submitted mobile banking transactions, inspect payment screenshots, and authorize company equity units.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchPayments}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex justify-between items-center text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Pending Review</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600">
            {stats.pending}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Requires manual verification</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex justify-between items-center text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Approved Payments</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600">
            {stats.approved}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">{stats.totalSharesSold}% equity active</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex justify-between items-center text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Total Equity Fund</span>
            <Coins className="w-4 h-4 text-primary-main" />
          </div>
          <div className="text-2xl font-black text-primary-main">
            ৳{stats.totalCollected.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Verified capital collected</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex justify-between items-center text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Rejected Payments</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-slate-700">
            {stats.rejected}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Declined or invalid TrxID</p>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Application ID, TrxID, Applicant Name, or Mobile..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-primary-main/20 focus:border-primary-main"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto bg-slate-50 p-1 rounded-xl border border-slate-200 shrink-0">
          {(['all', 'pending', 'approved', 'rejected'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === tab
                  ? 'bg-primary-main text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab === 'all' ? `All (${payments.length})` : 
               tab === 'pending' ? `Pending (${stats.pending})` : 
               tab === 'approved' ? `Approved (${stats.approved})` : 
               `Rejected (${stats.rejected})`}
            </button>
          ))}
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-primary-main border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs font-medium">Loading share payment records...</p>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-700">No share payment records found</h3>
            <p className="text-xs text-slate-400 mt-1">
              {searchTerm || statusFilter !== 'all' ? 'Try adjusting your search filters.' : 'No share payments have been submitted yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Application ID</th>
                  <th className="py-3 px-4">Applicant & Contact</th>
                  <th className="py-3 px-4">Shares (%)</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Method & TrxID</th>
                  <th className="py-3 px-4">Payer Phone</th>
                  <th className="py-3 px-4">Proof</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.map((record) => {
                  const isPending = (record.paymentStatus || record.status || '').toLowerCase().includes('pending');
                  const isApproved = (record.paymentStatus || record.status || '').toLowerCase() === 'approved';
                  const isRejected = (record.paymentStatus || record.status || '').toLowerCase() === 'rejected';

                  return (
                    <tr key={record.applicationId} className="hover:bg-slate-50/70 transition-colors">
                      {/* App ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {record.applicationId}
                      </td>

                      {/* Applicant & Guardian */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{record.applicantName}</div>
                        {record.guardianName && (
                          <div className="text-[11px] text-slate-500">C/O: {record.guardianName}</div>
                        )}
                        <div className="text-[11px] text-slate-400">{record.email}</div>
                      </td>

                      {/* Shares */}
                      <td className="py-3.5 px-4 font-bold text-primary-main whitespace-nowrap">
                        {record.sharePercent}% ({record.shareUnits || record.sharePercent} Units)
                      </td>

                      {/* Total Amount */}
                      <td className="py-3.5 px-4 font-black text-slate-900 whitespace-nowrap">
                        ৳{record.totalAmount?.toLocaleString()}
                      </td>

                      {/* Method & TrxID */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-800">{record.paymentMethod}</span>
                        <div className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 w-fit text-[11px] mt-0.5">
                          {record.transactionId}
                        </div>
                      </td>

                      {/* Payer Phone */}
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-700 whitespace-nowrap">
                        {record.payerMobile || record.phone}
                      </td>

                      {/* Screenshot */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {record.screenshotUrl ? (
                          <button
                            type="button"
                            onClick={() => setViewingImage(record.screenshotUrl!)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-primary-main hover:underline cursor-pointer"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span>View Proof</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px]">No image</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3" />
                            <span>Pending Verification</span>
                          </span>
                        )}
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Approved</span>
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                            <XCircle className="w-3 h-3" />
                            <span>Rejected</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedRecord(record)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="View Full Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {isPending && (
                            <>
                              <button
                                type="button"
                                disabled={processingAction}
                                onClick={() => handleApprove(record)}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>

                              <button
                                type="button"
                                disabled={processingAction}
                                onClick={() => setRejectingRecord(record)}
                                className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[11px] transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAIL MODAL */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative my-6">
            <button
              type="button"
              onClick={() => setSelectedRecord(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-primary-main/10 text-primary-main flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Shareholder Application Details
                </h3>
                <p className="text-xs font-mono text-slate-500">
                  {selectedRecord.applicationId}
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[11px]">Applicant Name:</span>
                  <span className="font-bold text-slate-900">{selectedRecord.applicantName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Father / Mother:</span>
                  <span className="font-bold text-slate-800">{selectedRecord.guardianName || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Phone:</span>
                  <span className="font-mono text-slate-800">{selectedRecord.phone}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Email:</span>
                  <span className="text-slate-800">{selectedRecord.email}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block text-[11px]">Registered Address:</span>
                  <span className="text-slate-800">{selectedRecord.address || 'N/A'}</span>
                </div>
              </div>

              {/* Financial & Payment Details */}
              <div className="p-4 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-slate-500">Requested Share Percentage:</span>
                  <span className="font-black text-primary-main text-sm">{selectedRecord.sharePercent}% Share</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-slate-500">Rate per 1% Unit:</span>
                  <span className="font-bold text-slate-800">৳2,000</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-slate-500 font-bold">Total Payable Amount:</span>
                  <span className="font-black text-slate-900 text-base">৳{selectedRecord.totalAmount?.toLocaleString()} BDT</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-slate-500">Payment Method:</span>
                  <span className="font-bold text-slate-800">{selectedRecord.paymentMethod}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-slate-500">Transaction ID (TrxID):</span>
                  <span className="font-mono font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {selectedRecord.transactionId}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Payer Mobile Number:</span>
                  <span className="font-mono font-bold text-slate-800">{selectedRecord.payerMobile}</span>
                </div>
              </div>

              {/* Screenshot if available */}
              {selectedRecord.screenshotUrl && (
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                  <span className="text-xs font-bold text-slate-700 block mb-2">Uploaded Payment Proof:</span>
                  <img
                    src={selectedRecord.screenshotUrl}
                    alt="Proof"
                    onClick={() => setViewingImage(selectedRecord.screenshotUrl!)}
                    className="max-h-48 mx-auto rounded-lg border border-slate-200 shadow-xs cursor-pointer hover:opacity-90"
                  />
                </div>
              )}

              {/* Verification Audit Log */}
              {selectedRecord.verifiedAt && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 text-[11px]">
                  <strong>Approved By:</strong> {selectedRecord.verifiedBy} on {new Date(selectedRecord.verifiedAt).toLocaleString()}
                </div>
              )}
              {selectedRecord.rejectedAt && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-950 text-[11px] space-y-1">
                  <div><strong>Rejected By:</strong> {selectedRecord.rejectedBy} on {new Date(selectedRecord.rejectedAt).toLocaleString()}</div>
                  <div><strong>Reason:</strong> {selectedRecord.rejectionReason}</div>
                </div>
              )}

              {/* Action Buttons if Pending */}
              {(selectedRecord.paymentStatus || selectedRecord.status || '').toLowerCase().includes('pending') && (
                <div className="flex items-center gap-3 pt-3">
                  <button
                    type="button"
                    disabled={processingAction}
                    onClick={() => handleApprove(selectedRecord)}
                    className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-colors shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve Payment & Activate Shares</span>
                  </button>

                  <button
                    type="button"
                    disabled={processingAction}
                    onClick={() => {
                      setRejectingRecord(selectedRecord);
                      setSelectedRecord(null);
                    }}
                    className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs transition-colors shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject Payment</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REJECTION REASON MODAL */}
      {rejectingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in">
            <button
              type="button"
              onClick={() => {
                setRejectingRecord(null);
                setRejectionReason('');
              }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Reject Share Payment
                </h3>
                <p className="text-xs text-slate-500">
                  {rejectingRecord.applicationId}
                </p>
              </div>
            </div>

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Specify Reason for Rejection <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Transaction ID not found in MFS merchant statement / Amount mismatch / Invalid screenshot"
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setRejectingRecord(null);
                    setRejectionReason('');
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={processingAction}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {processingAction ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL IMAGE PROOF VIEWER MODAL */}
      {viewingImage && (
        <div 
          onClick={() => setViewingImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 cursor-zoom-out"
        >
          <div className="relative max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl bg-white p-2 shadow-2xl">
            <button
              type="button"
              onClick={() => setViewingImage(null)}
              className="absolute top-4 right-4 p-2 bg-slate-900/60 hover:bg-slate-900 text-white rounded-full transition-colors cursor-pointer z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={viewingImage}
              alt="Payment Proof Full View"
              className="max-h-[85vh] max-w-full object-contain mx-auto rounded-lg"
            />
          </div>
        </div>
      )}

    </div>
  );
}
