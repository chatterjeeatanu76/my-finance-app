import React, { useMemo, useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  Plus, Wallet, TrendingUp, TrendingDown, PieChart,
  Home, BarChart3, User, X, Trash2, Loader2, AlertCircle, CheckCircle, Bell, BellOff
} from 'lucide-react'
import {
  PieChart as RePieChart, Pie, Cell, ResponsiveContainer,
  Tooltip, LineChart, Line, CartesianGrid, XAxis,
} from 'recharts'

const supabase = createClient(
  'https://soubaetsvxxuubnruuyd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvdWJhZXRzdnh4dXVibnJ1dXlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzQ1NzAsImV4cCI6MjA5NTAxMDU3MH0.oB4XXGrYzZPoyoT6ioxJh5KKz8ULnSyum2SvmpjzdJk'
)

const BUDGET_LIMIT = 15000

export default function FinanceApp() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [showBudgetAlert, setShowBudgetAlert] = useState(false)
  const [budgetDismissed, setBudgetDismissed] = useState(false)
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState('expense')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [category, setCategory] = useState('Food')
  const [reportView, setReportView] = useState('table')
  const [activePage, setActivePage] = useState('home')
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [profileData, setProfileData] = useState({
    name: 'Atanu Chatterjee',
    role: 'UI/UX Designer & Product Designer',
    email: 'atanu@example.com',
    mobile: '+91 98765 43210',
    location: 'Hyderabad, India',
    company: 'Freelance Designer',
  })

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    fetchTransactions()
  }, [])

  // Current month expenses
  const currentMonthExpense = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    return transactions
      .filter(t => {
        const d = new Date(t.date)
        return t.type === 'expense' && d.getMonth() === currentMonth && d.getFullYear() === currentYear
      })
      .reduce((s, t) => s + Number(t.amount), 0)
  }, [transactions])

  // Show/hide budget alert
  useEffect(() => {
    if (currentMonthExpense > BUDGET_LIMIT && !budgetDismissed) {
      setShowBudgetAlert(true)
    } else {
      setShowBudgetAlert(false)
    }
  }, [currentMonthExpense, budgetDismissed])

  // Reset dismissed state on new month
  useEffect(() => {
    const lastDismissed = localStorage.getItem('budgetDismissedMonth')
    const currentMonth = new Date().toISOString().slice(0, 7)
    if (lastDismissed !== currentMonth) {
      setBudgetDismissed(false)
      localStorage.removeItem('budgetDismissedMonth')
    }
  }, [])

  const dismissBudgetAlert = () => {
    setBudgetDismissed(true)
    setShowBudgetAlert(false)
    const currentMonth = new Date().toISOString().slice(0, 7)
    localStorage.setItem('budgetDismissedMonth', currentMonth)
  }

  const budgetUsedPercent = Math.min((currentMonthExpense / BUDGET_LIMIT) * 100, 100)
  const budgetRemaining = BUDGET_LIMIT - currentMonthExpense

  const fetchTransactions = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setTransactions(data || [])
    } catch (error) {
      showToast('error', 'Failed to load: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const addTransaction = async () => {
    if (!amount || !date) {
      showToast('error', 'Please fill in all fields')
      return
    }
    setSaving(true)
    try {
      const newTransaction = { title: category, amount: Number(amount), type, category, date }
      const { data, error } = await supabase.from('transactions').insert([newTransaction]).select()
      if (error) throw error
      setTransactions(prev => [data[0], ...prev])
      setAmount(''); setDate(new Date().toISOString().split('T')[0]); setCategory('Food')
      showToast('success', 'Transaction saved!')
      // Reset dismissed if new expense might trigger alert
      if (type === 'expense') setBudgetDismissed(false)
    } catch (error) {
      showToast('error', 'Failed to save: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const deleteTransaction = async (id) => {
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id)
      if (error) throw error
      setTransactions(prev => prev.filter(t => t.id !== id))
      showToast('success', 'Transaction deleted!')
    } catch (error) {
      showToast('error', 'Failed to delete: ' + error.message)
    }
  }

  const totalIncome = useMemo(() => transactions.filter(i => i.type === 'income').reduce((s, i) => s + Number(i.amount), 0), [transactions])
  const totalExpense = useMemo(() => transactions.filter(i => i.type === 'expense').reduce((s, i) => s + Number(i.amount), 0), [transactions])
  const balance = totalIncome - totalExpense
  const expensePercentage = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0
  const incomePercentage = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0
  const chartData = [{ name: 'Income', value: totalIncome }, { name: 'Expense', value: totalExpense }]
  const monthlyData = transactions.map(i => ({ name: i.title, amount: Number(i.amount), type: i.type }))
  const COLORS = ['#22c55e', '#ef4444']

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-zinc-900 text-white p-4 md:p-10">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border transition-all duration-300 ${
          toast.type === 'success' ? 'bg-green-950 border-green-700 text-green-300' : 'bg-red-950 border-red-700 text-red-300'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Budget Alert Banner */}
      {showBudgetAlert && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-lg px-4">
          <div className="bg-red-950 border border-red-500 rounded-2xl p-5 shadow-[0_0_40px_rgba(239,68,68,0.3)]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="bg-red-500 rounded-xl p-2 mt-0.5">
                  <Bell size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="text-red-300 font-bold text-base">⚠️ Monthly Budget Exceeded!</h3>
                  <p className="text-red-400 text-sm mt-1">
                    You've spent <span className="text-white font-bold">₹ {currentMonthExpense.toLocaleString()}</span> this month,
                    which is <span className="text-white font-bold">₹ {Math.abs(budgetRemaining).toLocaleString()}</span> over your ₹15,000 budget.
                  </p>
                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-red-400 mb-1">
                      <span>₹ 0</span>
                      <span>Budget: ₹ {BUDGET_LIMIT.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-red-900 rounded-full h-2">
                      <div
                        className="bg-red-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${budgetUsedPercent}%` }}
                      />
                    </div>
                    <p className="text-xs text-red-400 mt-1">{budgetUsedPercent.toFixed(0)}% of budget used</p>
                  </div>
                </div>
              </div>
              <button onClick={dismissBudgetAlert} className="text-red-400 hover:text-red-200 transition-colors mt-1 flex-shrink-0">
                <X size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto pb-28 md:pb-10">

        {/* Header */}
        <div className="sticky top-0 z-50 backdrop-blur-2xl bg-black/40 border border-white/10 rounded-[32px] px-6 py-5 mb-10 shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent">Finance Tracker</h1>
              <p className="text-zinc-400 mt-2">Track your income and expenses smartly.</p>
            </div>
<div className="hidden md:flex items-center justify-center lg:justify-end gap-3 flex-wrap">
              {['home', 'reports', 'profile'].map(page => (
                <button key={page} onClick={() => setActivePage(page)}
                  className={`px-6 py-3 rounded-2xl transition-all duration-300 font-semibold capitalize ${activePage === page ? 'bg-white text-black' : 'bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10 hover:text-white'}`}>
                  {page}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Budget Warning Bar (inline, below header) */}
        {currentMonthExpense > 0 && (
          <div className={`rounded-[24px] p-5 mb-8 border ${
            currentMonthExpense >= BUDGET_LIMIT
              ? 'bg-red-950/50 border-red-800'
              : currentMonthExpense >= BUDGET_LIMIT * 0.8
              ? 'bg-yellow-950/50 border-yellow-800'
              : 'bg-white/5 border-white/10'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {currentMonthExpense >= BUDGET_LIMIT
                  ? <Bell size={18} className="text-red-400" />
                  : currentMonthExpense >= BUDGET_LIMIT * 0.8
                  ? <Bell size={18} className="text-yellow-400" />
                  : <BellOff size={18} className="text-zinc-500" />
                }
                <span className="font-semibold text-sm">
                  {currentMonthExpense >= BUDGET_LIMIT
                    ? '⚠️ Budget Exceeded!'
                    : currentMonthExpense >= BUDGET_LIMIT * 0.8
                    ? '⚡ Approaching Budget Limit'
                    : 'Monthly Budget'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-bold ${
                  currentMonthExpense >= BUDGET_LIMIT ? 'text-red-400'
                  : currentMonthExpense >= BUDGET_LIMIT * 0.8 ? 'text-yellow-400'
                  : 'text-zinc-400'
                }`}>
                  ₹ {currentMonthExpense.toLocaleString()} / ₹ {BUDGET_LIMIT.toLocaleString()}
                </span>
                {currentMonthExpense >= BUDGET_LIMIT && (
                  <button onClick={dismissBudgetAlert} className="text-red-400 hover:text-red-200 transition-colors">
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-700 ${
                  currentMonthExpense >= BUDGET_LIMIT ? 'bg-red-500'
                  : currentMonthExpense >= BUDGET_LIMIT * 0.8 ? 'bg-yellow-500'
                  : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(budgetUsedPercent, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-zinc-500">
              <span>{budgetUsedPercent.toFixed(0)}% used this month</span>
              <span>{budgetRemaining > 0 ? `₹ ${budgetRemaining.toLocaleString()} remaining` : `₹ ${Math.abs(budgetRemaining).toLocaleString()} over budget`}</span>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {[
            { label: 'Total Balance', value: `₹ ${balance.toLocaleString()}`, icon: <Wallet />, color: '' },
            { label: 'Income', value: `₹ ${totalIncome.toLocaleString()}`, icon: <TrendingUp className="text-green-400" />, color: 'text-green-400' },
            { label: 'Expenses', value: `₹ ${totalExpense.toLocaleString()}`, icon: <TrendingDown className="text-red-400" />, color: 'text-red-400' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="bg-white/5 backdrop-blur-xl rounded-[28px] p-6 border border-white/10 shadow-2xl">
              <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-medium">{label}</h2>{icon}</div>
              <p className={`text-4xl font-black tracking-tight ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Home Page */}
        {activePage === 'home' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 bg-gradient-to-b from-zinc-900 to-zinc-950 backdrop-blur-2xl rounded-[32px] p-6 border border-white/10 shadow-[0_20px_80px_rgba(0,0,0,0.45)] h-fit sticky top-6">
              <div className="flex items-center gap-2 mb-6"><Plus /><h2 className="text-2xl font-semibold">Add Transaction</h2></div>
              <div className="flex bg-zinc-800 rounded-2xl p-1 mb-4">
                {['expense', 'income'].map(t => (
                  <button key={t} onClick={() => setType(t)}
                    className={`flex-1 py-3 rounded-2xl font-medium transition-all capitalize ${type === t ? (t === 'expense' ? 'bg-red-500 text-white' : 'bg-green-500 text-white') : 'text-zinc-400'}`}>
                    {t}
                  </button>
                ))}
              </div>
              <div className="space-y-4">
                <input value={date} onChange={e => setDate(e.target.value)} type="date" className="w-full bg-zinc-800/70 border border-zinc-700 rounded-2xl px-4 py-4 outline-none text-white" />
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-zinc-800/70 border border-zinc-700 rounded-2xl px-4 py-4 outline-none text-white">
                  {['Food', 'Shopping', 'Travel', 'Bills', 'Entertainment', 'Salary', 'Health', 'Education', 'Other'].map(c => (
                    <option key={c} className="bg-zinc-800">{c}</option>
                  ))}
                </select>
                <input value={amount} onChange={e => setAmount(e.target.value)} type="number" min="0" placeholder="Amount (₹)" className="w-full bg-zinc-800/70 border border-zinc-700 rounded-2xl px-4 py-4 outline-none text-white placeholder:text-zinc-500" />
                <button onClick={addTransaction} disabled={saving}
                  className="w-full bg-gradient-to-r from-white to-zinc-300 text-black py-4 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-60 hover:opacity-90 transition-opacity">
                  {saving ? <><Loader2 size={18} className="animate-spin" /> Saving...</> : '+ Add Transaction'}
                </button>
              </div>
            </div>

            <div className="lg:col-span-2 bg-white/5 backdrop-blur-xl rounded-[32px] p-6 border border-white/10 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold">Recent Transactions</h2>
                <button onClick={fetchTransactions} className="bg-white/10 border border-white/10 px-4 py-2 rounded-xl text-sm hover:bg-white/20 transition-all flex items-center gap-2">
                  <Loader2 size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                </button>
              </div>
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 size={32} className="animate-spin text-zinc-400" />
                  <p className="text-zinc-500 text-sm">Loading from database...</p>
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-20 text-zinc-500">
                  <Wallet size={40} className="mx-auto mb-3 opacity-30" />
                  <p>No transactions yet. Add your first one!</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                  {transactions.map(item => (
                    <div key={item.id} className="flex items-center justify-between bg-gradient-to-r from-zinc-900 to-zinc-800 rounded-3xl p-5 border border-white/5 hover:border-white/10 transition-all">
                      <div>
                        <h3 className="font-semibold text-lg">{item.title}</h3>
                        <p className="text-sm text-zinc-400">{item.date} • {item.category}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className={`text-lg font-bold ${item.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                          {item.type === 'income' ? '+' : '-'}₹ {Number(item.amount).toLocaleString()}
                        </p>
                        <button onClick={() => deleteTransaction(item.id)} className="text-zinc-600 hover:text-red-400 transition-colors p-1">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reports Page */}
        {activePage === 'reports' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/5 backdrop-blur-xl rounded-[32px] p-6 border border-white/10 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold">Financial Overview</h2>
                  <button onClick={() => setReportView(reportView === 'table' ? 'charts' : 'table')} className="bg-white/10 border border-white/10 p-3 rounded-2xl hover:bg-white/20 transition-all"><PieChart size={20} /></button>
                </div>
                <div className="space-y-5">
                  {[
                    { label: 'Savings Ratio', value: `${incomePercentage.toFixed(0)}%`, icon: <TrendingUp className="text-green-400" />, color: 'text-green-400' },
                    { label: 'Expense Ratio', value: `${expensePercentage.toFixed(0)}%`, icon: <TrendingDown className="text-red-400" />, color: 'text-red-400' },
                  ].map(({ label, value, icon, color }) => (
                    <div key={label} className="bg-zinc-900 rounded-3xl p-5 border border-white/5">
                      <div className="flex items-center justify-between mb-3"><p className="text-zinc-400">{label}</p>{icon}</div>
                      <h3 className={`text-4xl font-black ${color}`}>{value}</h3>
                    </div>
                  ))}
                  <div className="bg-zinc-900 rounded-3xl p-5 border border-white/5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-zinc-400">This Month's Expenses</p>
                      <Bell size={18} className={currentMonthExpense >= BUDGET_LIMIT ? 'text-red-400' : 'text-zinc-500'} />
                    </div>
                    <h3 className={`text-4xl font-black ${currentMonthExpense >= BUDGET_LIMIT ? 'text-red-400' : 'text-white'}`}>
                      ₹ {currentMonthExpense.toLocaleString()}
                    </h3>
                    <p className="text-sm text-zinc-500 mt-1">Budget limit: ₹ {BUDGET_LIMIT.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {reportView === 'charts' ? (
                <div className="bg-white/5 backdrop-blur-xl rounded-[32px] p-6 border border-white/10 shadow-2xl h-[420px]">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-semibold">Financial Charts</h2>
                    <button onClick={() => setReportView('table')} className="bg-white/10 border border-white/10 p-3 rounded-2xl hover:bg-white/20 transition-all"><X size={20} /></button>
                  </div>
                  <ResponsiveContainer width="100%" height="85%">
                    <RePieChart>
                      <Pie data={chartData} cx="50%" cy="50%" outerRadius={120} dataKey="value">
                        {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(value) => `₹ ${Number(value).toLocaleString()}`} />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="bg-white/5 backdrop-blur-xl rounded-[32px] p-6 border border-white/10 shadow-2xl">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-semibold">Transaction Report</h2>
                    <button onClick={() => setReportView('charts')} className="bg-white/10 border border-white/10 p-3 rounded-2xl hover:bg-white/20 transition-all"><BarChart3 size={20} /></button>
                  </div>
                  <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                    <table className="w-full text-left">
                      <thead className="sticky top-0 bg-zinc-900">
                        <tr className="border-b border-white/10 text-zinc-400">
                          {['Title', 'Date', 'Category', 'Amount'].map(h => <th key={h} className="pb-4 pr-4">{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map(item => (
                          <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="py-4 pr-4">{item.title}</td>
                            <td className="py-4 pr-4">{item.date}</td>
                            <td className="py-4 pr-4">{item.category}</td>
                            <td className={`py-4 font-semibold ${item.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                              {item.type === 'income' ? '+' : '-'}₹ {Number(item.amount).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white/5 backdrop-blur-xl rounded-[32px] p-6 border border-white/10 shadow-2xl h-[400px]">
              <h2 className="text-2xl font-semibold mb-6">Income & Expense Trends</h2>
              <ResponsiveContainer width="100%" height="85%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="name" stroke="#a1a1aa" />
                  <Tooltip formatter={(value) => `₹ ${Number(value).toLocaleString()}`} />
                  <Line type="monotone" dataKey="amount" stroke="#ffffff" strokeWidth={3} dot={{ fill: '#ffffff', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Profile Page */}
        {activePage === 'profile' && (
          <div className="max-w-2xl mx-auto bg-white/5 backdrop-blur-xl rounded-[32px] p-6 border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <div><h2 className="text-3xl font-bold">{profileData.name}</h2><p className="text-zinc-400 mt-2">{profileData.role}</p></div>
              <button onClick={() => setIsEditingProfile(!isEditingProfile)} className="bg-white text-black px-5 py-3 rounded-2xl font-semibold hover:bg-zinc-200 transition-colors">
                {isEditingProfile ? 'Save' : 'Edit'}
              </button>
            </div>
            <div className="space-y-4">
              {Object.entries(profileData).map(([key, value]) => (
                <div key={key} className="bg-zinc-800 rounded-2xl p-5 border border-zinc-700">
                  <p className="text-zinc-400 text-sm mb-2 capitalize">{key}</p>
                  {isEditingProfile ? (
                    <input value={value} onChange={e => setProfileData({ ...profileData, [key]: e.target.value })} className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 outline-none text-white" />
                  ) : (
                    <h3 className="text-lg font-semibold">{value}</h3>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mobile Bottom Nav */}
        <div className="fixed bottom-4 left-4 right-4 md:hidden bg-black/70 backdrop-blur-2xl border border-white/10 rounded-3xl px-6 py-4 shadow-[0_20px_80px_rgba(0,0,0,0.55)]">
          <div className="flex items-center justify-between">
            {[{ page: 'home', icon: <Home size={20} />, label: 'Home' }, { page: 'reports', icon: <BarChart3 size={20} />, label: 'Reports' }, { page: 'profile', icon: <User size={20} />, label: 'Profile' }].map(({ page, icon, label }) => (
              <button key={page} onClick={() => setActivePage(page)} className={`flex flex-col items-center gap-1 text-xs ${activePage === page ? 'text-white' : 'text-zinc-500'}`}>{icon}{label}</button>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
