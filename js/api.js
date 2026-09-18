const SteamAPI = {
    isValidSteamId(str) {
        return /^\d{17}$/.test(str.trim());
    },

    async getPlayerSummaries(steamIds, key) {
        const resp = await fetch(
            `/api/steam/summaries?ids=${steamIds.join(',')}&key=${key}`
        );
        if (!resp.ok) {
            throw new Error(`Error HTTP ${resp.status} al obtener perfiles`);
        }
        const data = await resp.json();
        return data.response && data.response.players
            ? data.response.players
            : [];
    },

    async getOwnedGames(steamId, key) {
        const resp = await fetch(
            `/api/steam/games?id=${steamId}&key=${key}`
        );
        if (!resp.ok) {
            throw new Error(`Error HTTP ${resp.status} al obtener juegos`);
        }
        const data = await resp.json();
        return data.response && data.response.games
            ? data.response.games
            : [];
    },

    async fetchLibraryFromMembers(memberIds, apiKey) {
        const invalid = memberIds.filter(id => !this.isValidSteamId(id));
        if (invalid.length > 0) {
            throw new Error(
                'Los siguientes IDs no son validos (deben ser 17 digitos numericos):\n' +
                invalid.join(', ')
            );
        }

        const players = await this.getPlayerSummaries(memberIds, apiKey);
        const playerMap = {};
        for (const p of players) {
            playerMap[p.steamid] = p;
        }

        const members = memberIds.map(id => {
            const p = playerMap[id] || {};
            return {
                steam_id: id,
                name: p.personaname || id,
                avatar: p.avatarfull || ''
            };
        });

        const gamesMap = {};

        for (const steamId of memberIds) {
            const games = await this.getOwnedGames(steamId, apiKey);
            for (const game of games) {
                const appid = game.appid;
                if (!gamesMap[appid]) {
                    gamesMap[appid] = {
                        appid,
                        name: game.name || 'Sin nombre',
                        img_icon_url: game.img_icon_url || '',
                        owners: [],
                        copies: 0
                    };
                }
                if (!gamesMap[appid].owners.includes(steamId)) {
                    gamesMap[appid].owners.push(steamId);
                }
                gamesMap[appid].copies++;
            }
        }

        return {
            games: Object.values(gamesMap).sort((a, b) =>
                (a.name || '').localeCompare(b.name || '')
            ),
            members
        };
    }
};
