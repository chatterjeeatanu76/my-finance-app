import React, { useMemo, useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'
import {
  Plus, Wallet, TrendingUp, TrendingDown, PieChart,
  Home, BarChart3, X, Loader2, AlertCircle, CheckCircle, Bell, BellOff, Pencil, Check, Zap, RefreshCw, Landmark, Search, ChevronDown, Download
} from 'lucide-react'
import {
  PieChart as RePieChart, Pie, Cell, ResponsiveContainer,
  Tooltip, LineChart, Line, CartesianGrid, XAxis, YAxis, BarChart, Bar, Legend,
} from 'recharts'

const supabase = createClient(
  'https://soubaetsvxxuubnruuyd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvdWJhZXRzdnh4dXVibnJ1dXlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzQ1NzAsImV4cCI6MjA5NTAxMDU3MH0.oB4XXGrYzZPoyoT6ioxJh5KKz8ULnSyum2SvmpjzdJk'
)

const BUDGET_LIMIT = 85000

const PAGE_TITLES = {
  home: 'Balance Sheet',
  corpus: 'Corpus Fund',
  reports: 'Reports',
  electricity: 'Electricity',
}

const NAV_ITEMS = [
  { page: 'home', label: 'Dashboard', icon: Home },
  { page: 'corpus', label: 'Corpus Fund', icon: Landmark },
  { page: 'electricity', label: 'Electricity', icon: Zap },
  { page: 'reports', label: 'Reports', icon: BarChart3 },
]

const panel = 'bg-[#151922] border border-[#1e2433] rounded-xl'
const inputCls = 'w-full bg-[#0f1319] border border-[#1e2433] rounded-lg px-4 py-2.5 outline-none text-white text-sm placeholder:text-zinc-500 focus:border-violet-500/40 [color-scheme:dark]'

function formatDateDisplay(isoDate) {
  if (!isoDate) return ''
  const [y, m, d] = isoDate.split('-')
  return `${d}/${m}/${y}`
}

function parseDateInput(ddmmyyyy) {
  if (!ddmmyyyy) return ''
  const parts = ddmmyyyy.split('/')
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`
  return ddmmyyyy
}

const HOME_INCOME_CATEGORIES = ['Maintenance Cost', 'Water Bill', 'Garbage Collection', 'Others']
const HOME_EXPENSE_CATEGORIES = ['Water Tanker Bill', 'Watchman Salary', 'Electricity Bill', 'Lift Current Bill', 'Generator Diesel Bill', 'GHMC Garbage Collection', 'Others']
const CORPUS_INCOME_CATEGORIES = ['Corpus Fund']
const CORPUS_EXPENSE_CATEGORIES = ['New Pump Instalation', 'Water Treatment', 'Others']

function getCategories(page, transactionType) {
  if (page === 'corpus') {
    return transactionType === 'income' ? CORPUS_INCOME_CATEGORIES : CORPUS_EXPENSE_CATEGORIES
  }
  return transactionType === 'income' ? HOME_INCOME_CATEGORIES : HOME_EXPENSE_CATEGORIES
}

function isCustomCategory(cat, page = 'home', transactionType = 'expense') {
  if (!cat) return false
  const standard = getCategories(page, transactionType)
  return !standard.includes(cat)
}

function SearchableFlatSelect({ value, onChange, flats }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return flats
    return flats.filter(f => f.toLowerCase().includes(q))
  }, [flats, query])

  return (
    <div ref={containerRef} className="relative">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 z-10 pointer-events-none" />
      <input
        type="text"
        value={open ? query : (value || '')}
        placeholder="Search flat..."
        onChange={e => {
          setQuery(e.target.value)
          setOpen(true)
          if (!e.target.value) onChange('')
        }}
        onFocus={() => {
          setOpen(true)
          setQuery(value || '')
        }}
        className={`${inputCls} pl-9`}
      />
      {open && (
        <ul className="absolute left-0 right-0 top-full mt-1 max-h-52 overflow-y-auto rounded-lg border border-[#1e2433] bg-[#151922] shadow-xl z-50 py-1">
          {filtered.length === 0 ? (
            <li className="px-4 py-2.5 text-sm text-zinc-500">No flats found</li>
          ) : (
            filtered.map(f => (
              <li
                key={f}
                onMouseDown={e => e.preventDefault()}
                onClick={() => {
                  onChange(f)
                  setOpen(false)
                  setQuery('')
                }}
                className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-violet-600/20 transition-colors ${
                  value === f ? 'text-violet-300 bg-violet-600/10' : 'text-zinc-200'
                }`}
              >
                {f}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}

