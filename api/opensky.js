export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: 'Falta lat/lon' });
  }

  try {
    const lamin = parseFloat(lat) - 1;
    const lamax = parseFloat(lat) + 1;
    const lomin = parseFloat(lon) - 1;
    const lomax = parseFloat(lon) + 1;

    const url = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
    
    const r = await fetch(url);
    if (!r.ok) throw new Error(`OpenSky ${r.status}`);
    
    const data = await r.json();
    return res.status(200).json(data);

  } catch (e) {
    console.error('OpenSky error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
