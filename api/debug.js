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
    const userLat = parseFloat(lat);
    const userLon = parseFloat(lon);
    const radiusKm = 165; // ±1.5 grados

    console.log(`[DEBUG] Centro búsqueda: ${userLat}, ${userLon}`);
    console.log(`[DEBUG] Radio: ${radiusKm}km`);

    // Llamar a api.adsb.lol
    const url = `https://api.adsb.lol/api/ac`;
    
    console.log(`[DEBUG] URL api.adsb.lol: ${url}`);
    console.log(`[DEBUG] Intentando fetch...`);

    const r = await fetch(url, {
      headers: { 'User-Agent': 'RadarEstelas-Debug/1.0' }
    });

    console.log(`[DEBUG] Fetch completado. Status: ${r.status}, OK: ${r.ok}`);

    if (!r.ok) {
      console.log(`[DEBUG] Error HTTP ${r.status} de api.adsb.lol`);
      return res.status(200).json({
        error: `api.adsb.lol HTTP ${r.status}`,
        url: url,
        status: r.status
      });
    }

    console.log(`[DEBUG] Parseando JSON...`);
    const data = await r.json();
    console.log(`[DEBUG] JSON parseado. Total estados: ${data ? Object.keys(data).length : 0}`);

    // Función Haversine para calcular distancia
    function haversine(lat1, lon1, lat2, lon2) {
      const R = 6371; // km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.asin(Math.sqrt(a));
      return R * c;
    }

    // Filtrar aviones en rango y en vuelo
    const totalStates = data ? Object.keys(data).length : 0;
    let inRange = [];

    if (data) {
      for (const [hex, aircraft] of Object.entries(data)) {
        // Verificar si tiene lat/lon/alt
        if (!aircraft.lat || !aircraft.lon || !aircraft.alt_baro) continue;

        // Calcular distancia
        const distance = haversine(userLat, userLon, aircraft.lat, aircraft.lon);

        // Si está dentro del radio
        if (distance <= radiusKm) {
          inRange.push({
            hex: aircraft.hex,
            callsign: aircraft.callsign || hex,
            lat: aircraft.lat,
            lon: aircraft.lon,
            altitude: aircraft.alt_baro,
            velocity: aircraft.gs || 0,
            distance: distance
          });
        }
      }
    }

    inRange.sort((a, b) => a.distance - b.distance);
    const inFlight = inRange.length;

    console.log(`[DEBUG] Estadísticas: total=${totalStates}, en_rango=${inFlight}, radio=${radiusKm}km`);

    const response = {
      timestamp: new Date().toISOString(),
      search: { lat: userLat, lon: userLon, radius_km: radiusKm },
      stats: {
        total_states: totalStates,
        in_range: inFlight,
        within_radius: radiusKm
      },
      sample_aircraft: inRange.slice(0, 5)
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
