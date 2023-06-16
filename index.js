// app configuration

const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require('stripe')(process.env.PAYMENT_KEY);

const port = process.env.PORT || 5000;

// dotenv

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
    const paymentCollection = spracheDB.collection('paymentCollection');

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

    app.get('/all-classes', async (req, res) => {
      const query = { status: 'approved' };
      const result = await classCollection.find(query).toArray();
      res.send(result);
    });

    // get popular classes based on enrolled students

    app.get('/popular', async (req, res) => {
      const result = await classCollection
        .find({ status: 'approved' })
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
      const email = req.params?.email;
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

    // admin apis...............

    // updating user role as admin

    app.patch('/users/admin/:id', verifyJWT, verifyAdmin, async (req, res) => {
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

    // updating class status
    app.patch('/approve/:id', verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: 'approved',
        },
      };
      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    // denying class status
    app.patch('/deny/:id', verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: 'denied',
        },
      };
      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // adding feedback
    app.patch('/add-feedback/:id', verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const body = req.body.feedback;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          feedback: body,
        },
      };
      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // updating user role as instructor

    app.patch(
      '/users/instructor/:id',
      verifyJWT,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const email = req.body.email;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            instructorRole: true,
            instructorEmail: email,
          },
        };
        const result = await usersCollection.updateOne(filter, updateDoc);
        res.send(result);
      }
    );

    // instructor apis.............

    // get single instructor
    app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
      const email = req.params?.email;
      if (req.decoded.email !== email) {
        return res.send({ instructor: false });
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { instructor: user?.instructorRole === true };
      res.send(result);
    });

    // get all instructors

    app.get('/instructors', async (req, res) => {
      const query = { instructorRole: true };
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });

    app.get('/get-instructor/:email', verifyJWT, async (req, res) => {
      const query = { instructorRole: true };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    app.get('/instructor-class/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      const query = { instructorEmail: email };
      const projection = { status: 1 };
      const result = await classCollection.find(query, projection).toArray();
      res.send(result);
    });

    // class apis...................//

    // add new class
    app.post('/add-class', async (req, res) => {
      const course = req.body;
      const result = await classCollection.insertOne(course);
      res.send(result);
    });

    // store booked course into the database

    app.get('/booked', verifyJWT, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }
      const query = { email: email };
      const result = await bookClassCollection.find(query).toArray();
      res.send(result);
    });

    app.get('/users', async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    app.post('/booked', async (req, res) => {
      const course = req.body;
      const result = await bookClassCollection.insertOne(course);
      res.send(result);
    });

    // payment intent

    app.post('/create-payment-intent', verifyJWT, async (req, res) => {
      const { price } = req.body;
      const amount = price * 100;
      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'eur',
        payment_method_types: ['card'],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.post('/payments', verifyJWT, async (req, res) => {
      const payment = req.body;
      const result = await paymentCollection.insertOne(payment);
      res.send(result);
    });

    app.delete('/delete-book/:id', verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { bookedId: id };
      const result = await bookClassCollection.deleteOne(filter);
      res.send(result);
    });

    app.get('/enrolled', verifyJWT, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }
      const query = { studentEmail: email };
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    });

    // get payment history

    app.get('/payment-history', verifyJWT, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }

      const query = { studentEmail: email };
      const result = await paymentCollection
        .find(query)
        .sort({ _id: -1 })
        .toArray();

      res.send(result);
    });

    app.patch('/reduce-seat/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $inc: {
          availableSeats: -1,
        },
      };
      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.patch('/increase-enroll/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $inc: {
          enrolledStudents: 1,
        },
      };
      const result = await classCollection.updateOne(filter, updateDoc);
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
