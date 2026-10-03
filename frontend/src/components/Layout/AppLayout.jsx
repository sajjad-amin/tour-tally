import { Outlet } from 'react-router';
import Topnav from './Topnav.jsx';
import Sidebar from './Sidebar.jsx';

/**
 * AppLayout — authenticated shell wrapper.
 *
 * Structure:
 *   <div.min-vh-100.bg-body-tertiary>
 *     <Topnav />
 *     <div.d-flex>
 *       <Sidebar />          (280px, offcanvas-lg on mobile)
 *       <div.flex-grow-1>
 *         <main.container-fluid.py-4.px-4>
 *           <Outlet />       (page content)
 *         </main>
 *       </div>
 *     </div>
 *   </div>
 */
export default function AppLayout() {
  return (
    <div className="min-vh-100 bg-body-tertiary">
      <Topnav />

      <div className="d-flex">
        <Sidebar />

        <div className="flex-grow-1" style={{ minWidth: 0 }}>
          <main className="container-fluid py-4 px-lg-4 px-3">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
