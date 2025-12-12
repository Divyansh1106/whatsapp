const response=(res,statusCode,message,data=null)=>{
  if(!res){
      console.log("response object is null");
      return;
  }
  const responseObject={
    status:statusCode<400?"success":"fail",
    
    message,
    data,

      }
      return res.status(statusCode).json(responseObject)
}
module.exports=response;






