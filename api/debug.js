export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: 'Falta lat/lon' });
  }

  try {
    const lamin = parseFloat(lat) - 1.5;
    const lamax = parseFloat(lat) + 1.5;
    const lomin = parseFloat(lon) - 1.5;
    const lomax = parseFloat(lon) + 1.5;

    const url = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
    
    const r = await fetch(url, {
      headers: { 'User-Agent': 'RadarEstelas-Debug/1.0' }
    });

    if (!r.ok) {
      return res.status(200).json({
        error: `OpenSky HTTP ${r.status}`,
        url: url,
        status: r.status
      });
    }

    const data = await r.json();

    const totalStates = data.states ? data.states.length : 0;
    const inFlight = data.states ? data.states.filter(s => !s[7]).length : 0;
    const withAltitude = data.states ? data.states.filter(s => s[6] !== null).length : 0;

    return res.status(200).json({
      timestamp: new Date().toISOString(),
      bbox: { lamin, lomin, lamax, lomax },
      stats: {
        total_states: totalStates,
        in_flight: inFlight,
        with_altitude: withAltitude
      },
      time: data.time,
      sample_states: data.states ? data.states.slice(0, 5) : []
    });

  } catch (e) {
    console.error('[DEBUG Error]', e.message);
    return res.status(500).json({ 
      error: e.message
    });
  }
}
