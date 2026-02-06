import React, { createContext, useContext, useState, useEffect } from 'react'
import { apiLogin } from '../services/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
	const [user, setUser] = useState(null)

	useEffect(() => {
		const saved = localStorage.getItem('trusted_user')
		if (saved) {
			setUser(JSON.parse(saved))
		}
	}, [])

	function login(email, password) {
		return apiLogin(email, password).then((res) => {
			const u = { token: res.token, role: res.role, name: res.name, email }
			localStorage.setItem('trusted_user', JSON.stringify(u))
			setUser(u)
			return u
		})
	}

	function logout() {
		localStorage.removeItem('trusted_user')
		setUser(null)
	}

	return (
		<AuthContext.Provider value={{ user, login, logout }}>
			{children}
		</AuthContext.Provider>
	)
}

export function useAuth() {
	return useContext(AuthContext)
}
