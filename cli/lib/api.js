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
      if (data.suggested_skill_id) {
        message += ` (suggested_skill_id: ${data.suggested_skill_id})`;
      }
    } catch (e) {
      // JSON parse failed; keep default message
    }
    throw new Error(message);
  }
  return response.json();
}

function getAuthHeaders(profile) {
  const credentials = loadCredentials(profile);
  const headers = {};
  if (credentials?.token) {
    headers['Authorization'] = `Bearer ${credentials.token}`;
  }
  return headers;
}

export function createClient() {
  const { apiUrl, profile } = getConfig();
  const headers = getAuthHeaders(profile);

  return {
    async get(path) {
      const response = await fetch(`${apiUrl}${path}`, {
        method: 'GET',
        headers: {
          ...headers
        }
      });
      return handleResponse(response);
    },

    async post(path, body) {
      const response = await fetch(`${apiUrl}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
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
          ...headers
        },
        body: formData
      });
      return handleResponse(response);
    },

    async download(path) {
      const response = await fetch(`${apiUrl}${path}`, {
        method: 'GET',
        headers: {
          ...headers
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
