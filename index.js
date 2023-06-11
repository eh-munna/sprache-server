// app configuration

const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;

// dotenv
require('dotenv').config();

// middleware

app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.0lo6seg.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 100,
});

async function connectDB() {
  try {
    client.connect((error) => {
      if (error) {
        console.log(error);
        return;
      }
    });

    // database name
    const spracheDB = client.db('spracheDB');

    // collections
    const usersCollection = spracheDB.collection('usersCollection');

    // creating and adding users

    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'User already exists' });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });
  } finally {
    // client.close();
  }
}

connectDB();

// basic route testing

app.get('/', (req, res) => {
  res.send('Welcome to the Sprache server!');
});

// app running

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
