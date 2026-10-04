import { useState, useEffect } from 'react';
import { exportApi } from '@/services/api.js';
import toastr from '@/services/toastr.js';

export default function MemberPosPrintModal({
  show,
  onClose,
  tour,
  member,
  balance,
  actions = [],
}) {
  // Thermal print configurations & printer live status
  const [printStrength, setPrintStrength] = useState(4); // 1-7, default 4 (Normal)
  const [printerStatus, setPrinterStatus] = useState(null);
  const [isCheckingPrinter, setIsCheckingPrinter] = useState(false);
  const [activeJobId, setActiveJobId] = useState(null);

  // Loading states
  const [isOpeningPos, setIsOpeningPos] = useState(false);
  const [isDirectPrinting, setIsDirectPrinting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  const isBusy = isOpeningPos || isDirectPrinting || isStopping;

  // Probe TinyPOS printer status when modal opens
  useEffect(() => {
    let isMounted = true;
    if (show) {
      setIsCheckingPrinter(true);
      exportApi
        .getPrinterStatus()
        .then((res) => {
          if (isMounted) {
            setPrinterStatus(res.data);
          }
        })
        .catch(() => {
          if (isMounted) {
            setPrinterStatus({ connected: false, status: 'offline' });
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsCheckingPrinter(false);
          }
        });
    }
    return () => {
      isMounted = false;
    };
  }, [show]);

  if (!show || !member) return null;

  const net = parseFloat(balance?.net_balance || 0);
  const totalPaid = parseFloat(balance?.total_paid || 0);
  const totalOwed = parseFloat(balance?.total_owed || 0);

  // ── Open 58mm POS Receipt in Next Browser Tab ───────────────
  const handleOpenPosInNewTab = async () => {
    setIsOpeningPos(true);
    try {
      const response = await exportApi.getPosReceipt(tour.id, member.id, false);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      toastr.success(`58mm POS receipt for ${member.name} opened in next tab.`);
    } catch (err) {
      console.error('Failed to open POS receipt:', err);
      const errMsg =
        err?.response?.data?.message ||
        'Failed to generate POS receipt. Please try again.';
      toastr.error(errMsg);
    } finally {
      setIsOpeningPos(false);
    }
  };

  // ── Direct Print to TinyPOS Thermal Printer ─────────────────
  const handleDirectPrint = async () => {
    setIsDirectPrinting(true);
    try {
      const payload = {
        strength: Number(printStrength),
        scale: '1.0',
        autocrop: 'true',
        keepjob: 'false',
        immediate: 'true',
      };

      const res = await exportApi.printPosReceipt(tour.id, member.id, payload);
      if (res.data?.status === 'success' || res.status === 200) {
        const jobId = res.data?.job_id || res.data?.data?.job_id || null;
        if (jobId) setActiveJobId(jobId);
        toastr.success(
          res.data?.message || `Receipt for ${member.name} sent to TinyPOS thermal printer!`
        );
        exportApi
          .getPrinterStatus()
          .then((r) => setPrinterStatus(r.data))
          .catch(() => {});
      } else {
        toastr.warning(res.data?.message || 'Print job queued.');
      }
    } catch (err) {
      console.error('Failed to print to thermal printer:', err);
      const msg =
        err?.response?.data?.message ||
        'Failed to connect to TinyPOS printer bridge. Please verify printer status and Bluetooth connection.';
      toastr.error(msg);
    } finally {
      setIsDirectPrinting(false);
    }
  };

  // ── Stop Active Thermal Print Job ───────────────────────────
  const handleStopPrint = async () => {
    setIsStopping(true);
    try {
      const targetJobId =
        activeJobId || printerStatus?.printer?.active_job_id || null;
      const res = await exportApi.stopPrintJob({ job_id: targetJobId });
      toastr.info(res.data?.message || 'Stop command sent to printer.');
      setIsDirectPrinting(false);
      setActiveJobId(null);
      exportApi
        .getPrinterStatus()
        .then((r) => setPrinterStatus(r.data))
        .catch(() => {});
    } catch (err) {
      console.error('Failed to stop print:', err);
      toastr.error(
        err?.response?.data?.message || 'Failed to send stop command to printer.'
      );
    } finally {
      setIsStopping(false);
    }
  };

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      role="dialog"
      aria-modal="true"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)', zIndex: 1055 }}
    >
      <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden bg-body text-body">
          {/* Modal Header */}
          <div className="modal-header bg-body-tertiary border-bottom py-3 px-4">
            <div className="d-flex align-items-center gap-2">
              <div className="p-2 rounded-3 bg-primary-subtle text-primary">
                <i className="bi bi-printer fs-5"></i>
              </div>
              <div>
                <h6 className="modal-title fw-bold mb-0 text-body">
                  58mm Thermal POS Receipt
                </h6>
                <small className="text-body-secondary">
                  {member.name} — {tour?.name}
                </small>
              </div>
            </div>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              disabled={isBusy}
              aria-label="Close"
            ></button>
          </div>

          {/* Modal Body */}
          <div className="modal-body p-4">
            {/* Member Statement Summary Card */}
            <div className="card border-0 bg-body-tertiary p-3 mb-3 border border-secondary-subtle rounded-3">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle mb-1">
                    Member Net Balance
                  </span>
                  <h5 className="fw-bold text-body mb-0">
                    {net > 0 ? (
                      <span className="text-success">+{net.toFixed(2)}</span>
                    ) : net < 0 ? (
                      <span className="text-danger">-{Math.abs(net).toFixed(2)}</span>
                    ) : (
                      <span className="text-body-secondary">0.00</span>
                    )}
                  </h5>
                  <small className="text-body-secondary">
                    {net > 0 ? 'Receives from group' : net < 0 ? 'Owes to group' : 'Fully settled'}
                  </small>
                </div>

                {/* Printer Live Status Badge */}
                <div>
                  {isCheckingPrinter ? (
                    <span className="badge bg-body-secondary text-secondary border px-2 py-1 rounded-pill small fw-normal d-inline-flex align-items-center gap-1">
                      <span
                        className="spinner-border spinner-border-sm"
                        style={{ width: '8px', height: '8px' }}
                      ></span>
                      Checking TinyPOS...
                    </span>
                  ) : printerStatus?.connected ? (
                    <span className="badge bg-success-subtle text-success border border-success-subtle px-2.5 py-1 rounded-pill small fw-semibold d-inline-flex align-items-center gap-1.5">
                      <span
                        className="rounded-circle bg-success d-inline-block"
                        style={{ width: '6px', height: '6px' }}
                      ></span>
                      Online ({printerStatus.printer?.printer_name || 'X6'})
                    </span>
                  ) : (
                    <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle px-2 py-1 rounded-pill small fw-normal d-inline-flex align-items-center gap-1">
                      <i className="bi bi-printer"></i>
                      Standby
                    </span>
                  )}
                </div>
              </div>

              {/* Financial Metrics */}
              <div className="row g-2 pt-2 border-top border-secondary-subtle mt-2 small">
                <div className="col-6">
                  <span className="text-body-secondary d-block">Total Paid:</span>
                  <span className="fw-semibold text-body">{totalPaid.toFixed(2)}</span>
                </div>
                <div className="col-6 text-end">
                  <span className="text-body-secondary d-block">Total Share Owed:</span>
                  <span className="fw-semibold text-body">{totalOwed.toFixed(2)}</span>
                </div>
              </div>

              {/* Action items preview */}
              {actions && actions.length > 0 && (
                <div
                  className="bg-body p-2 rounded-2 border border-secondary-subtle mt-3"
                  style={{ maxHeight: '130px', overflowY: 'auto', fontSize: '0.82rem' }}
                >
                  <div className="text-body-secondary small fw-semibold mb-1">
                    {balance?.status === 'debt' ? 'Transfers Required (Pay):' : 'Transfers to Receive:'}
                  </div>
                  {actions.map((act, idx) => (
                    <div
                      key={idx}
                      className="d-flex justify-content-between py-1"
                      style={{
                        borderBottom:
                          idx < actions.length - 1 ? '1px dashed var(--bs-border-color)' : 'none',
                      }}
                    >
                      <div className="text-truncate pe-2">
                        {balance?.status === 'debt' ? (
                          <span>➡️ Pay <strong>{act.to?.name}</strong></span>
                        ) : (
                          <span>⬅️ From <strong>{act.from?.name}</strong></span>
                        )}
                      </div>
                      <span className="fw-bold text-success text-nowrap">
                        {act.amount_formatted}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Thermal Print Configuration: Darkness / Strength */}
            <div className="row g-2 mb-2">
              <div className="col-12">
                <label className="form-label small fw-semibold text-secondary mb-1 d-flex align-items-center justify-content-between">
                  <span>
                    <i className="bi bi-fire text-danger me-1"></i> Text Darkness (Strength):
                  </span>
                  <span className="badge bg-body-secondary text-body small">
                    Level {printStrength}
                  </span>
                </label>
                <select
                  className="form-select form-select-sm"
                  value={printStrength}
                  onChange={(e) => setPrintStrength(Number(e.target.value))}
                  disabled={isBusy}
                >
                  <option value={1}>1 - Ultra Light</option>
                  <option value={2}>2 - Light</option>
                  <option value={3}>3 - Medium</option>
                  <option value={4}>4 - Normal (Default)</option>
                  <option value={5}>5 - Dark</option>
                  <option value={6}>6 - Extra Dark</option>
                  <option value={7}>7 - Max Dark (Aged Paper)</option>
                </select>
              </div>
            </div>
            <small className="text-body-secondary d-block mb-1" style={{ fontSize: '0.74rem' }}>
              Formatted specifically for 58mm / X6 continuous roll paper (auto-crop enabled).
            </small>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer bg-body-tertiary border-top py-3 px-4 d-flex justify-content-between">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={onClose}
              disabled={isBusy}
            >
              Cancel
            </button>

            <div className="d-flex align-items-center gap-2">
              {/* Stop Print Button */}
              {(isDirectPrinting || activeJobId) && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger px-3 fw-semibold d-flex align-items-center gap-1"
                  onClick={handleStopPrint}
                  disabled={isStopping}
                  title="Immediately abort active thermal printing"
                >
                  {isStopping ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status"></span>
                      <span>Stopping...</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-stop-circle-fill"></i>
                      <span>Stop</span>
                    </>
                  )}
                </button>
              )}

              {/* Open in Next Tab Button */}
              <button
                type="button"
                className="btn btn-sm btn-outline-primary px-3 fw-semibold d-flex align-items-center gap-1"
                onClick={handleOpenPosInNewTab}
                disabled={isBusy}
                title="Render 58mm POS receipt in the next browser tab"
              >
                {isOpeningPos ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status"></span>
                    <span>Opening...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-box-arrow-up-right"></i>
                    <span>Open in Tab</span>
                  </>
                )}
              </button>

              {/* Direct Thermal Print Button via TinyPOS */}
              <button
                type="button"
                className="btn btn-sm btn-dark px-3 fw-semibold shadow-sm d-flex align-items-center gap-1"
                onClick={handleDirectPrint}
                disabled={isBusy}
                title="Send directly to TinyPOS thermal printer"
              >
                {isDirectPrinting ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status"></span>
                    <span>Printing...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-printer-fill text-warning"></i>
                    <span>Direct Print</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
