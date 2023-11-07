const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId, Long } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.m6cowle.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const jobsCollection = client.db("jobJunctionDB").collection("jobs");
    // const postedJobsCollection = client
    //   .db("jobJunctionDB")
    // .collection("postedJobs");
    const bitsCollection = client.db("jobJunctionDB").collection("bits");

    // jobs collection operations
    // app.get("/jobs", async (req, res) => {
    //   try {
    //     const cursor = jobsCollection.find();
    //     const result = await cursor.toArray();
    //     res.send(result);
    //   } catch (error) {
    //     console.log(error);
    //   }
    // });

    app.get("/jobs", async (req, res) => {
      try {
        if (!req?.query?.email) {
          const cursor = jobsCollection.find();
          const result = await cursor.toArray();
          res.send(result);
          return;
        }
        const query = { email: req?.query?.email };
        const cursor = jobsCollection.find(query);
        const result = await cursor.toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    app.get("/jobs/:id", async (req, res) => {
      try {
        const id = req?.params?.id;
        const query = { _id: new ObjectId(id) };
        const result = await jobsCollection.findOne(query);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    app.post("/jobs", async (req, res) => {
      try {
        const jobInformation = req.body;
        const result = await jobsCollection.insertOne(jobInformation);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    app.delete("/jobs/:id", async (req, res) => {
      try {
        const id = req?.params;
        const query = { _id: new ObjectId(id) };
        const result = await jobsCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        console.log(console.error());
      }
    });

    // postedJobsCollection operations
    // app.get("/postedJobs", async (req, res) => {
    //   try {
    //     const query = { email: req?.query?.email };
    //     const cursor = postedJobsCollection.find(query);
    //     const result = await cursor.toArray();
    //     res.send(result);
    //   } catch (error) {
    //     console.log(error);
    //   }
    // });

    // app.post("/postedJobs", async (req, res) => {
    //   try {
    //     const job = req.body;
    //     const result = await postedJobsCollection.insertOne(job);
    //     res.send(result);
    //   } catch (error) {
    //     console.log(error);
    //   }
    // });

    // app.delete("/postedJobs/:id", async (req, res) => {
    //   try {
    //     const id = req?.params;
    //     const query = { _id: new ObjectId(id)}
    //     const result = await pr
    //   } catch (error) {
    //     console.log(console.error());
    //   }
    // });

    // bitsCollectionDB operation
    app.get("/bits", async (req, res) => {
      const result = await bitsCollection.find().toArray();
      res.send(result);
    });

    app.post("/bits", async (req, res) => {
      try {
        const bitJob = req.body;
        const result = await bitsCollection.insertOne(bitJob);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Job Junction server is running");
});

app.listen(port, () => {
  console.log(`Job junction server is running on ${port}`);
});
