const Mongoose=require('mongoose');
const Conversation=new Mongoose.Schema({
   participants:[{type:Mongoose.Schema.Types.ObjectId,ref:'User'}],
   LastMessage:{
    type:Mongoose.Schema.Types.ObjectId,ref:'message'
   },
   unreadCount:{
    type:Number,default:0
   }

},{timestamps:true})
const converse=Mongoose.model("converse",Conversation);
module.exports=converse