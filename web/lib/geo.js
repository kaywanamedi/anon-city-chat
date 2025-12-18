export async function getCoords() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("No geolocation"));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  });
}

export async function coordsToCity(lat, lng) {
  const r = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/city`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lat, lng }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error || "City lookup failed");
  return data.city;
}
