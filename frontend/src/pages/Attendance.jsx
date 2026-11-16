import { useEffect, useState, useMemo } from "react";
import api from "../services/api";
import { 
  Search, RefreshCw, LogIn, LogOut, Clock, CheckCircle2, 
  AlertCircle, Loader2, User
} from "lucide-react";

export default function Attendance() {
  const [attendanceData, setAttendanceData] = useState([]);
  const [members, setMembers] = useState([]);
  const [summary, setSummary] = useState({ total_check_ins: 0, currently_inside: 0, checked_out: 0 });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  // 1. Fetch Data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [attendanceRes, summaryRes, membersRes] = await Promise.all([
        api.get("/attendance"),
        api.get("/attendance/today"),
        api.get("/members?limit=500") // Fetch all members for search dropdown
      ]);

      setAttendanceData(attendanceRes.data.attendance);
      setSummary(summaryRes.data.summary);
      setMembers(membersRes.data.members);
    } catch (err) {
      setError("Failed to load attendance data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
  };

  // 2. Derived State
  const activeSessions = useMemo(() => {
    return attendanceData.filter(a => a.status === "CHECKED_IN");
  }, [attendanceData]);

  const historySessions = useMemo(() => {
    return attendanceData.filter(a => a.status === "CHECKED_OUT");
  }, [attendanceData]);

  // Search filtered members for Quick Check-in
  const searchedMembers = useMemo(() => {
    if (!search.trim()) return [];
    return members.filter(m => 
      m.full_name.toLowerCase().includes(search.toLowerCase()) || 
      m.member_code.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 5); // Limit to 5 results
  }, [search, members]);

  // 3. Actions
  const handleCheckIn = async (memberId) => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      await api.post("/attendance/check-in", { member_id: memberId });
      showToast("Member checked in successfully!");
      setSearch("");
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to check in member.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async (attendanceId) => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      await api.patch(`/attendance/${attendanceId}/check-out`);
      showToast("Member checked out successfully!");
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to check out member.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Format time helper
  const formatTime = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDuration = (minutes) => {
    if (!minutes && minutes !== 0) return "—";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
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
          <h3 className="text-lg font-semibold text-slate-900">Attendance</h3>
          <p className="text-sm text-slate-500">Track who is currently inside the lounge.</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {error && <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg border border-red-200 text-sm">{error}</div>}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Total Check-ins Today</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">{summary?.total_check_ins || 0}</h3>
        </div>
        <div className="bg-white border border-emerald-200 rounded-xl p-5 shadow-sm bg-emerald-50/30">
          <p className="text-sm text-emerald-600 font-medium">Currently Inside</p>
          <h3 className="text-2xl font-bold text-emerald-700 mt-1">{summary?.currently_inside || 0}</h3>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Checked Out</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">{summary?.checked_out || 0}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Quick Check-In & Active Sessions */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Quick Check-In Card */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <LogIn size={18} className="text-blue-600" /> Quick Check-In
              </h3>
            </div>
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Search member name or code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              {/* Search Results Dropdown */}
              {search.trim() && (
                <div className="mt-3 border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
                  {searchedMembers.length === 0 ? (
                    <div className="p-3 text-sm text-slate-500 text-center">No members found.</div>
                  ) : (
                    searchedMembers.map(member => {
                      const isAlreadyInside = activeSessions.some(a => a.member_id === member.member_id);
                      return (
                        <div key={member.member_id} className="p-3 bg-white hover:bg-slate-50 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-slate-900 text-sm">{member.full_name}</p>
                            <p className="text-xs text-slate-500 font-mono">{member.member_code}</p>
                          </div>
                          <button
                            onClick={() => handleCheckIn(member.member_id)}
                            disabled={isAlreadyInside || actionLoading}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                              isAlreadyInside 
                                ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                                : "bg-blue-600 text-white hover:bg-blue-700"
                            }`}
                          >
                            {isAlreadyInside ? "Inside" : "Check In"}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Active Sessions Card */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Clock size={18} className="text-emerald-600" /> Active Sessions
              </h3>
              <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {activeSessions.length} Inside
              </span>
            </div>
            <div className="p-4 max-h-[400px] overflow-y-auto space-y-3">
              {activeSessions.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No members currently inside.</p>
              ) : (
                activeSessions.map(session => (
                  <div key={session.attendance_id} className="flex items-center justify-between p-3 bg-emerald-50/50 border border-emerald-100 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{session.full_name}</p>
                      <p className="text-xs text-slate-500">In: {formatTime(session.check_in)} | Seat: {session.seat_number || "None"}</p>
                    </div>
                    <button
                      onClick={() => handleCheckOut(session.attendance_id)}
                      disabled={actionLoading}
                      className="p-2 bg-white border border-red-200 text-red-600 rounded-md hover:bg-red-50 transition"
                      title="Check Out"
                    >
                      <LogOut size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Today's History Table */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden h-full flex flex-col">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-semibold text-slate-900">Today's History</h3>
              <p className="text-xs text-slate-500 mt-1">All check-ins and check-outs for today.</p>
            </div>
            
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Member</th>
                    <th className="px-5 py-3 font-medium">Seat</th>
                    <th className="px-5 py-3 font-medium">Check In</th>
                    <th className="px-5 py-3 font-medium">Check Out</th>
                    <th className="px-5 py-3 font-medium">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan="5" className="px-5 py-10 text-center text-slate-500"><Loader2 className="animate-spin mx-auto mb-2 text-blue-500" size={24} /> Loading...</td></tr>
                  ) : historySessions.length === 0 && activeSessions.length === 0 ? (
                    <tr><td colSpan="5" className="px-5 py-10 text-center text-slate-500">No attendance records for today.</td></tr>
                  ) : (
                    // Combine active and history for the full log
                    attendanceData.map(record => (
                      <tr key={record.attendance_id} className="hover:bg-slate-50">
                        <td className="px-5 py-4">
                          <p className="font-medium text-slate-900">{record.full_name}</p>
                          <p className="text-xs text-slate-400">ID: {record.member_id}</p>
                        </td>
                        <td className="px-5 py-4 text-slate-600">{record.seat_number || "—"}</td>
                        <td className="px-5 py-4 text-slate-600">{formatTime(record.check_in)}</td>
                        <td className="px-5 py-4 text-slate-600">
                          {record.status === "CHECKED_IN" ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> Inside
                            </span>
                          ) : (
                            formatTime(record.check_out)
                          )}
                        </td>
                        <td className="px-5 py-4 text-slate-600 font-medium">
                          {formatDuration(record.duration_minutes)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}