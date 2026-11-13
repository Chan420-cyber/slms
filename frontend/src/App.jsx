import { useEffect, useState } from "react";
import api from "./services/api";

import {
  LayoutDashboard, Users, CreditCard, Armchair, CalendarCheck,
  Wallet, BarChart3, Settings, Bell, Search, Menu, Clock, CheckCircle2
} from "lucide-react";

const navigation = [
  { name: "Dashboard", icon: LayoutDashboard },
  { name: "Members", icon: Users },
  { name: "Memberships", icon: CreditCard },
  { name: "Seats & Zones", icon: Armchair },
  { name: "Attendance", icon: CalendarCheck },
  { name: "Payments", icon: Wallet },
  { name: "Reports", icon: BarChart3 },
  { name: "Settings", icon: Settings }
];

function App() {
  const [dashboard, setDashboard] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch both endpoints at the same time for speed
        const [dashboardResponse, activityResponse] = await Promise.all([
          api.get("/dashboard/overview"),
          api.get("/dashboard/activity")
        ]);

        setDashboard(dashboardResponse.data.dashboard);
        setActivities(activityResponse.data.activities);

      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        
        setError("Could not connect to backend. Showing sample data.");
      } finally {
        setLoading(false);
        setActivityLoading(false);
      }
    };

    fetchData();
  }, []);

  const stats = [
    {
      title: "Total Members",
      value: dashboard?.members?.total ?? 0,
      change: "Registered members",
      icon: Users,
      color: "bg-blue-100 text-blue-600"
    },
    {
      title: "Active Memberships",
      value: dashboard?.memberships?.active ?? 0,
      change: "Currently active",
      icon: CreditCard,
      color: "bg-emerald-100 text-emerald-600"
    },
    {
      title: "Today's Check-ins",
      value: dashboard?.attendance?.today_check_ins ?? 0,
      change: "Today's attendance",
      icon: CalendarCheck,
      color: "bg-violet-100 text-violet-600"
    },
    {
      title: "Available Seats",
      value: dashboard?.seats?.available ?? 0,
      change: `${dashboard?.seats?.occupied ?? 0} currently occupied`,
      icon: Armchair,
      color: "bg-orange-100 text-orange-600"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 bg-slate-950 text-white flex-col fixed inset-y-0 left-0">
        <div className="px-6 py-7 border-b border-slate-800">
          <h1 className="text-xl font-bold tracking-tight">
            Study<span className="text-blue-400">Space</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">Lounge Management System</p>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          <p className="text-xs text-slate-500 uppercase tracking-wider px-3 mb-4">Main Menu</p>
          {navigation.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={item.name}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition ${
                  index === 0 ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon size={19} />
                {item.name}
              </button>
            );
          })}
        </nav>

        <div className="p-5 border-t border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-semibold">A</div>
            <div>
              <p className="text-sm font-medium">Administrator</p>
              <p className="text-xs text-slate-400">Admin account</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64">
        <header className="bg-white border-b border-slate-200 px-5 md:px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-slate-600"><Menu size={23} /></button>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Dashboard</h2>
              <p className="text-sm text-slate-500 mt-1">Welcome back, Administrator</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-500">
              <Search size={17} /> Search
            </button>
            <button className="relative text-slate-600">
              <Bell size={21} />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold">A</div>
          </div>
        </header>

        {loading && <p className="p-6 text-slate-500">Loading dashboard data...</p>}

        {error && (
          <p className="mx-6 my-4 p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">
            {error}
          </p>
        )}

        <div className="p-5 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-7">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Overview</h3>
              <p className="text-sm text-slate-500">Here's what's happening at your study lounge today.</p>
            </div>
            <div className="text-sm text-slate-500 bg-white border border-slate-200 rounded-lg px-4 py-2">
              <Clock size={15} className="inline mr-2" /> Today's Overview
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.title} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-5">
                    <p className="text-sm text-slate-500">{stat.title}</p>
                    <div className={`p-2.5 rounded-lg ${stat.color}`}><Icon size={20} /></div>
                  </div>
                  <h3 className="text-3xl font-bold text-slate-900">{stat.value}</h3>
                  <p className="text-xs text-slate-500 mt-2">{stat.change}</p>
                </div>
              );
            })}
          </div>

          {/* Finance Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-sm text-slate-500">Today's Revenue</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-3">
                ₹{Number(dashboard?.finances?.today_revenue ?? 0).toLocaleString("en-IN")}
              </h3>
              <p className="text-xs text-emerald-600 mt-2">Successful payments</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-sm text-slate-500">Today's Expenses</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-3">
                ₹{Number(dashboard?.finances?.today_expenses ?? 0).toLocaleString("en-IN")}
              </h3>
              <p className="text-xs text-slate-500 mt-2">Recorded expenses</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-sm text-slate-500">Net Income Today</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-3">
                ₹{Number(dashboard?.finances?.today_net_income ?? 0).toLocaleString("en-IN")}
              </h3>
              <p className="text-xs text-slate-500 mt-2">Revenue minus expenses</p>
            </div>
          </div>

          {/* Recent Activity Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h3 className="font-semibold text-slate-900">Recent Activity</h3>
                <p className="text-xs text-slate-500 mt-1">Latest activity at your lounge</p>
              </div>
              <button className="text-sm text-blue-600 font-medium">View all</button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-medium">Member</th>
                    <th className="px-5 py-4 font-medium">Activity</th>
                    <th className="px-5 py-4 font-medium">Time</th>
                    <th className="px-5 py-4 font-medium">Status</th>
                  </tr>
                </thead>
                {/* ✅ YOUR NEW TABLE BODY IS INSERTED HERE */}
                <tbody className="divide-y divide-slate-100">
                  {activityLoading ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-slate-500">
                        Loading recent activity...
                      </td>
                    </tr>
                  ) : activities.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-slate-500">
                        No recent activity found.
                      </td>
                    </tr>
                  ) : (
                    activities.map((item, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {item.member}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {item.activity}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {new Date(item.activity_time).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                            <CheckCircle2 size={13} /> {item.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 mt-8">
            StudySpace Management System © 2026
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;