import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard, Users, CreditCard, Armchair, CalendarCheck,
  Wallet, BarChart3, Settings, Bell, Search, Menu
} from "lucide-react";

const navigation = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "Members", path: "/members", icon: Users },
  { name: "Memberships", path: "/memberships", icon: CreditCard },
  { name: "Seats & Zones", path: "/seats", icon: Armchair },
  { name: "Attendance", path: "/attendance", icon: CalendarCheck },
  { name: "Payments", path: "/payments", icon: Wallet },
  { name: "Reports", path: "/reports", icon: BarChart3 },
  { name: "Settings", path: "/settings", icon: Settings }
];

export default function MainLayout() {
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
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) =>
                  `w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition ${
                    isActive 
                      ? "bg-blue-600 text-white" 
                      : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`
                }
              >
                <Icon size={19} />
                {item.name}
              </NavLink>
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

      {/* Main Content Area */}
      <main className="flex-1 lg:ml-64">
        <header className="bg-white border-b border-slate-200 px-5 md:px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-slate-600"><Menu size={23} /></button>
            <h2 className="text-xl font-bold text-slate-900">Admin Portal</h2>
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

        {/* This is where the Dashboard or Members page will load */}
        <Outlet /> 
      </main>
    </div>
  );
}