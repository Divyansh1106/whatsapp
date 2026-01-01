import React, { useState } from 'react'
import useUserStore from "../../../store/useUserStore"
import useLoginStore from "../../../store/useLogin"
import countries from "../../../utils/contries"
import * as yup from 'yup'
import { useForm } from "react-hook-form"
import { yupResolver } from '@hookform/resolvers/yup'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import useThemeStore from '../../../store/themeStore'
import { FaChevronDown, FaWhatsapp,FaUser, FaArrowLeft, FaPlusCircle } from 'react-icons/fa'
import {sendOtp,verifyOtp,checkAuthUsers,updateUserOtp} from '../../../services/user.service'
import Spinner from '../../../utils/spinner'

import { toast } from 'react-toastify'



//validation Schema
const avatars = [
  'https://api.dicebear.com/6.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/6.x/avataaars/svg?seed=Aneka',
  'https://api.dicebear.com/6.x/avataaars/svg?seed=Mimi',
  'https://api.dicebear.com/6.x/avataaars/svg?seed=Jasper',
  'https://api.dicebear.com/6.x/avataaars/svg?seed=Luna',
  'https://api.dicebear.com/6.x/avataaars/svg?seed=Zoe',
]

const profileValidationSchema = yup.object().shape({
  username: yup.string().required("username is required"),
  agreed: yup.bool().oneOf([true], "You must agree to the terms"),
})

const loginValidationSchema = yup.object().shape({
  phoneNumber: yup
    .string()
    .nullable()
    .notRequired()
    .matches(/^\d+$/, "Phone number must be digits only")
    .transform((value, originalValue) => {
      return originalValue?.trim() === "" ? null : originalValue;
    }),
  email: yup
    .string()
    .email("Enter a valid email address")
    .nullable()
    .notRequired()
    .transform((value, originalValue) => {
      return originalValue?.trim() === "" ? null : originalValue;
    }),
});
  

const otpValidationSchema = yup.object().shape({
  otp: yup.string().length(6, "otp must be exactly 6 digits").required("otp is required")
})

