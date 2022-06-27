const jwt = require("jsonwebtoken");
const ActiveUser = require("../models/ActiveUser");

module.exports = (io) => {
  setInterval(() => {
    ActiveUser.find()
      .populate({ path: "user", select: "name" })
      .then((activeUsers) => {
        for (const { user } of activeUsers) {
          const token = jwt.sign(
            {
              id: user._id,
            },
            process.env.JWT_SECRET,
            {
              expiresIn: "1d",
            }
          );
          console.log(`${user.name} has a new token: ${token}`);
          io.to(user._id.toString()).emit("token:refresh", token);
        }
      });
  }, 5 * 60 * 1000);
};
