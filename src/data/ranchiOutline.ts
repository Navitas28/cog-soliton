/**
 * Simplified GeoJSON outline of Ranchi municipal area and Subarnarekha river.
 */
export const RANCHI_OUTLINE: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'Ranchi Municipal Corporation', type: 'boundary' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [85.2700, 23.3000],
          [85.3600, 23.3000],
          [85.3700, 23.3200],
          [85.3650, 23.3500],
          [85.3500, 23.3800],
          [85.3200, 23.3900],
          [85.2900, 23.3850],
          [85.2700, 23.3600],
          [85.2650, 23.3300],
          [85.2700, 23.3000],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Subarnarekha River', type: 'river' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [85.2600, 23.3200],
          [85.2800, 23.3150],
          [85.3000, 23.3100],
          [85.3200, 23.3080],
          [85.3400, 23.3100],
          [85.3600, 23.3150],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Kanke Dam', type: 'landmark' },
      geometry: { type: 'Point', coordinates: [85.3200, 23.4000] },
    },
  ],
};
