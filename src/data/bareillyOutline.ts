/**
 * Simplified GeoJSON outline of Bareilly municipal area and Ramganga river.
 */
export const BAREILLY_OUTLINE: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'Bareilly Nagar Nigam', type: 'boundary' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [79.3800, 28.3200],
          [79.4800, 28.3200],
          [79.4900, 28.3500],
          [79.4850, 28.3800],
          [79.4700, 28.4100],
          [79.4400, 28.4200],
          [79.4100, 28.4150],
          [79.3900, 28.3900],
          [79.3750, 28.3600],
          [79.3800, 28.3200],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Ramganga River', type: 'river' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [79.3500, 28.3900],
          [79.3700, 28.3800],
          [79.3900, 28.3650],
          [79.4100, 28.3500],
          [79.4300, 28.3400],
          [79.4500, 28.3350],
          [79.4700, 28.3300],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Kutubkhana (City Center)', type: 'landmark' },
      geometry: { type: 'Point', coordinates: [79.4304, 28.3670] },
    },
  ],
};
