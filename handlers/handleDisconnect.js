const ActiveUser = require("../models/ActiveUser");

module.exports = (socket) => {
  socket.on("disconnect", async (reason) => {
    console.log(reason);
    const activeUser = await ActiveUser.findOne({
      socketid: socket.id,
    });
    if (activeUser) {
      await activeUser.remove();
    }
  });
};
