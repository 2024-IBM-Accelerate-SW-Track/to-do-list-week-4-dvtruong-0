//importing external modules and reading the environment variables
const express = require("express"),
       app = express(),
       port = process.env.PORT || 8080,
       cors = require("cors");
const bodyParser = require('body-parser');
const fs = require("fs").promises;

//reading the environment for MongoDB
const mongoURI = process.env.mongoURI;
const mongoActive = mongoURI && (process.env.USE_MONGO == 'true');
console.log(mongoActive);

//setting up mongo client and url
const { MongoClient } = require('mongodb');
const url = 'mongodb://localhost:27017';
const client = new MongoClient(url);
let database;
let todoCollection;

//establish connection and create database
const connectMongo = async () => {
    try {
        if (mongoActive) {
            await client.connect();
            console.log('Connection made to MongoDb server');
            database = client.db('todoListDatabase');
            todoCollection = database.collection('todoListItems');
        }
    } catch(error) {
        console.log("Error when trying to establish client connection to MongoDb", error);
    }
    
}
connectMongo();

//sets up our express application and returns a message back once
//it starts running
app.use(cors());
app.use(bodyParser.json({ extended: true }));
app.listen(port, () => console.log("Backend server live on " + port));

//returns a message once a GET request (I think this is kind of like
//the beginning of a complete request) to the specified route is made 
app.get("/", (req, res) => {
    res.send({ message: "Connected to Backend server!" });
});

//makes a call to the addItem function once a POST request 
//(which causes a change in the server) to 
//the specified route is made 
app.post("/add/item", addItem)
app.post("/load/items", loadItems)

//takes in a request from the app, which reqpresents a todo item
//the body is converted to a json object and saved into a file 
//on our computer called database.json to represent the todos list
async function addItem (request, response) {
    try {
        // Converting Javascript object (Task Item) to a JSON string
        const id = request.body.jsonObject.id
        const task = request.body.jsonObject.task
        const curDate = request.body.jsonObject.currentDate
        const dueDate = request.body.jsonObject.dueDate
        const newTask = {
          ID: id,
          Task: task,
          Current_date: curDate,
          Due_date: dueDate
        }
        if (mongoActive && todoCollection) {
            await todoCollection.insertOne(newTask);
            console.log('successfully inserted task into MongoDb database');
        } else {
            const data = await fs.readFile("database.json");
            const json = JSON.parse(data);
            json.push(newTask);
            await fs.writeFile("database.json", JSON.stringify(json))
            console.log('Successfully wrote to file') 
            response.sendStatus(200)
        }
    } catch (err) {
        console.log("error: ", err)
        response.sendStatus(500)
    }
}

async function loadItems(request, response) {
    let loadedList;
    try {
        if (mongoActive && todoCollection) {
            loadedList = await todoCollection.find({}).toArray();
        } else {
            const dataFromFile = await fs.readFile('database.json', 'utf-8');
            loadedList = JSON.parse(dataFromFile);
        }
        return response.json(loadedList)
    } catch(error) {
        console.log('Erroring when trying to load to do list items', error);
    }
}

//shutdown client connetion when app closes
const disconnectMongoDb = async () => {
    console.log("Disconnecting from MongoDb...");
    if (mongoActive) {
        try {
            await client.close();
            console.log("MongoDb client connection closed.");
        } catch(error) {
            console.error("Error closing client connection to MongoDb", error);
        }
    }
    process.exit(0);
}

process.on('SIGINT', disconnectMongoDb);
process.on('SIGTERM', disconnectMongoDb);