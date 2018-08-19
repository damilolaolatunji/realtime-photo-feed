require('dotenv').config({ path: 'variables.env' });

const express = require('express');
const multipart = require('connect-multiparty');
const bodyParser = require('body-parser');
const cloudinary = require('cloudinary');
const cors = require('cors');
const Datastore = require('nedb');
const Pusher = require('pusher');

// Create an express app
const app = express();
// Create a database
const db = new Datastore();

// Configure middlewares
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Setup multiparty
const multipartMiddleware = multipart();

// Pusher configuration
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_APP_KEY,
  secret: process.env.PUSHER_APP_SECRET,
  cluster: process.env.PUSHER_APP_CLUSTER,
  encrypted: true,
});

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Get images from database
app.get('/', (req, res) => {
  db.find({}, (err, data) => {
    if (err) return res.status(500).send(err);

    res.json(data);
  });
});

app.post('/upload', multipartMiddleware, (req, res) => {
  // Upload image
  cloudinary.v2.uploader.upload(req.files.image.path, {}, function(
    error,
    result
  ) {
    if (error) {
      return res.status(500).send(error);
    }
    // Save record
    db.insert(Object.assign({}, result, req.body), (err, newDoc) => {
      if (err) {
        return res.status(500).send(err);
      }
      // Emit realtime event
      pusher.trigger('gallery', 'upload', {
        image: newDoc,
      });
      res.status(200).json(newDoc);
    });
  });
});

app.set('port', process.env.PORT || 5000);
const server = app.listen(app.get('port'), () => {
  console.log(`Express running → PORT ${server.address().port}`);
});
