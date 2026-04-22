import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

let moviesData = null;
let tfidfMatrix = null;
let lastUpdate = 0; // use timestamp to bust cache

export function loadData() {
  // Bust cache completely by checking a fake timestamp or just let it rebuild once
  if (moviesData && lastUpdate > 0) return { moviesData, tfidfMatrix };
  
  lastUpdate = Date.now();
  
  const filePath = path.join(process.cwd(), 'data', 'movies.csv');
  const fileContent = fs.readFileSync(filePath, 'utf8');
  
  const parsed = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
  });
  
  moviesData = parsed.data;
  
  const STOP_WORDS = new Set([
    'i','me','my','myself','we','our','ours','ourselves','you','your','yours','yourself','yourselves',
    'he','him','his','himself','she','her','hers','herself','it','its','itself','they','them','their',
    'theirs','themselves','what','which','who','whom','this','that','these','those','am','is','are',
    'was','were','be','been','being','have','has','had','having','do','does','did','doing','a','an',
    'the','and','but','if','or','because','as','until','while','of','at','by','for','with','about',
    'against','between','into','through','during','before','after','above','below','to','from','up',
    'down','in','out','on','off','over','under','again','further','then','once','here','there','when',
    'where','why','how','all','any','both','each','few','more','most','other','some','such','no','nor',
    'not','only','own','same','so','than','too','very','s','t','can','will','just','don','should','now'
  ]);

  // Preprocessing
  const documents = moviesData.map(movie => {
    const genre = (movie.Movie_Genre || '').toLowerCase();
    const keywords = (movie.Movie_Keywords || '').toLowerCase();
    const cast = (movie.Movie_Cast || '').toLowerCase();
    const director = (movie.Movie_Director || '').toLowerCase();
    const overview = (movie.Movie_Overview || '').toLowerCase();
    
    // Feature Weighting: Boost keywords/genres by 3x, cast/director by 2x
    const text = `${genre} ${genre} ${genre} ${keywords} ${keywords} ${keywords} ${cast} ${cast} ${director} ${director} ${overview}`;
    
    // Tokenize
    const tokens = text.match(/\b\w+\b/g) || [];
    
    // Stop Word Removal
    const filteredTokens = tokens.filter(word => !STOP_WORDS.has(word));
    return filteredTokens;
  });
  
  // Document Frequency
  const df = {};
  documents.forEach(doc => {
    const uniqueWords = new Set(doc);
    uniqueWords.forEach(word => {
      df[word] = (df[word] || 0) + 1;
    });
  });
  
  const N = documents.length;
  
  // Build TF-IDF vectors
  tfidfMatrix = documents.map(doc => {
    const tf = {};
    doc.forEach(word => {
      tf[word] = (tf[word] || 0) + 1;
    });
    
    const vector = {};
    let sumSq = 0;
    
    for (const [word, count] of Object.entries(tf)) {
      const idf = Math.log(N / (1 + (df[word] || 0)));
      const tfidf = count * idf;
      vector[word] = tfidf;
      sumSq += tfidf * tfidf;
    }
    
    // Normalize vector
    const norm = Math.sqrt(sumSq) || 1;
    const normalizedVector = {};
    for (const [word, val] of Object.entries(vector)) {
      normalizedVector[word] = val / norm;
    }
    return normalizedVector;
  });

  return { moviesData, tfidfMatrix };
}

function computeSimilarity(vec1, vec2) {
  let dotProduct = 0;
  for (const word in vec1) {
    if (vec2[word]) {
      dotProduct += vec1[word] * vec2[word];
    }
  }
  return dotProduct;
}

export function getRecommendations(movieTitle, topN = 10) {
  loadData();
  
  // Find movie (case insensitive)
  const movieIndex = moviesData.findIndex(m => m.Movie_Title.toLowerCase() === movieTitle.toLowerCase());
  if (movieIndex === -1) return [];
  
  const targetVector = tfidfMatrix[movieIndex];
  
  const similarities = [];
  for (let i = 0; i < moviesData.length; i++) {
    if (i === movieIndex) continue;
    
    const sim = computeSimilarity(targetVector, tfidfMatrix[i]);
    similarities.push({ index: i, similarity: sim });
  }
  
  similarities.sort((a, b) => b.similarity - a.similarity);
  
  return similarities.slice(0, topN).map(s => {
    const movie = moviesData[s.index];
    return {
      id: movie.Movie_ID,
      title: movie.Movie_Title,
      genre: movie.Movie_Genre,
      overview: movie.Movie_Overview,
      similarity: s.similarity.toFixed(4)
    };
  });
}

export function searchMovies(query) {
  loadData();
  if (!query) return moviesData.slice(0, 20).map(m => m.Movie_Title);
  
  const lowerQuery = query.toLowerCase();
  return moviesData
    .filter(m => m.Movie_Title.toLowerCase().includes(lowerQuery))
    .slice(0, 10)
    .map(m => m.Movie_Title);
}

export function getTrendingMovies() {
  loadData();
  return moviesData
    .sort((a, b) => parseFloat(b.Movie_Popularity || 0) - parseFloat(a.Movie_Popularity || 0))
    .slice(0, 10)
    .map(m => ({
      id: m.Movie_ID,
      title: m.Movie_Title,
      genre: m.Movie_Genre,
      overview: m.Movie_Overview,
      popularity: m.Movie_Popularity
    }));
}
