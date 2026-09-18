#!/usr/bin/env python3
import http.server
import json
import os
import urllib.request
import urllib.parse
import sys
import mimetypes

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
API_KEY_FILE = os.path.join(DATA_DIR, 'api_key.json')
BIBLIOTECAS_FILE = os.path.join(DATA_DIR, 'bibliotecas.json')

os.makedirs(DATA_DIR, exist_ok=True)

for f, default in [(API_KEY_FILE, {"api_key": ""}), (BIBLIOTECAS_FILE, {"libraries": []})]:
    if not os.path.exists(f):
        with open(f, 'w') as fh:
            json.dump(default, fh)


class SBFSServer(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        if path == '/api/key':
            self._send_json_file(API_KEY_FILE)
        elif path == '/api/bibliotecas':
            self._send_json_file(BIBLIOTECAS_FILE)
        elif path.startswith('/api/steam/'):
            self._handle_steam_proxy(path, query)
        elif path == '/' or path == '':
            self.path = '/html/index.html'
            super().do_GET()
        else:
            super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length) if content_length else b'{}'
        data = json.loads(body) if body else {}

        if path == '/api/key':
            with open(API_KEY_FILE, 'w') as f:
                json.dump(data, f)
            self._send_json({'ok': True})
        elif path == '/api/bibliotecas':
            with open(BIBLIOTECAS_FILE, 'w') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            self._send_json({'ok': True})
        else:
            self._send_json({'error': 'Not found'}, 404)

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        query = urllib.parse.parse_qs(parsed.query)

        if parsed.path == '/api/bibliotecas' and 'id' in query:
            lib_id = query['id'][0]
            with open(BIBLIOTECAS_FILE, 'r') as f:
                bibliotecas = json.load(f)
            bibliotecas['libraries'] = [
                lib for lib in bibliotecas['libraries']
                if lib.get('id') != lib_id
            ]
            with open(BIBLIOTECAS_FILE, 'w') as f:
                json.dump(bibliotecas, f, indent=2, ensure_ascii=False)
            self._send_json({'ok': True})
        else:
            self._send_json({'error': 'Not found'}, 404)

    STEAM_ENDPOINTS = {
        '/api/steam/resolve': 'https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/',
        '/api/steam/summaries': 'https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/',
        '/api/steam/games': 'https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/',
        '/api/steam/appdetails': 'https://store.steampowered.com/api/appdetails',
    }

    def _handle_steam_proxy(self, path, query):
        if path not in self.STEAM_ENDPOINTS:
            self._send_json({'error': 'Unknown endpoint'}, 404)
            return

        url = self.STEAM_ENDPOINTS[path]

        if path == '/api/steam/games':
            sid = query.get('id', [''])[0]
            key = query.get('key', [''])[0]
            url += f'?steamid={sid}&key={key}&format=json&include_appinfo=1&include_played_free_games=1'
        elif path == '/api/steam/resolve':
            vanity = query.get('vanity', [''])[0]
            key = query.get('key', [''])[0]
            url += f'?vanityurl={urllib.parse.quote(vanity)}&key={key}'
        elif path == '/api/steam/summaries':
            ids = query.get('ids', [''])[0]
            key = query.get('key', [''])[0]
            url += f'?steamids={ids}&key={key}'
        elif path == '/api/steam/appdetails':
            appids = query.get('appids', [''])[0]
            url += f'?appids={appids}&cc=us&l=en'

        try:
            req = urllib.request.Request(
                url,
                headers={'User-Agent': 'SBFS/1.0'}
            )
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = resp.read()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(data)
        except urllib.error.HTTPError as e:
            err_body = e.read().decode('utf-8', errors='replace')
            self.send_response(e.code)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                'error': f'HTTP {e.code}',
                'detail': err_body
            }).encode())
        except Exception as e:
            self._send_json({'error': str(e)}, 500)

    def _send_json_file(self, filepath):
        try:
            with open(filepath, 'r') as f:
                data = f.read()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.end_headers()
            self.wfile.write(data.encode('utf-8'))
        except FileNotFoundError:
            self._send_json({'error': 'Not found'}, 404)

    def _send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    server = http.server.HTTPServer(('0.0.0.0', port), SBFSServer)
    print(f'SBFS - Simulador de Biblioteca Familiar de Steam')
    print(f'Servidor corriendo en http://localhost:{port}')
    print('Presiona Ctrl+C para detener')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nServidor detenido')
        server.server_close()