export default function FinanceApp() {
  const [transactions, setTransactions] = useState([])
  const [corpusTransactions, setCorpusTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [corpusLoading, setCorpusLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [showBudgetAlert, setShowBudgetAlert] = useState(false)
  const [budgetDismissed, setBudgetDismissed] = useState(false)
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState('expense')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [category, setCategory] = useState('Maintenance Cost')
  const [flatNo, setFlatNo] = useState('')
  const [otherCategory, setOtherCategory] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editFields, setEditFields] = useState({})
  const [editOtherCategory, setEditOtherCategory] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return String(now.getMonth() + 1).padStart(2, '0')
  })
  const [dashboardTypeFilter, setDashboardTypeFilter] = useState('all')
  const [dashboardMergeByFlat, setDashboardMergeByFlat] = useState(true)
  const [reportSearchQuery, setReportSearchQuery] = useState('')
  const [reportSelectedMonth, setReportSelectedMonth] = useState('')
  const [dashboardMonth, setDashboardMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [showOverallModal, setShowOverallModal] = useState(false)
  const [mergeByFlat, setMergeByFlat] = useState(true)
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
  const isHomeLikePage = activePage === 'home' || activePage === 'corpus'
  const formCategories = getCategories(activePage, type)

  useEffect(() => {
    if (!formCategories.includes(category)) {
      setCategory(formCategories[0])
      setOtherCategory('')
    }
  }, [activePage, type])

  const handleTypeChange = (newType) => {
    setType(newType)
    if (activePage === 'corpus') {
      const cats = getCategories('corpus', newType)
      setCategory(cats[0])
      setOtherCategory('')
    }
  }

  // ── Electricity Tracker state ──
  const [elecRecords, setElecRecords] = useState([])
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [elecLoading, setElecLoading] = useState(false)
  const [elecSearch, setElecSearch] = useState('')
  const [elecMonthFilter, setElecMonthFilter] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [elecStatusFilter, setElecStatusFilter] = useState('all')
  const [elecEditingKey, setElecEditingKey] = useState(null)
  const [elecEditFields, setElecEditFields] = useState({ amount: '', usn: '' })
  const [elecSaving, setElecSaving] = useState(false)

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
        .eq('month', elecMonthFilter)
        .order('flat_no', { ascending: true })
      if (error) throw error
      setElecRecords(data || [])
    } catch (error) {
      showToast('error', 'Failed to load electricity payments: ' + error.message)
    } finally {
      setElecLoading(false)
    }
  }

  useEffect(() => {
    if (activePage === 'electricity') fetchElecRecords()
  }, [activePage, elecMonthFilter])

  const startElecEdit = (record) => {
    setElecEditingKey(`rec-${record.id}`)
    setElecEditFields({ amount: record.amount ?? '', usn: record.usn ?? '' })
  }

  const startElecAdd = (flatNo) => {
    setElecEditingKey(`new-${flatNo}`)
    setElecEditFields({ amount: '', usn: '' })
  }

  const cancelElecEdit = () => {
    setElecEditingKey(null)
    setElecEditFields({ amount: '', usn: '' })
  }

  const saveElecEdit = async (record, flatNo) => {
    if (!elecEditFields.amount) {
      showToast('error', 'Please enter the amount')
      return
    }
    setElecSaving(true)
    try {
      if (record) {
        // Editing an existing paid record
        const { error } = await supabase
          .from('electricity_payments')
          .update({ amount: Number(elecEditFields.amount), usn: elecEditFields.usn || null })
          .eq('id', record.id)
        if (error) throw error
        setElecRecords(prev => prev.map(r => r.id === record.id ? { ...r, amount: Number(elecEditFields.amount), usn: elecEditFields.usn || null } : r))
        showToast('success', 'Electricity record updated!')
      } else {
        // Adding a new paid record for a pending flat
        const { data, error } = await supabase
          .from('electricity_payments')
          .insert([{ flat_no: flatNo, amount: Number(elecEditFields.amount), usn: elecEditFields.usn || null, paid: true, month: elecMonthFilter }])
          .select()
        if (error) throw error
        setElecRecords(prev => [...prev, data[0]])
        showToast('success', 'Payment added!')
      }
      cancelElecEdit()
    } catch (error) {
      showToast('error', 'Failed to save: ' + error.message)
    } finally {
      setElecSaving(false)
    }
  }

  const markElecUnpaid = async (record) => {
    setElecSaving(true)
    try {
      const { error } = await supabase
        .from('electricity_payments')
        .delete()
        .eq('id', record.id)
      if (error) throw error
      setElecRecords(prev => prev.filter(r => r.id !== record.id))
      cancelElecEdit()
      showToast('success', 'Marked as pending!')
    } catch (error) {
      showToast('error', 'Failed to update: ' + error.message)
    } finally {
      setElecSaving(false)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) {
      fetchTransactions()
      fetchCorpusTransactions()
    }
  }, [session])

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

  const fetchCorpusTransactions = async () => {
    setCorpusLoading(true)
    try {
      const { data, error } = await supabase
        .from('corpus_transactions')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setCorpusTransactions(data || [])
    } catch (error) {
      showToast('error', 'Failed to load corpus fund: ' + error.message)
    } finally {
      setCorpusLoading(false)
    }
  }

  const addTransaction = async () => {
    if (!amount || !date || (category === 'Others' && !otherCategory.trim())) {
      showToast('error', 'Please fill in all fields')
      return
    }
    setSaving(true)
    const isCorpusPage = activePage === 'corpus'
    const table = isCorpusPage ? 'corpus_transactions' : 'transactions'
    try {
      const effectiveCategory = category === 'Others' && otherCategory.trim() ? otherCategory.trim() : category
      const newTransaction = { title: effectiveCategory, amount: Number(amount), type, category: effectiveCategory, date, flat_no: type === 'income' ? flatNo : null }
      const { data, error } = await supabase.from(table).insert([newTransaction]).select()
      if (error) throw error
      if (isCorpusPage) {
        setCorpusTransactions(prev => [data[0], ...prev])
      } else {
        setTransactions(prev => [data[0], ...prev])
        if (type === 'expense') setBudgetDismissed(false)
      }
      setAmount(''); setDate(new Date().toISOString().split('T')[0]); setCategory(getCategories(activePage, type)[0]); setFlatNo(''); setOtherCategory('')
      showToast('success', 'Transaction saved!')
    } catch (error) {
      showToast('error', 'Failed to save: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const editTransaction = (item) => {
    setEditingId(item.id)
    const isCustom = isCustomCategory(item.category, activePage, item.type)
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

    const isCorpusPage = activePage === 'corpus'
    const table = isCorpusPage ? 'corpus_transactions' : 'transactions'
    const updated = {
      title: effectiveCategory,
      amount: Number(editFields.amount),
      category: effectiveCategory,
      date: editFields.date,
      flat_no: editFields.type === 'income' ? editFields.flat_no : null,
    }
    try {
      const { error } = await supabase.from(table).update(updated).eq('id', editingId)
      if (error) throw error
      const applyUpdate = t =>
        t.id === editingId ? { ...t, ...updated } : t
      if (isCorpusPage) {
        setCorpusTransactions(prev => prev.map(applyUpdate))
      } else {
        setTransactions(prev => prev.map(applyUpdate))
      }
      setEditingId(null)
      setEditFields({})
      setEditOtherCategory('')
      showToast('success', 'Transaction updated!')
    } catch (error) {
      showToast('error', 'Failed to update: ' + error.message)
    }
  }

  const deleteTransaction = async (id) => {
    const isCorpusPage = activePage === 'corpus'
    const table = isCorpusPage ? 'corpus_transactions' : 'transactions'
    try {
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) throw error
      if (isCorpusPage) {
        setCorpusTransactions(prev => prev.filter(t => t.id !== id))
      } else {
        setTransactions(prev => prev.filter(t => t.id !== id))
      }
      showToast('success', 'Transaction deleted!')
    } catch (error) {
      showToast('error', 'Failed to delete: ' + error.message)
    }
  }

  const totalIncome = useMemo(() => transactions.filter(i => i.type === 'income').reduce((s, i) => s + Number(i.amount), 0), [transactions])
  const totalExpense = useMemo(() => transactions.filter(i => i.type === 'expense').reduce((s, i) => s + Number(i.amount), 0), [transactions])
  const balance = totalIncome - totalExpense

  const corpusIncome = useMemo(
    () => corpusTransactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0),
    [corpusTransactions]
  )
  const corpusExpense = useMemo(
    () => corpusTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0),
    [corpusTransactions]
  )

  const pageLoading = activePage === 'corpus' ? corpusLoading : loading
  const refreshTransactions = activePage === 'corpus' ? fetchCorpusTransactions : fetchTransactions

  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) return
    setLoginLoading(true)
    setLoginError('')
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword })
    if (error) {
      setLoginError('Invalid email or password. Please try again.')
    }
    setLoginLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setSession(null)
  }

  const downloadExcel = (pageType) => {
    const data = pageType === 'corpus' ? corpusTransactions : transactions
    if (!data || data.length === 0) {
      showToast('error', 'No data to download')
      return
    }
    const rows = data.map(t => ({
      'Date': formatDateDisplay(t.date),
      'Flat No.': t.flat_no || '—',
      'Category': t.category || '—',
      'Type': t.type === 'income' ? 'Income' : 'Expense',
      'Amount (₹)': Number(t.amount),
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [{ wch: 14 }, { wch: 12 }, { wch: 22 }, { wch: 10 }, { wch: 14 }]
    const wb = XLSX.utils.book_new()
    const sheetName = pageType === 'corpus' ? 'Corpus Fund' : 'Transactions'
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
    const fileName = pageType === 'corpus'
      ? `GreenMeadows_CorpusFund_${new Date().toISOString().slice(0, 10)}.xlsx`
      : `GreenMeadows_Transactions_${new Date().toISOString().slice(0, 10)}.xlsx`
    XLSX.writeFile(wb, fileName)
    showToast('success', 'Excel downloaded!')
  }
  const corpusBalance = corpusIncome - corpusExpense
  const corpusUsedPercent = corpusIncome > 0
    ? Math.min((corpusExpense / corpusIncome) * 100, 100)
    : corpusExpense > 0 ? 100 : 0

  const pageIncome = activePage === 'corpus' ? corpusIncome : totalIncome
  const pageExpense = activePage === 'corpus' ? corpusExpense : totalExpense
  const pageBalance = activePage === 'corpus' ? corpusBalance : balance

  const dashboardMonthIncome = useMemo(
    () => transactions.filter(t => t.type === 'income' && t.date?.slice(0, 7) === dashboardMonth).reduce((s, t) => s + Number(t.amount), 0),
    [transactions, dashboardMonth]
  )
  const dashboardMonthExpense = useMemo(
    () => transactions.filter(t => t.type === 'expense' && t.date?.slice(0, 7) === dashboardMonth).reduce((s, t) => s + Number(t.amount), 0),
    [transactions, dashboardMonth]
  )
  const dashboardMonthBalance = dashboardMonthIncome - dashboardMonthExpense
  const dashboardMonthLabel = (() => {
    const [y, m] = dashboardMonth.split('-')
    return new Date(Number(y), Number(m) - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' })
  })()
  const expensePercentage = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0
  const incomePercentage = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0
  const chartData = [{ name: 'Income', value: totalIncome }, { name: 'Expense', value: totalExpense }]
  const monthlyData = useMemo(() => {
    const grouped = {}
    transactions.forEach(t => {
      if (!t.date) return
      const key = t.date.slice(0, 7)
      if (!grouped[key]) grouped[key] = { key, income: 0, expense: 0 }
      if (t.type === 'income') grouped[key].income += Number(t.amount)
      else grouped[key].expense += Number(t.amount)
    })
    return Object.values(grouped)
      .sort((a, b) => a.key.localeCompare(b.key))
      .map(g => {
        const [y, m] = g.key.split('-')
        const label = new Date(Number(y), Number(m) - 1, 1).toLocaleString('default', { month: 'short', year: '2-digit' })
        return { name: label, income: g.income, expense: g.expense }
      })
  }, [transactions])

  const incomeBreakdown = useMemo(() => {
    const grouped = {}
    transactions.filter(t => t.type === 'income').forEach(t => {
      const cat = t.category || 'Others'
      grouped[cat] = (grouped[cat] || 0) + Number(t.amount)
    })
    return Object.entries(grouped).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [transactions])

  const expenseBreakdown = useMemo(() => {
    const grouped = {}
    transactions.filter(t => t.type === 'expense').forEach(t => {
      const cat = t.category || 'Others'
      grouped[cat] = (grouped[cat] || 0) + Number(t.amount)
    })
    return Object.entries(grouped).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [transactions])

  const DONUT_COLORS = ['#4ade80','#60a5fa','#f59e0b','#f87171','#a78bfa','#34d399','#fb923c','#38bdf8','#e879f9','#facc15']
  const COLORS = ['#22c55e', '#ef4444']

  const formatAmount = (n) => `₹${Number(n).toLocaleString('en-IN')}`

  // Auth loading
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0c0e14]">
        <Loader2 size={36} className="animate-spin text-zinc-500" />
      </div>
    )
  }

  // Login page
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0c0e14] text-white px-4">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-violet-800 flex items-center justify-center mx-auto mb-5 shadow-[0_0_40px_rgba(124,58,237,0.4)]">
              <Landmark size={30} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Green Meadows</h1>
            <p className="text-zinc-500 text-sm mt-1">Block A · Balance Sheet</p>
          </div>

          {/* Login Card */}
          <div className="bg-[#0f1319] border border-[#1e2433] rounded-2xl p-8 shadow-2xl">
            <h2 className="text-lg font-semibold mb-6">Sign in to continue</h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block">Email</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={e => { setLoginEmail(e.target.value); setLoginError('') }}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  placeholder="Enter your email"
                  className="w-full bg-[#151922] border border-[#1e2433] rounded-xl px-4 py-3 outline-none text-white placeholder:text-zinc-600 focus:border-violet-600 transition-colors text-sm"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block">Password</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={e => { setLoginPassword(e.target.value); setLoginError('') }}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  placeholder="Enter your password"
                  className="w-full bg-[#151922] border border-[#1e2433] rounded-xl px-4 py-3 outline-none text-white placeholder:text-zinc-600 focus:border-violet-600 transition-colors text-sm"
                />
              </div>

              {loginError && (
                <div className="flex items-center gap-2 bg-red-950/60 border border-red-800 rounded-xl px-4 py-3 text-red-400 text-sm">
                  <AlertCircle size={15} />
                  {loginError}
                </div>
              )}

              <button
                onClick={handleLogin}
                disabled={!loginEmail || !loginPassword || loginLoading}
                className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold transition-all mt-2 flex items-center justify-center gap-2"
              >
                {loginLoading ? <><Loader2 size={17} className="animate-spin" /> Signing in...</> : 'Login'}
              </button>
            </div>
          </div>

          <p className="text-center text-zinc-600 text-xs mt-6">
            Green Meadows Society Management · Block A
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex bg-[#0c0e14] text-white overflow-hidden">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl border transition-all duration-300 ${
          toast.type === 'success' ? 'bg-green-950/90 border-green-700 text-green-300' : 'bg-red-950/90 border-red-700 text-red-300'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Budget Alert Banner */}
      {showBudgetAlert && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-lg px-4 md:ml-64">
          <div className="bg-red-950 border border-red-500 rounded-xl p-5 shadow-[0_0_40px_rgba(239,68,68,0.3)]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="bg-red-500 rounded-lg p-2 mt-0.5">
                  <Bell size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="text-red-300 font-bold text-base">Monthly Budget Exceeded</h3>
                  <p className="text-red-400 text-sm mt-1">
                    You've spent <span className="text-white font-bold">{formatAmount(currentMonthExpense)}</span> this month,
                    which is <span className="text-white font-bold">{formatAmount(Math.abs(budgetRemaining))}</span> over your {formatAmount(BUDGET_LIMIT)} budget.
                  </p>
                  <div className="mt-3">
                    <div className="w-full bg-red-900 rounded-full h-2">
                      <div className="bg-red-500 h-2 rounded-full transition-all duration-500" style={{ width: `${budgetUsedPercent}%` }} />
                    </div>
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

      {/* Overall View Modal */}
      {showOverallModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4" onClick={() => setShowOverallModal(false)}>
          <div className={`${panel} w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xl font-bold text-white">Overall View</h2>
              <button onClick={() => setShowOverallModal(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <p className="text-xs text-zinc-500 mb-5">All-time totals across every transaction</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Total Income', value: formatAmount(totalIncome), icon: TrendingUp, badge: 'bg-green-900/60 border-green-700 text-green-400' },
                { label: 'Total Expense', value: formatAmount(totalExpense), icon: TrendingDown, badge: 'bg-red-900/60 border-red-700 text-red-400' },
                { label: 'Total Balance', value: formatAmount(balance), icon: Wallet, badge: 'bg-blue-900/60 border-blue-700 text-blue-400' },
              ].map(({ label, value, icon: Icon, badge }) => (
                <div key={label} className="bg-[#0f1319] border border-[#1e2433] rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-zinc-400 mb-1.5">{label}</p>
                      <p className="text-lg md:text-xl font-bold text-white">{value}</p>
                    </div>
                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${badge}`}>
                      <Icon size={14} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <h3 className="text-sm font-semibold text-zinc-300 mb-1">Month-wise Trend</h3>
            <div className="flex items-center gap-4 text-xs text-zinc-400 mb-3">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-green-400 inline-block"></span>Income</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block"></span>Expense</span>
            </div>
            {monthlyData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-zinc-500 text-sm">No data yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2433" vertical={false} />
                  <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value, name) => [`₹ ${Number(value).toLocaleString()}`, name === 'income' ? 'Income' : 'Expense']}
                    contentStyle={{ background: '#0f1319', border: '1px solid #1e2433', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="income" fill="#4ade80" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" fill="#f87171" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* Sidebar — desktop */}
      <aside className="hidden md:flex w-64 flex-shrink-0 flex-col bg-[#080a0f] border-r border-[#1e2433] px-4 py-6 h-screen sticky top-0">
        <div className="flex items-center gap-3 px-2 mb-8">
          <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center text-sm font-bold text-white">GM</div>
          <span className="font-semibold text-white">Green Meadows</span>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          {NAV_ITEMS.map(({ page, label, icon: Icon }) => (
            <button
              key={page}
              onClick={() => setActivePage(page)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activePage === page
                  ? 'bg-violet-600/25 text-violet-300'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
        {/* User info + Logout */}
        <div className="mt-auto border-t border-[#1e2433] pt-4">
          <div className="flex items-center gap-3 px-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-300">
              {session?.user?.email?.charAt(0).toUpperCase()}
            </div>
            <p className="text-xs text-zinc-400 truncate flex-1">{session?.user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-500 hover:text-red-400 hover:bg-red-950/30 transition-colors"
          >
            <X size={17} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen pb-24 md:pb-8">
          <p className="text-[11px] font-semibold tracking-widest text-zinc-500 uppercase mb-1">Green Meadows : Block A</p>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-white">{PAGE_TITLES[activePage]}</h1>
            {activePage === 'home' && (
              <div className="flex items-center gap-2">
                <input
                  type="month"
                  value={dashboardMonth}
                  onChange={e => setDashboardMonth(e.target.value)}
                  className={`${inputCls} w-auto`}
                />
                <button
                  onClick={() => setShowOverallModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-violet-700/40 bg-violet-900/20 hover:bg-violet-900/40 transition-colors text-violet-300 text-sm font-semibold whitespace-nowrap"
                >
                  <BarChart3 size={15} />
                  Overall View
                </button>
              </div>
            )}
          </div>

        {/* Monthly Budget Bar — home page only */}
        {activePage === 'home' && dashboardMonthIncome > 0 && (
          <div className={`${panel} p-5 mb-6`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-zinc-300">Income vs Expenditure — {dashboardMonthLabel}</span>
              <span className="text-xs text-zinc-500">
                <span className="text-green-400 font-semibold">₹{dashboardMonthIncome.toLocaleString()}</span>
                <span className="text-zinc-600"> / </span>
                <span className="text-red-400 font-semibold">₹{dashboardMonthExpense.toLocaleString()}</span>
              </span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden flex">
              <div
                className="h-3 bg-green-500 transition-all duration-700 rounded-l-full"
                style={{ width: `${dashboardMonthIncome > 0 ? Math.min((dashboardMonthIncome / (dashboardMonthIncome + dashboardMonthExpense)) * 100, 100) : 0}%` }}
              />
              <div
                className="h-3 bg-red-500 transition-all duration-700 rounded-r-full"
                style={{ width: `${dashboardMonthIncome > 0 ? Math.min((dashboardMonthExpense / (dashboardMonthIncome + dashboardMonthExpense)) * 100, 100) : 0}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-zinc-500">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>Income {dashboardMonthIncome > 0 ? Math.round((dashboardMonthIncome / (dashboardMonthIncome + dashboardMonthExpense)) * 100) : 0}%</span>
              <span>{dashboardMonthBalance >= 0 ? <span className="text-green-400">₹{dashboardMonthBalance.toLocaleString()} surplus</span> : <span className="text-red-400">₹{Math.abs(dashboardMonthBalance).toLocaleString()} deficit</span>}</span>
              <span className="flex items-center gap-1.5">Expense {dashboardMonthIncome > 0 ? Math.round((dashboardMonthExpense / (dashboardMonthIncome + dashboardMonthExpense)) * 100) : 0}% <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span></span>
            </div>
          </div>
        )}
        {activePage === 'home' && currentMonthExpense > 0 && (
          <div className={`${panel} p-5 mb-6 ${
            currentMonthExpense >= BUDGET_LIMIT
              ? 'border-red-800/60'
              : currentMonthExpense >= BUDGET_LIMIT * 0.8
              ? 'border-yellow-800/60'
              : ''
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

        {/* Corpus Fund Bar — corpus page only */}
        {activePage === 'corpus' && (
          <div className={`${panel} p-5 mb-6 ${
            corpusExpense >= corpusIncome && corpusIncome > 0
              ? 'border-red-800/60'
              : corpusUsedPercent >= 80
              ? 'border-yellow-800/60'
              : ''
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Landmark size={18} className={
                  corpusExpense >= corpusIncome && corpusIncome > 0 ? 'text-red-400'
                  : corpusUsedPercent >= 80 ? 'text-yellow-400'
                  : 'text-green-400'
                } />
                <span className="font-semibold text-sm">Corpus Fund</span>
              </div>
              <span className={`text-sm font-bold ${
                corpusExpense >= corpusIncome && corpusIncome > 0 ? 'text-red-400'
                : corpusUsedPercent >= 80 ? 'text-yellow-400'
                : 'text-zinc-300'
              }`}>
                <span className="text-red-400">₹ {corpusExpense.toLocaleString()}</span>
                <span className="text-zinc-500 font-normal"> used / </span>
                <span className="text-green-400">₹ {corpusIncome.toLocaleString()}</span>
                <span className="text-zinc-500 font-normal"> received</span>
              </span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-700 ${
                  corpusExpense >= corpusIncome && corpusIncome > 0 ? 'bg-red-500'
                  : corpusUsedPercent >= 80 ? 'bg-yellow-500'
                  : 'bg-green-500'
                }`}
                style={{ width: `${corpusUsedPercent}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-zinc-500">
              <span>{corpusUsedPercent.toFixed(0)}% of corpus fund used</span>
              <span>
                {corpusBalance >= 0
                  ? `₹ ${corpusBalance.toLocaleString()} available`
                  : `₹ ${Math.abs(corpusBalance).toLocaleString()} overdrawn`}
              </span>
            </div>
          </div>
        )}

        {/* Summary Cards — home & corpus pages */}
        {isHomeLikePage && (
          <>
            {activePage === 'home' && (
              <p className="text-xs text-zinc-500 mb-3 -mt-2">Showing data for <span className="text-zinc-300 font-medium">{dashboardMonthLabel}</span></p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {[
                { label: activePage === 'corpus' ? 'Received' : 'Income', value: formatAmount(activePage === 'home' ? dashboardMonthIncome : pageIncome), icon: TrendingUp, badge: 'bg-green-900/60 border-green-700 text-green-400' },
                { label: activePage === 'corpus' ? 'Used' : 'Expense', value: formatAmount(activePage === 'home' ? dashboardMonthExpense : pageExpense), icon: TrendingDown, badge: 'bg-red-900/60 border-red-700 text-red-400' },
                { label: 'Balance', value: formatAmount(activePage === 'home' ? dashboardMonthBalance : pageBalance), icon: Wallet, badge: 'bg-blue-900/60 border-blue-700 text-blue-400' },
              ].map(({ label, value, icon: Icon, badge }) => (
                <div key={label} className={`${panel} p-5 relative`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-zinc-400 mb-2">{label}</p>
                      <p className="text-2xl md:text-3xl font-bold text-white">{value}</p>
                    </div>
                    <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${badge}`}>
                      <Icon size={16} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Home & Corpus Pages */}
        {isHomeLikePage && (
          <div className="flex flex-col gap-6">
            <div className={`${panel} p-5`}>
              <div className="flex items-center gap-2 mb-4">
                <Plus size={18} className="text-violet-400" />
                <h3 className="text-base font-semibold">Add Transaction</h3>
              </div>
              <div className="flex bg-[#0f1319] rounded-lg p-1 mb-4 max-w-xs">
                {['expense', 'income'].map(t => (
                  <button key={t} onClick={() => handleTypeChange(t)}
                    className={`flex-1 py-2 rounded-md text-sm font-medium transition-all capitalize ${type === t ? (t === 'expense' ? 'bg-red-600 text-white' : 'bg-green-600 text-white') : 'text-zinc-500'}`}>
                    {t}
                  </button>
                ))}
              </div>
              <div className="flex flex-col md:flex-row md:items-end gap-3">
                {type === 'income' && (
                  <div className="md:flex-1">
                    <SearchableFlatSelect value={flatNo} onChange={setFlatNo} flats={flatNumbers} />
                  </div>
                )}
                <div className="md:flex-1">
                  <input value={date} onChange={e => setDate(e.target.value)} type="date" className={inputCls} />
                </div>
                <div className="md:flex-[1.2]">
                  <select value={category} onChange={e => { setCategory(e.target.value); setOtherCategory('') }} className={inputCls}>
                    {formCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="md:flex-1">
                  <input value={amount} onChange={e => setAmount(e.target.value)} type="number" min="0" placeholder="Amount" className={inputCls} />
                </div>
                <button onClick={addTransaction} disabled={saving}
                  className="bg-violet-600 hover:bg-violet-500 text-white px-6 py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-colors whitespace-nowrap">
                  {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : '+ Add'}
                </button>
              </div>
              {category === 'Others' && (
                <div className="mt-3">
                  <input
                    value={otherCategory}
                    onChange={e => setOtherCategory(e.target.value.slice(0, 30))}
                    placeholder="Please specify category..."
                    maxLength={30}
                    className={`${inputCls} border-amber-500/40`}
                  />
                  <p className="text-xs text-zinc-500 mt-1 text-right">{otherCategory.length}/30</p>
                </div>
              )}
            </div>

            <div className={`${panel} overflow-hidden`}>
              <div className="p-5 border-b border-[#1e2433] flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Transactions</h2>
                    <p className="text-sm text-zinc-500 mt-0.5">
                      {activePage === 'home'
                        ? `${['January','February','March','April','May','June','July','August','September','October','November','December'][parseInt(selectedMonth)-1] || 'All months'} — merged by flat`
                        : 'Monthly overview of all transactions'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    {/* All / Income / Expenditure filter — home page only */}
                    {activePage === 'home' && (
                      <div className="flex bg-[#0f1319] border border-[#1e2433] rounded-lg p-1 gap-1">
                        {[['all','All'],['income','Income'],['expense','Expenditure']].map(([val, label]) => (
                          <button
                            key={val}
                            onClick={() => setDashboardTypeFilter(val)}
                            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                              dashboardTypeFilter === val
                                ? val === 'income' ? 'bg-green-600 text-white' : val === 'expense' ? 'bg-red-600 text-white' : 'bg-violet-600 text-white'
                                : 'text-zinc-400 hover:text-white'
                            }`}
                          >{label}</button>
                        ))}
                      </div>
                    )}
                    <div className="relative">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search..."
                        className={`${inputCls} pl-9 pr-9 min-w-[160px]`}
                      />
                      {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <select
                        value={selectedMonth}
                        onChange={e => setSelectedMonth(e.target.value)}
                        className={`${inputCls} pr-9 appearance-none min-w-[130px]`}
                      >
                        <option value="">All Months</option>
                        {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
                          <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                    </div>
                    {/* Merge by flat toggle — home page only */}
                    {activePage === 'home' && (
                      <button
                        onClick={() => setDashboardMergeByFlat(!dashboardMergeByFlat)}
                        className={`text-xs px-3 py-2.5 rounded-lg border transition-all whitespace-nowrap ${dashboardMergeByFlat ? 'bg-violet-600/20 border-violet-500/40 text-violet-300' : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'}`}
                      >
                        {dashboardMergeByFlat ? '✓ Merged' : 'Merge by flat'}
                      </button>
                    )}
                    <button onClick={refreshTransactions} className="p-2.5 rounded-lg border border-[#1e2433] bg-[#0f1319] hover:bg-[#1a2030] transition-colors" title="Refresh">
                      <Loader2 size={16} className={`text-zinc-400 ${pageLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      onClick={() => downloadExcel(activePage)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-green-700/40 bg-green-900/20 hover:bg-green-900/40 transition-colors text-green-400 text-sm font-semibold"
                    >
                      <Download size={15} />
                      <span className="hidden sm:inline">Excel</span>
                    </button>
                  </div>
                </div>
              </div>
              {pageLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 size={32} className="animate-spin text-zinc-400" />
                  <p className="text-zinc-500 text-sm">Loading from database...</p>
                </div>
              ) : (() => {
                const listTransactions = activePage === 'corpus' ? corpusTransactions : transactions
                if (listTransactions.length === 0) {
                  return (
                    <div className="text-center py-20 text-zinc-500">
                      <Wallet size={40} className="mx-auto mb-3 opacity-30" />
                      <p>{activePage === 'corpus' ? 'No corpus fund transactions yet.' : 'No transactions yet. Add your first one!'}</p>
                    </div>
                  )
                }
                const q = searchQuery.trim().toLowerCase()
                let filtered = listTransactions.filter(t => {
                  const matchesSearch = !q || (
                    t.category?.toLowerCase().includes(q) ||
                    t.title?.toLowerCase().includes(q) ||
                    (t.flat_no && t.flat_no.toLowerCase().includes(q)) ||
                    String(t.amount).includes(q) ||
                    formatDateDisplay(t.date).includes(q)
                  )
                  const matchesMonth = !selectedMonth || (t.date && t.date.split('-')[1] === selectedMonth)
                  const matchesType = activePage !== 'home' || dashboardTypeFilter === 'all' || t.type === dashboardTypeFilter
                  // Hide electricity from dashboard home merged view
                  const hideElec = activePage === 'home' && dashboardMergeByFlat && t.category?.toLowerCase().includes('electricity')
                  return matchesSearch && matchesMonth && matchesType && !hideElec
                })

                // Merge by flat (home page only)
                if (activePage === 'home' && dashboardMergeByFlat) {
                  const groups = new Map()
                  const order = []
                  filtered.forEach(item => {
                    if (!item.flat_no) {
                      const soloKey = `solo-${item.id}`
                      groups.set(soloKey, { ...item, categories: [item.category], ids: [item.id] })
                      order.push(soloKey)
                      return
                    }
                    const key = `${item.flat_no}-${item.date}-${item.type}`
                    if (groups.has(key)) {
                      const g = groups.get(key)
                      g.amount = Number(g.amount) + Number(item.amount)
                      g.categories.push(item.category)
                      g.ids.push(item.id)
                    } else {
                      groups.set(key, { ...item, categories: [item.category], ids: [item.id] })
                      order.push(key)
                    }
                  })
                  filtered = order.map(k => {
                    const g = groups.get(k)
                    return { ...g, title: g.categories.join(' + '), category: g.categories.join(' + ') }
                  })
                }

                const noResultMsg = selectedMonth && !q
                  ? `No transactions in ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(selectedMonth)-1]}`
                  : `No results for "${searchQuery}"`
                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-16 text-zinc-500">
                      <Search size={36} className="mx-auto mb-3 opacity-30" />
                      <p className="text-sm">{noResultMsg}</p>
                    </div>
                  )
                }
                return (
                  <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
                    <table className="w-full text-left min-w-[640px]">
                      <thead className="sticky top-0 bg-[#151922] z-10">
                        <tr className="border-b border-[#1e2433]">
                          {['DATE', 'FLAT', 'CATEGORY', 'STATUS', 'AMOUNT', ''].map(h => (
                            <th key={h} className="px-5 py-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((item, idx) => (
                          <React.Fragment key={item.id}>
                            {editingId === item.id ? (
                              <tr className="bg-[#0f1319] border-b border-[#1e2433]">
                                <td colSpan={6} className="px-5 py-4">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                    <input type="date" value={editFields.date} onChange={e => setEditFields({...editFields, date: e.target.value})} className={inputCls} />
                                    <select value={editFields.category} onChange={e => { setEditFields({...editFields, category: e.target.value}); setEditOtherCategory('') }} className={inputCls}>
                                      {getCategories(activePage, editFields.type).map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <input type="number" value={editFields.amount} onChange={e => setEditFields({...editFields, amount: e.target.value})} className={inputCls} />
                                    {editFields.type === 'income' && (
                                      <SearchableFlatSelect
                                        value={editFields.flat_no}
                                        onChange={v => setEditFields({ ...editFields, flat_no: v })}
                                        flats={flatNumbers}
                                      />
                                    )}
                                  </div>
                                  {editFields.category === 'Others' && (
                                    <input value={editOtherCategory} onChange={e => setEditOtherCategory(e.target.value.slice(0, 30))} placeholder="Specify category..." maxLength={30} className={`${inputCls} mt-3 border-amber-500/40`} />
                                  )}
                                  <div className="flex gap-2 mt-3">
                                    <button onClick={saveEdit} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1"><Check size={14} /> Save</button>
                                    <button onClick={() => { setEditingId(null); setEditFields({}); setEditOtherCategory('') }} className="bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1"><X size={14} /> Cancel</button>
                                  </div>
                                </td>
                              </tr>
                            ) : (
                              <tr className={`border-b border-[#1e2433]/80 hover:bg-[#1a2030]/50 transition-colors ${idx % 2 === 1 ? 'bg-[#0f1319]/40' : ''}`}>
                                <td className="px-5 py-4 text-sm text-zinc-300">{formatDateDisplay(item.date)}</td>
                                <td className="px-5 py-4 text-sm text-zinc-400">{item.flat_no || '—'}</td>
                                <td className="px-5 py-4 text-sm text-white font-medium">{item.category}</td>
                                <td className="px-5 py-4">
                                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                                    item.type === 'income' ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
                                  }`}>
                                    {item.type === 'income' ? 'Income' : 'Expense'}
                                  </span>
                                </td>
                                <td className={`px-5 py-4 text-sm font-semibold ${item.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                                  {formatAmount(item.amount)}
                                </td>
                                <td className="px-5 py-4">
                                  <button onClick={() => editTransaction(item)} className="text-zinc-500 hover:text-violet-400 transition-colors p-1" title="Edit">
                                    <Pencil size={16} />
                                  </button>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {/* Reports Page */}
        {activePage === 'reports' && (
         {/* <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
              <div />

              }
              <button
                onClick={() => setShowOverallModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-violet-700/40 bg-violet-900/20 hover:bg-violet-900/40 transition-colors text-violet-300 text-sm font-semibold whitespace-nowrap"
              >
                <BarChart3 size={15} />
                Overall View
              </button>

              
            </div>*/}
            <div className="flex flex-col gap-6">
              <div className={`${panel} p-6`}>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-2xl font-semibold">Financial Overview</h2>

                <button
                  onClick={() => setShowOverallModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-violet-700/40 bg-violet-900/20 hover:bg-violet-900/40 transition-colors text-violet-300 text-sm font-semibold whitespace-nowrap"
                >
                  <BarChart3 size={15} />
                  Overall View
                </button>

                  <button onClick={() => setReportView(reportView === 'table' ? 'charts' : 'table')} className="bg-white/10 border border-white/10 p-3 rounded-2xl hover:bg-white/20 transition-all"><PieChart size={20} /></button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { label: 'Savings Ratio', value: `${incomePercentage.toFixed(0)}%`, icon: <TrendingUp className="text-green-400" />, color: 'text-green-400' },
                    { label: 'Expense Ratio', value: `${expensePercentage.toFixed(0)}%`, icon: <TrendingDown className="text-red-400" />, color: 'text-red-400' },
                  ].map(({ label, value, icon, color }) => (
                    <div key={label} className="bg-[#0f1319] rounded-lg p-5 border border-[#1e2433]">
                      <div className="flex items-center justify-between mb-3"><p className="text-zinc-400">{label}</p>{icon}</div>
                      <h3 className={`text-3xl font-black ${color}`}>{value}</h3>
                    </div>
                  ))}
                  <div className="bg-[#0f1319] rounded-lg p-5 border border-[#1e2433]">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-zinc-400">This Month's Expenses</p>
                      <Bell size={18} className={currentMonthExpense >= BUDGET_LIMIT ? 'text-red-400' : 'text-zinc-500'} />
                    </div>
                    <h3 className={`text-3xl font-black ${currentMonthExpense >= BUDGET_LIMIT ? 'text-red-400' : 'text-white'}`}>
                      ₹ {currentMonthExpense.toLocaleString()}
                    </h3>
                    <p className="text-sm text-zinc-500 mt-1">Budget limit: ₹ {BUDGET_LIMIT.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {reportView === 'charts' ? (
                <div className={`${panel} p-6 h-[420px]`}>
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
                <div className={`${panel} p-6`}>
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
                    <h2 className="text-lg font-semibold">Transaction Report</h2>
                    <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                      <div className="relative flex-1 sm:min-w-[200px]">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                          type="text"
                          value={reportSearchQuery}
                          onChange={e => setReportSearchQuery(e.target.value)}
                          placeholder="Search..."
                          className={`${inputCls} pl-9 pr-9`}
                        />
                        {reportSearchQuery && (
                          <button onClick={() => setReportSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                            <X size={14} />
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type="month"
                          value={reportSelectedMonth}
                          onChange={e => setReportSelectedMonth(e.target.value)}
                          className={`${inputCls} min-w-[150px]`}
                        />
                      </div>
                      {(reportSearchQuery || reportSelectedMonth) && (
                        <button onClick={() => { setReportSearchQuery(''); setReportSelectedMonth('') }} className="text-xs text-zinc-500 hover:text-white whitespace-nowrap">
                          Clear filters
                        </button>
                      )}
                      <button
                        onClick={() => setMergeByFlat(!mergeByFlat)}
                        className={`text-xs px-3 py-2.5 rounded-xl border transition-all whitespace-nowrap ${mergeByFlat ? 'bg-violet-600/20 border-violet-500/40 text-violet-300' : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'}`}
                      >
                        {mergeByFlat ? '✓ Merged by flat' : 'Merge by flat'}
                      </button>
                      <button onClick={() => setReportView('charts')} className="bg-white/10 border border-white/10 p-2.5 rounded-xl hover:bg-white/20 transition-all flex-shrink-0"><BarChart3 size={18} /></button>
                    </div>
                  </div>
                  {(() => {
                    const rq = reportSearchQuery.trim().toLowerCase()
                    let reportFiltered = transactions.filter(item => {
                      const matchesSearch = !rq || (
                        item.title?.toLowerCase().includes(rq) ||
                        item.category?.toLowerCase().includes(rq) ||
                        (item.flat_no && item.flat_no.toLowerCase().includes(rq)) ||
                        String(item.amount).includes(rq)
                      )
                      const matchesMonth = !reportSelectedMonth || (item.date && item.date.slice(0, 7) === reportSelectedMonth)
                      return matchesSearch && matchesMonth
                    })

                    if (mergeByFlat) {
                      const groups = new Map()
                      const order = []
                      reportFiltered.forEach(item => {
                        if (!item.flat_no) {
                          const soloKey = `solo-${item.id}`
                          groups.set(soloKey, { ...item, categories: [item.category], ids: [item.id] })
                          order.push(soloKey)
                          return
                        }
                        const key = `${item.flat_no}-${item.date}-${item.type}`
                        if (groups.has(key)) {
                          const g = groups.get(key)
                          g.amount = Number(g.amount) + Number(item.amount)
                          g.categories.push(item.category)
                          g.ids.push(item.id)
                        } else {
                          groups.set(key, { ...item, categories: [item.category], ids: [item.id] })
                          order.push(key)
                        }
                      })
                      reportFiltered = order.map(k => {
                        const g = groups.get(k)
                        return { ...g, title: g.categories.join(' + '), category: g.categories.join(' + ') }
                      })
                    }

                    if (reportFiltered.length === 0) {
                      return (
                        <div className="text-center py-16 text-zinc-500">
                          <Search size={32} className="mx-auto mb-3 opacity-30" />
                          <p className="text-sm">No transactions found.</p>
                        </div>
                      )
                    }
                    return (
                      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                        <table className="w-full text-left min-w-[560px]">
                          <thead className="sticky top-0 bg-[#151922]">
                            <tr className="border-b border-white/10 text-zinc-400">
                              {['Flat No.', 'Date', 'Category', 'Amount'].map(h => <th key={h} className="pb-4 pr-4 pt-1 text-xs font-semibold uppercase tracking-wider">{h}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {reportFiltered.map(item => (
                              <tr key={item.ids ? item.ids.join('-') : item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                <td className="py-4 text-xs pr-4 text-zinc-400">{item.flat_no || '—'}</td>
                                <td className="py-4 text-xs pr-4">{formatDateDisplay(item.date)}</td>
                                <td className="py-4 text-xs pr-4 max-w-[220px]">{item.category}</td>
                                <td className={`py-4 text-xs font-semibold ${item.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                                  {item.type === 'income' ? '+' : '-'}₹ {Number(item.amount).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Bar Chart — Financial Trend */}
              <div className={`${panel} p-6`}>
                <h2 className="text-lg font-semibold mb-1">Financial Trend</h2>
                <div className="flex items-center gap-4 text-xs text-zinc-400 mb-4">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-green-400 inline-block"></span>Income</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block"></span>Expenditure</span>
                </div>
                {monthlyData.length === 0 ? (
                  <div className="flex items-center justify-center h-64 text-zinc-500 text-sm">No data yet.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }} barCategoryGap="30%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e2433" vertical={false} />
                      <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                      <Tooltip
                        formatter={(value, name) => [`₹ ${Number(value).toLocaleString()}`, name === 'income' ? 'Income' : 'Expenditure']}
                        contentStyle={{ background: '#0f1319', border: '1px solid #1e2433', borderRadius: 8, fontSize: 12 }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Bar dataKey="income" fill="#4ade80" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expense" fill="#f87171" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Income Breakdown Donut */}
              <div className={`${panel} p-6`}>
                <h2 className="text-lg font-semibold mb-4">Income Breakdown</h2>
                {incomeBreakdown.length === 0 ? (
                  <div className="flex items-center justify-center h-64 text-zinc-500 text-sm">No income data.</div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={200}>
                      <RePieChart>
                        <Pie data={incomeBreakdown} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={2}>
                          {incomeBreakdown.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} stroke="transparent" />)}
                        </Pie>
                        <Tooltip formatter={(value) => `₹ ${Number(value).toLocaleString()}`} contentStyle={{ background: '#0f1319', border: '1px solid #1e2433', borderRadius: 8, fontSize: 12 }} />
                      </RePieChart>
                    </ResponsiveContainer>
                    <div className="mt-3 space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {incomeBreakdown.map((item, i) => (
                        <div key={item.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }}></span>
                            <span className="text-zinc-300 truncate max-w-[120px]">{item.name}</span>
                          </div>
                          <span className="text-zinc-400">₹{Number(item.value).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Expense Breakdown Donut */}
              <div className={`${panel} p-6`}>
                <h2 className="text-lg font-semibold mb-4">Expense Breakdown</h2>
                {expenseBreakdown.length === 0 ? (
                  <div className="flex items-center justify-center h-64 text-zinc-500 text-sm">No expense data.</div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={200}>
                      <RePieChart>
                        <Pie data={expenseBreakdown} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={2}>
                          {expenseBreakdown.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} stroke="transparent" />)}
                        </Pie>
                        <Tooltip formatter={(value) => `₹ ${Number(value).toLocaleString()}`} contentStyle={{ background: '#0f1319', border: '1px solid #1e2433', borderRadius: 8, fontSize: 12 }} />
                      </RePieChart>
                    </ResponsiveContainer>
                    <div className="mt-3 space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {expenseBreakdown.map((item, i) => (
                        <div key={item.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }}></span>
                            <span className="text-zinc-300 truncate max-w-[120px]">{item.name}</span>
                          </div>
                          <span className="text-zinc-400">₹{Number(item.value).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Electricity Tracker Page */}
        {activePage === 'electricity' && (() => {
          const now = new Date()
          const [filterYear, filterMonth] = elecMonthFilter.split('-')

          // Total is always fixed at 55 flats
          const TOTAL_FLATS = 55

          // All records for selected month (unaffected by search/status filters)
          const allForMonth = elecRecords.filter(r => !elecMonthFilter || r.month === elecMonthFilter)
          const paidCount = allForMonth.filter(r => r.paid === true).length
          const pendingCount = TOTAL_FLATS - paidCount

          const filtered = elecRecords.filter(r => {
            const matchMonth = !elecMonthFilter || r.month === elecMonthFilter
            const matchSearch = !elecSearch || r.flat_no?.toLowerCase().includes(elecSearch.toLowerCase())
            const matchStatus = elecStatusFilter === 'all' || (elecStatusFilter === 'paid' ? r.paid === true : r.paid !== true)
            return matchMonth && matchSearch && matchStatus
          })

          const monthOptions = []
          for (let i = 0; i < 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
            const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            const label = d.toLocaleString('default', { month: 'long', year: 'numeric' })
            monthOptions.push({ val, label })
          }

          // Normalize flat_no: strip "Flat-" prefix for comparison
          const normalizeFlatNo = (f) => f?.replace(/^Flat-/i, '').trim()

          // Build paid set using normalized flat numbers
          const paidFlatNos = new Set(
            allForMonth.filter(r => r.paid === true).map(r => normalizeFlatNo(r.flat_no))
          )
          const pendingRows = flatNumbers
            .filter(f => !paidFlatNos.has(normalizeFlatNo(f)))
            .filter(f => !elecSearch || f.toLowerCase().includes(elecSearch.toLowerCase()))

          return (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-4">
                {[
                  { label: 'Total Flats', value: TOTAL_FLATS, icon: <Zap size={18} className="text-blue-400" />, iconBg: 'bg-blue-900/60 border-blue-700' },
                  { label: 'Paid', value: paidCount, icon: <CheckCircle size={18} className="text-green-400" />, iconBg: 'bg-green-900/60 border-green-700' },
                  { label: 'Pending', value: pendingCount, icon: <Zap size={18} className="text-red-400" />, iconBg: 'bg-red-900/60 border-red-700' },
                ].map(({ label, value, icon, iconBg }) => (
                  <div key={label} className={`${panel} p-5 relative`}>
                <div className="flex items-start justify-between">
                  <div>
                     <p className="text-zinc-400 text-sm md:text-sm font-medium leading-tight">{label}</p>
                     <p className="text-2xl md:text-3xl font-black text-white">{value}</p>
                  </div>
                      
                      <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${iconBg}`}>{icon}</div>
                    </div>
                   


                  </div>
                ))}
              </div>

              {/* Progress bar */}
              <div className="w-full bg-zinc-800 rounded-full h-1.5">
                <div
                  className="bg-green-500 h-1.5 rounded-full transition-all duration-700"
                  style={{ width: `${(paidCount / TOTAL_FLATS) * 100}%` }}
                />
              </div>

              {/* Filters Row */}
              <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
                <div className="relative flex-1">
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                  <input
                    type="text"
                    value={elecSearch}
                    onChange={e => setElecSearch(e.target.value)}
                    placeholder="Search flat no..."
                    className={`${inputCls} pl-10`}
                  />
                </div>
                <select
                  value={elecMonthFilter}
                  onChange={e => setElecMonthFilter(e.target.value)}
                  className={`${inputCls} min-w-[160px]`}
                >
                  {monthOptions.map(o => (
                    <option key={o.val} value={o.val} className="bg-zinc-800">{o.label}</option>
                  ))}
                </select>
                <div className="flex bg-[#0f1319] rounded-lg p-1 gap-1 border border-[#1e2433]">
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
                <button
                  onClick={fetchElecRecords}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 transition-colors text-white px-5 py-3 rounded-2xl text-sm font-semibold"
                >
                  <RefreshCw size={15} className={elecLoading ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>

              {/* Table */}
              <div className={`${panel} overflow-hidden`}>
                {elecLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 size={32} className="animate-spin text-zinc-400" />
                    <p className="text-zinc-500 text-sm">Loading electricity data...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-zinc-900/80 border-b border-white/10">
                          <th className="px-6 py-4 text-xs text-zinc-400 font-semibold uppercase tracking-wider">Flat No.</th>
                          <th className="px-6 py-4 text-xs text-zinc-400 font-semibold uppercase tracking-wider">Amount</th>
                          <th className="px-6 py-4 text-xs text-zinc-400 font-semibold uppercase tracking-wider">USN No.</th>
                          <th className="px-6 py-4 text-xs text-zinc-400 font-semibold uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {elecStatusFilter === 'pending' ? (
                          pendingRows.length === 0 ? (
                            <tr><td colSpan={4} className="text-center py-16 text-zinc-500">
                              <Zap size={36} className="mx-auto mb-2 opacity-30" />
                              <p className="text-sm">All flats have paid!</p>
                            </td></tr>
                          ) : pendingRows.map((flatNo, idx) => {
                            const isAdding = elecEditingKey === `new-${flatNo}`
                            return (
                              <tr key={flatNo} className={`border-b border-white/5 hover:bg-white/5 ${idx % 2 === 0 ? 'bg-zinc-900/30' : 'bg-zinc-800/20'}`}>
                                <td className="px-6 py-4 font-bold text-white">{flatNo}</td>
                                {isAdding ? (
                                  <>
                                    <td className="px-6 py-2">
                                      <input type="number" min="0" placeholder="Amount" value={elecEditFields.amount}
                                        onChange={e => setElecEditFields({ ...elecEditFields, amount: e.target.value })}
                                        className="w-28 bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm outline-none text-white" />
                                    </td>
                                    <td className="px-6 py-2">
                                      <input type="text" placeholder="USN No." value={elecEditFields.usn}
                                        onChange={e => setElecEditFields({ ...elecEditFields, usn: e.target.value })}
                                        className="w-36 bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm outline-none text-white" />
                                    </td>
                                    <td className="px-6 py-2">
                                      <div className="flex gap-2">
                                        <button onClick={() => saveElecEdit(null, flatNo)} disabled={elecSaving} className="bg-green-500 text-white px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1 disabled:opacity-60">
                                          <Check size={14} /> Save
                                        </button>
                                        <button onClick={cancelElecEdit} className="bg-zinc-700 text-white px-3 py-2 rounded-lg text-xs font-semibold">
                                          <X size={14} />
                                        </button>
                                      </div>
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td className="px-6 py-4 text-zinc-600">—</td>
                                    <td className="px-6 py-4 text-zinc-600">—</td>
                                    <td className="px-6 py-4">
                                      <button onClick={() => startElecAdd(flatNo)} className="flex items-center gap-1 text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors">
                                        <Plus size={14} /> Add
                                      </button>
                                    </td>
                                  </>
                                )}
                              </tr>
                            )
                          })
                        ) : filtered.length === 0 ? (
                          <tr><td colSpan={4} className="text-center py-16 text-zinc-500 text-sm">No records found.</td></tr>
                        ) : (
                          filtered.map((record, idx) => {
                            const isEditing = elecEditingKey === `rec-${record.id}`
                            return (
                              <tr key={record.id || idx} className={`border-b border-white/5 hover:bg-white/5 ${idx % 2 === 0 ? 'bg-zinc-900/30' : 'bg-zinc-800/20'}`}>
                                <td className="px-6 py-4 font-bold text-white">{record.flat_no}</td>
                                {isEditing ? (
                                  <>
                                    <td className="px-6 py-2">
                                      <input type="number" min="0" placeholder="Amount" value={elecEditFields.amount}
                                        onChange={e => setElecEditFields({ ...elecEditFields, amount: e.target.value })}
                                        className="w-28 bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm outline-none text-white" />
                                    </td>
                                    <td className="px-6 py-2">
                                      <input type="text" placeholder="USN No." value={elecEditFields.usn}
                                        onChange={e => setElecEditFields({ ...elecEditFields, usn: e.target.value })}
                                        className="w-36 bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm outline-none text-white" />
                                    </td>
                                    <td className="px-6 py-2">
                                      <div className="flex gap-2">
                                        <button onClick={() => saveElecEdit(record, record.flat_no)} disabled={elecSaving} className="bg-green-500 text-white px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1 disabled:opacity-60">
                                          <Check size={14} /> Save
                                        </button>
                                        <button onClick={cancelElecEdit} className="bg-zinc-700 text-white px-3 py-2 rounded-lg text-xs font-semibold">
                                          <X size={14} />
                                        </button>
                                        <button onClick={() => markElecUnpaid(record)} disabled={elecSaving} className="bg-red-900/60 border border-red-700 text-red-300 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap">
                                          Mark unpaid
                                        </button>
                                      </div>
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td className="px-6 py-4 text-zinc-300">
                                      {record.amount ? `₹ ${Number(record.amount).toLocaleString()}` : '—'}
                                    </td>
                                    <td className="px-6 py-4 text-zinc-400 font-mono text-sm">
                                      {record.usn || '—'}
                                    </td>
                                    <td className="px-6 py-4">
                                      <button onClick={() => startElecEdit(record)} className="text-zinc-500 hover:text-blue-400 transition-colors">
                                        <Pencil size={16} />
                                      </button>
                                    </td>
                                  </>
                                )}
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )
        })()}

        </main>

        {/* Mobile Bottom Nav */}
        <nav className={`fixed bottom-0 left-0 right-0 md:hidden bg-[#080a0f] border-t border-[#1e2433] px-2 py-2 z-50 transition-transform duration-300 ${navVisible ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="flex items-center justify-around">
            {NAV_ITEMS.map(({ page, label, icon: Icon }) => (
              <button
                key={page}
                onClick={() => setActivePage(page)}
                className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg text-[10px] font-medium transition-colors ${
                  activePage === page ? 'text-violet-400' : 'text-zinc-500'
                }`}
              >
                <Icon size={20} />
                <span className="truncate max-w-[72px]">{page === 'home' ? 'Home' : label.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>
    </div>
  )
}
