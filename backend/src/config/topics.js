// backend/src/config/topics.js
// Topic taxonomy with keywords for relevance detection

export const TOPICS = {
  striping: {
    label: 'Striping',
    keywords: [
      'stripe', 'striping', 'line', 'lines',
      'pavement marking', 'traffic marking',
      'yellow line', 'white line',
      'centerline', 'edge line',
      'paint', 'thermoplastic'
    ]
  },

  thermoplastic_lines: {
    label: 'Thermoplastic Lines',
    keywords: [
      'thermoplastic', 'thermo',
      'line', 'lines',
      'white', 'yellow',
      'pavement marking'
    ]
  },

  crosswalks: {
    label: 'Crosswalks',
    keywords: [
      'crosswalk', 'crosswalks',
      'crossing', 'pedestrian crossing',
      'zebra crossing',
      'ladder marking',
      'continental'
    ]
  },

  stop_bars: {
    label: 'Stop Bars',
    keywords: [
      'stop bar', 'stop line',
      'stop marking',
      'intersection'
    ]
  },

  symbols_legends: {
    label: 'Symbols & Legends',
    keywords: [
      'symbol', 'symbols',
      'legend', 'arrow',
      'bike lane', 'bicycle',
      'handicap', 'accessible',
      'pavement message'
    ]
  },

  curb_painting: {
    label: 'Curb Painting',
    keywords: [
      'curb', 'curbing',
      'paint', 'painting',
      'red curb', 'yellow curb',
      'blue curb', 'white curb'
    ]
  },

  signage: {
    label: 'Signage (ADA & Posts)',
    keywords: [
      'sign', 'signage',
      'post', 'posts',
      'ada', 'accessible',
      'parking sign',
      'regulatory', 'warning'
    ]
  },

  line_removal: {
    label: 'Line Removal',
    keywords: [
      'removal', 'remove',
      'obliterate', 'obliteration',
      'grind', 'grinding',
      'sandblast', 'waterblast',
      'eradicate'
    ]
  },

  quantities_tables: {
    label: 'Quantities Tables',
    keywords: [
      'quantity', 'quantities',
      'table', 'schedule',
      'summary', 'total',
      'bid item', 'pay item',
      'unit price'
    ]
  },

  specification_notes: {
    label: 'Specification Notes',
    keywords: [
      'specification', 'spec',
      'note', 'notes',
      'general note',
      'detail', 'standard',
      'requirement', 'material'
    ]
  }
};

// Get topic by key
export const getTopic = (key) => TOPICS[key] || null;

// Get all topic keys for dropdown
export const getTopicKeys = () => Object.keys(TOPICS);

// Get all topics as array for dropdown
export const getTopicOptions = () => {
  return Object.entries(TOPICS).map(([key, value]) => ({
    value: key,
    label: value.label
  }));
};

// Check if topic exists
export const isValidTopic = (key) => key in TOPICS;

export default TOPICS;