import express from 'express';
import ejs from 'ejs';
const app = express();
const port = 3000;

app.use(express.static('public'));
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    res.render('main');
});

app.listen(port, () => {
  console.log(`MMO Server listening at http://localhost:${port}`);
});