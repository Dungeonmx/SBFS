const Storage = {
    async getApiKey() {
        const resp = await fetch('/api/key');
        const data = await resp.json();
        return data.api_key || '';
    },

    async saveApiKey(key) {
        await fetch('/api/key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: key })
        });
    },

    async getLibraries() {
        const resp = await fetch('/api/bibliotecas');
        const data = await resp.json();
        return data.libraries || [];
    },

    async saveLibraries(libraries) {
        await fetch('/api/bibliotecas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ libraries })
        });
    },

    async deleteLibrary(id) {
        await fetch(`/api/bibliotecas?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    }
};
