const mongoose=require('mongoose');
const userSchema=new mongoose.Schema({
    phone:{type:String,unique:true,sparse:true},
    phoneSuffix:{type:String,unique:false},
    email: {
  type: String,
  lowercase: true,
  
  validate: {
    validator: function (value) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    },
    message: props => `${props.value} is not a valid email address!`
  }
},
username:{
  type: String,

},
emailOtp:{
    type:String
    
},
Emailexpiry:{
 type:Date
},
profilePicture:{
 type:String
},
about:{
    type:String
},
lastSeen:{
    type:Date
},
isOnline:{
 type:Boolean,
 default:false
},
isVerified:{
    type:Boolean,
    default:false
},
agreed:{
 type:Boolean,
 default:false
},
},{
    timestamps:true
}
)
const User=mongoose.model("User",userSchema);
module.exports=User