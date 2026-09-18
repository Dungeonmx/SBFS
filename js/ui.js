const UI = {
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const el = document.getElementById(screenId);
        if (el) el.classList.add('active');
    },

    showLoading(text) {
        document.getElementById('loading-text').textContent = text || 'Cargando...';
        document.getElementById('loading-overlay').classList.remove('hidden');
    },

    hideLoading() {
        document.getElementById('loading-overlay').classList.add('hidden');
    },

    showError(message) {
        alert('Error: ' + message);
    },

    renderLibraries(libraries) {
        const container = document.getElementById('library-list');
        if (!libraries || libraries.length === 0) {
            container.innerHTML =
                '<div class="empty-state">No hay bibliotecas. Crea una nueva.</div>';
            return;
        }

        container.innerHTML = libraries.map(lib => {
            const members = lib.members || [];
            return `
                <div class="library-card" data-id="${this.esc(lib.id)}">
                    <h3 class="library-card-title">${this.esc(lib.title)}</h3>
                    <p class="library-card-count">${lib.games ? lib.games.length : 0} juegos</p>
                    <div class="library-card-members">
                        <span>Integrantes:</span>
                        ${members.map(m =>
                            m.avatar
                                ? `<img class="avatar" src="${this.esc(m.avatar)}" alt="${this.esc(m.name)}" title="${this.esc(m.name)}">`
                                : `<div class="avatar" style="background:var(--border);display:inline-flex;align-items:center;justify-content:center;font-size:12px;color:var(--text-secondary)" title="${this.esc(m.name)}">${this.esc(m.name.charAt(0))}</div>`
                        ).join('')}
                        ${members.length > 4 ? '<span>...</span>' : ''}
                    </div>
                </div>
            `;
        }).join('');

        container.querySelectorAll('.library-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.dataset.id;
                App.openLibrary(id);
            });
        });
    },

    renderLibraryView(library) {
        document.getElementById('library-title').textContent = library.title;
        document.getElementById('library-game-count').textContent =
            `${library.games ? library.games.length : 0} juegos`;

        const members = library.members || [];
        const membersContainer = document.getElementById('library-members');
        membersContainer.innerHTML = members.map(m =>
            m.avatar
                ? `<img class="avatar" src="${this.esc(m.avatar)}" alt="${this.esc(m.name)}" title="${this.esc(m.name)}">`
                : `<div class="avatar" style="background:var(--border);display:inline-flex;align-items:center;justify-content:center;font-size:12px;color:var(--text-secondary)" title="${this.esc(m.name)}">${this.esc(m.name.charAt(0))}</div>`
        ).join('');

        document.getElementById('game-search').value = '';
        this.renderGameGrid(library.games || [], members);
        this.renderStats(library);
    },

    renderGameGrid(games, members) {
        const container = document.getElementById('game-grid');
        if (!games || games.length === 0) {
            container.innerHTML = '<div class="empty-state">No hay juegos en esta biblioteca.</div>';
            return;
        }

        const memberMap = {};
        for (const m of members || []) {
            memberMap[m.steam_id] = m;
        }

        container.innerHTML = games.map(game => {
            const owners = (game.owners || [])
                .map(id => memberMap[id] ? memberMap[id].name : id)
                .join(', ');

            const iconUrl = game.img_icon_url
                ? `https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`
                : '';

            return `
                <div class="game-card">
                    ${iconUrl
                        ? `<img class="game-icon" src="${this.esc(iconUrl)}" alt="${this.esc(game.name)}" loading="lazy" onerror="this.onerror=null;this.parentNode.querySelector('.game-icon-fallback').style.display='flex';this.style.display='none'">`
                        : ''
                    }
                    <div class="game-icon-fallback" style="${iconUrl ? 'display:none' : 'display:flex'}">${this.esc(game.name.charAt(0))}</div>
                    <div class="game-info">
                        <h4 class="game-name" title="${this.esc(game.name)}">${this.esc(game.name)}</h4>
                        <p class="game-owner">Propietario: ${this.esc(owners)}</p>
                    </div>
                    <div class="game-status" title="${game.copies} copia(s)"></div>
                    <a class="game-link" href="https://store.steampowered.com/app/${game.appid}" target="_blank" title="Abrir en Steam">&rarr;</a>
                </div>
            `;
        }).join('');
    },

    renderStats(library) {
        const members = library.members || [];
        const games = library.games || [];

        const totalCopies = games.reduce((sum, g) => sum + (g.copies || 0), 0);
        const uniqueGames = games.length;

        const contributions = members.map(m => {
            const globalCount = games.filter(g =>
                g.owners && g.owners.includes(m.steam_id)
            ).length;

            const uniqueCount = games.filter(g =>
                g.owners && g.owners.length === 1 && g.owners[0] === m.steam_id
            ).length;

            return { member: m, global: globalCount, unique: uniqueCount };
        });

        const labels = contributions.map(c => c.member.name);
        const data = contributions.map(c => c.global);
        const colors = ChartConfig.getColors(members.length);

        ChartConfig.createPieChart('pie-chart', labels, data, colors);

        const listContainer = document.getElementById('contribution-list');
        listContainer.innerHTML = `
            <div class="stats-summary">
                <p>Total juegos unicos: <strong>${uniqueGames}</strong></p>
                <p>Total copias: <strong>${totalCopies}</strong></p>
            </div>
            <h4>Contribuciones</h4>
            ${contributions.map((c, i) => `
                <div class="contribution-item">
                    <span class="color-dot" style="background:${colors[i]}"></span>
                    <span class="contrib-name">${this.esc(c.member.name)}</span>
                    <span class="contrib-global">Global: ${c.global}</span>
                    <span class="contrib-unique">Unico: ${c.unique}</span>
                </div>
            `).join('')}
        `;
    },

    renderCompareLibraries(libraries) {
        const container = document.getElementById('compare-select');
        if (!libraries || libraries.length === 0) {
            container.innerHTML = '<p style="color:var(--text-secondary)">No hay bibliotecas para comparar.</p>';
            return;
        }
        container.innerHTML = libraries.map(lib => `
            <label class="compare-checkbox">
                <input type="checkbox" value="${this.esc(lib.id)}">
                ${this.esc(lib.title)} (${lib.games ? lib.games.length : 0} juegos)
            </label>
        `).join('');
    },

    renderCompareResults(selectedLibraries) {
        const container = document.getElementById('compare-results');
        if (selectedLibraries.length < 2) {
            container.innerHTML = '<p style="color:var(--text-secondary);padding:20px;">Selecciona al menos 2 bibliotecas para comparar.</p>';
            return;
        }

        const allAppids = new Set();
        const libGames = {};
        for (const lib of selectedLibraries) {
            libGames[lib.id] = {};
            for (const game of lib.games || []) {
                allAppids.add(game.appid);
                libGames[lib.id][game.appid] = game;
            }
        }

        const sortedAppids = [...allAppids].sort((a, b) => {
            const nameA = selectedLibraries.reduce((found, lib) => {
                const g = libGames[lib.id][a];
                return g ? g.name : found;
            }, '');
            const nameB = selectedLibraries.reduce((found, lib) => {
                const g = libGames[lib.id][b];
                return g ? g.name : found;
            }, '');
            return (nameA || '').localeCompare(nameB || '');
        });

        let html = '<table class="compare-table"><thead><tr><th>Juego</th>';
        for (const lib of selectedLibraries) {
            html += `<th>${this.esc(lib.title)}</th>`;
        }
        html += '</tr></thead><tbody>';

        for (const appid of sortedAppids) {
            const name = selectedLibraries.reduce((found, lib) => {
                const g = libGames[lib.id][appid];
                return g ? g.name : found;
            }, 'Sin nombre');

            html += `<tr><td>${this.esc(name)}</td>`;
            for (const lib of selectedLibraries) {
                const game = libGames[lib.id][appid];
                if (game) {
                    const copies = game.copies || 1;
                    html += `<td class="present">${copies > 1 ? 'x'+copies : '✓'}</td>`;
                } else {
                    html += `<td class="absent">—</td>`;
                }
            }
            html += '</tr>';
        }

        html += '</tbody></table>';
        container.innerHTML = html;
    },

    esc(str) {
        if (str == null) return '';
        const d = document.createElement('div');
        d.textContent = String(str);
        return d.innerHTML;
    }
};