const Login = () => {
  const { step, setStep, setUserPhoneData, userPhoneData, resetLoginState } = useLoginStore();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(countries[0])
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [email, setEmail] = useState("")
  const [profilePicture, setProfilePicture] = useState(null)
  const [selectedAvatar, setSelectedAvatar] = useState(avatars[0])
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [error, setError] = useState("")
  const [showDropDown, setShowDropDown] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { setUser } = useUserStore()
  const { theme } = useThemeStore()

  const {
    register:loginRegister,
    handleSubmit: handleLoginSubmit,
    formState: { errors: LoginErrors },
  } = useForm({
    resolver: yupResolver(loginValidationSchema)
  })

  const {
    handleSubmit: handleOtpSubmit,
    formState: { errors: otpErrors },
    setValue: setOtpValue
  } = useForm({
    resolver: yupResolver(otpValidationSchema)
  })

  const {
    register:profileRegister,
    handleSubmit: handleProfileSubmit,
    formState: { errors: ProfileErrors },
  } = useForm({
    resolver: yupResolver(profileValidationSchema)
  })
  

  

  // Fixed: filter -> filter, added return statement
  const filterCountry = countries.filter((country) =>
    country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.dialCode.includes(searchTerm.toLowerCase())
  )

  const ProgressBar = () => (
    <div className={`w-full ${theme === 'dark' ? "bg-gray-700" : "bg-gray-200"} rounded-full h-2.5 mb-6`}>
      <div
        className="bg-green-500 h-2.5 rounded-full transition-all duration-500 ease-in-out"
        style={{ width: `${(step / 3) * 100}%` }}
      >
      </div>
    </div>
  )
  const onLoginSubmit = async()=>{
    try{
      setLoading(true);
      if(email){
        const response=await sendOtp(null,null,email);
        console.log(response);
        if(response.status==="success"){
          console.log("success")
            toast.info("otp is sent to email")
            setUserPhoneData({email})
            setStep(2)        
        } 
        else{
          setError(response.message||"Failed to send Otp")
        }
      }
      else{
        const response= await sendOtp(phoneNumber,selectedCountry.dialCode,null);
        console.log(response);
         if(response.status==="success"){
            toast.info("otp is sent to phone Number")
            setUserPhoneData({phoneNumber,phoneSuffix:selectedCountry.dialCode})
            setStep(2)
        }else{
          setError(response.message||"Failed to send Otp")
        }
      }
    }
    catch(error){
       console.log(error);
       setError(error.message||"Failed to send Otp")
    } finally{
      setLoading(false);
    }
  }
  const onOtpSubmit=async()=>{
    setLoading(true);
    if(!userPhoneData){
      setLoading(false);
      throw new Error("phone or email dat is misisng");
      
      
    }
    const otpString=otp.join("");
    let response;
    if(userPhoneData?.email){
      
      response =await verifyOtp(null,null,userPhoneData.email,otpString);

    }else{
      // eslint-disable-next-line no-unused-vars
      response=await verifyOtp(userPhoneData.phoneNumber,userPhoneData.phoneSuffix,null,otpString)
    }
    if(response.status==="success"){
      setLoading(false)
      toast.success("otp verified succesfully")
      const user=response.data?.user;
      if(user?.username&& user?.profilePicture){
        setUser(user);
        toast.success("Welcome back to whatsapp")
        navigate('/');
        resetLoginState();

      }
      else{
        setLoading(false);
        setStep(3);
      }
    }
  }
  const handleChange=(e)=>{
    const file=e.target.files[0]
    if(file){
      setProfilePictureFile(file);
      setProfilePicture(URL.createObjectURL(file))
    }
  }
const onProfileSubmit = async (data) => {
  try {
    setLoading(true);

    const formData = new FormData();
    formData.append("username", data.username);
    formData.append("agreed", String(data.agreed));

    if (profilePictureFile) {
      formData.append("media", profilePictureFile);
    } else {
      formData.append("profilePicture", selectedAvatar);
    }

    console.log('=== SUBMITTING PROFILE ===');
    console.log('FormData contents:');
    for (let [key, value] of formData.entries()) {
      console.log(key, ':', value);
    }

    // Update profile
    const response = await updateUserOtp(formData);
    console.log('Update profile response:', response);

    if (response.status === "success") {
      // ✅ IMPORTANT: Fetch the updated user from the server
      const authResponse = await checkAuthUsers();
      console.log('Auth check response:', authResponse);

      if (authResponse.isAuthenticated && authResponse.user) {
        const user = authResponse.user;
        
        console.log('=== USER TO SET ===');
        console.log('User object:', user);
        console.log('User ID:', user._id);
        console.log('==================');

        // Make sure user has _id
        if (!user._id) {
          console.error('❌ User object missing _id:', user);
          setError('Invalid user data from server');
          return;
        }

        setUser(user);
        toast.success("Welcome to WhatsApp!");
        resetLoginState();
        navigate("/");
      } else {
        setError('Failed to authenticate after profile update');
      }
    } else {
      setError(response.message || "Failed to update profile");
    }
  } catch (e) {
    console.error('Profile update error:', e);
    setError(e.message || "Something went wrong while updating your profile");
  } finally {
    setLoading(false);
  }
};
  const handleOtpChange=(index,value)=>{
    const newOtp=[...otp];
    newOtp[index]=value;
    setOtp(newOtp);
    setOtpValue("otp",newOtp.join(""))
    if(value && index<5){
      document.getElementById(`otp-${index+1}`).focus();
    }
  }
  const handleBack=()=>{
     setStep(1);
     setUserPhoneData(null);
     setOtp(["","","","","","",])
     setError("")
     setLoading(false)
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? "bg-gray-900" : "bg-gradient-to-br from-green-400 to-blue-500"} flex items-center justify-center p-4 overflow-hidden`}>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`${theme === 'dark' ? "bg-gray-800 text-white" : "bg-white"} p-6 md:p-8 rounded-lg shadow-2xl w-full max-w-md relative z-10`}>

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.1, type: "spring", stiffness: 260, damping: 20 }}
          className={"w-24 h-24 bg-green-500 rounded-full mx-auto mb-6 flex items-center justify-center"}>
          <FaWhatsapp className="w-16 h-16 text-white" />
        </motion.div>

        <h1 className={`text-3xl font-bold text-center ${theme === "dark" ? "text-white" : "text-gray-800"} mb-4`}>
          WhatsApp Login
        </h1>

        <ProgressBar />

        {error && <p className='text-red-500 text-center mb-4'>
          {error}</p>}

        {step === 1 && (
          <form className='space-y-4' onSubmit={handleLoginSubmit(onLoginSubmit)}>
            <p className={`text-center ${theme === "dark" ? "text-gray-300" : "text-gray-600"} mb-4`}>
              Enter your phone number to receive an OTP
            </p>
            <div className='relative'>
              <div className='flex gap-2'>
                <div className="relative w-1/3">
                  <button
                    type='button'
                    onClick={() => setShowDropDown(!showDropDown)}
                    className={`w-full flex items-center justify-between py-2.5 px-4 text-sm font-medium ${theme === "dark" ? "text-white bg-gray-600 border-gray-600" : "text-gray-900 border-gray-300 bg-gray-100"} border rounded-lg hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-gray-200`} >
                    <span>
                      {selectedCountry.flag} {selectedCountry.dialCode}
                    </span>
                    <FaChevronDown className='ml-2' />
                  </button>
                  {showDropDown && (
                    <div className={`absolute z-10 w-full mt-1 ${theme ==='dark' ? "bg-gray-700 border-gray-600 ":"bg-white border-gray-300"} border rounded-md shadow-lg max-h-60 overflow-auto`}>
                        <div className={`sticky top-0 ${theme==='dark'?"bg-gray-700":"bg-white"}p-2`}>
                            <input type="text" placeholder='search countries...'  value={searchTerm} onChange={(e)=>{
                              setSearchTerm(e.target.value)
                            }}
                            className={`w-full px-2 py-1 border ${theme==="dark"? "bg-gray-600 text-white": "bg-white border-gray-300 "}rounded-md text-sm focus:right-2 focus:ring-green-500`}/>
                        </div>
                        {filterCountry.map((country)=>(
                            (
                                <button key={country.alpha2} type="button" className={`w-full text-left px-3 py-2 ${theme==="dark"?"hover:bg-gray-600":"hover:bg-gray-100"}focus:outline-none focus:bg-gray-100`} onClick={()=>{
                                  setSelectedCountry(country)
                                  setShowDropDown(false)
                                }}>{country.flag} ({country.dialCode}) {country.name}</button>
                            )

                        ))}
                    </div>
                    
                  )}

                  {/* Dropdown Menu */}
                  
                </div>
                <input type="text" {...loginRegister("phoneNumber")}
                value={phoneNumber}
                onChange={(e)=>setPhoneNumber(e.target.value)}
                placeholder='phone number'
                className={`w-2/3 px-4py-2 border ${theme==='dark'? "bg-gray-700 border-gray-600 text-white": "bg-white border-gray-300"} rounded-md focus:outline-none focus:right-2 focus:ring-green-500 ${LoginErrors.phoneNumber ? "border-red-500":""}`} 
                  
                >
                  </input>

                {/* Phone Input */}
               
              </div>
              {LoginErrors.phoneNumber&&(
                <p className='
                text-red-500 text-sm'>{LoginErrors.phoneNumber.message}

                </p>
              )
                    
             

              }
              
            </div>
            {/* //divider with or */}
            <div className='flex items-center my-4'>
              <div className='flex-grow h-px bg-gray-300 '/>
                <span className='mx-3 text-gray-500 text-sm font-medium'>Or</span>
                < div className='flex-grow h-px bg-gray-300'/>

              
            </div>
            <div className={`flex items-center border rounded-md px-3 py-2 ${theme==="dark"?"bg-gray-700 border-gray-600":"bg-white border-gray-300"}`}>
              <FaUser className={`mr-2 text-gray-400 ${theme === 'dark'?"text-gray-400":"text-gray-500"}`}/>
              <input type="email" {...loginRegister("email")}
                value={email}
                onChange={(e)=>setEmail(e.target.value)}
                placeholder='phone number'
                className={`w-full bg-transparent focus:outline-none  ${theme==='dark'? " text-white": "text-black"}  ${LoginErrors.email ? "border-red-500":""}`} 
                  
                >
                  </input>
                  {LoginErrors.email&&(
                <p className='
                text-red-500 text-sm'>{LoginErrors.email.message}

                </p>
              )
                    
             

              }
            </div>
            <button type='submit' className='w-full bg-green-500 text-2hite py-2 rounded-md hover:bg-green-600 transition'>

              {loading? <Spinner/>:"Send Otp"}
            </button >
            {/* Continue Button */}
            
          </form>
        )}
        {step===2 && (
          <form onSubmit={handleOtpSubmit(onOtpSubmit)} className='space-y-4'>
            <p>
              Please enter 6 digit otp send to your {userPhoneData? userPhoneData.phoneSuffix:"Email"} {""}
              {userPhoneData.phoneNumber && userPhoneData?.phoneNumber}
            </p>
            <div className='flex justify-between'>
              {otp.map((digit,index)=> (
                <input
                key={index}
                id={`otp-${index}`}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e)=>{
                  handleOtpChange(index,e.target.value)
                }}
                className={`w-12 h-12 text-center border ${theme==='dark'?"bg-gray-700 border-gray-600 text-white":"bg-white border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${otpErrors.otp? "border-red-500":""}`}

                />

              ))}
              
            </div>
            {otpErrors.otp&&(
                <p className='
                text-red-500 text-sm'>{otpErrors.otp.message}

                </p>
              )
                    
             

              }
              <button type='submit' className='w-full bg-green-500 text-white py-2 rounded-md hover:bg-green-600 transition'>

              {loading? <Spinner/>:"Verify OTP"}
            </button >
            <button
            type="button"
            onClick={handleBack}
            className={`w-full mt-2 ${theme==="dark"?"bg-gray-700 text-gray-300":"bg-gray-200 text-gray-700"}`}>
              <FaArrowLeft className='mr-2'>
                Wrong Number go back
              </FaArrowLeft>
            </button>
          </form>
        
        )}
         
         {step===3&&(
  <form onSubmit={handleProfileSubmit(onProfileSubmit)} className='space-y-4'>
    <p className={`text-center ${theme === "dark" ? "text-gray-300" : "text-gray-600"} mb-4`}>
      Complete your profile
    </p>
    
    {/* Profile Picture Section */}
    <div className='flex flex-col items-center mb-4'>
      <div className='relative w-24 h-24 mb-4'>
        <img src={profilePicture||selectedAvatar} alt="profile" className='w-full h-full rounded-full object-cover border-4 border-green-500' />
        <label htmlFor="profile-picture" className='absolute bg-green-500 bottom-0 right-0 p-2 text-white transition duration-300 rounded-full cursor-pointer hover:bg-green-600 shadow-lg'>
          <FaPlusCircle className="w-4 h-4"/>
        </label>
        <input
          type='file'
          id="profile-picture"
          accept="image/*"
          onChange={handleChange}
          className="hidden"
        />
      </div>
      
      <p className={`text-sm ${theme==='dark'?"text-gray-300":"text-gray-500"} mb-3 font-medium`}>
        Choose an avatar or upload your photo
      </p>
      
      {/* Avatar Grid */}
      <div className='flex flex-wrap justify-center gap-3 mb-4'>
        {avatars.map((avatar,index) => (
          <img 
            key={index} 
            src={avatar} 
            alt={`avatar ${index+1}`} 
            className={`w-14 h-14 rounded-full cursor-pointer transition duration-300 ease-in-out transform hover:scale-110 ${selectedAvatar===avatar?"ring-4 ring-green-500 ring-offset-2":"ring-2 ring-gray-300"}`}
            onClick={()=>{
              setSelectedAvatar(avatar)
              setProfilePicture(null)
              setProfilePictureFile(null)
            }} 
          />
        ))}
      </div>
    </div>

    {/* Username Input */}
    <div className='space-y-2'>
      <label className={`text-sm font-medium ${theme==="dark"?"text-gray-300":"text-gray-700"}`}>
        Username
      </label>
      <div className='relative'>
        <FaUser className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${theme==="dark"?"text-gray-400":"text-gray-500"}`}/>
        <input 
          {...profileRegister("username")} 
          type="text" 
          placeholder='Enter your username' 
          className={`w-full pl-10 pr-3 py-3 border ${theme==="dark"?"bg-gray-700 border-gray-600 text-white":"bg-white border-gray-300"} rounded-md focus:ring-2 focus:ring-green-500 focus:outline-none ${ProfileErrors.username ? "border-red-500":""}`} 
        />
      </div>
      {ProfileErrors.username && (
        <p className="text-red-500 text-sm mt-1"> 
          {ProfileErrors.username.message}
        </p>
      )}
    </div>

    {/* Terms Checkbox */}
    <div className='space-y-2'>
      <div className='flex items-start'>
        <input 
          type="checkbox" 
          id="terms" 
          {...profileRegister("agreed")}
          className='w-4 h-4 mt-1 text-green-500 border-gray-300 rounded focus:ring-green-500'
        />
        <label htmlFor="terms" className={`ml-3 text-sm ${theme==="dark"?"text-gray-300":"text-gray-600"}`}>
          I agree to the terms and conditions and privacy policy
        </label>
      </div>
      {ProfileErrors.agreed && (
        <p className='text-red-500 text-sm'>
          {ProfileErrors.agreed.message}
        </p>
      )}
    </div>

    {/* Submit Button */}
    <button 
      type='submit' 
      disabled={loading}
      className={`w-full bg-green-500 text-white font-bold py-3 px-4 rounded-md transition duration-300 ease-in-out transform hover:scale-105 hover:bg-green-600 flex justify-center items-center text-lg shadow-lg ${loading ? "opacity-50 cursor-not-allowed":""}`}>
      {loading ? <Spinner /> : "Complete Setup"}
    </button>
  </form>
)}

      </motion.div>
    </div>
  )
}

export default Login