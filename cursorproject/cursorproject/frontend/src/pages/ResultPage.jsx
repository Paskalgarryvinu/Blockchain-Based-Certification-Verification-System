import React from 'react'
import { useVerification } from '../context/VerificationContext.jsx'
import clsx from 'clsx'

export default function ResultPage() {
	const { lastResult } = useVerification()

	if (!lastResult) {
		return <div className="card">No result to display. Please verify a certificate first.</div>
	}

	const statusColor = lastResult.status === 'valid' ? 'text-green-700 bg-green-50 border-green-200' : 'text-yellow-800 bg-yellow-50 border-yellow-200'

	return (
		<div className="max-w-3xl mx-auto mt-6">
			<div className="card">
				<h2 className="text-xl font-semibold mb-4">Verification Result</h2>
				<div className={clsx('border rounded p-4 mb-4', statusColor)}>
					<div className="text-lg font-semibold">Status: {lastResult.status.toUpperCase()}</div>
					<div>Confidence: {(lastResult.confidence * 100).toFixed(0)}%</div>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="card">
						<h3 className="font-semibold mb-2">Extracted Fields</h3>
						<ul className="text-sm text-gray-700 space-y-1">
							<li><strong>Name:</strong> {lastResult.extracted?.name}</li>
							<li><strong>Institution:</strong> {lastResult.extracted?.institution}</li>
							<li><strong>Year:</strong> {lastResult.extracted?.year}</li>
							<li><strong>Certificate ID:</strong> {lastResult.extracted?.certificate_id}</li>
						</ul>
					</div>
					<div className="card">
						<h3 className="font-semibold mb-2">Institution Match</h3>
						{lastResult.institution_match ? (
							<ul className="text-sm text-gray-700 space-y-1">
								<li><strong>Name:</strong> {lastResult.institution_match.name}</li>
								<li><strong>Institution:</strong> {lastResult.institution_match.institution}</li>
								<li><strong>Year:</strong> {lastResult.institution_match.year}</li>
								<li><strong>Certificate ID:</strong> {lastResult.institution_match.certificate_id}</li>
							</ul>
						) : (
							<div className="text-sm text-gray-600">No exact match found</div>
						)}
					</div>
				</div>
				<div className="card mt-4">
					<h3 className="font-semibold mb-2">Reasons</h3>
					<ul className="list-disc ml-6 text-sm text-gray-700 space-y-1">
						{lastResult.reasons?.map((r, idx) => (<li key={idx}>{r}</li>))}
					</ul>
				</div>
				<div className="card mt-4">
					<h3 className="font-semibold mb-2">Ledger</h3>
					<div className="text-sm text-gray-700">File Hash (SHA-256): <code>{lastResult.file_hash}</code></div>
					<div className="text-xs text-gray-500 mt-2">Created at: {lastResult.created_at}</div>
				</div>
			</div>
		</div>
	)
}

