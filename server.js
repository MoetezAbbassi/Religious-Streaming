const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PASSWORD = 'secret123';

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));

app.post('/login', (req, res) => {
  const { password } = req.body;
  if (password === PASSWORD) return res.redirect('/stream.html');
  return res.send('Incorrect password');
});

app.listen(process.env.PORT || 3000, () => console.log('Server running'));
