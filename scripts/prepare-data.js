const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

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

function prepareData() {
  console.log('--- Starting Data Preparation ---');
  const csvPath = path.join(process.cwd(), 'data', 'movies.csv');
  const fileContent = fs.readFileSync(csvPath, 'utf8');
  
  console.log('Parsing CSV...');
  const parsed = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
  });
  
  const rawData = parsed.data;
  console.log(`Found ${rawData.length} movies.`);

  // 1. Optimize Metadata (smaller file for UI)
  const moviesMetadata = rawData.map(m => ({
    id: m.Movie_ID,
    title: m.Movie_Title,
    genre: m.Movie_Genre,
    overview: m.Movie_Overview,
    popularity: m.Movie_Popularity
  }));

  // 2. Build TF-IDF Matrix
  console.log('Tokenizing and calculating TF-IDF...');
  const documents = rawData.map(movie => {
    const genre = (movie.Movie_Genre || '').toLowerCase();
    const keywords = (movie.Movie_Keywords || '').toLowerCase();
    const cast = (movie.Movie_Cast || '').toLowerCase();
    const director = (movie.Movie_Director || '').toLowerCase();
    const overview = (movie.Movie_Overview || '').toLowerCase();
    
    const text = `${genre} ${genre} ${genre} ${keywords} ${keywords} ${keywords} ${cast} ${cast} ${director} ${director} ${overview}`;
    const tokens = text.match(/\b\w+\b/g) || [];
    return tokens.filter(word => !STOP_WORDS.has(word));
  });

  const df = {};
  documents.forEach(doc => {
    const uniqueWords = new Set(doc);
    uniqueWords.forEach(word => {
      df[word] = (df[word] || 0) + 1;
    });
  });

  const N = documents.length;
  const tfidfMatrix = documents.map(doc => {
    const tf = {};
    doc.forEach(word => {
      tf[word] = (tf[word] || 0) + 1;
    });
    
    const vector = {};
    let sumSq = 0;
    for (const [word, count] of Object.entries(tf)) {
      const idf = Math.log(N / (1 + (df[word] || 0)));
      const tfidf = count * idf;
      vector[word] = parseFloat(tfidf.toFixed(4));
      sumSq += tfidf * tfidf;
    }
    
    const norm = Math.sqrt(sumSq) || 1;
    const normalizedVector = {};
    for (const [word, val] of Object.entries(vector)) {
      normalizedVector[word] = parseFloat((val / norm).toFixed(4));
    }
    return normalizedVector;
  });

  // Save files
  console.log('Saving optimized files...');
  fs.writeFileSync(
    path.join(process.cwd(), 'data', 'movies_metadata.json'), 
    JSON.stringify(moviesMetadata)
  );
  fs.writeFileSync(
    path.join(process.cwd(), 'data', 'tfidf_matrix.json'), 
    JSON.stringify(tfidfMatrix)
  );

  console.log('--- Data Preparation Complete! ---');
  console.log('Created: data/movies_metadata.json');
  console.log('Created: data/tfidf_matrix.json');
}

prepareData();
