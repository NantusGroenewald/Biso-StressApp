const mongoose = require('mongoose');
// Use the schema to define the constraints of a valid user
const stressSchema  = new mongoose.Schema({
    level: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    heartRate: {
        type: Number,
        required: true
    }
}
)
// Based on the schema, we are now creating a model called user
// the model directly maps to the mongodb collection stress object
module.exports = mongoose.model('stress', stressSchema);