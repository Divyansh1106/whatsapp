const mongoose=require("mongoose")
const statusSchema=new mongoose.Schema({
    user:{type:mongoose.Schema.Types.ObjectId,ref:'User'},
    content:{type:String,required:"true"},
    content_type:{type:String,enum:["image","video","text"],default:"text"},
    viewers:[{type:mongoose.Schema.Types.ObjectId,ref:'User'}],
    expireAt:{type:Date,required:true},
     
    
},{timestamps:true})
const status=mongoose.model("status",statusSchema);
module.exports=status;
