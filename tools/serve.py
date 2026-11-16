"""Local development server without browser caching.

Usage:  python3 tools/serve.py [port]    (default: 8765)
"""
import functools
import http.server
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


# The page only allows the production sync server; locally the dev server on port 8787 is added.
DEV_CONNECT = "connect-src 'self' http://localhost:8787 ws://localhost:8787"


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.split('?')[0] in ('/', '/index.html'):
            with open(os.path.join(ROOT, 'index.html'), 'rb') as f:
                body = f.read().replace(b"connect-src 'self'", DEV_CONNECT.encode(), 1)
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def log_message(self, *args):
        pass


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    handler = functools.partial(NoCacheHandler, directory=ROOT)
    print(f'Clockwise running on http://localhost:{port}')
    http.server.ThreadingHTTPServer(('127.0.0.1', port), handler).serve_forever()
