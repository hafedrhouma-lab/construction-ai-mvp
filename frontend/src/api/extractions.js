// frontend/src/api/extractions.js
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

export const extractionsApi = {
  async startExtraction(fileId, pageNumber) {
    const res = await fetch(`${API_URL}/extractions/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_id: fileId, page_number: pageNumber })
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getExtraction(extractionId) {
    const res = await fetch(`${API_URL}/extractions/${extractionId}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getFileExtractions(fileId) {
    const res = await fetch(`${API_URL}/extractions/file/${fileId}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async updateLineItem(itemId, data) {
    const res = await fetch(`${API_URL}/line-items/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async deleteLineItem(itemId) {
    const res = await fetch(`${API_URL}/line-items/${itemId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async generateEstimate(fileId) {
    const res = await fetch(`${API_URL}/estimates/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_id: fileId })
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
};