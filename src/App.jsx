import React, { useMemo, useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  Plus, Wallet, TrendingUp, TrendingDown, PieChart,
  Home, BarChart3, User, X, Trash2, Loader2
} from 'lucide-react'
import {
  PieChart as RePieChart, Pie, Cell, ResponsiveContainer,
  Tooltip, LineChart, Line, CartesianGrid, XAxis,
} from 'recharts'

// Supabase client
const supabase = createClient(
  'https://soubaetsvxxuubnruuyd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvdWJhZXRzdnh4dXVibnJ1dXlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzQ1NzAsImV4cCI6MjA5NTAxMDU3MH0.oB4XXGrYzZPoyoT6ioxJh5KKz8ULnSyum2SvmpjzdJk'
)

export default function FinanceApp() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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

  // Fetch transactions from Supabase on load
  useEffect(() => {
    fetchTransactions()
  }, [])

  const fetchTransactions = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      console.error('Error fetching:', error)
    } else {
      setTransactions(data)
    }
    setLoading(false)
  }

  const addTransaction = async () => {
    if (!title || !amount || !date) return
    setSaving(true)
    const newTransaction = { title, amount: Number(amount), type, category, date }
    const { data, error } = await supabase
      .from('transactions')
      .insert([newTransaction])
      .select()
    if (error) {
      console.error('Error adding:', error)
    } else {
      setTransactions([data[0], ...transactions])
      setTitle('')
      setAmount('')
      setDate(new Date().toISOString().split('T')[0])
      setCategory('Food')
    }
    setSaving(false)
  }

  const deleteTransaction = async (id) => {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
    if (error) {
      console.error('Error deleting:', error)
    } else {
      setTransactions(transactions.filter(t => t.id !== id))
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
      <div className="max-w-7xl mx-auto pb-28 md:pb-10">

        {/* Header */}
        <div className="sticky top-0 z-50 backdrop-blur-2xl bg-black/40 border border-white/10 rounded-[32px] px-6 py-5 mb-10 shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent">Finance Tracker</h1>
              <p className="text-zinc-400 mt-2">Track your income and expenses smartly.</p>
            </div>
            <div className="hidden lg:flex items-center gap-3 bg-white/5 backdrop-blur-xl px-5 py-3 rounded-2xl border border-white/10">
              <Wallet size={22} /><span className="font-medium">Personal Finance</span>
            </div>
            <div className="hidden md:flex items-center justify-center lg:justify-end gap-3 flex-wrap">
              {['home', 'reports', 'profile'].map(page => (
                <button key={page} onClick={() => setActivePage(page)}
                  className={`px-6 py-3 rounded-2xl transition-all duration-300 font-semibold capitalize ${activePage === page ? 'bg-white text-black shadow-[0_10px_30px_rgba(255,255,255,0.2)]' : 'bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10 hover:text-white'}`}>
                  {page}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {[
            { label: 'Total Balance', value: `₹ ${balance.toLocaleString()}`, icon: <Wallet />, color: '' },
            { label: 'Income', value: `₹ ${totalIncome.toLocaleString()}`, icon: <TrendingUp className="text-green-400" />, color: 'text-green-400 drop-shadow-[0_0_12px_rgba(74,222,128,0.35)]' },
            { label: 'Expenses', value: `₹ ${totalExpense.toLocaleString()}`, icon: <TrendingDown className="text-red-400" />, color: 'text-red-400 drop-shadow-[0_0_12px_rgba(248,113,113,0.35)]' },
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
            {/* Add Transaction Form */}
            <div className="lg:col-span-1 bg-gradient-to-b from-zinc-900 to-zinc-950 backdrop-blur-2xl rounded-[32px] p-6 border border-white/10 shadow-[0_20px_80px_rgba(0,0,0,0.45)] h-fit sticky top-6">
              <div className="flex items-center gap-2 mb-6"><Plus /><h2 className="text-2xl font-semibold">Add Transaction</h2></div>
              <div className="flex bg-zinc-800 rounded-2xl p-1 mb-4">
                {['expense', 'income'].map(t => (
                  <button key={t} onClick={() => setType(t)} className={`flex-1 py-3 rounded-2xl font-medium transition-all capitalize ${type === t ? (t === 'expense' ? 'bg-red-500 text-white' : 'bg-green-500 text-white') : 'text-zinc-400'}`}>{t}</button>
                ))}
              </div>
              <div className="space-y-4">
                <input value={date} onChange={e => setDate(e.target.value)} type="date" className="w-full bg-zinc-800/70 border border-zinc-700 rounded-2xl px-4 py-4 outline-none text-white" />
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Transaction title" className="w-full bg-zinc-800/70 border border-zinc-700 rounded-2xl px-4 py-4 outline-none" />
                <input value={amount} onChange={e => setAmount(e.target.value)} type="number" placeholder="Amount" className="w-full bg-zinc-800/70 border border-zinc-700 rounded-2xl px-4 py-4 outline-none" />
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-zinc-800/70 border border-zinc-700 rounded-2xl px-4 py-4 outline-none">
                  {['Food', 'Shopping', 'Travel', 'Bills', 'Entertainment', 'Salary'].map(c => <option key={c}>{c}</option>)}
                </select>
                <button onClick={addTransaction} disabled={saving}
                  className="w-full bg-gradient-to-r from-white to-zinc-300 text-black py-4 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-60">
                  {saving ? <><Loader2 size={18} className="animate-spin" /> Saving...</> : 'Add Transaction'}
                </button>
              </div>
            </div>

            {/* Transactions List */}
            <div className="lg:col-span-2 bg-white/5 backdrop-blur-xl rounded-[32px] p-6 border border-white/10 shadow-2xl">
              <h2 className="text-2xl font-semibold mb-6">Recent Transactions</h2>
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 size={32} className="animate-spin text-zinc-400" />
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-20 text-zinc-500">No transactions yet. Add one!</div>
              ) : (
                <div className="space-y-4">
                  {transactions.map(item => (
                    <div key={item.id} className="flex items-center justify-between bg-gradient-to-r from-zinc-900 to-zinc-800 rounded-3xl p-5 border border-white/5">
                      <div>
                        <h3 className="font-semibold text-lg">{item.title}</h3>
                        <p className="text-sm text-zinc-400">{item.date} • {item.category}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className={`text-lg font-bold ${item.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                          {item.type === 'income' ? '+' : '-'}₹ {Number(item.amount).toLocaleString()}
                        </p>
                        <button onClick={() => deleteTransaction(item.id)} className="text-zinc-600 hover:text-red-400 transition-colors">
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
                </div>
              </div>

              {reportView === 'charts' ? (
                <div className="bg-white/5 backdrop-blur-xl rounded-[32px] p-6 border border-white/10 shadow-2xl h-[420px]">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-semibold">Financial Charts</h2>
                    <button onClick={() => setReportView('table')} className="bg-white/10 border border-white/10 p-3 rounded-2xl hover:bg-white/20 transition-all"><X size={20} /></button>
                  </div>
                  <ResponsiveContainer width="100%" height="85%">
                    <RePieChart><Pie data={chartData} cx="50%" cy="50%" outerRadius={120} dataKey="value">{chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></RePieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="bg-white/5 backdrop-blur-xl rounded-[32px] p-6 border border-white/10 shadow-2xl">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-semibold">Transaction Report</h2>
                    <button onClick={() => setReportView('charts')} className="bg-white/10 border border-white/10 p-3 rounded-2xl hover:bg-white/20 transition-all"><BarChart3 size={20} /></button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead><tr className="border-b border-white/10 text-zinc-400">{['Title', 'Date', 'Category', 'Amount'].map(h => <th key={h} className="pb-4">{h}</th>)}</tr></thead>
                      <tbody>{transactions.map(item => (
                        <tr key={item.id} className="border-b border-white/5">
                          <td className="py-4">{item.title}</td>
                          <td className="py-4">{item.date}</td>
                          <td className="py-4">{item.category}</td>
                          <td className={`py-4 font-semibold ${item.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>₹ {Number(item.amount).toLocaleString()}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white/5 backdrop-blur-xl rounded-[32px] p-6 border border-white/10 shadow-2xl h-[400px]">
              <h2 className="text-2xl font-semibold mb-6">Income & Expense Trends</h2>
              <ResponsiveContainer width="100%" height="85%">
                <LineChart data={monthlyData}><CartesianGrid strokeDasharray="3 3" stroke="#27272a" /><XAxis dataKey="name" stroke="#a1a1aa" /><Tooltip /><Line type="monotone" dataKey="amount" stroke="#ffffff" strokeWidth={3} /></LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Profile Page */}
        {activePage === 'profile' && (
          <div className="max-w-2xl mx-auto bg-white/5 backdrop-blur-xl rounded-[32px] p-6 border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <div><h2 className="text-3xl font-bold">{profileData.name}</h2><p className="text-zinc-400 mt-2">{profileData.role}</p></div>
              <button onClick={() => setIsEditingProfile(!isEditingProfile)} className="bg-white text-black px-5 py-3 rounded-2xl font-semibold">{isEditingProfile ? 'Save' : 'Edit'}</button>
            </div>
            <div className="space-y-4">
              {Object.entries(profileData).map(([key, value]) => (
                <div key={key} className="bg-zinc-800 rounded-2xl p-5 border border-zinc-700">
                  <p className="text-zinc-400 text-sm mb-2 capitalize">{key}</p>
                  {isEditingProfile ? (
                    <input value={value} onChange={e => setProfileData({ ...profileData, [key]: e.target.value })} className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 outline-none" />
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
