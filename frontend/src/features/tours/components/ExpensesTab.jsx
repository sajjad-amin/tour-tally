export default function ExpensesTab() {
  return (
    <div className="card shadow-sm border-0 my-4 text-center p-5">
      <div
        className="rounded-circle bg-warning-subtle text-warning d-inline-flex align-items-center justify-content-center mx-auto mb-3"
        style={{ width: '64px', height: '64px', fontSize: '1.75rem' }}
      >
        <i className="bi bi-receipt-cutoff"></i>
      </div>
      <h5 className="fw-bold mb-2">Expense Tracking Coming Soon</h5>
      <p className="text-muted small mx-auto" style={{ maxWidth: '420px' }}>
        Log expenses, upload receipts, and manage multi-currency group split settlements in Phase 4.
      </p>
    </div>
  );
}
