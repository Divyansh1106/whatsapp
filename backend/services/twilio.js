const twilio = require('twilio');
require('dotenv').config();

const SSID = process.env.SSID;
const AuthToken = process.env.AuthToken;
const AccountSID = process.env.AccountSID;

// Validate credentials on startup
if (!SSID || !AuthToken || !AccountSID) {
    console.error('❌ Missing Twilio credentials in .env file');
    console.error('SSID:', SSID ? '✅' : '❌');
    console.error('AuthToken:', AuthToken ? '✅' : '❌');
    console.error('AccountSID:', AccountSID ? '✅' : '❌');
}

const client = twilio(AccountSID, AuthToken);
console.log("client");

const sendOTPtoPhoneNumber = async (phoneNumber) => {
    try {
        console.log("📤 Sending OTP to:", phoneNumber);
        console.log("Using SSID:", SSID);
        
        if (!phoneNumber) throw new Error("Phone number is required");
        
        const response = await client.verify.v2
            .services(SSID)
            .verifications
            .create({
                to: phoneNumber,
                channel: 'sms'
            });
        
        console.log("✅ Twilio response status:", response.status);
        return response;
        
    } catch (error) {
        console.error('❌ Twilio sendOTP error:');
        console.error('Message:', error.message);
        console.error('Code:', error.code);
        console.error('Status:', error.status);
        console.error('More info:', error.moreInfo);
        
        // Throw with more details
        throw new Error(`Twilio error: ${error.message}`);
    }
};

const verification = async (phoneNumber, otp) => {
    try {
        console.log("🔍 Verifying OTP for:", phoneNumber);
        
        const response = await client.verify.v2
            .services(SSID)
            .verificationChecks
            .create({
                to: phoneNumber,
                code: otp
            });
        
        console.log("✅ Verification status:", response.status);
        return response;
        
    } catch (error) {
        console.error('❌ Twilio verification error:');
        console.error('Message:', error.message);
        console.error('Code:', error.code);
        
        throw new Error(`Twilio verification error: ${error.message}`);
    }
};

module.exports = {
    sendOTPtoPhoneNumber,
    verification
};
