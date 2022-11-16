const mongoose = require('mongoose');
// Use the schema to define the constraints of a valid user
const userSchema  = new mongoose.Schema({
    fullname: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    age: {
        type: Number,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    stress: {
        type: Array,
        required: false
    }
}
)
// Based on the schema, we are now creating a model called user
// the model directly maps to the mongodb model
module.exports = mongoose.model('user', userSchema);