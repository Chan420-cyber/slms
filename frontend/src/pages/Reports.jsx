import { useEffect, useState, useMemo } from "react";
import api from "../services/api";
import { 
  RefreshCw, Loader2, IndianRupee, TrendingUp, TrendingDown, 
  Calendar 
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from "recharts";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Data State
  const [financials, setFinancials] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [expensesData, setExpensesData] = useState([]);
  
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const fetchReports = async () => {
    setLoading(true);
    setError("");
    try {
      const [finRes, monthlyRes, methodsRes, expensesRes] = await Promise.all([
        // FIXED: Changed from "/reports/financial" to "/reports/financial-overview"
        api.get("/reports/financial-overview"),
        api.get(`/reports/monthly?year=${selectedYear}`),
        api.get("/reports/payment-methods"),
        // FIXED: Changed from "/reports/expenses" to "/reports/expense-categories"
        api.get("/reports/expense-categories")
      ]);

      setFinancials(finRes.data.financial_summary);
      setMonthlyData(monthlyRes.data.monthly_report);
      setPaymentMethods(methodsRes.data.payment_method_report);
      setExpensesData(expensesRes.data.expense_category_report);
    } catch (err) {
      console.error(err);
      setError("Failed to load reports. Check your backend routes or permissions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [selectedYear]);

  // Format monthly data for Recharts (Months: Jan, Feb, etc.)
  const formattedMonthlyData = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return monthlyData.map(item => ({
      ...item,
      name: monthNames[item.month - 1]
    }));
  }, [monthlyData]);

  // Format Payment Methods for Pie Chart
  const formattedPaymentMethods = useMemo(() => {
    return paymentMethods
      .filter(pm => Number(pm.successful_amount) > 0)
      .map(pm => ({
        name: pm.payment_method.replace("_", " "),
        value: Number(pm.successful_amount)
      }));
  }, [paymentMethods]);

  if (loading) return <div className="p-10 text-center text-slate-500"><Loader2 className="animate-spin mx-auto mb-2 text-blue-500" size={32} /> Generating Reports...</div>;
  if (error) return <div className="p-6 bg-red-50 text-red-600 rounded-lg border border-red-200">{error}</div>;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Reports & Analytics</h3>
          <p className="text-sm text-slate-500">Financial health and operational insights.</p>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[currentYear, currentYear - 1, currentYear - 2].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button onClick={fetchReports} className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* 1. Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm text-slate-500 font-medium">Net Revenue</p>
            <TrendingUp className="text-emerald-500" size={20} />
          </div>
          <h3 className="text-2xl font-bold text-slate-900">₹{Number(financials?.net_revenue || 0).toLocaleString("en-IN")}</h3>
          <p className="text-xs text-emerald-600 mt-1">After refunds</p>
        </div>
        
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm text-slate-500 font-medium">Total Expenses</p>
            <TrendingDown className="text-red-500" size={20} />
          </div>
          <h3 className="text-2xl font-bold text-slate-900">₹{Number(financials?.total_expenses || 0).toLocaleString("en-IN")}</h3>
          <p className="text-xs text-slate-500 mt-1">Operational costs</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm text-slate-500 font-medium">Net Income</p>
            <IndianRupee className="text-blue-500" size={20} />
          </div>
          <h3 className={`text-2xl font-bold ${Number(financials?.net_income) < 0 ? "text-red-600" : "text-emerald-600"}`}>
            ₹{Number(financials?.net_income || 0).toLocaleString("en-IN")}
          </h3>
          <p className="text-xs text-slate-500 mt-1">Revenue minus expenses</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm text-slate-500 font-medium">Pending Payments</p>
            <Calendar className="text-amber-500" size={20} />
          </div>
          <h3 className="text-2xl font-bold text-slate-900">₹{Number(financials?.total_pending_payments || 0).toLocaleString("en-IN")}</h3>
          <p className="text-xs text-slate-500 mt-1">Awaiting clearance</p>
        </div>
      </div>

      {/* 2. Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Monthly Revenue vs Expenses Bar Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="mb-6">
            <h3 className="font-semibold text-slate-900">Monthly Trend ({selectedYear})</h3>
            <p className="text-xs text-slate-500">Revenue vs Expenses over the year</p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={formattedMonthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(value) => `₹${value}`} />
                <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value) => `₹${Number(value).toLocaleString("en-IN")}`} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="net_revenue" name="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="total_expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods Pie Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="mb-6">
            <h3 className="font-semibold text-slate-900">Payment Methods</h3>
            <p className="text-xs text-slate-500">Distribution of successful payments</p>
          </div>
          <div className="h-72">
            {formattedPaymentMethods.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">No payment data yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={formattedPaymentMethods}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {formattedPaymentMethods.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value) => `₹${Number(value).toLocaleString("en-IN")}`} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* 3. Expense Breakdown Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Expenses by Category</h3>
          <p className="text-xs text-slate-500 mt-1">Where your money is being spent</p>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-5 py-4 font-medium">Category</th>
              <th className="px-5 py-4 font-medium">Total Transactions</th>
              <th className="px-5 py-4 font-medium">Total Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {expensesData.length === 0 ? (
              <tr><td colSpan="3" className="px-5 py-8 text-center text-slate-500">No expenses recorded.</td></tr>
            ) : (
              expensesData.map((exp, index) => (
                <tr key={index} className="hover:bg-slate-50">
                  <td className="px-5 py-4 font-medium text-slate-900 capitalize">{exp.category}</td>
                  <td className="px-5 py-4 text-slate-600">{exp.expense_count}</td>
                  <td className="px-5 py-4 font-bold text-red-600">₹{Number(exp.total_amount).toLocaleString("en-IN")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}