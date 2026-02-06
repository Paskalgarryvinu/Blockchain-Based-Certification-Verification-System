import React, { useEffect, useMemo, useState } from 'react'
import Papa from 'papaparse'
import { apiListVerifications, apiListInstitutions, apiBulkUploadInstitutions } from '../services/api.js'

export default function AdminDashboard() {
  const [verifications, setVerifications] = useState([])
  const [institutionsCount, setInstitutionsCount] = useState(0)
  const [filters, setFilters] = useState({ institution: '', year: '', status: '' })
  const [csvFile, setCsvFile] = useState(null)
  const [msg, setMsg] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const v = await apiListVerifications(filters)
      setVerifications(v.items)
      const inst = await apiListInstitutions({})
      setInstitutionsCount(inst.total)
    } catch (e) {
      setError('Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // initial

  async function applyFilters(e) {
    e.preventDefault()
    await load()
  }

  async function onUploadCSV(e) {
    e.preventDefault()
    if (!csvFile) return
    setMsg(null)
    setError(null)
    try {
      const res = await apiBulkUploadInstitutions(csvFile)
      setMsg(`Uploaded. Added: ${res.added}. Total records: ${res.total}.`)
      const inst = await apiListInstitutions({})
      setInstitutionsCount(inst.total)
    } catch (err) {
      setError('Bulk upload failed (ensure admin role and CSV format).')
    }
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Admin Dashboard</h2>
        <div className="text-sm text-gray-700">Institution records: <strong>{institutionsCount}</strong></div>
      </div>

      <div className="card">
        <h3 className="font-semibold mb-2">Bulk Upload Institutions (CSV)</h3>
        <p className="text-sm text-gray-600 mb-2">CSV headers: name,institution,year,certificate_id</p>
        <form onSubmit={onUploadCSV} className="flex items-center gap-3">
          <input type="file" accept=".csv" onChange={e => setCsvFile(e.target.files?.[0] ?? null)} />
          <button className="btn" disabled={!csvFile}>Upload</button>
        </form>
        {msg && <div className="text-green-700 text-sm mt-2">{msg}</div>}
        {error && <div className="text-red-700 text-sm mt-2">{error}</div>}
      </div>

      <div className="card">
        <h3 className="font-semibold mb-2">All Verifications</h3>
        <form onSubmit={applyFilters} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <input className="input" placeholder="Institution contains..." value={filters.institution} onChange={e => setFilters({ ...filters, institution: e.target.value })} />
          <input className="input" placeholder="Year" value={filters.year} onChange={e => setFilters({ ...filters, year: e.target.value })} />
          <select className="input" value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
            <option value="">Any status</option>
            <option value="valid">Valid</option>
            <option value="suspicious">Suspicious</option>
          </select>
          <button className="btn">Apply</button>
        </form>
        {loading ? (
          <div className="text-sm text-gray-600">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">Time</th>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Institution</th>
                  <th className="py-2 pr-4">Year</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Confidence</th>
                  <th className="py-2 pr-4">Cert ID</th>
                  <th className="py-2 pr-4">File Hash</th>
                </tr>
              </thead>
              <tbody>
                {verifications.map(v => (
                  <tr key={v.id} className="border-b">
                    <td className="py-2 pr-4">{v.created_at}</td>
                    <td className="py-2 pr-4">{v.extracted?.name}</td>
                    <td className="py-2 pr-4">{v.extracted?.institution}</td>
                    <td className="py-2 pr-4">{v.extracted?.year}</td>
                    <td className="py-2 pr-4">{v.status}</td>
                    <td className="py-2 pr-4">{Math.round(v.confidence * 100)}%</td>
                    <td className="py-2 pr-4">{v.extracted?.certificate_id}</td>
                    <td className="py-2 pr-4 truncate max-w-[240px]"><code className="text-xs">{v.file_hash}</code></td>
                  </tr>
                ))}
                {verifications.length === 0 && (
                  <tr><td className="py-3 text-gray-500" colSpan="8">No verifications yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}