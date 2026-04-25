from fastapi import FastAPI, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List

import models
from database import engine, get_db
import export

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Gantt Chart API")

# CRUD for Tasks
@app.post("/api/tasks", response_model=models.TaskOut)
def create_task(task: models.TaskCreate, db: Session = Depends(get_db)):
    db_task = models.Task(**task.model_dump())
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

@app.get("/api/tasks", response_model=List[models.TaskOut])
def read_tasks(skip: int = 0, limit: int = 1000, db: Session = Depends(get_db)):
    tasks = db.query(models.Task).order_by(models.Task.sort_order.asc(), models.Task.id.asc()).offset(skip).limit(limit).all()
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
import os
os.makedirs("static", exist_ok=True)
app.mount("/", StaticFiles(directory="static", html=True), name="static")
