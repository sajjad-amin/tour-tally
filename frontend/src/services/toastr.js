/**
 * Toastr helper service for TourTally.
 *
 * Configures and wraps toastr for easy import throughout React components:
 * toastr.success('Tour created successfully');
 * toastr.error('An error occurred');
 * toastr.info('Information message');
 * toastr.warning('Warning message');
 */

const getToastr = () => {
  if (typeof window !== 'undefined' && window.toastr) {
    window.toastr.options = {
      closeButton: true,
      debug: false,
      newestOnTop: true,
      progressBar: true,
      positionClass: 'toast-top-right',
      preventDuplicates: false,
      onclick: null,
      showDuration: '300',
      hideDuration: '1000',
      timeOut: '4000',
      extendedTimeOut: '1000',
      showEasing: 'swing',
      hideEasing: 'linear',
      showMethod: 'fadeIn',
      hideMethod: 'fadeOut',
    };
    return window.toastr;
  }
  return null;
};

const toastrService = {
  success: (message, title = '') => {
    const t = getToastr();
    if (t) t.success(message, title);
    else console.log('[Toastr Success]', title, message);
  },
  error: (message, title = '') => {
    const t = getToastr();
    if (t) t.error(message, title);
    else console.error('[Toastr Error]', title, message);
  },
  warning: (message, title = '') => {
    const t = getToastr();
    if (t) t.warning(message, title);
    else console.warn('[Toastr Warning]', title, message);
  },
  info: (message, title = '') => {
    const t = getToastr();
    if (t) t.info(message, title);
    else console.info('[Toastr Info]', title, message);
  },
  clear: () => {
    const t = getToastr();
    if (t) t.clear();
  },
};

export default toastrService;
