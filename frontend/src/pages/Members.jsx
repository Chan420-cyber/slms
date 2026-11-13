
import { useEffect, useMemo, useState } from "react";
import { Search, Users, RefreshCw } from "lucide-react";
import api from "../services/api";

function Members() {
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/members");

      const data = response.data;

      // Support common API response formats
      const memberList = Array.isArray(data)
        ? data
        : data.members || data.data || [];

      setMembers(memberList);
    } catch (err) {
      console.error("Members loading error:", err);
      setError(
        err.response?.data?.message || "Unable to load members."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const filteredMembers = useMemo(() => {
    const query = search.toLowerCase().trim();

    if (!query) return members;

    return members.filter((member) =>
      [
        member.full_name,
        member.member_code,
        member.email,
        member.phone
      ].some((value) =>
        String(value || "").toLowerCase().includes(query)
      )
    );
  }, [members, search]);

  return (
    <div className="p-5 md:p-8">
      {/* Page heading */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Members
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage your study lounge members.
          </p>
        </div>

        <button
          onClick={fetchMembers}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Member summary */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
            <Users size={23} />
          </div>

          <div>
            <p className="text-sm text-slate-500">
              Total Members
            </p>
            <h3 className="text-2xl font-bold text-slate-900">
              {members.length}
            </h3>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, member code, email or phone..."
            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
      </div>

      {/* Members table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">
            All Members
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {filteredMembers.length} member(s) found
          </p>
        </div>

        {loading ? (
          <p className="p-8 text-center text-slate-500">
            Loading members...
          </p>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-600 mb-3">{error}</p>
            <button
              onClick={fetchMembers}
              className="text-blue-600 text-sm font-medium"
            >
              Try again
            </button>
          </div>
        ) : filteredMembers.length === 0 ? (
          <p className="p-8 text-center text-slate-500">
            No members found.
          </p>
        ) : (
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
                {filteredMembers.map((member) => (
                  <tr key={member.member_id}>
                    <td className="px-5 py-4 font-medium text-slate-900">
                      {member.full_name}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {member.member_code}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {member.email || "—"}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {member.phone || "—"}
                    </td>

                    <td className="px-5 py-4">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        {member.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Members;
