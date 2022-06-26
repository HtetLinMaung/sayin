require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const init = require("./init");

const PORT = process.env.PORT || 4040;

const app = express();

app.use(cors());
app.use(express.json({ limit: "100mb" }));

app.use("/sayin", express.static("public"));

app.use("/sayin/auth", require("./routes/auth-route"));
app.use("/sayin/products", require("./routes/product-route"));
app.use("/sayin/invoices", require("./routes/invoice-route"));
app.use("/sayin/sales", require("./routes/sale-route"));
app.use("/sayin/categories", require("./routes/category-route"));
app.use("/sayin/roles", require("./routes/role-route"));

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
    init();
  })
  .catch(console.log);
