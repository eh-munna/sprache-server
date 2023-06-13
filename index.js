// app configuration

const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;

// dotenv
require('dotenv').config();

// middleware

app.use(cors());
app.use(express.json());

// verifying jwt token

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'Invalid access' });
  }
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'Invalid access' });
    }
    req.decoded = decoded;
    next();
  });
};

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
    const classCollection = spracheDB.collection('classCollection');
    const bookClassCollection = spracheDB.collection('bookClassCollection');

    // jwt creating

    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: '1h',
      });
      res.send({ token });
    });

    // verifying admin

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (!user?.adminRole) {
        return res.status(403).send({ error: true, message: 'Invalid access' });
      }
      next();
    };

    // get all the classes

    app.get('/classes', async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    });

    // get popular classes based on enrolled students

    app.get('/popular', async (req, res) => {
      const result = await classCollection
        .find()
        .sort({ enrolledStudents: -1 })
        .limit(6)
        .toArray();
      res.send(result);
    });

    // get users
    app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // get admin based on email
    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        return res.send({ admin: false });
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.adminRole === true };
      res.send(result);
    });

    // creating and adding users

    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'User already exist' });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // updating user role as admin

    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          adminRole: true,
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // get single user from database

    // app.get('/users/user/:email', async (req, res) => {
    //   const user = req.params.email;
    //   const query = { email: user };
    //   const result = await usersCollection.findOne(query);
    //   res.send(result);
    // });

    app.get('/user/:email', async (req, res) => {
      const user = req.params.email;
      const query = { email: user };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    // updating user role as instructor

    app.patch('/users/instructor/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          instructorRole: true,
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // store booked course into the database

    app.post('/booked', async (req, res) => {
      const course = req.body;
      const result = await bookClassCollection.insertOne(course);
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
