// Jarvixss Chat - Vercel Serverless Function for Image Search
// Sources: Unsplash (if UNSPLASH_ACCESS_KEY set), else Wikimedia Commons/Wikipedia

const WIKIMEDIA_SEARCH_URL = 'https://commons.wikimedia.org/w/api.php';
const UNSPLASH_SEARCH_URL = 'https://api.unsplash.com/search/photos';

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-Requested-With, Accept, Content-Type'
  );
}

function isValidHttpUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

async function searchWikimedia(q, limit = 3) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    generator: 'search',
    gsrnamespace: '6', // File namespace
    gsrsearch: q,
    gsrlimit: String(limit),
    prop: 'imageinfo|pageimages',
    iiprop: 'url|extmetadata|mime',
    iiurlwidth: '640',
    origin: '*'
  });

  const response = await fetch(`${WIKIMEDIA_SEARCH_URL}?${params.toString()}`, {
    headers: {
      'User-Agent': 'JarvixssChat/1.0 (Educational Project)',
      'Referer': 'http://localhost:3000'
    },
    signal: AbortSignal.timeout(10000)
  });

  if (!response.ok) {
    throw new Error(`Wikimedia API returned ${response.status}`);
  }

  const data = await response.json();
  const pages = data.query?.pages || {};
  const results = [];

  for (const page of Object.values(pages)) {
    const imageinfo = page.imageinfo?.[0];
    if (!imageinfo || !imageinfo.url) continue;
    if (!isValidHttpUrl(imageinfo.url)) continue;

    const ext = imageinfo.extmetadata || {};
    const title = page.title?.replace('File:', '') || page.title || q;
    const artist = ext.Artist?.value || ext.Credit?.value || 'Wikimedia Commons';
    const sourceUrl = `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title)}`;

    results.push({
      imageUrl: imageinfo.url,
      thumbnailUrl: imageinfo.thumburl || imageinfo.url,
      title,
      author: artist.replace(/<[^>]*>/g, '').trim() || 'Wikimedia Commons',
      source: sourceUrl,
      credit: artist.replace(/<[^>]*>/g, '').trim() || 'Wikimedia Commons'
    });
  }

  return results.slice(0, limit);
}

async function searchUnsplash(q, limit = 3, accessKey) {
  const params = new URLSearchParams({
    query: q,
    per_page: String(limit),
    orientation: 'landscape'
  });

  const response = await fetch(`${UNSPLASH_SEARCH_URL}?${params.toString()}`, {
    headers: {
      Authorization: `Client-ID ${accessKey}`,
      'Accept-Version': 'v1'
    },
    signal: AbortSignal.timeout(10000)
  });

  if (!response.ok) {
    throw new Error(`Unsplash API returned ${response.status}`);
  }

  const data = await response.json();
  const results = [];

  for (const photo of data.results || []) {
    if (!photo.urls?.regular || !isValidHttpUrl(photo.urls.regular)) continue;
    const author = photo.user?.name || 'Unsplash';
    const sourceUrl = photo.links?.html || `https://unsplash.com/photos/${photo.id}`;

    results.push({
      imageUrl: photo.urls.regular,
      thumbnailUrl: photo.urls.small || photo.urls.thumb || photo.urls.regular,
      title: photo.alt_description || photo.description || q,
      author,
      source: sourceUrl,
      credit: `${author} on Unsplash`
    });
  }

  return results.slice(0, limit);
}

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    let q = url.searchParams.get('q') || '';

    q = q.trim().slice(0, 100); // limit query length
    if (!q) {
      return res.status(400).json({ error: 'Missing query' });
    }

    const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
    let results = [];

    if (unsplashKey) {
      try {
        results = await searchUnsplash(q, 3, unsplashKey);
      } catch (e) {
        console.error('Unsplash error:', e.message);
      }
    }

    if (results.length === 0) {
      try {
        results = await searchWikimedia(q, 3);
      } catch (e) {
        console.error('Wikimedia error:', e.message);
      }
    }

    // Filter to only https/http
    results = results.filter(r => isValidHttpUrl(r.imageUrl));

    return res.status(200).json({ results });
  } catch (error) {
    console.error('Image search error:', error.message);
    return res.status(200).json({ results: [] });
  }
}
