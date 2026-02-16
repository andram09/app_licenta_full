const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./models/index');

const app = express();

// --- Middlewares ---

app.use(cors());
app.use(express.json());

// --- Rute API ---

// Ruta de test pentru a verifica starea serverului
app.get('/test', (req, res) => {
  res.json({ status: "Server is up and running" });
});

// --- Pornire Server si sincronizare BD ---
const PORT = process.env.PORT || 5000;

// force: false asigura ca tabelele nu sunt sterse si recreate la fiecare restart
db.sequelize.sync({ alter: true }) 
  .then(() => {
    console.log('MySQL connection established and tables synced.');
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Database synchronization failed:', err);
  });