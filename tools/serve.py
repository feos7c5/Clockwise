"""Lokaler Entwicklungs-Server ohne Browser-Cache.

Aufruf:  python3 tools/serve.py [port]    (Standard: 8765)
"""
import functools
import http.server
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def log_message(self, *args):
        pass


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    handler = functools.partial(NoCacheHandler, directory=ROOT)
    print(f'Clockwise läuft auf http://localhost:{port}')
    http.server.ThreadingHTTPServer(('127.0.0.1', port), handler).serve_forever()
