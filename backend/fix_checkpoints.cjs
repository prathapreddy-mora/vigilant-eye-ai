const mongoose = require('mongoose');
const models = require('./models.cjs');

mongoose.connect('mongodb://localhost:27017/vigilant_eye')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

async function fix() {
  const result = await models.Checkpoint.updateMany(
    { lat: { $in: [null, undefined] } },
    { $set: { lat: 15.5057, lng: 80.0499 } }
  );
  console.log(`Updated ${result.modifiedCount} checkpoints`);
  mongoose.connection.close();
}

fix();
