//importing external modules and reading the environment variables
require('dotenv').config();
const express = require("express"),
       app = express(),
       port = process.env.PORT || 8080,
       cors = require("cors");
const bodyParser = require('body-parser');
const fs = require("fs").promises;

//reading the environment for MongoDB
//Question: Is there some way to make this automatic? As in, I wouldn't have to manually create a .env file and 
//set the variable myself
const mongoActive = (process.env.USE_MONGO == 'true');
console.log(process.env.USE_MONGO)

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
app.post("/add/item", addItem);
app.post("/load/items", loadItems);
app.post('/delete/item', deleteItem);

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
        }
        const data = await fs.readFile("database.json");
        
        const json = JSON.parse(data);
        const isDuplicate = json.some(todo => todo.Task === newTask.Task);
        if (isDuplicate) {
            return;
        }
        json.push(newTask);
        await fs.writeFile("database.json", JSON.stringify(json))
        console.log('Successfully wrote to file') 
        response.sendStatus(200)
    } catch (err) {
        console.log("error: ", err)
        response.sendStatus(500)
    }
}

/**
 * This function loads items from either the mongo database or the file database.json
 * for usage within the frontend
 * @param {*Request from frontend} request 
 * @param {*Response from backend/server} response 
 * @returns 
 */
async function loadItems(request, response) {
    let loadedList;
    try {
        if (mongoActive && todoCollection) {
            await synchronizeMongoWithFile();
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

/**
 * Helper for loadItems: will synchronize the mongo databse and file database once the app is loaded
 */
async function synchronizeMongoWithFile() {
    try {
        const mongoData = await todoCollection.find({}).toArray();

        const fileData = await fs.readFile('database.json', 'utf-8');
        const fileJson = JSON.parse(fileData);

        const itemsToAdd = fileJson.filter(item => !mongoData.some(mongoItem => mongoItem.ID === item.ID));
        const itemsToUpdate = fileJson.filter(item => mongoData.some(mongoItem => mongoItem.ID === item.ID && !isEqual(mongoItem, item)));
        const itemsToDelete = mongoData.filter(mongoItem => !fileJson.some(item => item.ID === mongoItem.ID));

        // Add new items to MongoDB
        if (itemsToAdd.length > 0) {
            await todoCollection.insertMany(itemsToAdd);
            console.log(`Added ${itemsToAdd.length} items to MongoDB`);
        }

        // Update existing items in MongoDB
        for (const item of itemsToUpdate) {
            await todoCollection.updateOne({ ID: item.ID }, { $set: item });
            console.log(`Updated item with ID ${item.ID} in MongoDB`);
        }

        // Delete items from MongoDB
        for (const item of itemsToDelete) {
            await todoCollection.deleteOne({ ID: item.ID });
            console.log(`Deleted item with ID ${item.ID} from MongoDB`);
        }

        console.log("MongoDB synchronization with file database.json complete");
    } catch(error) {
        console.log('Error in synchornization: ', error);
    }
}

/**
 * This function will delete an item with a particular ID. IDs are unique
 * in the use case of this function, so we are only able to delete one at a time.
 * @param {*Request from the frontend} request 
 * @param {*Response from the server/backend} response 
 */
async function deleteItem(request, response) {
    const idToDelete = request.body.jsonObject.id;
    console.log('Deleting id:', idToDelete);
    try {
        //if mongoActive, then delete from the mongo database and log it in the console
        if (mongoActive && todoCollection) {
            const deleteResultMongo = await todoCollection.deleteOne({ID : idToDelete});
            console.log('Deleted documents =>', deleteResultMongo);
        }
        //we should read from a file on our computer and delete from there using 
        //filtering regardless of whether or not the MongoDb is active
        const dataFromFile = await fs.readFile('database.json', 'utf-8');
        let currentTodos = JSON.parse(dataFromFile);

        const updatedList = currentTodos.filter(todo => todo.ID !== idToDelete);
        if (updatedList.length < currentTodos.length) {
            await fs.writeFile('database.json', JSON.stringify(updatedList));
            console.log('Deleted task with id ' + {idToDelete} + ' without any issues');
            response.sendStatus(200);
        } else {
            console.log('Could not delete task with id ' + {idToDelete} + ' because it could not be found');
             response.sendStatus(400);
        }
    } catch(error){
        console.log("Error when trying to delete ", error);
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