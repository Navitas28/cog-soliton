/**
 * Simplified GeoJSON outline of Ayodhya municipal area and the Saryu river.
 * Used as an offline basemap fallback — renders on a blank canvas with no internet.
 */
export const AYODHYA_OUTLINE: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    // Approximate Ayodhya municipal boundary (simplified polygon)
    {
      type: 'Feature',
      properties: { name: 'Ayodhya Municipal Area', type: 'boundary' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [82.1700, 26.7700],
          [82.2300, 26.7700],
          [82.2350, 26.7800],
          [82.2300, 26.7950],
          [82.2250, 26.8050],
          [82.2100, 26.8100],
          [82.1900, 26.8100],
          [82.1750, 26.8050],
          [82.1680, 26.7950],
          [82.1700, 26.7700],
        ]],
      },
    },
    // Saryu river (simplified polyline through Ayodhya)
    {
      type: 'Feature',
      properties: { name: 'Saryu River', type: 'river' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [82.1600, 26.8020],
          [82.1700, 26.8030],
          [82.1800, 26.8025],
          [82.1900, 26.8010],
          [82.2000, 26.7990],
          [82.2100, 26.7985],
          [82.2200, 26.7990],
          [82.2300, 26.8000],
          [82.2400, 26.8010],
        ],
      },
    },
    // Ram Janmabhoomi area marker
    {
      type: 'Feature',
      properties: { name: 'Ram Janmabhoomi', type: 'landmark' },
      geometry: {
        type: 'Point',
        coordinates: [82.1998, 26.7922],
      },
    },
    // Hanumangarhi
    {
      type: 'Feature',
      properties: { name: 'Hanumangarhi', type: 'landmark' },
      geometry: {
        type: 'Point',
        coordinates: [82.2010, 26.7945],
      },
    },
    // Major road grid (simplified)
    {
      type: 'Feature',
      properties: { name: 'Major Road 1', type: 'road' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [82.1800, 26.7850],
          [82.1900, 26.7870],
          [82.2000, 26.7900],
          [82.2100, 26.7920],
          [82.2200, 26.7930],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Major Road 2', type: 'road' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [82.1850, 26.7950],
          [82.1950, 26.7940],
          [82.2050, 26.7930],
          [82.2150, 26.7920],
        ],
      },
    },
  ],
};
