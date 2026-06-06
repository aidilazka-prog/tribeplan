import { useState, useRef, useEffect } from 'react'
import './ExpensesTab.css'

// ── Constants ────────────────────────────────────────────────
const CATEGORY_META = {
  food:          { icon: '🍽️', label: 'Food & Drink' },
  accommodation: { icon: '🏨', label: 'Stay' },
  transport:     { icon: '🚗', label: 'Transport' },
  activity:      { icon: '🎟️', label: 'Activity' },
  shopping:      { icon: '🛍️', label: 'Shopping' },
  other:         { icon: '💳', label: 'Other' },
}

const EMPTY_FORM = {
  description: '',
  amount: '',
  paidBy: '',
  category: 'food',
}

// ── Balance engine ────────────────────────────────────────────
/**
 * Greedy min-transactions settlement.
 * Returns: Array<{ from, to, amount }>
 * Also returns net balances per member.
 */
function computeSettlements(expenses, members) {
  const net = {}
  members.forEach(m => (net[m] = 0))

  expenses.forEach(exp => {
    const share = exp.amount / exp.splitAmong.length
    net[exp.paidBy] = (net[exp.paidBy] || 0) + exp.amount
    exp.splitAmong.forEach(m => {
      net[m] = (net[m] || 0) - share
    })
  })

  const debtors  = Object.entries(net)
    .filter(([, v]) => v < -0.005)
    .map(([k, v]) => ({ name: k, amount: -v }))
    .sort((a, b) => b.amount - a.amount)

  const creditors = Object.entries(net)
    .filter(([, v]) => v > 0.005)
    .map(([k, v]) => ({ name: k, amount: v }))
    .sort((a, b) => b.amount - a.amount)

  const settlements = []
  let di = 0, ci = 0
  // Clone to avoid mutating
  const d = debtors.map(x => ({ ...x }))
  const c = creditors.map(x => ({ ...x }))

  while (di < d.length && ci < c.length) {
    const pay = Math.min(d[di].amount, c[ci].amount)
    settlements.push({ from: d[di].name, to: c[ci].name, amount: pay })
    d[di].amount -= pay
    c[ci].amount -= pay
    if (d[di].amount < 0.005) di++
    if (c[ci].amount < 0.005) ci++
  }

  return { settlements, net }
}

