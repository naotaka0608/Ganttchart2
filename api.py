from fastapi import FastAPI, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List

import models
from database import engine, get_db
import export
import os
import sys

# Database Migration Helper
def migrate_db():
    import sqlite3
    from database import DB_PATH
    if not os.path.exists(DB_PATH):
        return
    try:
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("PRAGMA table_info(tasks)")
            columns = [column[1] for column in cursor.fetchall()]
            if "page_id" not in columns:
                print("Adding page_id column to tasks table...")
                conn.execute("ALTER TABLE tasks ADD COLUMN page_id INTEGER DEFAULT 1")
    except Exception as e:
        print(f"Migration error: {e}")

migrate_db()
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Ganttopia API")

# Initialization: Ensure at least one page exists
@app.on_event("startup")
def startup_populate():
    db = next(get_db())
    if not db.query(models.Page).first():
        print("Creating default page...")
        default_page = models.Page(name="メインページ", sort_order=0)
        db.add(default_page)
        db.commit()

# CRUD for Pages
@app.get("/api/pages", response_model=List[models.PageOut])
def read_pages(db: Session = Depends(get_db)):
    return db.query(models.Page).order_by(models.Page.sort_order.asc(), models.Page.id.asc()).all()

@app.post("/api/pages", response_model=models.PageOut)
def create_page(page: models.PageCreate, db: Session = Depends(get_db)):
    db_page = models.Page(**page.model_dump())
    db.add(db_page)
    db.commit()
    db.refresh(db_page)
    return db_page

@app.put("/api/pages/{page_id}", response_model=models.PageOut)
def update_page(page_id: int, page: models.PageUpdate, db: Session = Depends(get_db)):
    db_page = db.query(models.Page).filter(models.Page.id == page_id).first()
    if not db_page:
        raise HTTPException(status_code=404, detail="Page not found")
    update_data = page.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_page, key, value)
    db.commit()
    db.refresh(db_page)
    return db_page

@app.delete("/api/pages/{page_id}")
def delete_page(page_id: int, db: Session = Depends(get_db)):
    db_page = db.query(models.Page).filter(models.Page.id == page_id).first()
    if not db_page:
        raise HTTPException(status_code=404, detail="Page not found")
    # Also delete tasks associated with this page
    db.query(models.Task).filter(models.Task.page_id == page_id).delete()
    db.delete(db_page)
    db.commit()
    return {"ok": True}

# CRUD for Tasks
@app.post("/api/tasks", response_model=models.TaskOut)
def create_task(task: models.TaskCreate, db: Session = Depends(get_db)):
    db_task = models.Task(**task.model_dump())
    if db_task.baseline_start is None:
        db_task.baseline_start = db_task.start_date
    if db_task.baseline_end is None:
        db_task.baseline_end = db_task.end_date
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

@app.get("/api/tasks", response_model=List[models.TaskOut])
def read_tasks(page_id: int = 1, skip: int = 0, limit: int = 1000, db: Session = Depends(get_db)):
    tasks = db.query(models.Task).filter(models.Task.page_id == page_id).order_by(models.Task.sort_order.asc(), models.Task.id.asc()).offset(skip).limit(limit).all()
    return tasks

from pydantic import BaseModel
class ReorderRequest(BaseModel):
    task_ids: List[int]

@app.post("/api/tasks/reorder")
def reorder_tasks(req: ReorderRequest, db: Session = Depends(get_db)):
    for index, task_id in enumerate(req.task_ids):
        db.query(models.Task).filter(models.Task.id == task_id).update({"sort_order": index})
    db.commit()
    return {"ok": True}

@app.put("/api/tasks/{task_id}", response_model=models.TaskOut)
def update_task(task_id: int, task: models.TaskUpdate, db: Session = Depends(get_db)):
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_data = task.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_task, key, value)
        
    db.commit()
    db.refresh(db_task)
    return db_task

@app.delete("/api/tasks/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(db_task)
    db.commit()
    return {"ok": True}

# Export Endpoints
@app.get("/api/export/list")
def export_list(db: Session = Depends(get_db)):
    tasks = db.query(models.Task).all()
    file_path = export.generate_list_excel(tasks)
    return {"ok": True, "path": file_path}

@app.get("/api/export/gantt")
def export_gantt(db: Session = Depends(get_db)):
    tasks = db.query(models.Task).all()
    file_path = export.generate_gantt_excel(tasks)
    return {"ok": True, "path": file_path}

# Serve static files
def get_base_path():
    if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
        return sys._MEIPASS
    return os.path.dirname(os.path.abspath(__file__))

static_path = os.path.join(get_base_path(), "static")
os.makedirs(static_path, exist_ok=True)
app.mount("/", StaticFiles(directory=static_path, html=True), name="static")
