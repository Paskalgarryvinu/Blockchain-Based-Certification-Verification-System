import React, { useState } from 'react'
import { useAuth } from '../auth/AuthContext.jsx'

export default function VerifierPage() {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [extractedFields, setExtractedFields] = useState(null)
  const [blockchainFields, setBlockchainFields] = useState(null)
  const { user } = useAuth()

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a file to verify");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setExtractedFields(null);
    setBlockchainFields(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await apiVerify(formData);
      setResult(response);
      
      // Set extracted fields from the uploaded certificate
      setExtractedFields({
        student_name: "John Doe", // Demo data - in real app, this would come from OCR/extraction
        certificate_id: "CERT-2023-001",
        issue_date: "2023-05-15",
        file_hash: response.hash
      });
      
      // Set blockchain fields if verification was successful
      if (response.verified && response.certificate) {
        setBlockchainFields({
          student_name: response.certificate.student_name,
          certificate_id: response.certificate.certificate_id,
          issue_date: response.certificate.issue_date,
          institution_name: response.certificate.institution,
          file_hash: response.hash
        });
      }
    } catch (err) {
      console.error("Verification error:", err);
      setError(err.message || "Failed to verify certificate");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-full mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Verifier Portal</h1>
          <p className="text-gray-600">Verify certificate authenticity using blockchain technology</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-semibold mb-6 text-center">Verify Certificate</h2>
          
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-green-400 transition-colors duration-200">
              <div className="mb-4">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-lg font-medium text-gray-700 mb-2">
                  {file ? file.name : 'Choose a certificate to verify'}
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
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 cursor-pointer transition-colors duration-200"
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

            <button 
              type="submit"
              className="w-full bg-gradient-to-r from-green-600 to-teal-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-green-700 hover:to-teal-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed" 
              disabled={!file || loading}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verifying Certificate...
                </div>
              ) : (
                'Verify Certificate'
              )}
            </button>
          </form>

          {result && (
            <div className="mt-8 p-6 bg-gray-50 rounded-xl">
              <h3 className="text-lg font-semibold mb-4">Verification Result</h3>
              <div className={`p-4 rounded-lg ${result.verified ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-center mb-3">
                  {result.verified ? (
                    <svg className="w-6 h-6 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  <span className={`text-lg font-semibold ${result.verified ? 'text-green-800' : 'text-red-800'}`}>
                    {result.verified ? 'Certificate Verified ✓' : 'Certificate Not Found ✗'}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div><strong>Status:</strong> {result.verified ? 'Valid and authentic' : 'Not found in blockchain'}</div>
                  <div className="bg-gray-100 p-2 rounded my-2">
                    <strong>Certificate Hash:</strong> <code className="font-mono text-xs break-all">{result.hash}</code>
                  </div>
                  
                  {/* Comparison Table */}
                  <div className="mt-4 border rounded-lg overflow-hidden">
                    <div className="bg-blue-50 p-3 border-b">
                      <h3 className="font-bold text-blue-800">Certificate Verification Details</h3>
                    </div>
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Field</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Extracted Value</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Blockchain Value</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Match</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t">
                          <td className="px-4 py-2 font-medium">Student Name</td>
                          <td className="px-4 py-2">{extractedFields?.student_name || 'N/A'}</td>
                          <td className="px-4 py-2">{blockchainFields?.student_name || 'Not found'}</td>
                          <td className="px-4 py-2">
                            {blockchainFields && extractedFields?.student_name === blockchainFields?.student_name ? 
                              <span className="text-green-600">✓</span> : 
                              <span className="text-red-600">✗</span>}
                          </td>
                        </tr>
                        <tr className="border-t bg-gray-50">
                          <td className="px-4 py-2 font-medium">Certificate ID</td>
                          <td className="px-4 py-2">{extractedFields?.certificate_id || 'N/A'}</td>
                          <td className="px-4 py-2">{blockchainFields?.certificate_id || 'Not found'}</td>
                          <td className="px-4 py-2">
                            {blockchainFields && extractedFields?.certificate_id === blockchainFields?.certificate_id ? 
                              <span className="text-green-600">✓</span> : 
                              <span className="text-red-600">✗</span>}
                          </td>
                        </tr>
                        <tr className="border-t">
                          <td className="px-4 py-2 font-medium">Issue Date</td>
                          <td className="px-4 py-2">{extractedFields?.issue_date || 'N/A'}</td>
                          <td className="px-4 py-2">{blockchainFields?.issue_date || 'Not found'}</td>
                          <td className="px-4 py-2">
                            {blockchainFields && extractedFields?.issue_date === blockchainFields?.issue_date ? 
                              <span className="text-green-600">✓</span> : 
                              <span className="text-red-600">✗</span>}
                          </td>
                        </tr>
                        <tr className="border-t bg-gray-50">
                          <td className="px-4 py-2 font-medium">Certificate Hash</td>
                          <td className="px-4 py-2 font-mono text-xs">{extractedFields?.file_hash || 'N/A'}</td>
                          <td className="px-4 py-2 font-mono text-xs">{blockchainFields?.file_hash || 'Not found'}</td>
                          <td className="px-4 py-2">
                            {blockchainFields && extractedFields?.file_hash === blockchainFields?.file_hash ? 
                              <span className="text-green-600">✓</span> : 
                              <span className="text-red-600">✗</span>}
                          </td>
                        </tr>
                        {blockchainFields && (
                          <tr className="border-t">
                            <td className="px-4 py-2 font-medium">Institution</td>
                            <td className="px-4 py-2">-</td>
                            <td className="px-4 py-2">{blockchainFields.institution_name}</td>
                            <td className="px-4 py-2">-</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}


        </div>
      </div>
    </div>
  )
}