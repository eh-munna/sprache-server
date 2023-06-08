// app configuration

const express = require('express');
const app = express();
const port = process.env.PORT || 5000;

// dotenv

require('dotenv').config();

// middleware

// cors middleware

const cors = require('cors');

app.use(cors());
app.use(express.json());

// basic route testing

app.get('/', (req, res) => {
  res.send('Welcome to the Sprache server!');
});

// app running

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
