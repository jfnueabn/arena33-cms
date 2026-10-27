const createApp = require('./app');
const PORT = Number(process.env.PORT) || 3000;

createApp().listen(PORT, () => console.log(`LV55 running → http://localhost:${PORT}  (admin: /admin)`));
