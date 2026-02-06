import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('institution@trusted.dev')
  const [password, setPassword] = useState('inst123')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  function onSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    // Direct login without async for demo
    if (email === 'institution@trusted.dev') {
      // Create user object
      const user = { role: 'institution', name: 'Demo Institution', email: 'institution@trusted.dev', token: 'demo-token' }
      // Save to localStorage
      localStorage.setItem('trusted_user', JSON.stringify(user))
      // Force a complete page reload to the upload page
      window.location.href = '/upload'
      return
    } 
    
    if (email === 'verifier@trusted.dev') {
      // Create user object
      const user = { role: 'verifier', name: 'Demo Verifier', email: 'verifier@trusted.dev', token: 'demo-token' }
      // Save to localStorage
      localStorage.setItem('trusted_user', JSON.stringify(user))
      // Force a complete page reload to the verify page
      window.location.href = '/verify'
      return
    }
    
    // Fallback for other emails (shouldn't happen in demo)
    setError('Please use one of the demo accounts')
    setLoading(false)
  }

  function selectUser(userEmail, userPassword) {
    setEmail(userEmail)
    setPassword(userPassword)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">TrustEd</h1>
          <p className="text-gray-600">Secure Certificate Management System</p>
        </div>
        
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-semibold text-center mb-6">Choose Your Role</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button 
              type="button"
              className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                email === 'institution@trusted.dev' 
                  ? 'border-purple-500 bg-purple-50 text-purple-700' 
                  : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'
              }`}
              onClick={() => selectUser('institution@trusted.dev', 'inst123')}
            >
              <div className="text-center">
                <div className="w-8 h-8 mx-auto mb-2 text-purple-600">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div className="font-semibold">Institution</div>
                <div className="text-xs text-gray-500">Upload Certificates</div>
              </div>
            </button>
            
            <button 
              type="button"
              className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                email === 'verifier@trusted.dev' 
                  ? 'border-green-500 bg-green-50 text-green-700' 
                  : 'border-gray-200 hover:border-green-300 hover:bg-green-50'
              }`}
              onClick={() => selectUser('verifier@trusted.dev', 'verify123')}
            >
              <div className="text-center">
                <div className="w-8 h-8 mx-auto mb-2 text-green-600">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="font-semibold">Verifier</div>
                <div className="text-xs text-gray-500">Verify Certificates</div>
              </div>
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input 
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                placeholder="Enter your email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input 
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="Enter your password"
              />
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            <button 
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed" 
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}