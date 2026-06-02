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
      headers: { 'User-Agent': 'RadarEstelas/1.0' }
    });
    
    if (!r.ok) throw new Error(`OpenSky HTTP ${r.status}`);
    
    const data = await r.json();
    
    if (!data.states) {
      return res.status(200).json({ states: [], time: data.time, error: null });
    }

    const inFlight = data.states.filter(s => {
      const [icao, callsign, origin, time, lat, lon, baroAlt, onGround, vel, trueTrack, vertRate, sensors, geoAlt, squawk, spi, posSource, category] = s;
      return lat && lon && baroAlt && !onGround;
    });

    return res.status(200).json({ 
      states: inFlight, 
      time: data.time,
      debug: {
        total: data.states.length,
        inFlight: inFlight.length
      }
    });

  } catch (e) {
    console.error('[OpenSky Error]', e.message);
    return res.status(500).json({ error: e.message });
  }
}
