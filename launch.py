#!/usr/bin/env python3
"""
Sanctuary Launcher
Starts a local web server and opens Sanctuary in your default browser.
"""

import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8042
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def log_message(self, format, *args):
        # Quiet logger
        pass

def main():
    print("=" * 60)
    print(" 🍃 SANCTUARY — Decompression & Chill Oasis")
    print(f" Serving at: http://localhost:{PORT}")
    print(" Press Ctrl+C in terminal to stop.")
    print("=" * 60)

    # Allow port reuse
    socketserver.TCPServer.allow_reuse_address = True
    try:
        with socketserver.TCPServer(("", PORT), Handler) as httpd:
            webbrowser.open(f"http://localhost:{PORT}")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🍃 Sanctuary closed peacefully. Take care.")
        sys.exit(0)
    except Exception as e:
        print(f"Error starting server: {e}")
        # Fallback to direct file open
        webbrowser.open(os.path.join(DIRECTORY, "index.html"))

if __name__ == "__main__":
    main()
