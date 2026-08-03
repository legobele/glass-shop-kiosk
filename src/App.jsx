import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ToastProvider } from './components/Toast';
import RequireRole from './components/RequireRole';
import PhoneFrame from './components/PhoneFrame';
import Kiosk from './views/kiosk/Kiosk';
import Track from './views/portal/Track';
import CustomerAccount from './views/portal/CustomerAccount';
import Login from './views/login/Login';
import AdminLayout from './views/admin/AdminLayout';
import OrdersView from './views/admin/OrdersView';
import CatalogView from './views/admin/CatalogView';
import SettingsView from './views/admin/SettingsView';
import CoordinatorView from './views/admin/CoordinatorView';
import UsersView from './views/admin/UsersView';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <HashRouter>
          <PhoneFrame>
            <Routes>
              <Route path="/" element={<Navigate to="/kiosk" replace />} />
              <Route path="/kiosk" element={<Kiosk />} />
              <Route path="/track" element={<Track />} />
              <Route path="/account" element={<CustomerAccount />} />
              <Route path="/login" element={<Login />} />
              <Route
                path="/admin"
                element={
                  <RequireRole role="staff">
                    <AdminLayout />
                  </RequireRole>
                }
              >
                <Route index element={<OrdersView />} />
                <Route path="orders" element={<OrdersView />} />
                <Route path="catalog" element={<CatalogView />} />
                <Route path="settings" element={<SettingsView />} />
                <Route path="coordinator" element={<CoordinatorView />} />
                <Route
                  path="users"
                  element={
                    <RequireRole role="admin">
                      <UsersView />
                    </RequireRole>
                  }
                />
              </Route>
              <Route path="*" element={<Navigate to="/kiosk" replace />} />
            </Routes>
          </PhoneFrame>
        </HashRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
