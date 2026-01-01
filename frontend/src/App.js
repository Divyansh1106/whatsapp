import React from "react";
import { useEffect} from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";
import Login from "./pages/pages/userLogin/Login";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PublicRoute, { ProtectedRoute } from "./protectedRoutes";
import Home from "./components/homePage";
import UserDetails from "./components/userDetails";
import SettingWindow from "./pages/pages/settingSection/settingWindow";
import Status from "./pages/pages/statusSection/status";
import useUserStore from "./store/useUserStore";
import { useChatStore } from "./store/chatStore";
import { checkAuthUsers } from './services/user.service'
function App() {
    const { setUser, clearUser, user } = useUserStore();
//key takeaways:-
//1.sabse pehle humne checkAuthenticate function bnaya yeh checkAuthenticate function mera object return karta hain is object main do properties hoti hain user or isAuthenticated jisme user hume axios response se milta hain aur agar status succes hota hain toh isAuthenticated ko true krdete hain warna false kr dete hain yeh dono object hum fir return krdenge
//2.fir humne App.js main useEffect hook use kiya jisme hum checkAuthenticate function ko call karte hain aur agar user authenticated hota hain toh hum us user ko setUser function ke through global state main set kar dete hain aur agar user authenticated nahi hota hain toh hum clearUser function ke through global state main se user ko hata dete hain
//3.iss tarah se humara app load hone par hi yeh check ho jata hain ki user authenticated hain ya nahi aur uske hisab se humara app behave karta hain
  useEffect(() => {
    const loadUser = async () => {
      try {
        console.log('=== CHECKING AUTH ON LOAD ===');
        const response = await checkAuthUsers();
        console.log('Auth response:', response);

        if (response.isAuthenticated && response.user) {
          console.log('User authenticated:', response.user);
          setUser(response.user);
        } else {
          console.log('User not authenticated');
          clearUser();
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        clearUser();
      }
    };

    // Only check if user is not already loaded
    if (!user) {
      loadUser();
    }
  }, []);

  
  console.log("user:",user);
  const { setCurrentUser, cleanup, fetchConversation, fetchMessages } = useChatStore();
  
  useEffect(()=>{
    if(user?._id){
      setCurrentUser(user);
      // Load conversations for the user and open first conversation if none selected
      fetchConversation()
        .then(() => {
          try {
            const state = useChatStore.getState ? useChatStore.getState() : null;
            const convs = state?.conversations?.data || [];
            const currentConv = state?.currentConversation;
            if (!currentConv && convs.length > 0) {
              const firstId = convs[0]._id;
              if (firstId) fetchMessages(firstId).catch(() => {});
            }
          } catch (e) {
            /* ignore */
          }
        })
        .catch(() => {});
    }else{
      cleanup();
    }
    return ()=>{
      cleanup();
    }
  },[user,setCurrentUser,cleanup])
  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <Router>
        <Routes>
          {/* Public (unauthenticated) routes */}
          <Route element={<PublicRoute />}>
            <Route path="/userLogin" element={<Login />} />
          </Route>

          {/* Protected (authenticated) routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Home />} />
            <Route path="/user-profile" element={<UserDetails />} />
            <Route path="/status" element={<Status />} />
            <Route path="/setting" element={<SettingWindow />} />
          </Route>
        </Routes>
      </Router>
    </>
  );
}

export default App;

