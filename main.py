import webview
import threading
import uvicorn
import time
from api import app

def run_server():
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")

if __name__ == '__main__':
    # Start the FastAPI server in a separate thread
    t = threading.Thread(target=run_server)
    t.daemon = True
    t.start()
    
    # Wait a little bit for the server to start
    time.sleep(1)
    
    # Create the webview window
    window = webview.create_window(
        'Gantt Chart App',
        'http://127.0.0.1:8000/',
        width=1200,
        height=800,
        min_size=(800, 600),
        maximized=True
    )
    
    webview.start()
