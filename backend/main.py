import logging
from typing import List

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from pydantic import BaseModel

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, String, Integer
from sqlalchemy.sql import func


app = FastAPI()


logger = logging.getLogger(__name__)


engine = create_engine('sqlite:///database.db')
Base = declarative_base()


class Session(Base):
    __tablename__ = 'sessions'
    __table_args__ = {'extend_existing': True}
    session_id = Column(String, primary_key=True)
    time_spend = Column(Integer)
    fingerprint = Column(String)


Base.metadata.create_all(engine, checkfirst=True)
SessionSession = sessionmaker(bind=engine)
session = SessionSession()


origins = [
    "*"
]


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class StatsResponseData(BaseModel):
    fingerprint:    str
    time_spent:     float


@app.websocket("/ws/")
async def websocket_endpoint(websocket: WebSocket):
    available_events = ('initial_event', 'time_spent_event')
    await websocket.accept()

    try:
        while True:
            db = SessionSession()
            data = await websocket.receive_json()
            logger.error(data)
            event_type = data.get('event')
            event_data = data.get('data')
            if not event_type or event_type not in available_events:
                continue
            session = None
            if event_type == 'initial_event':
                sess = Session(session_id=event_data.get('session_id'), time_spend=0, fingerprint=event_data.get('fingerprint'))
                db.add(sess)
                db.commit()
                session = sess
            elif event_type == 'time_spent_event':
                session = db.query(Session).filter(Session.session_id == event_data.get('session_id')).first()
                if session:
                    session.time_spend = int(event_data.get('time_spent'))
                    db.commit()
            if session:
                db.commit()
                db.refresh(session)
    except WebSocketDisconnect:
        pass


@app.get("/sessions/")
def get_sessions():
    db = SessionSession()
    sessions = db.query(Session).all()
    return sessions


@app.get("/stats/", response_model=List[StatsResponseData])
async def get_stats():
    res = session.query(Session.fingerprint, func.avg(Session.time_spend)).group_by(Session.fingerprint).all()
    return [StatsResponseData(fingerprint=row[0], time_spent=row[1]) for row in res]
