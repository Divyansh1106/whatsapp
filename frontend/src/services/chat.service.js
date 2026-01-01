import UseUserStore from "../store/useUserStore";
import {io} from "socket.io-client"
let socket=null
export const initializeSocket = ()=>{
    if(socket) return socket;
    const user=UseUserStore().user;
    const BACKEND_URL=process.env.REACT_APP_API_URL||"http://localhost:8000"
    socket = io(BACKEND_URL,{
        withCredentials:true,
        transports: ["websocket", "polling" ],
        reconnectionAttempts:5,
        reconnectionDelay:1000,
    })
    socket.on("connect",()=>{
        console.log("socket connected",socket.id)
        socket.emit("user_connected",user._id)
    })
    socket.on("connect_error",(error)=>{
        console.log("socket connection error",error)
    })
    socket.on("disconnect",(reason)=>{
        console.log("socket disconnect",reason)
    })
    return socket;


}
export const getSocket=()=>{
   if(!socket)return initializeSocket();
   return socket;

}
export const disconnectSocket=()=>{
    if(socket){
        socket.disconnect();
        socket=null;
    }
}