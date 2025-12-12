const mongoose=require('mongoose');

const URL=process.env.URL
console.log(URL);
const dbConnect=async () => {
    try{
       await mongoose.connect(URL,{
        useNewUrlParser:true,
        useUnifiedTopology:true
       });
    }
    catch(error){
      console.log("there is a error",error.message)
      process.exit(1);
    }
    finally{

    }
}
module.exports=dbConnect;