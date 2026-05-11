import webview
import threading
import uvicorn
import time
from api import app
import os
from database import get_db
import models
import export

class JsApi:
    def __init__(self):
        self._window = None

    def set_window(self, window):
        self._window = window

    def export_gantt(self):
        if not self._window:
            return None
        file_path = self._window.create_file_dialog(
            webview.FileDialog.SAVE, 
            directory=export.get_desktop_path(), 
            save_filename='gantt_chart.xlsx',
            file_types=('Excel files (*.xlsx)', 'All files (*.*)')
        )
        if not file_path:
            return None
        
        # Handle both list and tuple results
        if isinstance(file_path, (list, tuple)):
            file_path = file_path[0]
            
        if not str(file_path).lower().endswith('.xlsx'):
            file_path += '.xlsx'

        db = next(get_db())
        tasks = db.query(models.Task).all()
        try:
            actual_path = export.generate_gantt_excel(tasks, file_path=file_path)
            return actual_path
        except Exception as e:
            print(f"Export error: {e}")
            return str(e)

    def export_list(self):
        if not self._window:
            return None
        file_path = self._window.create_file_dialog(
            webview.FileDialog.SAVE, 
            directory=export.get_desktop_path(), 
            save_filename='tasks_list.xlsx',
            file_types=('Excel files (*.xlsx)', 'All files (*.*)')
        )
        if not file_path:
            return None
            
        if isinstance(file_path, (list, tuple)):
            file_path = file_path[0]
            
        if not str(file_path).lower().endswith('.xlsx'):
            file_path += '.xlsx'

        db = next(get_db())
        tasks = db.query(models.Task).all()
        try:
            actual_path = export.generate_list_excel(tasks, file_path=file_path)
            return actual_path
        except Exception as e:
            return str(e)

def run_server():
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")

if __name__ == '__main__':
    # Start the FastAPI server in a separate thread
    t = threading.Thread(target=run_server)
    t.daemon = True
    t.start()
    
    # Wait a little bit for the server to start
    time.sleep(1)
    
    api = JsApi()
    
    # Create the webview window
    window = webview.create_window(
        'Ganttopia',
        'http://127.0.0.1:8000/',
        width=1200,
        height=800,
        min_size=(800, 600),
        maximized=True,
        js_api=api
    )
    api.set_window(window)
    
    webview.start()
