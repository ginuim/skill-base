import { getConfig } from './config.js';
import { loadCredentials } from './auth.js';

async function handleResponse(response) {
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const data = await response.json();
      if (data.detail) {
        message = data.detail;
      }
    } catch (e) {
      // JSON parse failed; keep default message
    }
    throw new Error(message);
  }
  return response.json();
}

function getAuthHeaders() {
  const credentials = loadCredentials();
  const headers = {};
  if (credentials?.token) {
    headers['Authorization'] = `Bearer ${credentials.token}`;
  }
  return headers;
}

export function createClient() {
  const { apiUrl } = getConfig();

  return {
    async get(path) {
      const response = await fetch(`${apiUrl}${path}`, {
        method: 'GET',
        headers: {
          ...getAuthHeaders()
        }
      });
      return handleResponse(response);
    },

    async post(path, body) {
      const response = await fetch(`${apiUrl}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(body)
      });
      return handleResponse(response);
    },

    async postForm(path, formData) {
      // Native FormData so fetch sets Content-Type with boundary
      const response = await fetch(`${apiUrl}${path}`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders()
        },
        body: formData
      });
      return handleResponse(response);
    },

    async download(path) {
      const response = await fetch(`${apiUrl}${path}`, {
        method: 'GET',
        headers: {
          ...getAuthHeaders()
        }
      });
      if (!response.ok) {
        let message = `HTTP ${response.status}`;
        try {
          const data = await response.json();
          if (data.detail) {
            message = data.detail;
          }
        } catch (e) {
          // JSON parse failed; keep default message
        }
        throw new Error(message);
      }
      return response;
    }
  };
}
