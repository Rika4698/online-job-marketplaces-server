const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

//middleware

app.use(cors({
  origin:[
    
  'http://localhost:5173',
  'https://online-job-marketplaces-client.web.app',
  'https://online-job-marketplaces-client.firebaseapp.com',
], credentials:true}));
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
// const logger =(req, res, next)=>{
//   console.log('log: info',req.method,req.url);
//   next();
// }
const verifyToken = (req,res,next)=>{
  console.log('Cookies received by server:', req.cookies);
  const token = req.cookies?.token;
  console.log('token in the verify',token);
  
  if(!token){
    return res.status(401).send({message:'unauthorized access'})
  }
  jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded)=>{
    if(err){
      return res.status(401).send({message:'unauthorized access'})
    }
    req.user = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const jobCollection = client.db('JobDB').collection("job");
    const bidCollection = client.db('MyBidDB').collection("bids");

    // auth api
    app.post('/jwt',async(req,res)=>{
      const user = req.body;
      console.log('user for token', user);
      const token = jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{expiresIn: '5h'});
      res.cookie('token',token,{
        httpOnly:true,
        secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        // secure:true,
        // sameSite:'none'
      })
      .send({success:true});
    });

    app.post('/logout',async(req,res)=>{
      const user = req.body;
      console.log('logging out',user);
      
      res.clearCookie('token',{
        httpOnly:true,
        secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        // secure:true,
        // sameSite:'none'
      })
      .send({success:true});
    });



     //service api
    // app.get('/my-jobs/:email',verifyToken,async (req, res) => {
    //   // console.log('my-jobs', req.decoded);
    //   console.log('email',req.params.email);
    //   console.log("Backend API hit:", req.params.email); // Check incoming email
    //   if (!req.params.email) {
    //       return res.status(400).send({ message: "Email is required" });
    //   }
    //   if(req.user.email !== req.params.email){
    //     return res.status(403).send({message: 'forbidden access'})
    //   }
    //   let query = {};
    //   if(req.params?.email){
    //     query = {email: req.params.email}
    //   }
    //   const result = await jobCollection.find(query).toArray();
    //   // console.log(result);
    //   res.send(result);
    // })
    app.get("/my-jobs/:id",verifyToken, async (req, res) => {
      console.log('job', req.cookies);
      console.log(req.query.email);
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobCollection.findOne(query);
      res.send(result);
    });

    app.get('/jobs',async (req, res) => {
      console.log('token owner info', req.user);
     
        const cursor = jobCollection.find();
        const result = await cursor.toArray();
        res.send(result);
    })


    app.get("/jobs/:id",verifyToken, async (req, res) => {
      console.log('job', req.cookies);
      console.log(req.query.email);
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobCollection.findOne(query);
      res.send(result);
    });


    app.post('/jobs',verifyToken, async (req, res) => {
        const newJob = req.body;
        console.log(newJob);
        const result = await jobCollection.insertOne(newJob);
        res.send(result);
    })

    app.get('/bids', verifyToken, async (req, res) => {
      const cursor = bidCollection.find();
      // const sortedBids = await bidCollection.find().sort({ status: 1 }).toArray();
      const result = await cursor.toArray();
      res.send(result);
  });
    
  app.get('/my-bids', verifyToken,async (req, res) => {
      const cursor = bidCollection.find().sort({ status: 1 });
      // const sortedBids = await bidCollection.find().sort({ status: 1 }).toArray();
      const result = await cursor.toArray();
      res.send(result);
      console.log(result);
  });


    app.post('/bids', verifyToken,async (req, res) => {
        const myBid = req.body;
        console.log(myBid);
        const result = await bidCollection.insertOne(myBid);
        res.send(result);
    })

    app.patch('/bids/:id',verifyToken,async(req,res)=>{
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

    app.put('/jobs/:id',verifyToken, async (req, res) => {
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
    
    app.delete('/jobs/:id',verifyToken, async (req, res) => {
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