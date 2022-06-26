require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const init = require("./init");
const socketio = require("./socket");
const incomingLog = require("./middlewares/incoming-log");
const handleSubscribe = require("./handlers/handleSubscribe");
const handleDisconnect = require("./handlers/handleDisconnect");
const handleTokenRefresh = require("./handlers/handleTokenRefresh");

console["error"] = function () {};

const PORT = process.env.PORT || 4040;

const app = express();

app.use(cors());
app.use(express.json({ limit: "100mb" }));

app.use("/sayin", express.static("public"));

app.use(incomingLog);
app.use("/sayin/auth", require("./routes/auth-route"));
app.use("/sayin/products", require("./routes/product-route"));
app.use("/sayin/invoices", require("./routes/invoice-route"));
app.use("/sayin/sales", require("./routes/sale-route"));
app.use("/sayin/categories", require("./routes/category-route"));
app.use("/sayin/roles", require("./routes/role-route"));
app.use("/sayin/users", require("./routes/user-route"));

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    const server = app.listen(PORT, () =>
      console.log(`Listening on port ${PORT}`)
    );
    init();
    const io = socketio.init(server, {
      cors: {
        origin: "*",
      },
    });

    io.on("connection", (socket) => {
      handleSubscribe(socket);
      handleDisconnect(socket);
    });

    handleTokenRefresh(io);

    io.engine.on("connection_error", (err) => {
      console.log(err.req); // the request object
      console.log(err.code); // the error code, for example 1
      console.log(err.message); // the error message, for example "Session ID unknown"
      console.log(err.context); // some additional error context
    });
  })
  .catch(console.log);
