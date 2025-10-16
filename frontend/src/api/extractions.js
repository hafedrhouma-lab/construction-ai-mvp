// api/extractions.js
// Add enhanced_extraction flag support

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

export const extractionsApi = {
  startExtraction: async (fileId, pageNumber, useEnhanced = false) => {
    const response = await fetch(`${API_URL}/extractions/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_id: fileId,
        page_number: pageNumber,
        use_enhanced_extraction: useEnhanced // NEW: Pass flag to backend
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to start extraction');
    }

    return response.json();
  },

  getExtraction: async (id) => {
    const response = await fetch(`${API_URL}/extractions/${id}`);
    if (!response.ok) throw new Error('Failed to get extraction');
    return response.json();
  },

  getFileExtractions: async (fileId) => {
    const response = await fetch(`${API_URL}/extractions/file/${fileId}`);
    if (!response.ok) throw new Error('Failed to get extractions');
    return response.json();
  },

  updateLineItem: async (itemId, updates) => {
    const response = await fetch(`${API_URL}/line-items/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });

    if (!response.ok) throw new Error('Failed to update line item');
    return response.json();
  },

  deleteLineItem: async (itemId) => {
    const response = await fetch(`${API_URL}/line-items/${itemId}`, {
      method: 'DELETE'
    });

    if (!response.ok) throw new Error('Failed to delete line item');
    return response.json();
  },

  generateEstimate: async (fileId) => {
    const response = await fetch(`${API_URL}/estimates/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_id: fileId })
    });

    if (!response.ok) throw new Error('Failed to generate estimate');
    return response.json();
  }
};