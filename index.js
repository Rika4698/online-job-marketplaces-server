const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

//middleware

app.use(cors({origin:['http://localhost:5173'], credentials:true}));
app.use(express.json());
app.use(cookieParser());
// {origin:'https://online-job-marketplaces-client.web.app'}

// console.log(process.env.DB_PASS);
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.i5g3jew.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
const logger =(req, res, next)=>{
  console.log('log: info',req.method,req.url);
  next();
}
const verifyToken = (req,res,next)=>{
  const token = req?.cookies?.token;
  console.log('token in the middleware',token);
  
  if(!token){
    return res.status(401).send({message:'unauthorized access'})
  }
  jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded)=>{
    if(err){
      return res.status(401).send({message:'unauthorized access'})
    }
    req.user = decoded;
    next();
  })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const jobCollection = client.db('JobDB').collection("job");
    const bidCollection = client.db('MyBidDB').collection("bids");
    // auth api
    app.post('/jwt',logger,async(req,res)=>{
      const user = req.body;
      console.log('user for token', user);
      const token = jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{expiresIn: '24h'});
      res.cookie('token',token,{
        httpOnly:true,
        secure:true,
        sameSite:'none'
      })
      .send({success:true});
    })
    app.post('/logout',logger,async(req,res)=>{
      const user = req.body;
      console.log('logging out',user);
      res.clearCookie('token',{maxAge:0}).send({success:true})
    })



     //service api
    app.get('/jobs',logger ,verifyToken,async (req, res) => {
      console.log('token owner info', req.user);
      console.log('email',req.params.email);
      // if(req.user.email !== req.query.email){
      //   return res.status(403).send({message: 'forbidden access'})
      // }
      let query = {};
      if(req.query?.email){
        query = {email: req.query.email}
      }
      const result = await jobCollection.find(query).toArray();
      res.send(result);
    })

    app.get('/jobs',logger ,verifyToken,async (req, res) => {
      console.log('token owner info', req.user);
        const cursor = jobCollection.find();
        const result = await cursor.toArray();
        res.send(result);
    })
    app.get("/jobs/:id",logger, async (req, res) => {
      console.log('cook cookies', req.cookies);
      console.log(req.query.email);
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobCollection.findOne(query);
      res.send(result);
    });


    app.post('/jobs',logger,verifyToken, async (req, res) => {
        const newJob = req.body;
        console.log(newJob);
        const result = await jobCollection.insertOne(newJob);
        res.send(result);
    })

    app.get('/bids', logger,verifyToken, async (req, res) => {
      const cursor = bidCollection.find();
      // const sortedBids = await bidCollection.find().sort({ status: 1 }).toArray();
      const result = await cursor.toArray();
      res.send(result);
  })
    app.get('/my-bids',logger, verifyToken,async (req, res) => {
      const cursor = bidCollection.find().sort({ status: 1 });
      // const sortedBids = await bidCollection.find().sort({ status: 1 }).toArray();
      const result = await cursor.toArray();
      res.send(result);
  })


    app.post('/bids',logger, verifyToken,async (req, res) => {
        const myBid = req.body;
        console.log(myBid);
        const result = await bidCollection.insertOne(myBid);
        res.send(result);
    })

    app.patch('/bids/:id',logger,verifyToken,async(req,res)=>{
      const id = req.params.id;
      // console.log(id);
      const filter =  { _id: new ObjectId(id) };
      const accepted = req.body;
      console.log(accepted);
      const updateDoc = {
        $set:{
          status: accepted.status
        },
      };
      const result = await bidCollection.updateOne(filter,updateDoc);
      res.send(result);
    })

    app.put('/jobs/:id',logger,verifyToken, async (req, res) => {
        const id = req.params.id;
       
        const filter = { _id: new ObjectId(id) };
        const options = { upsert: true };
        const updateJob = req.body;
        const job = {
            $set: {
                name: updateJob.name,
                image: updateJob.image,
                deadline: updateJob.deadline,
                category: updateJob.category,
                description: updateJob.description,
                minPrice: updateJob.minPrice,
                maxPrice: updateJob.maxPrice,

            }
        }
        const result = await jobCollection.updateOne(filter, job, options);
        res.send(result);
    })
    
    app.delete('/jobs/:id',logger,verifyToken, async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        // const data = req.body;
        // console.log(data);
        // // const query = { prodId: data.id };
        // const filter = {
        //     $and: [
        //         { email: data.email },
        //         { prodId: data.id }
        //     ]
        // }
        const result = await jobCollection.deleteOne(filter);
        res.send(result);
    })


    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/',(req,res) => {
    res.send('online job is running')
})

app.listen(port,() => {
    console.log(`online job marketplaces is running on port ${port}`);
})