// ── Main component ────────────────────────────────────────────
export default function ExpensesTab({ items, members, onAddExpense, onDeleteExpense }) {
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM, paidBy: members[0] })
  const [splitAmong, setSplitAmong] = useState(new Set(members))
  const [errors, setErrors] = useState({})
  const [deletingId, setDeletingId] = useState(null)
  const descRef = useRef(null)

  const { settlements, net } = computeSettlements(items, members)
  const totalSpend = items.reduce((s, e) => s + e.amount, 0)
  const maxNetAbs  = Math.max(...Object.values(net).map(Math.abs), 1)

  // Auto-focus description when form opens
  useEffect(() => {
    if (formOpen) {
      setForm({ ...EMPTY_FORM, paidBy: members[0] })
      setSplitAmong(new Set(members))
      setErrors({})
      setTimeout(() => descRef.current?.focus(), 60)
    }
  }, [formOpen, members])

  const toggleSplit = (member) => {
    setSplitAmong(prev => {
      const next = new Set(prev)
      if (next.has(member)) { if (next.size > 1) next.delete(member) }
      else next.add(member)
      return next
    })
  }

  const validate = () => {
    const e = {}
    if (!form.description.trim()) e.description = 'Required'
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) e.amount = 'Enter a valid amount'
    return e
  }

  const handleSubmit = (ev) => {
    ev.preventDefault()
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    onAddExpense({
      description: form.description.trim(),
      amount: Number(form.amount),
      paidBy: form.paidBy,
      splitAmong: [...splitAmong],
      category: form.category,
    })
    setFormOpen(false)
  }

  const handleDelete = (id) => {
    setDeletingId(id)
    setTimeout(() => {
      onDeleteExpense(id)
      setDeletingId(null)
    }, 250) // let the fade animation play
  }

  return (
    <section className="exp-tab" aria-label="Trip expenses">

      {/* ── Stats strip ── */}
      <div className="exp-stats">
        <div className="exp-stats__cell">
          <span className="exp-stats__value exp-stats__value--pink">${totalSpend.toFixed(0)}</span>
          <span className="exp-stats__label">Total Spent</span>
        </div>
        <div className="exp-stats__divider" />
        <div className="exp-stats__cell">
          <span className="exp-stats__value">{items.length}</span>
          <span className="exp-stats__label">Transactions</span>
        </div>
        <div className="exp-stats__divider" />
        <div className="exp-stats__cell">
          <span className="exp-stats__value">{members.length}</span>
          <span className="exp-stats__label">Members</span>
        </div>
      </div>

      {/* ── Add Expense inline form ── */}
      {formOpen ? (
        <form
          id="add-expense-form"
          className="exp-form"
          onSubmit={handleSubmit}
          noValidate
          aria-label="Add new expense"
        >
          <div className="exp-form__header">
            <span className="exp-form__title">New Expense</span>
            <button
              type="button"
              className="exp-form__cancel-icon"
              onClick={() => setFormOpen(false)}
              aria-label="Cancel"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Description */}
          <div className="exp-field">
            <label htmlFor="exp-desc" className="exp-label">
              Description {errors.description && <span className="exp-err">{errors.description}</span>}
            </label>
            <input
              id="exp-desc"
              ref={descRef}
              type="text"
              className={`exp-input${errors.description ? ' exp-input--err' : ''}`}
              placeholder="e.g. Lunch at Naughty Nuri's"
              value={form.description}
              maxLength={80}
              onChange={e => { setForm(p => ({ ...p, description: e.target.value })); setErrors(p => ({ ...p, description: '' })) }}
            />
          </div>

          {/* Amount + Paid By row */}
          <div className="exp-row">
            <div className="exp-field exp-field--half">
              <label htmlFor="exp-amount" className="exp-label">
                Amount (USD) {errors.amount && <span className="exp-err">{errors.amount}</span>}
              </label>
              <div className="exp-amount-wrap">
                <span className="exp-amount-prefix">$</span>
                <input
                  id="exp-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  className={`exp-input exp-input--amount${errors.amount ? ' exp-input--err' : ''}`}
                  placeholder="0.00"
                  value={form.amount}
                  onChange={e => { setForm(p => ({ ...p, amount: e.target.value })); setErrors(p => ({ ...p, amount: '' })) }}
                />
              </div>
            </div>

            <div className="exp-field exp-field--half">
              <label htmlFor="exp-paid-by" className="exp-label">Paid By</label>
              <div className="exp-select-wrap">
                <select
                  id="exp-paid-by"
                  className="exp-select"
                  value={form.paidBy}
                  onChange={e => setForm(p => ({ ...p, paidBy: e.target.value }))}
                >
                  {members.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <svg className="exp-select-arrow" width="11" height="11" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Category chips */}
          <div className="exp-field">
            <span className="exp-label">Category</span>
            <div className="exp-cat-chips" role="group" aria-label="Expense category">
              {Object.entries(CATEGORY_META).map(([key, { icon, label }]) => (
                <button
                  key={key}
                  type="button"
                  id={`exp-cat-${key}`}
                  className={`exp-cat-chip${form.category === key ? ' exp-cat-chip--active' : ''}`}
                  onClick={() => setForm(p => ({ ...p, category: key }))}
                  aria-pressed={form.category === key}
                >
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>

          {/* Split among checkboxes */}
          <div className="exp-field">
            <span className="exp-label">
              Split Among
              <span className="exp-label-sub">({splitAmong.size} of {members.length})</span>
            </span>
            <div className="exp-split-chips" role="group" aria-label="Split among members">
              {members.map(m => {
                const checked = splitAmong.has(m)
                return (
                  <button
                    key={m}
                    type="button"
                    id={`split-chip-${m}`}
                    className={`exp-split-chip${checked ? ' exp-split-chip--active' : ''}`}
                    onClick={() => toggleSplit(m)}
                    aria-pressed={checked}
                  >
                    {checked && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="3" strokeLinecap="round"
                        strokeLinejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                    {m}
                  </button>
                )
              })}
            </div>
            {form.amount && splitAmong.size > 0 && (
              <p className="exp-per-person-preview">
                ≈ <strong>${(Number(form.amount) / splitAmong.size).toFixed(2)}</strong> per person
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="exp-form__actions">
            <button
              type="button"
              id="exp-form-cancel"
              className="exp-btn exp-btn--ghost"
              onClick={() => setFormOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" id="exp-form-submit" className="exp-btn exp-btn--primary">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Expense
            </button>
          </div>
        </form>
      ) : (
        <button
          id="add-expense-btn"
          className="exp-add-trigger"
          onClick={() => setFormOpen(true)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
            strokeLinejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Log an Expense
        </button>
      )}

      {/* ── Balance Summary ── */}
      <div className="exp-section">
        <h2 className="exp-section-title">
          <span>Settlement Summary</span>
          {settlements.length === 0 && items.length > 0 && (
            <span className="exp-section-badge exp-section-badge--ok">Settled ✓</span>
          )}
        </h2>

        {/* Textual human-readable sentences */}
        {settlements.length === 0 ? (
          <div className="settlement-clear">
            <span className="settlement-clear__icon" aria-hidden="true">🎉</span>
            <p>Everyone is settled up!</p>
          </div>
        ) : (
          <ul className="settlement-list" role="list" aria-label="Who owes whom">
            {settlements.map((s, i) => (
              <li key={i} className="settlement-item" aria-label={`${s.from} owes ${s.to} $${s.amount.toFixed(2)}`}>
                <div className="settlement-item__sentence">
                  <span className="settlement-item__debtor">{s.from}</span>
                  <span className="settlement-item__verb"> owes </span>
                  <span className="settlement-item__creditor">{s.to}</span>
                </div>
                <span className="settlement-item__amount">${s.amount.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Per-member net balance bars ── */}
      <div className="exp-section">
        <h2 className="exp-section-title">Net Balances</h2>
        <ul className="net-list" role="list">
          {members.map(m => {
            const val = net[m] || 0
            const pct = Math.abs(val) / maxNetAbs * 100
            const isPos = val > 0.005
            const isNeg = val < -0.005
            return (
              <li key={m} className="net-item">
                <span className="net-item__name">{m}</span>
                <div className="net-item__bar-wrap" aria-hidden="true">
                  <div
                    className={`net-item__bar${isPos ? ' net-item__bar--pos' : isNeg ? ' net-item__bar--neg' : ''}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className={`net-item__val${isPos ? ' net-item__val--pos' : isNeg ? ' net-item__val--neg' : ''}`}>
                  {isPos ? `+$${val.toFixed(2)}` : isNeg ? `-$${Math.abs(val).toFixed(2)}` : 'even'}
                </span>
              </li>
            )
          })}
        </ul>
        <p className="net-legend">
          <span className="net-legend__pos">▌ gets back</span>
          <span className="net-legend__neg">▌ owes</span>
        </p>
      </div>

      {/* ── Ledger ── */}
      <div className="exp-section">
        <h2 className="exp-section-title">All Transactions</h2>
        {items.length === 0 ? (
          <p className="exp-empty">No expenses yet — log your first one above.</p>
        ) : (
          <ul className="ledger-list" role="list">
            {items.map(exp => (
              <LedgerRow
                key={exp.id}
                exp={exp}
                isDeleting={deletingId === exp.id}
                onDelete={() => handleDelete(exp.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

// ── Ledger row ────────────────────────────────────────────────
function LedgerRow({ exp, isDeleting, onDelete }) {
  const perPerson = exp.amount / exp.splitAmong.length
  const meta = CATEGORY_META[exp.category] || CATEGORY_META.other

  return (
    <li className={`ledger-row${isDeleting ? ' ledger-row--deleting' : ''}`}
      aria-label={`${exp.description}, $${exp.amount}, paid by ${exp.paidBy}`}>
      <span className="ledger-row__icon" aria-hidden="true">{meta.icon}</span>
      <div className="ledger-row__body">
        <div className="ledger-row__desc">{exp.description}</div>
        <div className="ledger-row__meta">
          <span>Paid by <strong>{exp.paidBy}</strong></span>
          <span className="ledger-row__dot" aria-hidden="true">·</span>
          <span>split {exp.splitAmong.length} ways</span>
          <span className="ledger-row__dot" aria-hidden="true">·</span>
          <span className="ledger-row__per">${perPerson.toFixed(2)}/ea</span>
        </div>
      </div>
      <div className="ledger-row__right">
        <span className="ledger-row__total">${exp.amount.toFixed(2)}</span>
        <button
          className="ledger-row__delete"
          onClick={onDelete}
          aria-label={`Delete expense: ${exp.description}`}
          title="Remove"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
            strokeLinejoin="round" aria-hidden="true">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>
    </li>
  )
}
