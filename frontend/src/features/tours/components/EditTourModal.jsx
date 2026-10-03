import { useState, useEffect } from 'react';

export default function EditTourModal({
  isOpen,
  tour,
  onClose,
  onUpdate,
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
    if (tour && isOpen) {
      setName(tour.name || '');
      setDestination(tour.destination || '');
      setStartDate(tour.start_date || '');
      setEndDate(tour.end_date || '');
      setStatus(tour.status || 'planning');
      setDescription(tour.description || '');
    }
  }, [tour, isOpen]);

  if (!isOpen || !tour) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdate({
      name: name.trim(),
      destination: destination.trim() || null,
      start_date: startDate || null,
      end_date: endDate || null,
      status,
      description: description.trim() || null,
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
              <i className="bi bi-pencil-square me-2 text-primary"></i>
              Edit Tour Details
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
                <label className="form-label small fw-semibold" htmlFor="editTourName">
                  Tour Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  id="editTourName"
                  className="form-control"
                  placeholder="Enter a title"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold" htmlFor="editTourDest">
                  Destination
                </label>
                <input
                  type="text"
                  id="editTourDest"
                  className="form-control"
                  placeholder="Enter destination"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                />
              </div>

              <div className="row g-2 mb-3">
                <div className="col-md-6">
                  <label className="form-label small fw-semibold" htmlFor="editTourStartDate">
                    Start Date
                  </label>
                  <input
                    type="date"
                    id="editTourStartDate"
                    className="form-control"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold" htmlFor="editTourEndDate">
                    End Date
                  </label>
                  <input
                    type="date"
                    id="editTourEndDate"
                    className="form-control"
                    value={endDate}
                    min={startDate || undefined}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold" htmlFor="editTourStatus">
                  Status
                </label>
                <select
                  id="editTourStatus"
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
                <label className="form-label small fw-semibold" htmlFor="editTourDesc">
                  Description / Itinerary Notes
                </label>
                <textarea
                  id="editTourDesc"
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
                className="btn btn-primary btn-sm px-4 fw-semibold"
                disabled={isPending || !name.trim()}
              >
                {isPending ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                    Saving…
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
