import { useState } from 'react'
import axios from 'axios'
import './App.css'

function App() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await axios.post('/api/scan', { url })
      setResult(response.data)
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred while scanning the website')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <h1>DEI Policy Scanner</h1>
      <p className="description">
        Enter a website URL to scan for DEI (Diversity, Equity, and Inclusion) policies
      </p>

      <form onSubmit={handleSubmit} className="form">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter website URL (e.g., https://example.com)"
          required
          className="url-input"
        />
        <button type="submit" disabled={loading} className="submit-button">
          {loading ? 'Scanning...' : 'Scan Website'}
        </button>
      </form>

      {error && <div className="error">{error}</div>}

      {result && (
        <div className="result">
          <h2>Scan Results</h2>
          <div className="result-content">
            <h3>Summary</h3>
            <p>{result.summary}</p>
            
            <h3>Key Findings</h3>
            <ul>
              {result.findings.map((finding, index) => (
                <li key={index}>{finding}</li>
              ))}
            </ul>

            {result.recommendations && (
              <>
                <h3>Recommendations</h3>
                <ul>
                  {result.recommendations.map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
