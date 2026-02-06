import React, { createContext, useContext, useState } from 'react'

const VerificationContext = createContext(null)

export function VerificationProvider({ children }) {
  const [lastResult, setLastResult] = useState(null)
  return (
    <VerificationContext.Provider value={{ lastResult, setLastResult }}>
      {children}
    </VerificationContext.Provider>
  )
}

export function useVerification() {
  return useContext(VerificationContext)
}