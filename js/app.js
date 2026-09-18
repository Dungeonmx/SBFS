const App = {
    currentLibraryId: null,
    editingLibraryId: null,

    async init() {
        const apiKey = await Storage.getApiKey();
        if (apiKey) {
            UI.showScreen('screen-home');
            await this.loadHome();
        } else {
            UI.showScreen('screen-config');
            document.getElementById('api-key-input').focus();
        }
        this.bindEvents();
    },

    bindEvents() {
        document.getElementById('api-key-btn')
            .addEventListener('click', () => this.saveApiKey());
        document.getElementById('api-key-input')
            .addEventListener('keydown', e => { if (e.key === 'Enter') this.saveApiKey(); });

        document.getElementById('new-library-btn')
            .addEventListener('click', () => this.showCreate());
        document.getElementById('compare-nav-btn')
            .addEventListener('click', () => this.showCompare());

        document.getElementById('back-home-btn')
            .addEventListener('click', () => { UI.showScreen('screen-home'); this.loadHome(); });
        document.getElementById('config-library-btn')
            .addEventListener('click', () => this.showEdit());
        document.getElementById('game-search')
            .addEventListener('input', e => this.searchGames(e.target.value));

        document.getElementById('cancel-btn')
            .addEventListener('click', () => { UI.showScreen('screen-home'); this.loadHome(); });
        document.getElementById('accept-btn')
            .addEventListener('click', () => this.saveLibrary());

        document.getElementById('back-home-compare-btn')
            .addEventListener('click', () => { UI.showScreen('screen-home'); this.loadHome(); });
        document.getElementById('compare-btn')
            .addEventListener('click', () => this.doCompare());
    },

    async saveApiKey() {
        const key = document.getElementById('api-key-input').value.trim();
        if (!key) {
            UI.showError('Ingresa una API Key valida');
            return;
        }
        await Storage.saveApiKey(key);
        UI.showScreen('screen-home');
        await this.loadHome();
    },

    async loadHome() {
        const libraries = await Storage.getLibraries();
        UI.renderLibraries(libraries);
    },

    showCreate() {
        this.editingLibraryId = null;
        document.getElementById('create-title').textContent = 'Nueva Biblioteca';
        document.getElementById('library-title-input').value = '';
        document.getElementById('library-members-input').value = '';
        document.getElementById('member-preview').innerHTML = '';
        UI.showScreen('screen-create');
        document.getElementById('library-title-input').focus();
    },

    async showEdit() {
        if (!this.currentLibraryId) return;
        this.editingLibraryId = this.currentLibraryId;
        document.getElementById('create-title').textContent = 'Configurar Biblioteca';

        const libraries = await Storage.getLibraries();
        const lib = libraries.find(l => l.id === this.currentLibraryId);
        if (lib) {
            document.getElementById('library-title-input').value = lib.title;
            document.getElementById('library-members-input').value =
                (lib.members || []).map(m => m.steam_id).join(', ');
            UI.showScreen('screen-create');
        }
    },

    async saveLibrary() {
        const title = document.getElementById('library-title-input').value.trim();
        const membersStr = document.getElementById('library-members-input').value.trim();

        if (!title) { UI.showError('Ingresa un titulo para la biblioteca'); return; }
        if (!membersStr) { UI.showError('Ingresa al menos un integrante'); return; }

        const memberIds = membersStr.split(',').map(s => s.trim()).filter(Boolean);

        UI.showLoading('Obteniendo datos de Steam...');

        try {
            const apiKey = await Storage.getApiKey();
            if (!apiKey) {
                UI.hideLoading();
                UI.showError('No hay API Key configurada. Vuelve a la pantalla de inicio.');
                return;
            }

            const result = await SteamAPI.fetchLibraryFromMembers(memberIds, apiKey);

            const library = {
                id: this.editingLibraryId ||
                    Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
                title,
                members: result.members,
                games: result.games,
                last_updated: new Date().toISOString()
            };

            const libraries = await Storage.getLibraries();
            if (this.editingLibraryId) {
                const idx = libraries.findIndex(l => l.id === this.editingLibraryId);
                if (idx !== -1) {
                    libraries[idx] = library;
                } else {
                    libraries.push(library);
                }
            } else {
                libraries.push(library);
            }
            await Storage.saveLibraries(libraries);

            UI.hideLoading();
            UI.showScreen('screen-home');
            await this.loadHome();
        } catch (e) {
            UI.hideLoading();
            UI.showError(e.message);
        }
    },

    async openLibrary(id) {
        this.currentLibraryId = id;
        const libraries = await Storage.getLibraries();
        const lib = libraries.find(l => l.id === id);
        if (!lib) { UI.showError('Biblioteca no encontrada'); return; }
        UI.renderLibraryView(lib);
        UI.showScreen('screen-library');
    },

    searchGames(query) {
        const q = query.toLowerCase().trim();
        const libId = this.currentLibraryId;
        if (!libId) return;

        Storage.getLibraries().then(libraries => {
            const lib = libraries.find(l => l.id === libId);
            if (!lib) return;

            const filtered = q
                ? (lib.games || []).filter(g => g.name && g.name.toLowerCase().includes(q))
                : lib.games || [];

            const container = document.getElementById('game-grid');
            if (filtered.length === 0) {
                container.innerHTML = '<div class="empty-state">No se encontraron juegos.</div>';
            } else {
                UI.renderGameGrid(filtered, lib.members || []);
            }
        });
    },

    async showCompare() {
        const libraries = await Storage.getLibraries();
        UI.renderCompareLibraries(libraries);
        document.getElementById('compare-results').innerHTML = '';
        UI.showScreen('screen-compare');
    },

    async doCompare() {
        const checkboxes = document.querySelectorAll('#compare-select input:checked');
        const selectedIds = [...checkboxes].map(cb => cb.value);

        if (selectedIds.length < 2) {
            UI.showError('Selecciona al menos 2 bibliotecas para comparar');
            return;
        }

        const libraries = await Storage.getLibraries();
        const selected = libraries.filter(l => selectedIds.includes(l.id));
        UI.renderCompareResults(selected);
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
