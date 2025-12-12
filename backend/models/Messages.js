const mongoose=require('mongoose');

const messageSchema=new mongoose.Schema({
    Message:{
        type:mongoose.Schema.Types.ObjectId,ref:'converse',required:true
    },
    Sender:{
        type:mongoose.Schema.Types.ObjectId,ref:'User',required:true
    },
    Reciever:{
     type:mongoose.Schema.Types.ObjectId,ref:'User',required:true
    },
    Content:{
      type:String
    },
    imageorvideoURL:{
        type:String
    },
    contentType:{
        type:String,enum:["image","video","text"]
    },
    reactions:[{
        user:{
            type:mongoose.Schema.Types.ObjectId,ref:'User'
        },
        emoji:{
            type:String
        }
    }],
    messageStatus:{
        type:String,default:'send'
    }

},{timestamps:true})
const message=mongoose.model("message",messageSchema);
module.exports=message