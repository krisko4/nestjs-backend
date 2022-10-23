const asin = Math.asin;
const cos = Math.cos;
const sin = Math.sin;
const sqrt = Math.sqrt;
const PI = Math.PI;
const R = 6378137;
function squared(x) {
  return x * x;
}
function toRad(x) {
  return (x * PI) / 180.0;
}
function hav(x) {
  return squared(sin(x / 2));
}

interface LatLng {
  lat: number;
  lng: number;
}

export class Haversine {
  static calculateDistance(a: LatLng, b: LatLng): number {
    const aLat = toRad(a.lat);
    const bLat = toRad(b.lat);
    const aLng = toRad(a.lng);
    const bLng = toRad(b.lng);
    const ht = hav(bLat - aLat) + cos(aLat) * cos(bLat) * hav(bLng - aLng);
    return 2 * R * asin(sqrt(ht));
  }
}
