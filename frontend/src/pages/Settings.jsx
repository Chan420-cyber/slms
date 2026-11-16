import { useState, useEffect } from "react";
import api from "../services/api";
import { 
  Shield, Database, Users, AlertTriangle, CheckCircle2, 
  Server, Lock, Save, Loader2, UserPlus, X, ShieldAlert
} from "lucide-react";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("system");
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  // --- State for System Info ---
  const [dbStatus, setDbStatus] = useState("checking"); // checking, connected, error

  // --- State for Staff Management ---
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [staffForm, setStaffForm] = useState({ username: "", email: "", password: "", role: "STAFF" });
  const [staffSubmitLoading, setStaffSubmitLoading] = useState(false);
  const [staffError, setStaffError] = useState("");

  // --- State for Security ---
  const [passwordForm, setPasswordForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
  };

  // --- API Calls ---
  const checkSystemStatus = async () => {
    try {
      // Ping a lightweight endpoint to verify DB is up
      await api.get("/dashboard/overview");
      setDbStatus("connected");
    } catch (err) {
      setDbStatus("error");
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await api.get("/users");
      setUsers(res.data.users);
    } catch (err) {
      showToast("Failed to load staff directory.", "error");
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    checkSystemStatus();
    if (activeTab === "staff") fetchUsers();
  }, [activeTab]);

  // --- Handlers ---
  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setStaffSubmitLoading(true);
    setStaffError("");
    try {
      await api.post("/users", staffForm);
      setIsAddStaffOpen(false);
      setStaffForm({ username: "", email: "", password: "", role: "STAFF" });
      showToast("Staff account created successfully");
      fetchUsers();
    } catch (err) {
      setStaffError(err.response?.data?.message || "Failed to create staff account.");
    } finally {
      setStaffSubmitLoading(false);
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await api.patch(`/users/${userId}/status`, { status: newStatus });
      showToast(`Account marked as ${newStatus}`);
      fetchUsers();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update status.", "error");
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError("New passwords do not match.");
      return;
    }
    if (passwordForm.new_password.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }

    setPasswordLoading(true);
    setPasswordError("");
    try {
      await api.put("/users/change-password", {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });
      setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
      showToast("Password updated securely.");
    } catch (err) {
      setPasswordError(err.response?.data?.message || "Failed to change password.");
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div>
      {/* Toast */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 text-white ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="mb-7">
        <h3 className="text-lg font-semibold text-slate-900">Settings</h3>
        <p className="text-sm text-slate-500">Manage your system preferences and account security.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Navigation Sidebar */}
        <div className="w-full lg:w-64 flex-shrink-0">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
            <button onClick={() => setActiveTab("system")} className={`flex items-center gap-3 px-5 py-4 text-sm font-medium text-left transition ${activeTab === 'system' ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600' : 'text-slate-600 hover:bg-slate-50 border-l-4 border-transparent'}`}>
              <Server size={18} /> System Information
            </button>
            <button onClick={() => setActiveTab("security")} className={`flex items-center gap-3 px-5 py-4 text-sm font-medium text-left transition ${activeTab === 'security' ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600' : 'text-slate-600 hover:bg-slate-50 border-l-4 border-transparent'}`}>
              <Shield size={18} /> Security
            </button>
            <button onClick={() => setActiveTab("staff")} className={`flex items-center gap-3 px-5 py-4 text-sm font-medium text-left transition ${activeTab === 'staff' ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600' : 'text-slate-600 hover:bg-slate-50 border-l-4 border-transparent'}`}>
              <Users size={18} /> Staff Management
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 space-y-6">

          {/* SYSTEM INFORMATION */}
          {activeTab === "system" && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Database size={18} className="text-blue-500"/> System & Database Information
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Database Connection</p>
                    <p className="text-xs text-slate-500">TiDB Cloud MySQL Cluster</p>
                  </div>
                  {dbStatus === "checking" ? (
                    <span className="text-xs font-bold text-slate-500 flex items-center gap-2"><Loader2 size={14} className="animate-spin"/> Checking...</span>
                  ) : dbStatus === "connected" ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> Connected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 text-xs font-bold rounded-full border border-red-200">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div> Offline
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border border-slate-100 rounded-lg bg-slate-50">
                    <p className="text-xs text-slate-500 mb-1">Role Authorization</p>
                    <p className="font-medium text-slate-900">Administrator (ADMIN)</p>
                  </div>
                  <div className="p-4 border border-slate-100 rounded-lg bg-slate-50">
                    <p className="text-xs text-slate-500 mb-1">System Version</p>
                    <p className="font-medium text-slate-900">v1.0.0</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECURITY */}
          {activeTab === "security" && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Lock size={18} className="text-blue-500"/> Account Security
                </h3>
              </div>
              <div className="p-6">
                <form onSubmit={handlePasswordSubmit} className="max-w-md space-y-4">
                  {passwordError && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{passwordError}</div>}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
                    <input type="password" required value={passwordForm.current_password} onChange={e => setPasswordForm({...passwordForm, current_password: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                    <input type="password" required value={passwordForm.new_password} onChange={e => setPasswordForm({...passwordForm, new_password: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                    <input type="password" required value={passwordForm.confirm_password} onChange={e => setPasswordForm({...passwordForm, confirm_password: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <button type="submit" disabled={passwordLoading} className="flex items-center gap-2 px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-70">
                    {passwordLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Update Password
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* STAFF MANAGEMENT */}
          {activeTab === "staff" && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <Users size={18} className="text-blue-500"/> Staff Directory
                  </h3>
                </div>
                <button onClick={() => setIsAddStaffOpen(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
                  <UserPlus size={16} /> Add Staff
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-5 py-4 font-medium">Username</th>
                      <th className="px-5 py-4 font-medium">Email</th>
                      <th className="px-5 py-4 font-medium">Role</th>
                      <th className="px-5 py-4 font-medium">Status</th>
                      <th className="px-5 py-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {usersLoading ? (
                      <tr><td colSpan="5" className="px-5 py-10 text-center"><Loader2 size={24} className="animate-spin mx-auto text-blue-500"/></td></tr>
                    ) : users.map(user => (
                      <tr key={user.user_id} className="hover:bg-slate-50">
                        <td className="px-5 py-4 font-medium text-slate-900">{user.username}</td>
                        <td className="px-5 py-4 text-slate-600">{user.email}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex px-2 py-1 rounded-md text-xs font-bold ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}`}>{user.role}</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${user.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{user.status}</span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button onClick={() => handleToggleStatus(user.user_id, user.status)} className={`text-xs font-medium px-3 py-1 rounded-md border ${user.status === "ACTIVE" ? "text-red-600 border-red-200 hover:bg-red-50" : "text-emerald-600 border-emerald-200 hover:bg-emerald-50"}`}>
                            {user.status === "ACTIVE" ? "Deactivate" : "Activate"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Add Staff Modal */}
      {isAddStaffOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-900">Create Staff Account</h3>
              <button onClick={() => setIsAddStaffOpen(false)} disabled={staffSubmitLoading} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateStaff} className="p-6">
              {staffError && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{staffError}</div>}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                  <input type="text" required value={staffForm.username} onChange={e => setStaffForm({...staffForm, username: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input type="email" required value={staffForm.email} onChange={e => setStaffForm({...staffForm, email: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Temporary Password</label>
                  <input type="password" required minLength="6" value={staffForm.password} onChange={e => setStaffForm({...staffForm, password: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                  <select value={staffForm.role} onChange={e => setStaffForm({...staffForm, role: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="STAFF">Staff (Limited Access)</option>
                    <option value="ADMIN">Admin (Full Access)</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsAddStaffOpen(false)} disabled={staffSubmitLoading} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-lg">Cancel</button>
                <button type="submit" disabled={staffSubmitLoading} className="flex items-center gap-2 px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-70">
                  {staffSubmitLoading ? <Loader2 size={16} className="animate-spin" /> : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}