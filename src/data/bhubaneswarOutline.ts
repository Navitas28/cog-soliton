/**
 * Simplified GeoJSON outline of Bhubaneswar municipal area and the Kuakhai river.
 */
export const BHUBANESWAR_OUTLINE: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    // Approximate BMC boundary (simplified polygon)
    {
      type: 'Feature',
      properties: { name: 'Bhubaneswar Municipal Corporation', type: 'boundary' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [85.7800, 20.2400],
          [85.8600, 20.2400],
          [85.8800, 20.2700],
          [85.8850, 20.3000],
          [85.8700, 20.3300],
          [85.8500, 20.3500],
          [85.8200, 20.3550],
          [85.7900, 20.3400],
          [85.7750, 20.3100],
          [85.7700, 20.2800],
          [85.7800, 20.2400],
        ]],
      },
    },
    // Kuakhai river (simplified polyline, flows south through east Bhubaneswar)
    {
      type: 'Feature',
      properties: { name: 'Kuakhai River', type: 'river' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [85.8600, 20.3500],
          [85.8650, 20.3350],
          [85.8700, 20.3200],
          [85.8680, 20.3050],
          [85.8650, 20.2900],
          [85.8600, 20.2750],
          [85.8550, 20.2600],
          [85.8500, 20.2450],
        ],
      },
    },
    // Lingaraj Temple landmark
    {
      type: 'Feature',
      properties: { name: 'Lingaraj Temple', type: 'landmark' },
      geometry: {
        type: 'Point',
        coordinates: [85.8245, 20.2380],
      },
    },
    // Khandagiri-Udayagiri caves
    {
      type: 'Feature',
      properties: { name: 'Khandagiri Caves', type: 'landmark' },
      geometry: {
        type: 'Point',
        coordinates: [85.7860, 20.2550],
      },
    },
  ],
};
