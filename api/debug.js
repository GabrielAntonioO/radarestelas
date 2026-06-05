export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const { lat, lon } = req.query;

  console.log(`[DEBUG] Request recibida: lat=${lat}, lon=${lon}`);

  if (!lat || !lon) {
    console.log(`[DEBUG] Error: Falta lat o lon`);
    return res.status(400).json({ error: 'Falta lat/lon' });
  }

  try {
    const lamin = parseFloat(lat) - 1.5;
    const lamax = parseFloat(lat) + 1.5;
    const lomin = parseFloat(lon) - 1.5;
    const lomax = parseFloat(lon) + 1.5;

    const url = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
    
    console.log(`[DEBUG] URL OpenSky: ${url}`);
    console.log(`[DEBUG] Intentando fetch...`);

    const r = await fetch(url, {
      headers: { 'User-Agent': 'RadarEstelas-Debug/1.0' }
    });

    console.log(`[DEBUG] Fetch completado. Status: ${r.status}, OK: ${r.ok}`);

    if (!r.ok) {
      console.log(`[DEBUG] Error HTTP ${r.status} de OpenSky`);
      return res.status(200).json({
        error: `OpenSky HTTP ${r.status}`,
        url: url,
        status: r.status
      });
    }

    console.log(`[DEBUG] Parseando JSON...`);
    const data = await r.json();
    console.log(`[DEBUG] JSON parseado. Total estados: ${data.states ? data.states.length : 0}`);

    const totalStates = data.states ? data.states.length : 0;
    const inFlight = data.states ? data.states.filter(s => !s[7]).length : 0;
    const withAltitude = data.states ? data.states.filter(s => s[6] !== null).length : 0;

    console.log(`[DEBUG] Estadísticas: total=${totalStates}, en_vuelo=${inFlight}, con_altitud=${withAltitude}`);

    const response = {
      timestamp: new Date().toISOString(),
      bbox: { lamin, lomin, lamax, lomax },
      stats: {
        total_states: totalStates,
        in_flight: inFlight,
        with_altitude: withAltitude
      },
      time: data.time,
      sample_states: data.states ? data.states.slice(0, 5) : []
    };

    console.log(`[DEBUG] Respondiendo con éxito`);
    return res.status(200).json(response);

  } catch (e) {
    console.error(`[DEBUG] ERROR CAPTURADO: ${e.message}`);
    console.error(`[DEBUG] Stack: ${e.stack}`);
    return res.status(500).json({ 
      error: e.message,
      type: e.constructor.name
    });
  }
}
