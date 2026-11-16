import { useEffect, useState, useMemo } from "react";
import api from "../services/api";
import { 
  Search, RefreshCw, Plus, X, Loader2, CheckCircle2, 
  AlertCircle, ArrowRight, ShieldAlert, XCircle
} from "lucide-react";

export default function Memberships() {
  // Data State
  const [memberships, setMemberships] = useState([]);
  const [members, setMembers] = useState([]);
  const [plans, setPlans] = useState([]);
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isRenewOpen, setIsRenewOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [selectedMembership, setSelectedMembership] = useState(null);
  
  // Form State & Action State
  const [formData, setFormData] = useState({ member_id: "", plan_id: "", start_date: new Date().toISOString().split("T")[0] });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  // 1. Fetch Data
  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [msRes, membersRes, plansRes] = await Promise.all([
        api.get("/memberships"),
        api.get("/members?limit=100"), // Get all members for the dropdown
        api.get("/membership-plans?status=ACTIVE") // Get active plans
      ]);
      
      setMemberships(msRes.data.memberships);
      setMembers(membersRes.data.members);
      setPlans(plansRes.data.plans);
    } catch (err) {
      console.error(err);
      setError("Failed to load memberships data. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 2. Helpers
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
  };

  const calculateEndDate = (startDate, durationDays) => {
    if (!startDate || !durationDays) return "";
    const date = new Date(`${startDate}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + Number(durationDays) - 1);
    return date.toISOString().split("T")[0];
  };

  // 3. Derived State (Search, Filter, Pagination)
  const filteredMemberships = useMemo(() => {
    return memberships.filter((ms) => {
      const matchesSearch = 
        ms.full_name.toLowerCase().includes(search.toLowerCase()) ||
        ms.member_code.toLowerCase().includes(search.toLowerCase()) ||
        ms.plan_name_snapshot.toLowerCase().includes(search.toLowerCase());
      
      const matchesStatus = statusFilter ? ms.status === statusFilter : true;
      const matchesPlan = planFilter ? ms.plan_id.toString() === planFilter : true;

      return matchesSearch && matchesStatus && matchesPlan;
    });
  }, [memberships, search, statusFilter, planFilter]);

  const totalPages = Math.ceil(filteredMemberships.length / itemsPerPage);
  const paginatedMemberships = filteredMemberships.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Summary Stats
  const stats = {
    total: memberships.length,
    active: memberships.filter((m) => m.status === "ACTIVE").length,
    expired: memberships.filter((m) => m.status === "EXPIRED").length,
    pending: memberships.filter((m) => m.status === "PENDING").length,
  };

  // 4. Handlers
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (submitLoading) return;
    
    if (!formData.member_id || !formData.plan_id || !formData.start_date) {
      setSubmitError("Please fill in all required fields.");
      return;
    }

    setSubmitLoading(true);
    setSubmitError("");

    try {
      await api.post("/memberships", {
        member_id: Number(formData.member_id),
        plan_id: Number(formData.plan_id),
        start_date: formData.start_date
      });
      
      setIsCreateOpen(false);
      setFormData({ member_id: "", plan_id: "", start_date: new Date().toISOString().split("T")[0] });
      showToast("Membership created successfully!");
      fetchData(); // Refresh
    } catch (err) {
      setSubmitError(err.response?.data?.message || "Failed to create membership.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleRenew = async () => {
    if (submitLoading || !selectedMembership) return;
    setSubmitLoading(true);
    try {
      await api.post(`/memberships/${selectedMembership.membership_id}/renew`);
      setIsRenewOpen(false);
      showToast("Membership renewed successfully!");
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to renew.", "error");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCancel = async () => {
    if (submitLoading || !selectedMembership) return;
    setSubmitLoading(true);
    try {
      await api.patch(`/memberships/${selectedMembership.membership_id}/cancel`);
      setIsCancelOpen(false);
      showToast("Membership cancelled successfully!");
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to cancel.", "error");
    } finally {
      setSubmitLoading(false);
    }
  };

  // Get currently selected plan details for the Create Modal
  const currentPlan = plans.find(p => p.plan_id.toString() === formData.plan_id.toString());

  return (
    <div>
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 text-white transition-transform ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Memberships</h3>
          <p className="text-sm text-slate-500">Manage subscription plans and member access.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchData} className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition shadow-sm">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 transition shadow-sm">
            <Plus size={16} /> Create Membership
          </button>
        </div>
      </div>

      {error && <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg border border-red-200 text-sm">{error}</div>}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Total Memberships</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</h3>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-sm text-emerald-600 font-medium">Active</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.active}</h3>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-sm text-red-600 font-medium">Expired</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.expired}</h3>
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
          <input type="text" placeholder="Search by member or plan..." value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-600">
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="EXPIRED">Expired</option>
          <option value="PENDING">Pending</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <select value={planFilter} onChange={(e) => { setPlanFilter(e.target.value); setCurrentPage(1); }} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-600">
          <option value="">All Plans</option>
          {plans.map(p => <option key={p.plan_id} value={p.plan_id}>{p.plan_name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-4 font-medium">Member</th>
                <th className="px-5 py-4 font-medium">Plan</th>
                <th className="px-5 py-4 font-medium">Start Date</th>
                <th className="px-5 py-4 font-medium">End Date</th>
                <th className="px-5 py-4 font-medium">Amount</th>
                <th className="px-5 py-4 font-medium">Status</th>
                <th className="px-5 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="7" className="px-5 py-10 text-center text-slate-500"><Loader2 className="animate-spin mx-auto mb-2 text-blue-500" size={24} />Loading...</td></tr>
              ) : paginatedMemberships.length === 0 ? (
                <tr><td colSpan="7" className="px-5 py-10 text-center text-slate-500">No memberships found.</td></tr>
              ) : (
                paginatedMemberships.map((ms) => (
                  <tr key={ms.membership_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-900">{ms.full_name}</p>
                      <p className="text-xs text-slate-500 font-mono">{ms.member_code}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{ms.plan_name_snapshot}</td>
                    <td className="px-5 py-4 text-slate-600">{ms.start_date}</td>
                    <td className="px-5 py-4 text-slate-600">{ms.end_date}</td>
                    <td className="px-5 py-4 font-medium text-slate-900">₹{Number(ms.price_snapshot).toLocaleString("en-IN")}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        ms.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : 
                        ms.status === "PENDING" ? "bg-amber-50 text-amber-700" :
                        ms.status === "EXPIRED" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-700"
                      }`}>{ms.status}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => { setSelectedMembership(ms); setIsViewOpen(true); }} className="text-slate-400 hover:text-blue-600 p-1 rounded transition-colors" title="View"><Search size={16} /></button>
                        {ms.status === "ACTIVE" || ms.status === "EXPIRED" ? (
                          <button onClick={() => { setSelectedMembership(ms); setIsRenewOpen(true); }} className="text-slate-400 hover:text-emerald-600 p-1 rounded transition-colors" title="Renew"><RefreshCw size={16} /></button>
                        ) : null}
                        {ms.status === "ACTIVE" || ms.status === "PENDING" ? (
                          <button onClick={() => { setSelectedMembership(ms); setIsCancelOpen(true); }} className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors" title="Cancel"><XCircle size={16} /></button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {!loading && filteredMemberships.length > 0 && (
          <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-between text-sm text-slate-500">
            <span>Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredMemberships.length)} of {filteredMemberships.length} entries</span>
            <div className="flex gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50">Previous</button>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* --- MODALS --- */}

      {/* Create Membership Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-900">Create Membership</h3>
              <button onClick={() => setIsCreateOpen(false)} disabled={submitLoading} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateSubmit} className="p-6">
              {submitError && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{submitError}</div>}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Select Member <span className="text-red-500">*</span></label>
                  <select required value={formData.member_id} onChange={(e) => setFormData({...formData, member_id: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">-- Choose Member --</option>
                    {members.map(m => <option key={m.member_id} value={m.member_id}>{m.full_name} ({m.member_code})</option>)}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Select Plan <span className="text-red-500">*</span></label>
                  <select required value={formData.plan_id} onChange={(e) => setFormData({...formData, plan_id: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">-- Choose Plan --</option>
                    {plans.map(p => <option key={p.plan_id} value={p.plan_id}>{p.plan_name} - ₹{p.price}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Date <span className="text-red-500">*</span></label>
                  <input type="date" required value={formData.start_date} onChange={(e) => setFormData({...formData, start_date: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>

                {/* Live Calculation Preview */}
                {currentPlan && formData.start_date && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mt-4">
                    <p className="text-xs text-blue-800 font-medium mb-1">Automatic Calculation Preview:</p>
                    <div className="flex justify-between text-sm text-blue-900">
                      <span>Duration:</span>
                      <span className="font-semibold">{currentPlan.duration_days} Days</span>
                    </div>
                    <div className="flex justify-between text-sm text-blue-900 mt-1">
                      <span>End Date:</span>
                      <span className="font-semibold">{calculateEndDate(formData.start_date, currentPlan.duration_days)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-blue-900 mt-1">
                      <span>Total Amount:</span>
                      <span className="font-semibold">₹{Number(currentPlan.price).toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsCreateOpen(false)} disabled={submitLoading} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-lg">Cancel</button>
                <button type="submit" disabled={submitLoading} className="flex items-center gap-2 px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-70">
                  {submitLoading ? <Loader2 size={16} className="animate-spin" /> : "Save Membership"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Membership Modal */}
      {isViewOpen && selectedMembership && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-900">Membership Details</h3>
              <button onClick={() => setIsViewOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-slate-500">Member</p><p className="font-medium text-slate-900">{selectedMembership.full_name}</p></div>
                <div><p className="text-slate-500">Code</p><p className="font-medium text-slate-900 font-mono">{selectedMembership.member_code}</p></div>
                <div><p className="text-slate-500">Plan</p><p className="font-medium text-slate-900">{selectedMembership.plan_name_snapshot}</p></div>
                <div><p className="text-slate-500">Status</p><p className="font-medium text-slate-900">{selectedMembership.status}</p></div>
                <div><p className="text-slate-500">Start Date</p><p className="font-medium text-slate-900">{selectedMembership.start_date}</p></div>
                <div><p className="text-slate-500">End Date</p><p className="font-medium text-slate-900">{selectedMembership.end_date}</p></div>
                <div><p className="text-slate-500">Amount Paid</p><p className="font-medium text-slate-900">₹{Number(selectedMembership.price_snapshot).toLocaleString("en-IN")}</p></div>
                <div><p className="text-slate-500">Duration</p><p className="font-medium text-slate-900">{selectedMembership.duration_days_snapshot} Days</p></div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
              <button onClick={() => setIsViewOpen(false)} className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Renew Confirmation Modal */}
      {isRenewOpen && selectedMembership && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="mx-auto w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4"><RefreshCw size={24} /></div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Renew Membership?</h3>
            <p className="text-sm text-slate-500 mb-6">This will extend {selectedMembership.full_name}'s access. The new plan will start the day after their current membership ends.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setIsRenewOpen(false)} disabled={submitLoading} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
              <button onClick={handleRenew} disabled={submitLoading} className="flex items-center gap-2 px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                {submitLoading ? <Loader2 size={16} className="animate-spin" /> : "Yes, Renew"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {isCancelOpen && selectedMembership && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4"><ShieldAlert size={24} /></div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Cancel Membership?</h3>
            <p className="text-sm text-slate-500 mb-6">Are you sure you want to cancel {selectedMembership.full_name}'s membership? This action cannot be undone.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setIsCancelOpen(false)} disabled={submitLoading} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Keep Active</button>
              <button onClick={handleCancel} disabled={submitLoading} className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">
                {submitLoading ? <Loader2 size={16} className="animate-spin" /> : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}