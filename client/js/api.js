const BASE_URL = 'http://localhost:5000/api';

export const api = {
    async get(endpoint) {
        const response = await fetch(`${BASE_URL}${endpoint}`);
        if (!response.ok) throw new Error('API request failed');
        return response.json();
    },

    async post(endpoint, data) {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('API request failed');
        return response.json();
    },

    async put(endpoint, data) {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('API request failed');
        return response.json();
    },

    async delete(endpoint) {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('API request failed');
        return response.json();
    }
};
