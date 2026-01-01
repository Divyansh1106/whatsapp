import React, { useEffect, useState } from "react";
import { Outlet, useLocation, Navigate } from "react-router-dom";
import useUserStore from "./store/useUserStore";
import { checkAuthUsers } from "./services/user.service";
import Loader from "./utils/loader";

// PROTECTED ROUTE
export const ProtectedRoute = () => {
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const { isAuthenticated, setUser, clearUser } = useUserStore();

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const result = await checkAuthUsers();
        if (result?.isAuthenticated) {
          setUser(result.user);
        } else {
          clearUser();
        }
      } catch (e) {
        console.log(e);
        clearUser();
      } finally {
        setIsChecking(false);
      }
    };

    verifyAuth();
  }, [setUser, clearUser]);

  if (isChecking) {
    return <Loader />;
  }

  if (!isAuthenticated) 
    return <Navigate to="/userLogin" state={{ from: location }} replace />;
  

  return <Outlet />;
};

// PUBLIC ROUTE
function PublicRoute() {
  const isAuthenticated = useUserStore((state) => {return state.isAuthenticated});

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // If not authenticated, render nested routes like /userLogin
  return <Outlet />;
}

export default PublicRoute;


