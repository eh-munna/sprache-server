// app configuration

const express = require('express');
const app = express();
const port = process.env.PORT || 5000;

// basic route testing

app.get('/', (req, res) => {
  res.send('Welcome to the Sprache server!');
});

// app running

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
