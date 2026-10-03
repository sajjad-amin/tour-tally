import { useState, useEffect } from 'react';

export default function CreateTourModal({
  isOpen,
  onClose,
  onCreate,
  isPending,
  error,
}) {
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('planning');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName('');
      setDestination('');
      setStartDate('');
      setEndDate('');
      setStatus('planning');
      setDescription('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate({
      name: name.trim(),
      destination: destination.trim() || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      status,
      description: description.trim() || undefined,
    });
  };

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content shadow-lg border-0 rounded-4">
          <div className="modal-header border-bottom">
            <h5 className="modal-title fw-bold">
              <i className="bi bi-compass me-2 text-success"></i>
              Create New Tour
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              disabled={isPending}
              aria-label="Close"
            ></button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body p-4">
              {error && (
                <div className="alert alert-danger py-2 px-3 small border-0 mb-3" role="alert">
                  {error}
                </div>
              )}

              <div className="mb-3">
                <label className="form-label small fw-semibold" htmlFor="tourNameInput">
                  Tour Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  id="tourNameInput"
                  className="form-control"
                  placeholder="Enter a title"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold" htmlFor="tourDestInput">
                  Destination
                </label>
                <input
                  type="text"
                  id="tourDestInput"
                  className="form-control"
                  placeholder="Enter destination"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                />
              </div>

              <div className="row g-2 mb-3">
                <div className="col-md-6">
                  <label className="form-label small fw-semibold" htmlFor="tourStartDate">
                    Start Date
                  </label>
                  <input
                    type="date"
                    id="tourStartDate"
                    className="form-control"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold" htmlFor="tourEndDate">
                    End Date
                  </label>
                  <input
                    type="date"
                    id="tourEndDate"
                    className="form-control"
                    value={endDate}
                    min={startDate || undefined}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold" htmlFor="tourStatusSelect">
                  Status
                </label>
                <select
                  id="tourStatusSelect"
                  className="form-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="planning">Planning (Draft)</option>
                  <option value="active">Active (Ongoing)</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="mb-2">
                <label className="form-label small fw-semibold" htmlFor="tourDescInput">
                  Description / Itinerary Notes
                </label>
                <textarea
                  id="tourDescInput"
                  className="form-control"
                  rows="3"
                  placeholder="Enter tour description or notes"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                ></textarea>
              </div>
            </div>

            <div className="modal-footer border-top">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={onClose}
                disabled={isPending}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-success btn-sm px-4 fw-semibold"
                disabled={isPending || !name.trim()}
              >
                {isPending ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                    Creating…
                  </>
                ) : (
                  'Create Tour'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
