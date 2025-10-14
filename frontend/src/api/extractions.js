// frontend/src/api/extractions.js
export const extractionsApi = {
  async startExtraction(fileId, pageNumber) {
    const res = await fetch('http://localhost:3001/api/v1/extractions/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_id: fileId, page_number: pageNumber })
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getExtraction(extractionId) {
    const res = await fetch(`http://localhost:3001/api/v1/extractions/${extractionId}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getFileExtractions(fileId) {
    const res = await fetch(`http://localhost:3001/api/v1/extractions/file/${fileId}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async updateLineItem(itemId, data) {
    const res = await fetch(`http://localhost:3001/api/v1/line-items/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async deleteLineItem(itemId) {
    const res = await fetch(`http://localhost:3001/api/v1/line-items/${itemId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async generateEstimate(fileId) {
    const res = await fetch('http://localhost:3001/api/v1/estimates/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_id: fileId })
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
};