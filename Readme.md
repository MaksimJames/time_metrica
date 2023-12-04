### Startapp
- Frontend - ```npm start --prefix ./frontend/visit_time_counting```
- Backend - ```cd backend && source env/bin/activate && uvicorn main:app --reload```

### API Documentation
api documentation - ```/docs```

### Project structure
- Frontend - ```./frontend/visit_time_counting```
- Backend - ```./backend```

### Frameworks
- Frontend - React (Thats my first experience build JS app)
- Backend - FastAPI
- Database - SQLite

### Scheme
<img src="./static/Screenshot 2023-12-04 at 12.58.56.png" alt="Scheme">

### Scheme explanation
The main idea is to keep track of whether a site tab is active or not. If the tab is active, then count the seconds of activity.
When the page is first loaded, a web socket connection is established. By a certain timeout through the web socket from the client are sent events with the current time spent on this tab.  (Now events are sent every 3 seconds of activity. This parameter can be adjusted depending on how accurate data is needed and for server resource saving reasons). When the tab is closed, the socket connection is closed.
The server receives these events. If it finds a record in the database by session number, it updates the time counter. If not, it creates a new record.
To get statistics of the average time spent by one user, the /stats/ endpoint is used.

P.S..
Browser fingerprint is used to indicate user separation.

### Thoughts
- Analytical databases can be used for better performance of data retrieval
- A different attribute can be used to better separate users (currently a browser fingerprint is used). In this way, if a user sits from different browsers, it will be considered that they are different users.
It is possible to use for example access token or other attribute
- For more accurate measurement, you could not count the time of the active tab, but send events with mouse coordinates by timeout.
- If the coordinates have not changed for a certain period of time, it can be considered that the user is not looking at the page.
- Так же можно установить страницам коэффициенты. Потому что некоторые страницы могут содержать мало контента а другие очень много. И время на прочитывание будет разным. И умножать этот коэффициент на таймаут.