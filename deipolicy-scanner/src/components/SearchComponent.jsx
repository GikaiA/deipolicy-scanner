// src/components/SearchComponent.jsx
import { useState } from 'react';
import { searchDEIPolicies } from '../api';
import './SearchComponent.css';

function SearchComponent() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!url) {
      setError('Please enter a URL');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setResults(null);
      
      const data = await searchDEIPolicies(url);
      setResults(data);
    } catch (err) {
      setError(err.message || 'An error occurred while searching');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="search-container">
      <h1>DEI Policy Finder</h1>
      <p>Enter a company website to find their DEI policies</p>
      
      <form onSubmit={handleSearch}>
        <div className="search-input">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter website URL (e.g., company.com)"
            className="url-input"
          />
          <button 
            type="submit" 
            className="search-button"
            disabled={loading}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}

      {loading && (
        <div className="loading">
          <p>Searching for DEI policies... This may take a moment.</p>
        </div>
      )}

      {results && (
        <div className="results">
          <h2>Results for {results.url}</h2>
          
          {Array.isArray(results.deiPolicies) ? (
            <div>
              <p>Found potential DEI policies on {results.pagesAnalyzed.length} pages:</p>
              {results.deiPolicies.map((item, index) => (
                <div className="policy-item" key={index}>
                  <h3>
                    <a href={item.url} target="_blank" rel="noopener noreferrer">
                      {item.url}
                    </a>
                  </h3>
                  <div className="policy-content">
                    {item.policies.split('\n').map((paragraph, i) => (
                      paragraph ? <p key={i}>{paragraph}</p> : null
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="policy-content">
              {results.deiPolicies.split('\n').map((paragraph, i) => (
                paragraph ? <p key={i}>{paragraph}</p> : null
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SearchComponent;