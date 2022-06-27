const jwt = require("jsonwebtoken");
const User = require("../models/User");

const isAuth = async (req, res, next) => {
  const authHeader = req.get("Authorization");
  if (!authHeader) {
    return res.status(419).json({
      code: 419,
      message: "No auth header",
    });
  }
  const token = authHeader.split(" ")[1];

  let decodedToken;
  try {
    decodedToken = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      code: 500,
      message: err.message,
    });
  }
  if (!decodedToken) {
    return res.status(401).json({
      code: 401,
      message: "Not authenticated!",
    });
  }

  const user = await User.findOne(
    {
      status: 1,
      _id: decodedToken.id,
    },
    { role: 1 }
  ).populate("role");
  req.role = user.role;
  req.tokenData = decodedToken;
  console.log(decodedToken);
  next();
};

module.exports = isAuth;
