const bcrypt = require("bcryptjs");
const fs = require("fs");
const ActiveUser = require("./models/ActiveUser");
// const Category = require("./models/Category");
const Module = require("./models/Module");
// const Product = require("./models/Product");
const Role = require("./models/Role");
const Sequence = require("./models/Sequence");
const TableHeader = require("./models/TableHeader");

const User = require("./models/User");
const { log } = require("./utils/logger");

const headers = [
  {
    key: "name",
    title: "Name",
  },
  {
    key: "total",
    title: "Stocks",
  },
  {
    key: "createdAt",
    title: "Time",
  },
  {
    key: "creatername",
    title: "Created By",
  },
  {
    key: "invoiceid",
    title: "Invoice ID",
  },
  {
    key: "discount",
    title: "Discount",
  },
  {
    key: "tax",
    title: "Tax",
  },
  {
    key: "subtotal",
    title: "Total",
  },
  {
    key: "total",
    title: "Nett",
  },
  {
    key: "paymentmethod",
    title: "Payment Method",
  },
  {
    key: "code",
    title: "Code",
  },
  {
    key: "price",
    title: "Price",
  },
  {
    key: "discountpercent",
    title: "Discount Percentage",
  },
  {
    key: "instock",
    title: "In Stock",
  },
  {
    key: "reorderlevel",
    title: "Reorder Level",
  },
  {
    key: "productcode",
    title: "Stock Code",
  },
  {
    key: "productname",
    title: "Stock Name",
  },
  {
    key: "qty",
    title: "Qty",
  },
  {
    key: "amount",
    title: "Subtotal",
  },
];

