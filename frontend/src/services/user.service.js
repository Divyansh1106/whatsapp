

import axiosInstance from './url.servics'
export const sendOtp=async(phone,phoneSuffix,email)=>{
    try{
        const response=await axiosInstance.post('/auth/send-otp',{phone,phoneSuffix,email})
        return response.data;

    }
    catch(error){
          throw error.response ? error.response.data:error.message
    }
}
export const verifyOtp=async(phoneNumber,phoneSuffix,email,otp)=>{
    try{
        const payload = { phone: phoneNumber, phoneSuffix, email, otp };
        const response=await axiosInstance.post('/auth/verify-otp', payload);
        return response.data;

    }
    catch(error){
          throw error.response ? error.response.data:error.message
    }
}
export const updateUserOtp=async(updateData)=>{
    try{
        const response=await axiosInstance.put('/auth/update-profile',updateData)
        return response.data;

    }
    catch(error){
          throw error.response ? error.response.data:error.message
    }
}
export const checkAuthUsers =async()=>{
    try{
        const response=await axiosInstance.get('/auth/checkAuthenticated')
            if(response.data.status==='success'){
                return {isAuthenticated:true,user:response?.data?.data}
            
        }else if(response.data.status==='error'){
            return{isAuthenticated:false}
        }
        return response.data;

    }
    catch(error){
          throw error.response ? error.response.data:error.message
    }
}
export const logoutUsers=async(updateData)=>{
    try{
        const response=await axiosInstance.post('/auth/logout',updateData)
        return response.data;

    }
    catch(error){
          throw error.response ? error.response.data:error.message
    }
}
export const getAllUsers=async(updateData)=>{
    try{
        const response=await axiosInstance.get('/auth/users',updateData)
        return response.data;

    }
    catch(error){
          throw error.response ? error.response.data:error.message
    }
}
