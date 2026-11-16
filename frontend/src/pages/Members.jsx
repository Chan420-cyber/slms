import { useEffect, useState } from "react";
import api from "../services/api";
import { Search, RefreshCw, UserPlus, X, Loader2 } from "lucide-react";

export default function Members() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    address: "",
    emergency_contact: ""
  });

  const fetchMembers = async (searchQuery = "") => {
    setLoading(true);
    try {
      const res = await api.get(`/members?search=${searchQuery}`);
      setMembers(res.data.members);
      setError("");
    } catch (err) {
      console.error("Failed to fetch members", err);
      setError("Failed to load members. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchMembers();
  }, []);

  // Handle Add Member Submit
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (submitLoading) return; // Prevent duplicate submissions

    // Basic Validation
    if (!formData.full_name.trim() || !formData.phone.trim()) {
      setSubmitError("Full name and phone number are required.");
      return;
    }

    // Simple email format check (optional field, but if provided, must be valid)
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setSubmitError("Please enter a valid email address.");
      return;
    }

    // Simple phone format check
    if (!/^[0-9+\-\s()]{7,15}$/.test(formData.phone)) {
      setSubmitError("Please enter a valid phone number.");
      return;
    }

    setSubmitLoading(true);
    setSubmitError("");

    try {
      // Exact payload matching your backend controller
      await api.post("/members", {
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || null,
        address: formData.address.trim() || null,
        emergency_contact: formData.emergency_contact.trim() || null
      });

      // Success: close modal, reset form, and refresh list
      setIsModalOpen(false);
      setFormData({ full_name: "", email: "", phone: "", address: "", emergency_contact: "" });
      fetchMembers(); 
      
    } catch (err) {
      console.error("Add member error", err);
      setSubmitError(err.response?.data?.message || "Failed to register member. Please try again.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const closeModal = () => {
    if (!submitLoading) {
      setIsModalOpen(false);
      setSubmitError("");
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Members</h3>
          <p className="text-sm text-slate-500">Manage your study lounge members.</p>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => fetchMembers()}
            className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition shadow-sm"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 transition shadow-sm"
          >
            <UserPlus size={16} /> Add Member
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg border border-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Total Members Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 shadow-sm flex items-center gap-4">
        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
          <UserPlus size={24} />
        </div>
        <div>
          <p className="text-sm text-slate-500 font-medium">Total Members</p>
          <h3 className="text-2xl font-bold text-slate-900">{members.length}</h3>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search name, member code, email or phone..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            onChange={(e) => fetchMembers(e.target.value)}
          />
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-semibold text-slate-900">All Members</h3>
          <p className="text-xs text-slate-500 mt-1">{members.length} member(s) found</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-4 font-medium">Member</th>
                <th className="px-5 py-4 font-medium">Member Code</th>
                <th className="px-5 py-4 font-medium">Email</th>
                <th className="px-5 py-4 font-medium">Phone</th>
                <th className="px-5 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-5 py-12 text-center text-slate-500">
                    <Loader2 size={24} className="animate-spin mx-auto mb-2 text-blue-500" />
                    Loading members...
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-5 py-12 text-center text-slate-500">
                    No members found.
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.member_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4 font-medium text-slate-900">{member.full_name}</td>
                    <td className="px-5 py-4 text-slate-500 font-mono text-xs">{member.member_code}</td>
                    <td className="px-5 py-4 text-slate-500">{member.email || "-"}</td>
                    <td className="px-5 py-4 text-slate-500">{member.phone}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        member.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : 
                        member.status === "SUSPENDED" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-700"
                      }`}>
                        {member.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Member Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Add New Member</h3>
              <button 
                onClick={closeModal} 
                disabled={submitLoading}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleAddMember} className="p-6">
              {submitError && (
                <div className="mb-5 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
                  {submitError}
                </div>
              )}

              <div className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    name="full_name"
                    value={formData.full_name} 
                    onChange={handleInputChange}
                    placeholder="e.g. John Doe"
                    className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    name="phone"
                    value={formData.phone} 
                    onChange={handleInputChange}
                    placeholder="e.g. 9876543210"
                    className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Email Address
                  </label>
                  <input 
                    type="email" 
                    name="email"
                    value={formData.email} 
                    onChange={handleInputChange}
                    placeholder="e.g. john@example.com"
                    className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Address
                  </label>
                  <input 
                    type="text" 
                    name="address"
                    value={formData.address} 
                    onChange={handleInputChange}
                    placeholder="Street address"
                    className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  />
                </div>

                {/* Emergency Contact */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Emergency Contact
                  </label>
                  <input 
                    type="text" 
                    name="emergency_contact"
                    value={formData.emergency_contact} 
                    onChange={handleInputChange}
                    placeholder="Name and phone number"
                    className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button 
                  type="button" 
                  onClick={closeModal}
                  disabled={submitLoading}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-lg transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitLoading}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                >
                  {submitLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Member"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}