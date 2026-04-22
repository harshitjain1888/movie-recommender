import fs from 'fs';
import path from 'path';

let moviesData = null;
let tfidfMatrix = null;

export function loadData() {
  if (moviesData && tfidfMatrix) return { moviesData, tfidfMatrix };
  
  const metadataPath = path.join(process.cwd(), 'data', 'movies_metadata.json');
  const matrixPath = path.join(process.cwd(), 'data', 'tfidf_matrix.json');
  
  if (!fs.existsSync(metadataPath) || !fs.existsSync(matrixPath)) {
    console.warn('ML data files not found. Please run scripts/prepare-data.js');
    return { moviesData: [], tfidfMatrix: [] };
  }

  moviesData = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  tfidfMatrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
  
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
  const { moviesData, tfidfMatrix } = loadData();
  
  const movieIndex = moviesData.findIndex(m => m.title.toLowerCase() === movieTitle.toLowerCase());
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
      id: movie.id,
      title: movie.title,
      genre: movie.genre,
      overview: movie.overview,
      similarity: s.similarity.toFixed(4)
    };
  });
}

export function searchMovies(query) {
  const { moviesData } = loadData();
  if (!query) return moviesData.slice(0, 20).map(m => m.title);
  
  const lowerQuery = query.toLowerCase();
  return moviesData
    .filter(m => m.title.toLowerCase().includes(lowerQuery))
    .slice(0, 10)
    .map(m => m.title);
}

export function getTrendingMovies() {
  const { moviesData } = loadData();
  return moviesData
    .sort((a, b) => parseFloat(b.popularity || 0) - parseFloat(a.popularity || 0))
    .slice(0, 10)
    .map(m => ({
      id: m.id,
      title: m.title,
      genre: m.genre,
      overview: m.overview,
      popularity: m.popularity
    }));
}