const init = async () => {
  log("Checking public folder exists...");
  if (!fs.existsSync("public")) {
    fs.mkdirSync("public");
    log("public folder created");
  }
  log("public folder already exists");

  log("Checking excels folder exists...");
  if (!fs.existsSync("excels")) {
    fs.mkdirSync("excels");
    log("excels folder created");
  }
  log("excels folder already exists");

  for (const header of headers) {
    log('Checking table header "' + header.key + '" exists...');
    let tableHeader = await TableHeader.findOne({
      ...header,
      status: 1,
    });
    if (!tableHeader) {
      log('Table header "' + header.key + '" does not exist');
      tableHeader = new TableHeader({
        ...header,
      });
      await tableHeader.save();
      log('Table header "' + header.key + '" created');
    }
    log('Table header "' + header.key + '" already exists');
  }

  const list = [
    {
      modulename: "Category",
      headerkeys: [
        {
          key: "name",
          title: "Name",
        },
        {
          key: "total",
          title: "Stocks",
        },
        {
          key: "createdAt",
          title: "Time",
        },
        {
          key: "creatername",
          title: "Created By",
        },
      ],
    },
    {
      modulename: "Invoice",
      headerkeys: [
        {
          key: "invoiceid",
          title: "Invoice ID",
        },
        {
          key: "discount",
          title: "Discount",
        },
        {
          key: "tax",
          title: "Tax",
        },
        {
          key: "subtotal",
          title: "Total",
        },
        {
          key: "total",
          title: "Nett",
        },
        {
          key: "paymentmethod",
          title: "Payment Method",
        },
        {
          key: "createdAt",
          title: "Time",
        },
        {
          key: "creatername",
          title: "Created By",
        },
      ],
    },
    {
      modulename: "Product",
      headerkeys: [
        {
          key: "code",
          title: "Code",
        },
        {
          key: "name",
          title: "Name",
        },
        {
          key: "price",
          title: "Price",
        },
        {
          key: "discountpercent",
          title: "Discount Percentage",
        },
        {
          key: "instock",
          title: "In Stock",
        },
        {
          key: "reorderlevel",
          title: "Reorder Level",
        },
        {
          key: "createdAt",
          title: "Time",
        },
        {
          key: "creatername",
          title: "Created By",
        },
      ],
    },
    {
      modulename: "Role",
      headerkeys: [
        {
          key: "createdAt",
          title: "Time",
        },
        {
          key: "creatername",
          title: "Created By",
        },
      ],
    },
    {
      modulename: "Sale",
      headerkeys: [
        {
          key: "productcode",
          title: "Stock Code",
        },
        {
          key: "productname",
          title: "Stock Name",
        },
        {
          key: "qty",
          title: "Qty",
        },
        {
          key: "price",
          title: "Price",
        },
        {
          key: "amount",
          title: "Subtotal",
        },
        {
          key: "invoiceid",
          title: "Invoice ID",
        },
        {
          key: "createdAt",
          title: "Time",
        },
        {
          key: "creatername",
          title: "Created By",
        },
      ],
    },
    {
      modulename: "User",
      headerkeys: [
        {
          key: "createdAt",
          title: "Time",
        },
        {
          key: "creatername",
          title: "Created By",
        },
      ],
    },
  ];

  const modules = [];
  for (const m of list) {
    log('Checking module "' + m.modulename + '" exists...');
    let module = await Module.findOne({
      name: m.modulename,
      status: 1,
    });
    if (!module) {
      log('Module "' + m.modulename + '" does not exist');
      module = new Module({
        name: m.modulename,
      });
    }
    log('Module "' + m.modulename + '" already exists');
    module.tableheaders = [];
    for (const key of m.headerkeys) {
      log('Checking table header "' + key.key + '" exists...');
      const tableHeader = await TableHeader.findOne(
        { ...key, status: 1 },
        { _id: 1 }
      );
      if (tableHeader) {
        log('Table header "' + key.key + '" already exists');
        module.tableheaders.push(tableHeader._id);
      }
    }
    await module.save();
    log('Module "' + m.modulename + '" updated');
    modules.push(module);
  }

  log("Checking role 'Super Admin' exists...");
  let role = await Role.findOne({
    name: "Super Admin",
    status: 1,
    superadmin: true,
  });
  if (!role) {
    log("Role 'Super Admin' does not exist");
    role = new Role({
      name: "Super Admin",
      superadmin: true,
      objectpermissions: [],
      modulepermissions: [],
    });
  } else {
    log("Role 'Super Admin' already exists");
  }

  role.modulepermissions = modules.map((m) => ({
    module: m._id,
    tableheaders: [...m.tableheaders],
  }));

  await role.save();
  log("Role 'Super Admin' updated");

  log("Checking user 'admin@gmail.com' exists...");
  let user = await User.findOne({
    userid: "admin@gmail.com",
    status: 1,
  });

  if (!user) {
    log("User 'admin@gmail.com' does not exists");
    user = new User({
      name: "Htet Lin Maung",
      userid: "admin@gmail.com",
      password: bcrypt.hashSync("User@123", 12),
      role: role._id,
    });
  } else {
    log("User 'admin@gmail.com' already existed");
  }
  user.name = "Htet Lin Maung";
  user.userid = "admin@gmail.com";
  user.password = bcrypt.hashSync("User@123", 12);
  user.role = role._id;
  await user.save();
  log("User 'admin@gmail.com' updated");

  // const categories = await Category.find({ status: 1 });
  // for (const category of categories) {
  //   const productIds = [];
  //   for (const productId of category.products) {
  //     const product = await Product.findById(productId);
  //     if (product && product.status) {
  //       productIds.push(productId);
  //     }
  //   }
  //   category.products = productIds;
  //   await category.save();
  // }

  log("Clearing active users...");
  await ActiveUser.deleteMany();

  log("Checking sequence 'invoiceid' exists...");
  let sequence = await Sequence.findOne({
    key: "invoiceid",
  });
  if (!sequence) {
    log("Sequence 'invoiceid' does not exist");
    sequence = new Sequence({
      key: "invoiceid",
      minlength: 9,
    });
    await sequence.save();
  }
  log("Sequence 'invoiceid' already exists");
};

module.exports = init;
