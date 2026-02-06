import React from 'react'
import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage.jsx'
import InstitutionUploadPage from './pages/InstitutionUploadPage.jsx'
import VerifierPage from './pages/VerifierPage.jsx'
import { AuthProvider, useAuth } from './auth/AuthContext.jsx'

function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div>
      <nav className="bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="text-2xl font-bold text-white flex items-center">
              <svg className="w-8 h-8 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              TrustEd
            </Link>
            {/* Removed navigation links as requested by user */}
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <span className="text-blue-100 text-sm">
                  {user.name} ({user.role === 'institution' ? 'Institution' : 'Verifier'})
                </span>
                <button 
                  className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors duration-200" 
                  onClick={() => { logout(); navigate('/login'); }}
                >
                  Logout
                </button>
              </>
            ) : (
              <Link to="/login" className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors duration-200">
                Login
              </Link>
            )}
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  )
}

function ProtectedRoute({ children, roles }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Layout><Navigate to="/login" replace /></Layout>} />
        <Route path="/login" element={<Layout><LoginPage /></Layout>} />
        <Route path="/upload" element={<Layout><ProtectedRoute roles={['institution']}><InstitutionUploadPage /></ProtectedRoute></Layout>} />
        <Route path="/verify" element={<Layout><ProtectedRoute roles={['verifier']}><VerifierPage /></ProtectedRoute></Layout>} />
        <Route path="*" element={<Layout><div className="min-h-screen flex items-center justify-center"><div className="text-center"><h1 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h1><p className="text-gray-600">The page you're looking for doesn't exist.</p></div></div></Layout>} />
      </Routes>
    </AuthProvider>
  )
}