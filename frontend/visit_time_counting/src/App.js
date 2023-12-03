import React, { useEffect, useState, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import RandomText from './RandomText';
import Fingerprint2 from 'fingerprintjs2';

const storage = window.localStorage;

function App() {
  const [timeSpent, setTimeSpent] = useState(0);
  const sessionIdRef = useRef(generateSessionId());
  const socket = useRef(null);
  const tabActiveRef = useRef(true);
  const periodicEventTimeoutRef = useRef(null);

  useEffect(() => {
    const interval = setInterval(() => {
      if (tabActiveRef.current) {
        setTimeSpent(prevTime => prevTime + 1);
      }
    }, 1000);

    const handleVisibilityChange = () => {
      tabActiveRef.current = !document.hidden;
      if (tabActiveRef.current) {
        periodicEventTimeoutRef.current = setTimeout(() => {
          socket.current.send(JSON.stringify({
            event: 'periodic_event',
            data: { session_id: sessionIdRef.current, is_active: true }
          }));
        }, 3000);
      } else {
        clearTimeout(periodicEventTimeoutRef.current);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const handleBeforeUnload = () => {
      socket.current.send(JSON.stringify({
        event: 'close_event',
        data: { session_id: sessionIdRef.current }
      }));
      socket.current.close();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    if (!socket.current) {
      socket.current = new WebSocket('ws://127.0.0.1:8000/ws/');
      socket.current.onopen = () => {
        getBrowserFingerprint((fingerprint) => {
          const storedFingerprint = storage.getItem('browserFingerprint');
          const newFingerprint = fingerprint || storedFingerprint;
          storage.setItem('browserFingerprint', newFingerprint);
          socket.current.send(JSON.stringify({
            event: 'initial_event',
            data: { session_id: sessionIdRef.current, time_on_site: timeSpent, fingerprint: newFingerprint }
          }));
        });
      };

      socket.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const { event: eventName, data: eventData } = data;

        if (eventName === 'periodic_event') {
          if (tabActiveRef.current) {
            periodicEventTimeoutRef.current = setTimeout(() => {
              socket.current.send(JSON.stringify({
                event: 'periodic_event',
                data: { session_id: sessionIdRef.current, is_active: true }
              }));
            }, 3000);
          }
        } else if (eventName === 'update_time_spent') {
          const { session_id, time_spent } = eventData;
          if (session_id === sessionIdRef.current) {
            console.log(`Время проведенное на сайте (из другой вкладки): ${time_spent} секунд`);
            setTimeSpent(time_spent);
          }
        }
      };
    } else if (socket.current.readyState === WebSocket.OPEN) {
      getBrowserFingerprint((fingerprint) => {
        const storedFingerprint = storage.getItem('browserFingerprint');
        const newFingerprint = fingerprint || storedFingerprint;
        socket.current.send(JSON.stringify({
          event: 'time_spent_event',
          data: { session_id: sessionIdRef.current, time_spent: timeSpent, fingerprint: newFingerprint }
        }));
      });
    }
  }, [timeSpent]);

  function generateSessionId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  const getBrowserFingerprint = (callback) => {
    Fingerprint2.get((components) => {
      const values = components.map((component) => component.value);
      const fingerprint = Fingerprint2.x64hash128(values.join(''), 31);
      storage.setItem('browserFingerprint', fingerprint);
      callback(fingerprint);
    });
  }

  return (
    <Router>
      <div>
        <nav>
          <ul>
            <li>
              <Link to="/">Главная</Link>
            </li>
            <li>
              <Link to="/random-text">Случайный текст</Link>
            </li>
          </ul>
        </nav>

        <div>
          <h2>Время проведенное на сайте: {timeSpent} секунд</h2>
        </div>

        <Routes>
          <Route path="/" element={<div>
            <h1>Текст-рыба</h1>
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla ac justo
              Integer aliquam auctor sem, sed condimentum diam sod. Vestibulum vel velit non ligula ullamcorper
              fermentum. Fusce bibendum aliquet placerat. Pellentesque habitant morbi tristique senectus et netus et
              malesuada fames ac turpis egestas. Curabitur ac velit risus. Sed
            </p>
          </div>} />
          <Route path="/random" element={<RandomText />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;