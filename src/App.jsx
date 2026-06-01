import React, { useMemo, useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  Plus, Wallet, TrendingUp, TrendingDown, PieChart,
  Home, BarChart3, X, Loader2, AlertCircle, CheckCircle, Bell, BellOff, Pencil, Check, Zap, RefreshCw
} from 'lucide-react'
import {
  PieChart as RePieChart, Pie, Cell, ResponsiveContainer,
  Tooltip, LineChart, Line, CartesianGrid, XAxis,
} from 'recharts'

const supabase = createClient(
  'https://soubaetsvxxuubnruuyd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvdWJhZXRzdnh4dXVibnJ1dXlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzQ1NzAsImV4cCI6MjA5NTAxMDU3MH0.oB4XXGrYzZPoyoT6ioxJh5KKz8ULnSyum2SvmpjzdJk'
)

const BUDGET_LIMIT = 85000

// Helper: format ISO date string (yyyy-mm-dd) to dd/mm/yyyy for display
function formatDateDisplay(isoDate) {
  if (!isoDate) return ''
  const [y, m, d] = isoDate.split('-')
  return `${d}/${m}/${y}`
}

// Helper: parse dd/mm/yyyy input back to yyyy-mm-dd for storage
function parseDateInput(ddmmyyyy) {
  if (!ddmmyyyy) return ''
  const parts = ddmmyyyy.split('/')
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`
  return ddmmyyyy
}

const STANDARD_CATEGORIES = ['Maintenance Cost', 'Garbage', 'Corpus Fund', 'Electricity Bill', 'Water Bill', 'Watchman Salary', 'Security Salary', 'Festival', 'Others']

function isCustomCategory(cat) {
  return cat && !STANDARD_CATEGORIES.includes(cat)
}

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
  const [flatNo, setFlatNo] = useState('')
  const [otherCategory, setOtherCategory] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editFields, setEditFields] = useState({})
  // For edit mode: track if the category is "Others" (custom)
  const [editOtherCategory, setEditOtherCategory] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [navVisible, setNavVisible] = useState(true)
  const lastScrollY = React.useRef(0)

  useEffect(() => {
    const handleScroll = () => {
      const current = window.scrollY
      if (current < lastScrollY.current) {
        setNavVisible(false)
      } else {
        setNavVisible(true)
      }
      lastScrollY.current = current
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const flatNumbers = [
    'Flat-101','Flat-102','Flat-103','Flat-104','Flat-105','Flat-106','Flat-107','Flat-108','Flat-109','Flat-110','Flat-111',
    'Flat-201','Flat-202','Flat-203','Flat-204','Flat-205','Flat-206','Flat-207','Flat-208','Flat-209','Flat-210','Flat-211',
    'Flat-301','Flat-302','Flat-303','Flat-304','Flat-305','Flat-306','Flat-307','Flat-308','Flat-309','Flat-310','Flat-311',
    'Flat-401','Flat-402','Flat-403','Flat-404','Flat-405','Flat-406','Flat-407','Flat-408','Flat-409','Flat-410','Flat-411',
    'Flat-501','Flat-502','Flat-503','Flat-504','Flat-505','Flat-506','Flat-507','Flat-508','Flat-509','Flat-510','Flat-511'
  ]

  const [reportView, setReportView] = useState('table')
  const [activePage, setActivePage] = useState('home')

  // ── Electricity Tracker state ──
  const [elecRecords, setElecRecords] = useState([])
  const [elecLoading, setElecLoading] = useState(false)
  const [elecSearch, setElecSearch] = useState('')
  const [elecMonthFilter, setElecMonthFilter] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [elecStatusFilter, setElecStatusFilter] = useState('all')

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }

const fetchElecRecords = async () => {
  setElecLoading(true)

  try {
    const { data, error } = await supabase
      .from('electricity_payments')
      .select(`
        id,
        flat_no,
        amount,
        usn,
        paid,
        month,
        updated_at
      `)
      .order('flat_no','usn', { ascending: true })

    if (error) throw error

    setElecRecords(data || [])
  } catch (error) {
    showToast(
      'error',
      'Failed to load electricity payments: ' + error.message
    )
  } finally {
    setElecLoading(false)
  }
}

  useEffect(() => {
    if (activePage === 'electricity') fetchElecRecords()
  }, [activePage])

  useEffect(() => { fetchTransactions() }, [])

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

  useEffect(() => {
    if (currentMonthExpense > BUDGET_LIMIT && !budgetDismissed) {
      setShowBudgetAlert(true)
    } else {
      setShowBudgetAlert(false)
    }
  }, [currentMonthExpense, budgetDismissed])

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
    if (!amount || !date || (category === 'Others' && !otherCategory.trim())) {
      showToast('error', 'Please fill in all fields')
      return
    }
    setSaving(true)
    try {
      const effectiveCategory = category === 'Others' && otherCategory.trim() ? otherCategory.trim() : category
      const newTransaction = { title: effectiveCategory, amount: Number(amount), type, category: effectiveCategory, date, flat_no: type === 'income' ? flatNo : null }
      const { data, error } = await supabase.from('transactions').insert([newTransaction]).select()
      if (error) throw error
      setTransactions(prev => [data[0], ...prev])
      setAmount(''); setDate(new Date().toISOString().split('T')[0]); setCategory('Food'); setFlatNo(''); setOtherCategory('')
      showToast('success', 'Transaction saved!')
      if (type === 'expense') setBudgetDismissed(false)
    } catch (error) {
      showToast('error', 'Failed to save: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const editTransaction = (item) => {
    setEditingId(item.id)
    // Determine if category is custom (Others)
    const isCustom = isCustomCategory(item.category)
    setEditFields({
      amount: item.amount,
      category: isCustom ? 'Others' : item.category,
      date: item.date,
      flat_no: item.flat_no || '',
      type: item.type,
    })
    setEditOtherCategory(isCustom ? item.category : '')
  }

  const saveEdit = async () => {
    if (!editFields.amount || !editFields.date) return
    if (editFields.category === 'Others' && !editOtherCategory.trim()) {
      showToast('error', 'Please specify the category')
      return
    }
    const effectiveCategory = editFields.category === 'Others' && editOtherCategory.trim()
      ? editOtherCategory.trim()
      : editFields.category

    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          title: effectiveCategory,
          amount: Number(editFields.amount),
          category: effectiveCategory,
          date: editFields.date,
          flat_no: editFields.type === 'income' ? editFields.flat_no : null,
        })
        .eq('id', editingId)
      if (error) throw error
      setTransactions(prev => prev.map(t =>
        t.id === editingId
          ? { ...t, title: effectiveCategory, amount: Number(editFields.amount), category: effectiveCategory, date: editFields.date, flat_no: editFields.type === 'income' ? editFields.flat_no : null }
          : t
      ))
      setEditingId(null)
      setEditFields({})
      setEditOtherCategory('')
      showToast('success', 'Transaction updated!')
    } catch (error) {
      showToast('error', 'Failed to update: ' + error.message)
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
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-red-400 mb-1">
                      <span>₹ 0</span>
                      <span>Budget: ₹ {BUDGET_LIMIT.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-red-900 rounded-full h-2">
                      <div className="bg-red-500 h-2 rounded-full transition-all duration-500" style={{ width: `${budgetUsedPercent}%` }} />
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
        <div className="md:sticky top-0 z-50 backdrop-blur-2xl bg-black/40 border border-white/10 rounded-[32px] px-6 py-5 mb-5 shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent">Finance Tracker</h1>
              <p className="text-zinc-400 mt-2">Green Meadows : Bloak - A</p>
            </div>
            <div className="hidden md:flex items-center justify-center lg:justify-end gap-3 flex-wrap">
              {['home', 'reports', 'electricity'].map(page => (
                <button key={page} onClick={() => setActivePage(page)}
                  className={`px-6 py-3 rounded-2xl transition-all duration-300 font-semibold capitalize ${activePage === page ? 'bg-white text-black' : 'bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10 hover:text-white'}`}>
                  {page}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Budget Warning Bar */}
        {currentMonthExpense > 0 && (
          <div className={`rounded-[24px] p-5 mb-5 border ${
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
        <div className="grid grid-cols-3 gap-2 md:gap-6 mb-6 md:mb-5">
          {[
            { label: 'Balance', value: `₹ ${balance.toLocaleString()}`, icon: <Wallet size={16} />, color: '' },
            { label: 'Income', value: `₹ ${totalIncome.toLocaleString()}`, icon: <TrendingUp size={16} className="text-green-400" />, color: 'text-green-400' },
            { label: 'Expenses', value: `₹ ${totalExpense.toLocaleString()}`, icon: <TrendingDown size={16} className="text-red-400" />, color: 'text-red-400' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="bg-white/5 backdrop-blur-xl rounded-2xl md:rounded-[28px] p-3 md:p-6 border border-white/10 shadow-2xl">
              <div className="flex items-center justify-between mb-1 md:mb-3">
                <h2 className="text-[11px] md:text-lg font-medium leading-tight">{label}</h2>
                <span className="hidden md:block">{icon}</span>
              </div>
              <p className={`text-lg text-left md:text-4xl font-black tracking-tight leading-snug ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Home Page */}
        {activePage === 'home' && (
          <div className="flex flex-col gap-8">
            <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 backdrop-blur-2xl rounded-[32px] p-3 border border-white/10 shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
              <div className="flex items-center gap-2 mb-6"><Plus /><h3 className="text-2x font-semibold">Add Transaction</h3></div>
              <div className="flex bg-zinc-800 rounded-2xl p-1 mb-4">
                {['expense', 'income'].map(t => (
                  <button key={t} onClick={() => setType(t)}
                    className={`flex-1 py-3 rounded-2xl font-medium transition-all capitalize ${type === t ? (t === 'expense' ? 'bg-red-500 text-white' : 'bg-green-500 text-white') : 'text-zinc-400'}`}>
                    {t}
                  </button>
                ))}
              </div>
              <div className="flex flex-col md:flex-row md:items-end gap-3">
                {type === 'income' && (
                  <div className="flex flex-col gap-1 md:flex-1">
                    <select value={flatNo} onChange={e => setFlatNo(e.target.value)} className="w-full bg-zinc-800/70 border border-zinc-700 rounded-2xl px-4 py-3 outline-none text-white">
                      <option value="">Select Flat</option>
                      {flatNumbers.map(f => <option key={f} className="bg-zinc-800">{f}</option>)}
                    </select>
                  </div>
                )}
                <div className="flex flex-col gap-1 md:flex-1">
                  <input value={date} onChange={e => setDate(e.target.value)} type="date" className="w-full bg-zinc-800/70 border border-zinc-700 rounded-2xl px-4 py-3 outline-none text-white" />
                </div>
                <div className="flex flex-col gap-1 md:flex-[1.4]">
                  <select value={category} onChange={e => { setCategory(e.target.value); setOtherCategory('') }} className="w-full bg-zinc-800/70 border border-zinc-700 rounded-2xl px-4 py-3 outline-none text-white">
                    {STANDARD_CATEGORIES.map(c => (
                      <option key={c} className="bg-zinc-800">{c}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1 md:flex-1">
                  <input value={amount} onChange={e => setAmount(e.target.value)} type="number" min="0" placeholder="0" className="w-full bg-zinc-800/70 border border-zinc-700 rounded-2xl px-4 py-3 outline-none text-white placeholder:text-zinc-500" />
                </div>
                <div className="flex flex-col gap-1 md:flex-none">
                  <button onClick={addTransaction} disabled={saving}
                    className="w-full md:w-auto bg-gradient-to-r from-white to-zinc-300 text-black px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-60 hover:opacity-90 transition-opacity whitespace-nowrap">
                    {saving ? <><Loader2 size={18} className="animate-spin" /> Saving...</> : '+ Add'}
                  </button>
                </div>
              </div>
              {category === 'Others' && (
                <div className="mt-3">
                  <input
                    value={otherCategory}
                    onChange={e => setOtherCategory(e.target.value.slice(0, 30))}
                    placeholder="Please specify category..."
                    maxLength={30}
                    className="w-full bg-zinc-800/70 border border-yellow-500/50 rounded-2xl px-4 py-3 outline-none text-white placeholder:text-zinc-500"
                  />
                  <p className="text-xs text-zinc-500 mt-1 text-right">{otherCategory.length}/30</p>
                </div>
              )}
            </div>

            <div className="bg-white/5 backdrop-blur-xl rounded-[32px] p-3 border border-white/10 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2x font-semibold">Recent Transactions</h2>
                <button onClick={fetchTransactions} className="bg-white/10 border border-white/10 px-4 py-2 rounded-xl text-sm hover:bg-white/20 transition-all flex items-center gap-2">
                  <Loader2 size={12} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
              {/* Search Bar + Month Filter */}
              <div className="flex gap-2 mb-4">
                <div className="relative" style={{flex: '2'}}>
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by category, flat no. or amount..."
                    className="w-full bg-zinc-800/70 border border-zinc-700 rounded-2xl pl-10 pr-10 py-3 outline-none text-white placeholder:text-zinc-500 text-sm"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors">
                      <X size={14} />
                    </button>
                  )}
                </div>
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="bg-zinc-800/70 border border-zinc-700 rounded-2xl px-3 py-3 outline-none text-white text-sm"
                  style={{flex: '1'}}
                >
                  <option value="">All Months</option>
                  {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
                    <option key={m} value={String(i + 1).padStart(2, '0')} className="bg-zinc-800">{m}</option>
                  ))}
                </select>
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
              ) : (() => {
                const q = searchQuery.trim().toLowerCase()
                const filtered = transactions.filter(t => {
                  const matchesSearch = !q || (
                    t.category?.toLowerCase().includes(q) ||
                    t.title?.toLowerCase().includes(q) ||
                    (t.flat_no && t.flat_no.toLowerCase().includes(q)) ||
                    String(t.amount).includes(q) ||
                    formatDateDisplay(t.date).includes(q)
                  )
                  const matchesMonth = !selectedMonth || (t.date && t.date.split('-')[1] === selectedMonth)
                  return matchesSearch && matchesMonth
                })
                const noResultMsg = selectedMonth && !q
                  ? `No transactions in ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(selectedMonth)-1]}`
                  : `No results for "${searchQuery}"`
                return filtered.length === 0 ? (
                  <div className="text-center py-16 text-zinc-500">
                    <svg className="mx-auto mb-3 opacity-30" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                    </svg>
                    <p className="text-sm">{noResultMsg}</p>
                  </div>
                ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">

                  {/* Desktop view */}
                  <div className="hidden md:block space-y-3">
                    {filtered.map(item => (
                      <div key={item.id} className="bg-gradient-to-r from-zinc-900 to-zinc-800 rounded-3xl p-5 border border-white/5 hover:border-white/10 transition-all">
                        {editingId === item.id ? (
                          <div className="flex flex-col gap-3">
                            <div className="grid grid-cols-4 gap-3">
                              {/* Date */}
                              <div>
                                <p className="text-xs text-zinc-500 mb-1">Date</p>
                                <input
                                  type="date"
                                  value={editFields.date}
                                  onChange={e => setEditFields({...editFields, date: e.target.value})}
                                  className="w-full bg-zinc-800 border border-zinc-600 rounded-xl px-3 py-2 text-sm outline-none text-white"
                                />
                              </div>
                              {/* Category */}
                              <div>
                                <p className="text-xs text-zinc-500 mb-1">Category</p>
                                <select
                                  value={editFields.category}
                                  onChange={e => { setEditFields({...editFields, category: e.target.value}); setEditOtherCategory('') }}
                                  className="w-full bg-zinc-800 border border-zinc-600 rounded-xl px-3 py-2 text-sm outline-none text-white"
                                >
                                  {STANDARD_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                                </select>
                              </div>
                              {/* Amount */}
                              <div>
                                <p className="text-xs text-zinc-500 mb-1">Amount (₹)</p>
                                <input
                                  type="number"
                                  value={editFields.amount}
                                  onChange={e => setEditFields({...editFields, amount: e.target.value})}
                                  className="w-full bg-zinc-800 border border-zinc-600 rounded-xl px-3 py-2 text-sm outline-none text-white"
                                />
                              </div>
                              {/* Flat No — only show if income */}
                              {editFields.type === 'income' ? (
                                <div>
                                  <p className="text-xs text-zinc-500 mb-1">Flat No.</p>
                                  <select
                                    value={editFields.flat_no}
                                    onChange={e => setEditFields({...editFields, flat_no: e.target.value})}
                                    className="w-full bg-zinc-800 border border-zinc-600 rounded-xl px-3 py-2 text-sm outline-none text-white"
                                  >
                                    <option value="">Select Flat</option>
                                    {flatNumbers.map(f => <option key={f} className="bg-zinc-800">{f}</option>)}
                                  </select>
                                </div>
                              ) : (
                                <div className="flex items-end gap-2">
                                  <button onClick={saveEdit} className="flex-1 bg-green-500 text-white py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-1">
                                    <Check size={14} /> Save
                                  </button>
                                  <button onClick={() => { setEditingId(null); setEditFields({}); setEditOtherCategory('') }} className="flex-1 bg-zinc-700 text-white py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-1">
                                    <X size={14} /> Cancel
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Others custom field */}
                            {editFields.category === 'Others' && (
                              <div>
                                <input
                                  value={editOtherCategory}
                                  onChange={e => setEditOtherCategory(e.target.value.slice(0, 30))}
                                  placeholder="Please specify category..."
                                  maxLength={30}
                                  className="w-full bg-zinc-800 border border-yellow-500/50 rounded-xl px-3 py-2 text-sm outline-none text-white placeholder:text-zinc-500"
                                />
                                <p className="text-xs text-zinc-500 mt-1 text-right">{editOtherCategory.length}/30</p>
                              </div>
                            )}

                            {/* Save/Cancel row for income type (after flat no) */}
                            {editFields.type === 'income' && (
                              <div className="flex gap-2">
                                <button onClick={saveEdit} className="flex-1 bg-green-500 text-white py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-1">
                                  <Check size={14} /> Save
                                </button>
                                <button onClick={() => { setEditingId(null); setEditFields({}); setEditOtherCategory('') }} className="flex-1 bg-zinc-700 text-white py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-1">
                                  <X size={14} /> Cancel
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="text-left">
                              <h3 className="font-semibold text-lg">{item.title}</h3>
                              <p className="text-sm text-zinc-400 text-left">
                                {formatDateDisplay(item.date)} • {item.category}{item.flat_no ? ` • ${item.flat_no}` : ''}
                              </p>
                            </div>
                            <div className="flex items-center gap-4">
                              <p className={`text-lg font-bold ${item.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                                {item.type === 'income' ? '+' : '-'}₹ {Number(item.amount).toLocaleString()}
                              </p>
                              <button onClick={() => editTransaction(item)} className="text-zinc-500 hover:text-blue-400 transition-colors p-1">
                                <Pencil size={18} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Mobile scrollable table view */}
                  <div className="md:hidden overflow-x-auto rounded-2xl border border-white/10">
                    <table className="w-full text-left min-w-[540px]">
                      <thead>
                        <tr className="bg-zinc-900 border-b border-white/10">
                          <th className="px-4 py-3 text-xs text-zinc-400 font-semibold">Category</th>
                          <th className="px-4 py-3 text-xs text-zinc-400 font-semibold">Flat No.</th>
                          <th className="px-4 py-3 text-xs text-zinc-400 font-semibold">Date</th>
                          <th className="px-4 py-3 text-xs text-zinc-400 font-semibold">Amount</th>
                          <th className="px-4 py-3 text-xs text-zinc-400 font-semibold">Edit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((item, idx) => (
                          <React.Fragment key={item.id}>
                            <tr className={`border-b border-white/5 ${idx % 2 === 0 ? 'bg-zinc-900/60' : 'bg-zinc-800/40'}`}>
                              {editingId === item.id ? (
                                <>
                                  <td className="px-3 py-2" colSpan={4}>
                                    <div className="flex gap-2 flex-wrap">
                                      <input type="date" value={editFields.date} onChange={e => setEditFields({...editFields, date: e.target.value})}
                                        className="flex-1 bg-zinc-800 border border-zinc-600 rounded-lg px-2 py-1.5 text-xs outline-none text-white min-w-[100px]" />
                                      <select value={editFields.category} onChange={e => { setEditFields({...editFields, category: e.target.value}); setEditOtherCategory('') }}
                                        className="flex-1 bg-zinc-800 border border-zinc-600 rounded-lg px-2 py-1.5 text-xs outline-none text-white min-w-[100px]">
                                        {STANDARD_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                                      </select>
                                      <input type="number" value={editFields.amount} onChange={e => setEditFields({...editFields, amount: e.target.value})}
                                        className="w-20 bg-zinc-800 border border-zinc-600 rounded-lg px-2 py-1.5 text-xs outline-none text-white" />
                                      {editFields.type === 'income' && (
                                        <select value={editFields.flat_no} onChange={e => setEditFields({...editFields, flat_no: e.target.value})}
                                          className="flex-1 bg-zinc-800 border border-zinc-600 rounded-lg px-2 py-1.5 text-xs outline-none text-white min-w-[100px]">
                                          <option value="">Select Flat</option>
                                          {flatNumbers.map(f => <option key={f} className="bg-zinc-800">{f}</option>)}
                                        </select>
                                      )}
                                    </div>
                                    {editFields.category === 'Others' && (
                                      <div className="mt-2">
                                        <input
                                          value={editOtherCategory}
                                          onChange={e => setEditOtherCategory(e.target.value.slice(0, 30))}
                                          placeholder="Specify category..."
                                          maxLength={30}
                                          className="w-full bg-zinc-800 border border-yellow-500/50 rounded-lg px-2 py-1.5 text-xs outline-none text-white placeholder:text-zinc-500"
                                        />
                                        <p className="text-xs text-zinc-500 mt-0.5 text-right">{editOtherCategory.length}/30</p>
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-3 py-2">
                                    <div className="flex gap-1">
                                      <button onClick={saveEdit} className="bg-green-500 text-white px-2 py-1 rounded-lg text-xs font-semibold">Save</button>
                                      <button onClick={() => { setEditingId(null); setEditFields({}); setEditOtherCategory('') }} className="bg-zinc-700 text-white px-2 py-1 rounded-lg text-xs font-semibold">✕</button>
                                    </div>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="px-4 py-3 text-xs font-semibold text-white">{item.category}</td>
                                  <td className="px-4 py-3 text-xs text-zinc-400">{item.flat_no || '—'}</td>
                                  <td className="px-4 py-3 text-xs text-zinc-400">{formatDateDisplay(item.date)}</td>
                                  <td className={`px-4 py-3 text-xs font-bold ${item.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                                    {item.type === 'income' ? '+' : '-'}₹{Number(item.amount).toLocaleString()}
                                  </td>
                                  <td className="px-4 py-3">
                                    <button onClick={() => editTransaction(item)} className="text-zinc-500 hover:text-blue-400 transition-colors">
                                      <Pencil size={14} />
                                    </button>
                                  </td>
                                </>
                              )}
                            </tr>
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                )
              })()}
            </div>
          </div>
        )}

        {/* Reports Page */}
        {activePage === 'reports' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/5 backdrop-blur-xl rounded-[32px] p-6 border border-white/10 shadow-2xl">
                <div className="flex items-center justify-between mb-5">
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
                  <div className="flex items-center justify-between mb-5">
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
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-2x font-semibold">Transaction Report</h2>
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
                            <td className="py-4 text-xs pr-4">{item.title}</td>
                            <td className="py-4 text-xs pr-4">{formatDateDisplay(item.date)}</td>
                            <td className="py-4 text-xs pr-4">{item.category}</td>
                            <td className={`py-4 text-xs font-semibold ${item.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
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
              <h2 className="text-2xl font-semibold mb-5">Income & Expense Trends</h2>
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

        {/* Electricity Tracker Page */}
        {activePage === 'electricity' && (() => {
          const now = new Date()
          const [filterYear, filterMonth] = elecMonthFilter.split('-')
          const monthName = new Date(Number(filterYear), Number(filterMonth) - 1).toLocaleString('default', { month: 'long' })

          const filtered = elecRecords.filter(r => {
            const matchMonth = !elecMonthFilter || r.month === elecMonthFilter
            const matchSearch = !elecSearch || r.flat_no?.toLowerCase().includes(elecSearch.toLowerCase())
            const matchStatus = elecStatusFilter === 'all' || r.status === elecStatusFilter
            return matchMonth && matchSearch && matchStatus
          })

          const totalFlats = filtered.length
          const paidCount = filtered.filter(r => r.status === 'paid').length
          const pendingCount = filtered.filter(r => r.status !== 'paid').length

          // Generate month options: last 12 months
          const monthOptions = []
          for (let i = 0; i < 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
            const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            const label = d.toLocaleString('default', { month: 'long', year: 'numeric' })
            monthOptions.push({ val, label })
          }

          return (
            <div className="space-y-6">
              {/* Page Title */}
{/*}
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-zinc-500 text-sm font-medium uppercase tracking-widest">Green Meadows : Block A</p>
                  <div className="flex items-center gap-3 mt-1">
                    <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white">Electricity Tracker</h2>
                    <span className="bg-blue-900/60 border border-blue-700 text-blue-300 text-sm font-semibold px-3 py-1 rounded-xl">{elecMonthFilter}</span>
                  </div>
                </div>
              </div>
*/}
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Total Flats', value: totalFlats, icon: <Zap size={20} className="text-blue-400 hidden md:block" />, iconBg: 'bg-blue-900/60 border-blue-700' },
                  { label: 'Paid', value: paidCount, icon: <CheckCircle size={20} className="text-green-400" />, iconBg: 'bg-green-900/60 border-green-700' },
                  { label: 'Pending', value: pendingCount, icon: <Zap size={20} className="text-red-400" />, iconBg: 'bg-red-900/60 border-red-700' },
                ].map(({ label, value, icon, iconBg }) => (
                  <div key={label} className="bg-white/5 backdrop-blur-xl rounded-[28px] p-5 border border-white/10 shadow-2xl">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-zinc-400 text-sm font-medium">{label}</p>
                      <div className={`p-2 rounded-xl border ${iconBg}`}>{icon}</div>
                    </div>
                    <p className="text-4xl font-black text-white">{value}</p>
                  </div>
                ))}
              </div>

              {/* Progress bar */}
              <div className="w-full bg-zinc-800 rounded-full h-1.5">
                <div
                  className="bg-green-500 h-1.5 rounded-full transition-all duration-700"
                  style={{ width: totalFlats > 0 ? `${(paidCount / totalFlats) * 100}%` : '0%' }}
                />
              </div>

              {/* Filters Row */}
              <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
                {/* Search */}
                <div className="relative flex-1">
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                  <input
                    type="text"
                    value={elecSearch}
                    onChange={e => setElecSearch(e.target.value)}
                    placeholder="Search flat no..."
                    className="w-full bg-zinc-800/70 border border-zinc-700 rounded-2xl pl-10 pr-4 py-3 outline-none text-white placeholder:text-zinc-500 text-sm"
                  />
                </div>
                {/* Month */}
                <select
                  value={elecMonthFilter}
                  onChange={e => setElecMonthFilter(e.target.value)}
                  className="bg-zinc-800/70 border border-zinc-700 rounded-2xl px-4 py-3 outline-none text-white text-sm"
                >
                  {monthOptions.map(o => (
                    <option key={o.val} value={o.val} className="bg-zinc-800">{o.label}</option>
                  ))}
                </select>
                {/* Status Filter */}
              {/*  
                <div className="flex bg-zinc-800 rounded-2xl p-1 gap-1">
                  {['all', 'paid', 'pending'].map(s => (
                    <button
                      key={s}
                      onClick={() => setElecStatusFilter(s)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all ${
                        elecStatusFilter === s
                          ? s === 'paid' ? 'bg-green-500 text-white'
                            : s === 'pending' ? 'bg-red-500 text-white'
                            : 'bg-white text-black'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {s === 'all' ? 'All' : s === 'paid' ? 'Paid' : 'Pending'}
                    </button>
                  ))}
                </div>

                */}
                {/* Refresh */}
                <button
                  onClick={fetchElecRecords}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 transition-colors text-white px-5 py-3 rounded-2xl text-sm font-semibold"
                >
                  <RefreshCw size={15} className={elecLoading ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>

              {/* Table */}
              <div className="bg-white/5 backdrop-blur-xl rounded-[28px] border border-white/10 shadow-2xl overflow-hidden">
                {elecLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 size={32} className="animate-spin text-zinc-400" />
                    <p className="text-zinc-500 text-sm">Loading electricity data...</p>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-20 text-zinc-500">
                    <Zap size={40} className="mx-auto mb-3 opacity-30" />
                    <p>No records found for the selected filters.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-zinc-900/80 border-b border-white/10">
                          <th className="px-6 py-4 text-xs text-zinc-400 font-semibold uppercase tracking-wider">Flat No.</th>
                        {/*  <th className="px-6 py-4 text-xs text-zinc-400 font-semibold uppercase tracking-wider">Status</th>  */}
                          <th className="px-6 py-4 text-xs text-zinc-400 font-semibold uppercase tracking-wider">Amount</th>
                          <th className="px-6 py-4 text-xs text-zinc-400 font-semibold uppercase tracking-wider">USN No.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((record, idx) => (
                          <tr key={record.id || idx} className={`border-b border-white/5 transition-colors hover:bg-white/5 ${idx % 2 === 0 ? 'bg-zinc-900/30' : 'bg-zinc-800/20'}`}>
                            <td className="px-6 py-4 font-bold text-white">{record.flat_no}</td>
                          {/*}  
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                record.status === 'paid'
                                  ? 'bg-green-900/50 text-green-400 border border-green-700'
                                  : 'bg-red-900/50 text-red-400 border border-red-700'
                              }`}>
                                {record.status === 'paid' ? 'Paid' : 'Pending'}
                              </span>
                            </td>
                          */}
                            <td className="px-6 py-4 text-zinc-300">
                              {record.amount ? `₹ ${Number(record.amount).toLocaleString()}` : '—'}
                            </td>
                            <td className="px-6 py-4 text-zinc-400 font-mono text-sm">
                              {record.usn || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )
        })()}

        {/* Mobile Bottom Nav */}
        <div className={`fixed bottom-4 left-4 right-4 md:hidden bg-black/70 backdrop-blur-2xl border border-white/10 rounded-3xl px-6 py-4 shadow-[0_20px_80px_rgba(0,0,0,0.55)] transition-transform duration-300 ${navVisible ? 'translate-y-0' : 'translate-y-28'}`}>
          <div className="flex items-center justify-between">
            {[
              { page: 'home', icon: <Home size={20} />, label: 'Home' },
              { page: 'electricity', icon: <Zap size={20} />, label: 'Electricity' },
              { page: 'reports', icon: <BarChart3 size={20} />, label: 'Reports' },              
            ].map(({ page, icon, label }) => (
              <button key={page} onClick={() => setActivePage(page)} className={`flex flex-col items-center gap-1 text-xs ${activePage === page ? 'text-white' : 'text-zinc-500'}`}>{icon}{label}</button>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
