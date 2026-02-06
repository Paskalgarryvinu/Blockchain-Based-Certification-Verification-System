import React, { useState, useEffect } from 'react'
import { useAuth } from '../auth/AuthContext.jsx'

export default function InstitutionUploadPage() {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [certificates, setCertificates] = useState([])
  const [loadingCertificates, setLoadingCertificates] = useState(false)
  const [extractedFields, setExtractedFields] = useState(null)
  const [generatedHash, setGeneratedHash] = useState('')
  const { user } = useAuth()
  
  // Fetch certificates on component mount
  useEffect(() => {
    fetchCertificates()
  }, [])
  
  // Function to fetch certificates
  const fetchCertificates = async () => {
    setLoadingCertificates(true)
    try {
      const response = await fetch('http://127.0.0.1:8000/institution/certificates', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch certificates')
      }
      
      const data = await response.json()
      setCertificates(data.certificates)
    } catch (err) {
      console.error('Error fetching certificates:', err)
    } finally {
      setLoadingCertificates(false)
    }
  }

  async function onSubmit(e) {
    e.preventDefault()
    if (!file) return
    setLoading(true)
    setError(null)
    setSuccess(null)
    setExtractedFields(null)
    setGeneratedHash('')
    
    // Show processing steps
    const processingSteps = [
      "Uploading certificate...",
      "Extracting data using Gemini AI...",
      "Generating secure SHA-256 hash...",
      "Encrypting sensitive data with AES-256...",
      "Storing in blockchain..."
    ]
    
    let currentStep = 0
    const processingInterval = setInterval(() => {
      setSuccess(processingSteps[currentStep])
      currentStep = (currentStep + 1) % processingSteps.length
    }, 1500)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      console.log("Uploading file:", file.name, "Size:", file.size)
      
      const response = await fetch('http://127.0.0.1:8000/institution/upload-certificate', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      })
      
      const responseData = await response.json()
      
      if (!response.ok) {
        const errorMessage = responseData.detail || responseData.message || 'Upload failed'
        console.error("Upload error:", errorMessage, responseData)
        throw new Error(errorMessage)
      }
      
      clearInterval(processingInterval)
      setSuccess('Certificate uploaded and secured successfully! Hash generated and stored in blockchain.')
      
      // Display extracted fields and hash
      setExtractedFields({
        student_name: responseData.student_name,
        certificate_id: responseData.certificate_id,
        issue_date: responseData.issue_date || new Date().toISOString().split('T')[0],
        institution_name: responseData.institution_name || user.name
      })
      setGeneratedHash(responseData.file_hash || '')
      
      setFile(null)
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]')
      if (fileInput) fileInput.value = ''
      
      // Refresh certificates list
      fetchCertificates()
    } catch (err) {
      clearInterval(processingInterval)
      console.error("Upload error details:", err)
      setError(`Upload failed: ${err.message || 'Please try again with a valid certificate image.'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-600 rounded-full mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Institution Portal</h1>
          <p className="text-gray-600">Upload and secure your certificates on the blockchain</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-semibold mb-6 text-center">Upload Certificate</h2>
          
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-purple-400 transition-colors duration-200">
              <div className="mb-4">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-lg font-medium text-gray-700 mb-2">
                  {file ? file.name : 'Choose a certificate file'}
                </p>
                <p className="text-sm text-gray-500">
                  Supports PDF, PNG, JPG, JPEG files
                </p>
              </div>
              <input 
                type="file" 
                accept=".pdf,.png,.jpg,.jpeg" 
                onChange={e => setFile(e.target.files?.[0] ?? null)}
                className="hidden"
                id="file-upload"
              />
              <label 
                htmlFor="file-upload"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 cursor-pointer transition-colors duration-200"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Select File
              </label>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {success}
                </div>
              </div>
            )}
            
            {/* Extracted Fields and Hash Display */}
            {extractedFields && (
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-800 mb-3">Extracted Certificate Information:</h3>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="font-medium">Student Name:</div>
                    <div>{extractedFields.student_name}</div>
                    
                    <div className="font-medium">Certificate ID:</div>
                    <div>{extractedFields.certificate_id}</div>
                    
                    <div className="font-medium">Issue Date:</div>
                    <div>{extractedFields.issue_date}</div>
                    
                    <div className="font-medium">Institution:</div>
                    <div>{extractedFields.institution_name}</div>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-blue-200">
                    <div className="font-medium mb-1">Generated Certificate Hash:</div>
                    <div className="bg-white p-3 rounded font-mono text-sm break-all">{generatedHash}</div>
                    <div className="mt-2 text-xs text-blue-600">This unique hash has been stored in the blockchain for verification.</div>
                  </div>
                </div>
              </div>
            )}

            <button 
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed" 
              disabled={!file || loading}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uploading & Generating Hash...
                </div>
              ) : (
                'Upload Certificate'
              )}
            </button>
          </form>


          
          {/* Certificate Records Section */}
          <div className="mt-8 p-6 bg-white rounded-xl shadow-lg">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Certificate Records</h3>
            
            {loadingCertificates ? (
              <div className="flex justify-center py-8">
                <svg className="animate-spin h-8 w-8 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : certificates.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No certificates uploaded yet
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Certificate ID</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Upload Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-100">Certificate Hash</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {certificates.map((cert, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{cert.student_name}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{cert.certificate_id}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{new Date(cert.upload_date).toLocaleDateString()}</td>
                        <td className="px-4 py-2 bg-gray-100 font-mono text-xs break-all">{cert.file_hash}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}