import React, { useEffect, useState } from "react";
import Layout from "./Layout";
import { motion } from "framer-motion";
import ChatList from "../pages/pages/chatSection/chatList";
import useLayoutStore from "../store/layoutStore";
import { getAllUsers } from "../services/user.service";

const HomePage = () => {
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  console.log("allUsers")

  const fetchAllUsers = async () => {
    try {
      setLoading(true);
      const result = await getAllUsers();
      console.log(result);
      // adjust following checks depending on your service response shape
      // If getAllUsers returns { status: 'success', data: [...] }:
      if (result?.status === "success" && Array.isArray(result.data)) {
        setAllUsers(result.data);
      }
      // If getAllUsers returns an axios response: { data: { status, data } }
      else if (result?.data?.status === "success" && Array.isArray(result.data.data)) {
        setAllUsers(result.data.data);
      } else {
        // fallback — if it's already an array
        if (Array.isArray(result)) setAllUsers(result);
      }
    } catch (e) {
      console.error("Failed to fetch users", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllUsers();
  }, []); // run once on mount

  // helpful debug: only log when value changes
  useEffect(() => {
    console.log("allUsers:", allUsers);
  }, [allUsers]);

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="h-full"
      >
        {loading ? (
          <div className="p-4">Loading users...</div>
        ) : (
          
          <ChatList contacts={allUsers} />
        )}
      </motion.div>
    </Layout>
  );
};

export default HomePage;
