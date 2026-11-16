import { useEffect, useState, useMemo } from "react";
import api from "../services/api";
import { 
  Search, RefreshCw, Plus, X, Loader2, CheckCircle2, 
  AlertCircle, IndianRupee, FileText, ArrowRight
} from "lucide-react";

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [members, setMembers] = useState([]);
  const [memberships, setMemberships] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  
  // Modals
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [receiptData, setReceiptData] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    member_id: "",
    membership_id: "",
    amount: "",
    payment_method: "CASH",
    transaction_reference: "",
    payment_status: "SUCCESS"
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [paymentsRes, membersRes, membershipsRes] = await Promise.all([
        api.get("/payments"),
        api.get("/members?limit=500"),
        api.get("/memberships?status=ACTIVE")
      ]);
      setPayments(paymentsRes.data.payments);
      setMembers(membersRes.data.members);
      setMemberships(membershipsRes.data.memberships);
    } catch (err) {
      setError("Failed to load payments data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
  };

  // --- Derived Data ---
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const matchesSearch = 
        p.full_name.toLowerCase().includes(search.toLowerCase()) || 
        p.member_code.toLowerCase().includes(search.toLowerCase()) ||
        (p.transaction_reference && p.transaction_reference.toLowerCase().includes(search.toLowerCase()));
      
      const matchesStatus = statusFilter ? p.payment_status === statusFilter : true;
      
      return matchesSearch && matchesStatus;
    });
  }, [payments, search, statusFilter]);

  // Calculate Summary Stats (Today's revenue only)
  const stats = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const todayPayments = payments.filter(p => p.paid_at.startsWith(today));
    
    const revenue = todayPayments
      .filter(p => p.payment_status === "SUCCESS")
      .reduce((sum, p) => sum + Number(p.amount), 0);
      
    const successCount = todayPayments.filter(p => p.payment_status === "SUCCESS").length;
    const pendingCount = todayPayments.filter(p => p.payment_status === "PENDING").length;

    return {
      revenue,
      totalTx: todayPayments.length,
      success: successCount,
      pending: pendingCount
    };
  }, [payments]);

  // When a member is selected in the modal, filter their active memberships
  const memberActiveMemberships = useMemo(() => {
    if (!formData.member_id) return [];
    return memberships.filter(m => m.member_id.toString() === formData.member_id.toString());
  }, [formData.member_id, memberships]);

  // --- Handlers ---
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (submitLoading) return;

    if (!formData.member_id || !formData.amount || !formData.payment_method) {
      setSubmitError("Member, Amount, and Payment Method are required.");
      return;
    }

    setSubmitLoading(true);
    setSubmitError("");

    try {
      await api.post("/payments", {
        ...formData,
        member_id: Number(formData.member_id),
        membership_id: formData.membership_id ? Number(formData.membership_id) : null,
        amount: Number(formData.amount)
      });
      
      setIsRecordOpen(false);
      setFormData({ member_id: "", membership_id: "", amount: "", payment_method: "CASH", transaction_reference: "", payment_status: "SUCCESS" });
      showToast("Payment recorded successfully!");
      fetchData();
    } catch (err) {
      setSubmitError(err.response?.data?.message || "Failed to record payment.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedPayment) return;
    setSubmitLoading(true);
    try {
      await api.patch(`/payments/${selectedPayment.payment_id}/status`, { payment_status: newStatus });
      setIsStatusOpen(false);
      showToast(`Payment marked as ${newStatus}`);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update status.", "error");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleViewReceipt = async (paymentId) => {
    try {
      const res = await api.get(`/payments/${paymentId}/receipt`);
      setReceiptData(res.data.receipt);
      setIsReceiptOpen(true);
    } catch (err) {
      showToast(err.response?.data?.message || "Receipt unavailable.", "error");
    }
  };

  return (
    <div>
      {/* Toast */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 text-white ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Payments</h3>
          <p className="text-sm text-slate-500">Manage billing, revenue, and receipts.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchData} className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button onClick={() => setIsRecordOpen(true)} className="flex items-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700">
            <Plus size={16} /> Record Payment
          </button>
        </div>
      </div>

      {error && <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg border border-red-200 text-sm">{error}</div>}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Today's Revenue</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">₹{stats.revenue.toLocaleString("en-IN")}</h3>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Total Transactions</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.totalTx}</h3>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-sm text-emerald-600 font-medium">Successful</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.success}</h3>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-sm text-amber-500 font-medium">Pending</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.pending}</h3>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Search by member or reference..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-600">
          <option value="">All Statuses</option>
          <option value="SUCCESS">Success</option>
          <option value="PENDING">Pending</option>
          <option value="FAILED">Failed</option>
          <option value="REFUNDED">Refunded</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-4 font-medium">Date</th>
                <th className="px-5 py-4 font-medium">Member</th>
                <th className="px-5 py-4 font-medium">Amount</th>
                <th className="px-5 py-4 font-medium">Method</th>
                <th className="px-5 py-4 font-medium">Reference</th>
                <th className="px-5 py-4 font-medium">Status</th>
                <th className="px-5 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="7" className="px-5 py-10 text-center text-slate-500"><Loader2 className="animate-spin mx-auto mb-2 text-blue-500" size={24} /> Loading...</td></tr>
              ) : filteredPayments.length === 0 ? (
                <tr><td colSpan="7" className="px-5 py-10 text-center text-slate-500">No payments found.</td></tr>
              ) : (
                filteredPayments.map(pay => (
                  <tr key={pay.payment_id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 text-slate-600">
                      {new Date(pay.paid_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-900">{pay.full_name}</p>
                      <p className="text-xs text-slate-500 font-mono">{pay.member_code}</p>
                    </td>
                    <td className="px-5 py-4 font-bold text-slate-900">₹{Number(pay.amount).toLocaleString("en-IN")}</td>
                    <td className="px-5 py-4 text-slate-600">{pay.payment_method}</td>
                    <td className="px-5 py-4 text-slate-500 font-mono text-xs">{pay.transaction_reference || "—"}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        pay.payment_status === "SUCCESS" ? "bg-emerald-50 text-emerald-700" : 
                        pay.payment_status === "PENDING" ? "bg-amber-50 text-amber-700" :
                        pay.payment_status === "REFUNDED" ? "bg-slate-100 text-slate-700" : "bg-red-50 text-red-700"
                      }`}>{pay.payment_status}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {pay.payment_status === "SUCCESS" && (
                          <button onClick={() => handleViewReceipt(pay.payment_id)} className="text-slate-400 hover:text-blue-600 p-1" title="View Receipt"><FileText size={16} /></button>
                        )}
                        {pay.payment_status !== "REFUNDED" && (
                          <button onClick={() => { setSelectedPayment(pay); setIsStatusOpen(true); }} className="text-slate-400 hover:text-slate-700 p-1" title="Update Status"><ArrowRight size={16} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODALS --- */}
      
      {/* Record Payment Modal */}
      {isRecordOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-900">Record Payment</h3>
              <button onClick={() => setIsRecordOpen(false)} disabled={submitLoading} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleRecordPayment} className="p-6">
              {submitError && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{submitError}</div>}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Select Member <span className="text-red-500">*</span></label>
                  <select required value={formData.member_id} onChange={(e) => setFormData({...formData, member_id: e.target.value, membership_id: ""})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">-- Choose Member --</option>
                    {members.map(m => <option key={m.member_id} value={m.member_id}>{m.full_name} ({m.member_code})</option>)}
                  </select>
                </div>

                {/* Only show Membership dropdown if member has active memberships */}
                {formData.member_id && memberActiveMemberships.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Link to Membership (Optional)</label>
                    <select value={formData.membership_id} onChange={(e) => setFormData({...formData, membership_id: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                      <option value="">-- General Payment --</option>
                      {memberActiveMemberships.map(ms => (
                        <option key={ms.membership_id} value={ms.membership_id}>{ms.plan_name_snapshot} (Ends: {ms.end_date})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₹) <span className="text-red-500">*</span></label>
                    <input type="number" required min="1" step="0.01" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="1500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Method <span className="text-red-500">*</span></label>
                    <select value={formData.payment_method} onChange={(e) => setFormData({...formData, payment_method: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                      <option value="CASH">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="CARD">Card</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Transaction Ref (Optional)</label>
                  <input type="text" value={formData.transaction_reference} onChange={(e) => setFormData({...formData, transaction_reference: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. UPI-123456789" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select value={formData.payment_status} onChange={(e) => setFormData({...formData, payment_status: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="SUCCESS">Success</option>
                    <option value="PENDING">Pending</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsRecordOpen(false)} disabled={submitLoading} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-lg">Cancel</button>
                <button type="submit" disabled={submitLoading} className="flex items-center gap-2 px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-70">
                  {submitLoading ? <Loader2 size={16} className="animate-spin" /> : "Save Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {isReceiptOpen && receiptData && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border-2 border-slate-100">
            <div className="p-6 text-center border-b border-dashed border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">StudySpace</h3>
              <p className="text-xs text-slate-500 mt-1">Payment Receipt</p>
              <p className="text-sm font-mono mt-3 font-semibold text-blue-600">{receiptData.receipt_number}</p>
            </div>
            <div className="p-6 space-y-3 text-sm bg-slate-50">
              <div className="flex justify-between"><span className="text-slate-500">Date:</span> <span className="font-medium">{new Date(receiptData.paid_at).toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Member:</span> <span className="font-medium">{receiptData.full_name}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Code:</span> <span className="font-medium font-mono">{receiptData.member_code}</span></div>
              {receiptData.plan_name && (
                <div className="flex justify-between"><span className="text-slate-500">Plan:</span> <span className="font-medium">{receiptData.plan_name}</span></div>
              )}
              <div className="flex justify-between"><span className="text-slate-500">Method:</span> <span className="font-medium">{receiptData.payment_method}</span></div>
              <div className="flex justify-between pt-3 border-t border-slate-200 mt-3">
                <span className="text-slate-800 font-bold text-base">Total Paid:</span> 
                <span className="text-slate-900 font-extrabold text-base">₹{Number(receiptData.amount).toLocaleString("en-IN")}</span>
              </div>
            </div>
            <div className="p-4 text-center border-t border-slate-200 bg-white">
              <button onClick={() => setIsReceiptOpen(false)} className="w-full py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Update Status Modal */}
      {isStatusOpen && selectedPayment && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 text-center">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Update Payment Status</h3>
            <p className="text-sm text-slate-500 mb-6">Current status: <span className="font-bold">{selectedPayment.payment_status}</span></p>
            
            <div className="flex flex-col gap-2">
              {selectedPayment.payment_status === "PENDING" && (
                <>
                  <button onClick={() => handleUpdateStatus("SUCCESS")} disabled={submitLoading} className="w-full py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium">Mark as Success</button>
                  <button onClick={() => handleUpdateStatus("FAILED")} disabled={submitLoading} className="w-full py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">Mark as Failed</button>
                </>
              )}
              {selectedPayment.payment_status === "SUCCESS" && (
                <button onClick={() => handleUpdateStatus("REFUNDED")} disabled={submitLoading} className="w-full py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 font-medium">Issue Refund</button>
              )}
              <button onClick={() => setIsStatusOpen(false)} disabled={submitLoading} className="w-full py-2 mt-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}