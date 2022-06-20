const jwt = require("jsonwebtoken");

const isAuth = (req, res, next) => {
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

  req.tokenData = decodedToken;
  next();
};

module.exports = isAuth;
