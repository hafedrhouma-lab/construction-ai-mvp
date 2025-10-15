import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '${API_URL}';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor (for future auth tokens)
api.interceptors.request.use(
  (config) => {
    // TODO: Add auth token when implemented
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// ============================================
// PROJECTS API
// ============================================
export const projectsAPI = {
  // Get all projects
  getAll: (params = {}) => api.get('/projects', { params }),
  
  // Get project by ID
  getById: (id) => api.get(`/projects/${id}`),
  
  // Create project
  create: (data) => api.post('/projects', data),
  
  // Update project
  update: (id, data) => api.put(`/projects/${id}`, data),
  
  // Delete project
  delete: (id) => api.delete(`/projects/${id}`),
};

// ============================================
// FILES API
// ============================================
export const filesAPI = {
  // Create file record
  create: (data) => api.post('/files', data),
  
  // Get presigned URL for page upload
  getPageUploadUrl: (fileId, pageNumber) => 
    api.post(`/files/${fileId}/pages/${pageNumber}/upload-url`),
  
  // Confirm upload complete
  confirmUpload: (fileId) => api.post(`/files/${fileId}/confirm`),
  
  // Get files for project
  getByProject: (projectId, params = {}) => 
    api.get('/files', { params: { project_id: projectId, ...params } }),
  
  // Get file by ID
  getById: (id) => api.get(`/files/${id}`),
  
  // Delete file
  delete: (id) => api.delete(`/files/${id}`),
};

// ============================================
// EXTRACTION API
// ============================================
export const extractionAPI = {
  // Start extraction session
  start: (data) => api.post('/extraction/start', data),
  
  // Get session
  getSession: (sessionId) => api.get(`/extraction/sessions/${sessionId}`),
  
  // Extract page
  extractPage: (sessionId, pageNumber) => 
    api.post(`/extraction/sessions/${sessionId}/pages/${pageNumber}`),
  
  // Get scope items
  getScopeItems: (sessionId) => 
    api.get(`/extraction/sessions/${sessionId}/items`),
  
  // Update scope item
  updateItem: (itemId, data) => api.put(`/extraction/items/${itemId}`, data),
  
  // Delete scope item
  deleteItem: (itemId) => api.delete(`/extraction/items/${itemId}`),
};

// ============================================
// ESTIMATES API
// ============================================
export const estimatesAPI = {
  // Generate estimate
  generate: (sessionId) => api.post(`/estimates/generate/${sessionId}`),
  
  // Get estimate
  getById: (id) => api.get(`/estimates/${id}`),
  
  // Update estimate
  update: (id, data) => api.put(`/estimates/${id}`, data),
  
  // Export estimate
  export: (id, format = 'xlsx') => 
    api.get(`/estimates/${id}/export/${format}`, { responseType: 'blob' }),
};

export default api;
