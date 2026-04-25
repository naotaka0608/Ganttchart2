import webview
import threading
import uvicorn
import time
import os
from api import app

window = None

class Api:
    def close_window(self):
        if window:
            window.destroy()
            os._exit(0)
    
    def minimize_window(self):
        if window:
            window.minimize()
            
    def toggle_maximize(self):
        if window:
            window.toggle_fullscreen()

def run_server():
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")

if __name__ == '__main__':
    # Start the FastAPI server in a separate thread
    t = threading.Thread(target=run_server)
    t.daemon = True
    t.start()
    
    # Wait a little bit for the server to start
    time.sleep(1)
    
    api = Api()
    # Create the webview window
    window = webview.create_window(
        'Ganttopia',
        'http://127.0.0.1:8000/',
        width=1200,
        height=800,
        min_size=(800, 600),
        frameless=True,
        js_api=api
    )
    
    webview.start()
