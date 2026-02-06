import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiVerify } from '../services/api.js'
import { useVerification } from '../context/VerificationContext.jsx'

export default function UploadPage() {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const { setLastResult } = useVerification()

  async function onSubmit(e) {
    e.preventDefault()
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const result = await apiVerify(file)
      setLastResult(result)
      navigate('/results')
    } catch (err) {
      setError('Verification failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto mt-6">
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Upload and Verify Certificate</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={e => setFile(e.target.files?.[0] ?? null)} />
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <button className="btn" disabled={!file || loading}>{loading ? 'Verifying...' : 'Verify'}</button>
        </form>
      </div>
    </div>
  )
}