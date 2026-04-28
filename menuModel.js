const mongoose = require('mongoose');

const menuSchema = new mongoose.Schema({
name:{
    type:String,
    required:true
},
imageUrl:{
    type:String,
},
price:{
    type:Number,
    required:true   
},
category:{
    type:String
},
description:{
    type:String,
},
 publicId: {
    type: String, 
  },
},{ timestamps:true})

const menuModel = mongoose.model('Menu', menuSchema);

module.exports = { menuModel } ;