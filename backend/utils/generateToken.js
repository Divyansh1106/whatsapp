// utils/generateToken.js
const jwt = require('jsonwebtoken');

function generateToken(payload) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not set in environment');
  }

  // Debugging helper — remove or comment out once fixed
  // console.log('generateToken payload type:', typeof payload, Array.isArray(payload));
  // console.log('payload value:', payload);

  // If a Mongoose document, convert to plain object or extract id/email
  if (payload && typeof payload.toObject === 'function') {
    // prefer a minimal safe payload (id + email)
    const obj = payload.toObject();
    payload = { id: obj._id?.toString(), email: obj.email ,phone:obj.phone};
  }
 ///humne yeh check kiya ki payLoad jo hain woh mongoose document hain ya nhi agr hain toh usko plain object me convert kr diya aur usme se sirf id aur email nikal ke ek naya object bnaya
  // If a primitive (string/number) or array, wrap it into an object
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    payload = { data: payload };
  }

  // Ensure payload is now a plain object
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw new Error('generateToken: payload could not be normalized to an object');
  }

  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
}


module.exports = generateToken;
