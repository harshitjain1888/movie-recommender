"use client";

import { useState, useEffect, useRef } from 'react';

// A simple MovieCard component
const MovieCard = ({ movie, similarity }) => {
  const [posterUrl, setPosterUrl] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  
  useEffect(() => {
    const fetchPoster = async () => {
      const title = movie.title || movie.Title;
      if (!title) return;
      try {
        const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&query=${encodeURIComponent(title)}`);
        const data = await res.json();
        // Try to match exact year if possible, but fallback to first result
        if (data.results && data.results.length > 0 && data.results[0].poster_path) {
          setPosterUrl(`https://image.tmdb.org/t/p/w500${data.results[0].poster_path}`);
        }
      } catch (e) {
        console.error("Error fetching poster", e);
      }
    };
    fetchPoster();
  }, [movie]);

  // Fallback gradient if no poster is found
  const getGradient = (title) => {
    if (!title) return '#1e293b';
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
      hash = title.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = hash % 360;
    return `linear-gradient(135deg, hsl(${h}, 70%, 20%), hsl(${(h + 40) % 360}, 70%, 10%))`;
  };

  return (
    <div className="movie-card" onClick={() => setIsExpanded(!isExpanded)}>
      <div className="poster-container" style={{ background: getGradient(movie.title || movie.Title) }}>
        {posterUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={posterUrl} alt={movie.title || movie.Title} className="poster-image" />
        ) : (
          <div className="poster-fallback">🎬</div>
        )}
        {similarity && (
          <div className="similarity-badge">{(similarity * 100).toFixed(0)}% Match</div>
        )}
      </div>
      <div className="movie-info">
        <h3 className="movie-title">{movie.title || movie.Title}</h3>
        <p className="movie-genre">{(movie.genre || movie.Genre || '').split(',').slice(0, 3).join(', ')}</p>
        <div className={`movie-overview ${isExpanded ? 'expanded' : ''}`}>
          {movie.overview || movie.Overview || 'No overview available.'}
        </div>
        {(movie.overview?.length > 100 || movie.Overview?.length > 100) && (
          <span className="read-more-btn">
            {isExpanded ? 'Show less' : 'Read more'}
          </span>
        )}
      </div>
    </div>
  );
};

export default function Home() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchedMovie, setSearchedMovie] = useState(null);
  const searchRef = useRef(null);

  // Fetch trending on load
  useEffect(() => {
    fetch('/api/movies/trending')
      .then(res => res.json())
      .then(data => {
        if (data.trending) setTrending(data.trending);
      })
      .catch(err => console.error(err));
  }, []);

  // Handle outside click for autocomplete
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle search input
  const handleSearchChange = async (e) => {
    const val = e.target.value;
    setQuery(val);
    
    if (val.length > 1) {
      try {
        const res = await fetch(`/api/movies/search?q=${encodeURIComponent(val)}`);
        const data = await res.json();
        setSuggestions(data.movies || []);
        setShowSuggestions(true);
      } catch (err) {
        console.error(err);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Get recommendations
  const fetchRecommendations = async (title) => {
    setQuery(title);
    setShowSuggestions(false);
    setLoading(true);
    setSearchedMovie(title);
    setTrending([]); // Hide trending when searching
    
    try {
      const res = await fetch(`/api/movies/recommend?title=${encodeURIComponent(title)}`);
      const data = await res.json();
      if (data.recommendations) {
        setRecommendations(data.recommendations);
      } else {
        setRecommendations([]);
      }
    } catch (err) {
      console.error(err);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      fetchRecommendations(query);
    }
  };

  return (
    <main className="container">
      <h1 className="hero-title">Discover Your Next Favorite Movie</h1>
      
      <div className="search-container" ref={searchRef}>
        <div className="search-bar">
          <input
            type="text"
            className="search-input"
            placeholder="Type a movie name (e.g. Avatar, Inception)..."
            value={query}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            onFocus={() => { if(query.length > 1) setShowSuggestions(true); }}
          />
          <button className="search-button" onClick={() => fetchRecommendations(query)}>
            Recommend
          </button>
        </div>
        
        {showSuggestions && suggestions.length > 0 && (
          <div className="autocomplete-dropdown">
            {suggestions.map((title, idx) => (
              <div 
                key={idx} 
                className="autocomplete-item"
                onClick={() => fetchRecommendations(title)}
              >
                {title}
              </div>
            ))}
          </div>
        )}
      </div>

      {loading && (
        <div className="loader-container">
          <div className="loader"></div>
        </div>
      )}

      {!loading && searchedMovie && recommendations.length > 0 && (
        <div>
          <h2 className="section-title">Because you liked "{searchedMovie}"</h2>
          <div className="movie-grid">
            {recommendations.map(movie => (
              <MovieCard key={movie.id} movie={movie} similarity={movie.similarity} />
            ))}
          </div>
        </div>
      )}

      {!loading && searchedMovie && recommendations.length === 0 && (
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <p>Sorry, we couldn't find any recommendations for "{searchedMovie}".</p>
          <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginTop: '0.5rem' }}>Make sure you select a movie from the suggestions dropdown.</p>
        </div>
      )}

      {!loading && trending.length > 0 && !searchedMovie && (
        <div>
          <h2 className="section-title">Top Trending Movies</h2>
          <div className="movie-grid">
            {trending.map(movie => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
