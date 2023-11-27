import ejs from 'ejs';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const port = 3000;

//SETUP BODY PARSER
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.raw());

//MONGODB DATABASE CONNECTION AND SCHEMAS
mongoose.set("strictQuery", false);
let conn = mongoose.createConnection("mongodb+srv://reeser:eZLB5c9LolhzMpbf@mmobg.oq3gsu8.mongodb.net/mmobg");

const worldSchema = new mongoose.Schema ({
    owner: String,
    name: String,
    description: String,
    objectsPlaced: Array,
    created: Date,
    rating: Number,
    size: {
        x: Number,
        y: Number,
        z: Number
    }
});

const worldData = conn.model('world', worldSchema);

app.use(express.static('public'));
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    res.render('main');
});

const players = {};

io.on('connection', (socket) => {
    console.log('a user connected');
    //SOCKET EVENTS

    //login
    socket.on('login', (username) => {
        players[socket.id] = {
            username: username
        };
        console.log(players);

        loadWorld(username).then((world) => {
            socket.emit('loadworld', world);
        });
    });

    //save players world
    socket.on('saveworld', (objectsPlaced) => {
        console.log(objectsPlaced);
        saveWorld(players[socket.id].username, objectsPlaced);
    });

    //disconnect
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

// Listen on the specified port
server.listen(port, () => {
    console.log(`MMO Server listening at http://localhost:${port}`);
});





//FUNCTIONS
async function saveWorld(username, objectsPlaced) {
    let saveWorld = worldData.updateOne({owner: username}, {objectsPlaced: objectsPlaced});
    return saveWorld;
}

async function loadWorld(username) {
    let world = await worldData.findOne({owner: username});
    if (world == null) {
        await newWorld(username);
        world = await worldData.findOne({owner: username});
    }
    console.log(world);
    return world;
}

async function newWorld(username) {
    let newWorld = new worldData({
        owner: username,
        name: 'Test World',
        description: 'This is a test world',
        objectsPlaced: [],
        created: Date.now(),
        rating: 0,
        size: {
            x: 20,
            y: 1,
            z: 20
        }
    });

    await newWorld.save();
}