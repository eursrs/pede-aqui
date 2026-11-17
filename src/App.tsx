import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import ProtectedRoute from './auth/ProtectedRoute'
import { useAuth } from './auth/AuthContext'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import OwnerDashboard from './pages/OwnerDashboard'
import PlatformAdminPage from './pages/PlatformAdminPage'
import PublicMenuPage from './pages/PublicMenuPage'

function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const painel = user?.role === 'platform_admin' ? '/admin' : '/painel'

  return (
    <nav className="top-nav">
      <Link className="brand" to="/">Pede <span className="brand-accent">Aqui</span></Link>
      <div className="nav-links">
        {user ? (
          <>
            <Link to={painel}>Painel</Link>
            <button className="nav-button" onClick={() => void logout().then(() => navigate('/'))}>Sair</button>
          </>
        ) : (
          <>
            <Link to="/entrar">Entrar</Link>
            <Link to="/cardapio/cafe-da-ana">Ver cardápio</Link>
          </>
        )}
      </div>
    </nav>
  )
}

export default function App() {
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined
  return (
    <BrowserRouter basename={basename}>
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/entrar" element={<LoginPage />} />
        <Route path="/cadastro" element={<Navigate to="/" replace />} />
        <Route path="/painel" element={
          <ProtectedRoute role="owner"><OwnerDashboard /></ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute role="platform_admin"><PlatformAdminPage /></ProtectedRoute>
        } />
        <Route path="/cardapio/:slug" element={<PublicMenuPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
