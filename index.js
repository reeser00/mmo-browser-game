import ejs from 'ejs';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const port = 3000;

app.use(express.static('public'));
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    res.render('main');
});

const players = {};

io.on('connection', (socket) => {
    console.log('a user connected');

    //disconnect
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});



// Listen on the specified port
server.listen(port, () => {
    console.log(`MMO Server listening at http://localhost:${port}`);
});