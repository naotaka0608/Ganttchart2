from sqlalchemy import Column, Integer, String, Float, Date, Boolean, ForeignKey
from database import Base
from pydantic import BaseModel
from typing import Optional
from datetime import date

# SQLAlchemy Models
class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    start_date = Column(Date)
    end_date = Column(Date)
    progress = Column(Float, default=0.0) # 0.0 to 100.0
    assignee = Column(String, nullable=True)
    milestone = Column(Boolean, default=False)
    dependencies = Column(String, default="") # comma separated IDs
    parent_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)
    sort_order = Column(Integer, default=0)
    color = Column(String, default="#3b82f6")

# Pydantic Schemas
class TaskBase(BaseModel):
    name: str
    start_date: date
    end_date: date
    progress: float = 0.0
    assignee: Optional[str] = None
    milestone: bool = False
    dependencies: str = ""
    parent_id: Optional[int] = None
    sort_order: int = 0
    color: str = "#3b82f6"

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    name: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    progress: Optional[float] = None
    assignee: Optional[str] = None
    milestone: Optional[bool] = None
    dependencies: Optional[str] = None
    parent_id: Optional[int] = None
    sort_order: Optional[int] = None
    color: Optional[str] = None

class TaskOut(TaskBase):
    id: int

    class Config:
        from_attributes = True
