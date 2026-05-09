import os
import msvcrt
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import time

DB_PATH = "gantt_data_test.db"

# Create DB first
engine1 = create_engine(f"sqlite:///{DB_PATH}")
engine1.execute("CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY)")

# Test Read-Only
try:
    engine2 = create_engine(f"sqlite:///file:{DB_PATH}?mode=ro&uri=true")
    engine2.connect()
    print("URI in connection string works")
except Exception as e:
    print(f"URI in connection string failed: {e}")

try:
    engine3 = create_engine(f"sqlite:///{DB_PATH}", connect_args={"uri": True})
    engine3.execute("CREATE TABLE IF NOT EXISTS test2 (id INTEGER PRIMARY KEY)")
    print("Normal connect works")
except Exception as e:
    print(f"Normal connect failed: {e}")

try:
    engine4 = create_engine(f"sqlite:///file:{DB_PATH}?mode=ro", connect_args={"uri": True})
    engine4.execute("INSERT INTO test (id) VALUES (1)")
except Exception as e:
    print(f"Read-only properly blocked write: {e}")
