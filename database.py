import os
import msvcrt
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DB_PATH = "gantt_data.db"
LOCK_PATH = "gantt_data.lock"

# 複数起動時の排他制御（ロック取得によるモード判定）
is_read_only = False
_lock_fd = None

try:
    _lock_fd = os.open(LOCK_PATH, os.O_RDWR | os.O_CREAT | os.O_TRUNC)
    msvcrt.locking(_lock_fd, msvcrt.LK_NBLCK, 1)
except (IOError, OSError):
    is_read_only = True
    if _lock_fd is not None:
        try:
            os.close(_lock_fd)
        except Exception:
            pass
        _lock_fd = None

if is_read_only:
    # 読み取り専用モードでは mode=ro と uri=True を付与して接続
    SQLALCHEMY_DATABASE_URL = f"sqlite:///file:{DB_PATH}?mode=ro"
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False, "uri": True}
    )
else:
    # 通常の読み書きモード
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
