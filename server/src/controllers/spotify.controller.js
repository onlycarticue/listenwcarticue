const ARTIST_ID = "0AvGycOEDZTaBFLCaiGd9S";
const API_BASE = "https://api.spotify.com/v1";

let cachedToken = "";
let tokenExpiresAt = 0;

const getAccessToken = async () => {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = process.env;
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    const error = new Error("Spotify API ยังไม่ได้ตั้งค่า กรุณากำหนด SPOTIFY_CLIENT_ID และ SPOTIFY_CLIENT_SECRET ใน server/.env");
    error.status = 503;
    throw error;
  }

  const credentials = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64");
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const error = new Error("Spotify ยืนยันตัวตน API ไม่สำเร็จ ตรวจสอบ Client ID/Secret และสถานะ Spotify Developer app");
    error.status = 502;
    throw error;
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + Math.max(0, data.expires_in - 60) * 1000;
  return cachedToken;
};

const getArtistAlbums = async (req, res, next) => {
  try {
    const token = await getAccessToken();
    const albums = [];
    const seenIds = new Set();
    let offset = 0;
    let hasMore = true;

    while (hasMore && albums.length < 1000) {
      const url = new URL(`${API_BASE}/artists/${ARTIST_ID}/albums`);
      url.searchParams.set("include_groups", "album,single,compilation");
      url.searchParams.set("market", "TH");
      url.searchParams.set("limit", "50");
      url.searchParams.set("offset", String(offset));

      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) {
        const error = new Error("Spotify โหลดรายการอัลบั้มไม่สำเร็จ");
        error.status = response.status === 429 ? 503 : 502;
        throw error;
      }

      const data = await response.json();
      for (const album of data.items || []) {
        if (seenIds.has(album.id)) continue;
        seenIds.add(album.id);
        albums.push({
          id: album.id,
          name: album.name,
          releaseDate: album.release_date,
          albumType: album.album_type,
          totalTracks: album.total_tracks,
          image: album.images?.[0]?.url || "",
          spotifyUrl: album.external_urls?.spotify || `https://open.spotify.com/album/${album.id}`,
        });
      }
      offset += (data.items || []).length;
      hasMore = Boolean(data.next) && (data.items || []).length > 0;
    }

    res.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
    res.json({ albums });
  } catch (error) {
    next(error);
  }
};

module.exports = { getArtistAlbums };
