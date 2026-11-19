import { useState } from "react";
import api from "../services/api";
import { Lock, Mail, Loader2, ArrowRight, ShieldCheck } from "lucide-react";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Adjust this if your backend route is /auth/login or /users/login
      const response = await api.post("/auth/login", { email, password });
      
      // Assuming your backend returns { token, user: { role, username } }
      const { token, user } = response.data;

      // Save to localStorage
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user)); // Optional, for UI display

      // Call the parent function to switch to the Dashboard
      onLogin();
      
    } catch (err) {
      setError(err.response?.data?.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left Side - Branding (Hidden on mobile) */}
      <div className="hidden lg:flex w-1/2 bg-slate-950 flex-col justify-center p-12 relative overflow-hidden">
        {/* Decorative Background */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-72 h-72 bg-emerald-500 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative z-10 max-w-lg">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-blue-500/30">
            <ShieldCheck size={32} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
            Manage your StudySpace with absolute clarity.
          </h1>
          <p className="text-slate-400 text-lg mb-8">
            The all-in-one platform for tracking memberships, seat allocations, payments, and daily attendance.
          </p>
          <div className="flex items-center gap-3 text-slate-300 text-sm font-medium">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full bg-blue-500 border-2 border-slate-950 flex items-center justify-center text-xs">A</div>
              <div className="w-8 h-8 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center text-xs">B</div>
              <div className="w-8 h-8 rounded-full bg-purple-500 border-2 border-slate-950 flex items-center justify-center text-xs">C</div>
            </div>
            <p>Trusted by admins and staff.</p>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-10">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Study<span className="text-blue-600">Space</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">Lounge Management System</p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
            <p className="text-sm text-slate-500 mt-2">Please sign in to your admin account.</p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center gap-2">
              <Lock size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="email" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@studyspace.com" 
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-sm font-medium text-slate-700">Password</label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-70 disabled:cursor-not-allowed mt-2 shadow-sm"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>Sign In <ArrowRight size={18} /></>
              )}
            </button>
          </form>

          <div className="mb-8">
            <p className="text-sm text-slate-500 mt-2">Email: admin@studylounge.com</p>
            <p className="text-sm text-slate-500">Password: admin1234</p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
            <p className="text-sm text-slate-500 mt-2">Please sign in to your admin account.</p>
          </div>

          <p className="text-center text-xs text-slate-400 mt-10">
            StudySpace Management System &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}