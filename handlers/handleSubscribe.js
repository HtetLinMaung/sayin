const jwt = require("jsonwebtoken");
const ActiveUser = require("../models/ActiveUser");

module.exports = (socket) => {
  const timeoutId = setTimeout(() => {
    socket.disconnect();
  }, 30 * 1000);

  socket.on("subscribe", async (token) => {
    console.log("subscribe event triggered.");
    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      console.log(err);
      return socket.emit("error", {
        code: 500,
        message: err.message,
      });
    }
    if (!decodedToken) {
      return socket.emit("error", {
        code: 401,
        message: "Not authenticated!",
      });
    }
    clearTimeout(timeoutId);

    socket.join(decodedToken.id);
    let activeUser = await ActiveUser.findOneAndUpdate(
      { user: decodedToken.id },
      { socketid: socket.id }
    );
    if (!activeUser) {
      activeUser = new ActiveUser({
        user: decodedToken.id,
        socketid: socket.id,
      });
      await activeUser.save();
    }
  });
};
