import { HashRouter, Link, NavLink, Outlet, Route, Routes } from 'react-router-dom';
import Kiosk from './kiosk/Kiosk';
import Admin from './admin/Admin';
import Portal from './portal/Portal';

function Shell() {
  return (
    <>
      <header className="topbar">
        <Link className="brand" to="/">
          <span className="word">Quality Glass</span>
        </Link>
        <nav className="tabs" aria-label="Surfaces">
          <NavLink className="tab" to="/" end>Kiosk</NavLink>
          <NavLink className="tab" to="/admin">Admin</NavLink>
          <NavLink className="tab" to="/portal">Customer Portal</NavLink>
        </nav>
        <span className="hud" style={{ letterSpacing: '.18em' }}>QGI · v1.3.1</span>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Kiosk />} />
        <Route element={<Shell />}>
          <Route path="/admin" element={<Admin />} />
          <Route path="/portal" element={<Portal />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
