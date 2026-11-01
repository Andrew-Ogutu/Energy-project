# Home Energy Monitor

React + Vite dashboard for tracking electricity use in each room of a home.

## Run
    npm install
    npm run dev

## Files
- src/App.jsx     main screen: live, compare, report, alerts tabs
- src/charts.jsx  Spark, Bars and Live SVG charts
- src/data.js     rooms, usage patterns, demo history, browser storage
- src/styles.css  design tokens and components

## Connect real meters
Replace the simulated reading loop (the setInterval inside the useEffect in App.jsx)
with data from your meter, API or MQTT/WebSocket feed. Daily history is kept in
localStorage; swap `persist` and `load` in data.js for a database call for multi-device use.
