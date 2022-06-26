const {
  isModuleAccessable,
  getAccessibleUsers,
  getUsersForBroadcast,
} = require("./permission-helpers");
const { getMongooseFindOptions } = require("./query-helpers");
const socketio = require("../socket");

exports.getAllHandler = (Model, option) => async (req, res) => {
  try {
    if (!req.role.superadmin) {
      const accessable = await isModuleAccessable(option.moduleName, "r", req);
      if (!accessable) {
        return res.status(403).json({
          code: 403,
          message: "You are not authorized to perform this action",
        });
      }
    }

    const { query, sortArg, offset, page, perpage } =
      getMongooseFindOptions(req);

    let data = [];
    let cursor = Model.find(query).sort(sortArg);

    let total = 0;
    let pagecount = 0;
    if (page && perpage) {
      cursor = cursor.skip(offset).limit(perpage);
      total = await Model.find(query).countDocuments();
      pagecount = Math.ceil(total / perpage);
    }
    if ("populate" in option) {
      cursor = cursor.populate(option.populate);
    }
    data = await cursor.exec();

    res.json({
      code: 200,
      message: option.message,
      data,
      total,
      page,
      perpage,
      pagecount,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      code: 500,
      message: err.message,
    });
  }
};

exports.createHandler = (Model, option) => async (req, res) => {
  try {
    const io = socketio.getIO();
    if (!req.role.superadmin) {
      const accessable = await isModuleAccessable(option.moduleName, "c", req);
      if (!accessable) {
        return res.status(403).json({
          code: 403,
          message: "You are not authorized to perform this action",
        });
      }
    }

    const defaultData = "defaultData" in option ? option.defaultData : {};
    const data = new Model({
      ...req.body,
      ...defaultData,
      createdby: req.tokenData.id,
    });
    await data.save();

    res.status(201).json({
      code: 201,
      message: option.message,
      data,
    });
    const rooms = await getUsersForBroadcast(
      req.tokenData.id,
      "r",
      req.tokenData.id
    );
    if (rooms.length) {
      io.to(rooms).emit(`${option.moduleName}:create`, data);
    }
  } catch (err) {
    console.log(err);
    res.code(500).json({
      code: 500,
      message: err.message,
    });
  }
};

exports.getByIdMiddleware = (Model, option) => async (req, res, next) => {
  try {
    if (!req.role.superadmin) {
      const accessable = await isModuleAccessable(option.moduleName, "r", req);
      if (!accessable) {
        return res.status(403).json({
          code: 403,
          message: "You are not authorized to perform this action",
        });
      }
    }

    const data = await Model.findOne({
      _id: req.params.id,
      status: 1,
    });
    if (!data) {
      return res.status(404).json({
        code: 404,
        message: option.message || "Data not found",
      });
    }

    if (
      !req.role.superadmin &&
      !getAccessibleUsers("r", req).includes(data.createdby)
    ) {
      return res.status(403).json({
        code: 403,
        message: "You are not authorized to perform this action",
      });
    }
    req.data = data;
    next();
  } catch (err) {
    console.log(err);
    res.status(500).json({
      code: 500,
      message: err.message,
    });
  }
};

exports.updateHandler = (option) => async (req, res) => {
  try {
    const io = socketio.getIO();
    const data = req.data;
    if (!req.role.superadmin) {
      const accessable = await isModuleAccessable(option.moduleName, "u", req);
      if (
        !accessable ||
        !getAccessibleUsers("u", req).includes(data.createdby)
      ) {
        return res.status(403).json({
          code: 403,
          message: "You are not authorized to perform this action",
        });
      }
    }

    let except = "except" in option ? option.except : [];
    except = [
      ...except,
      "_id",
      "createdby",
      "createdAt",
      "updatedAt",
      "status",
    ];
    for (const [key, value] of Object.entries(req.body)) {
      if (!except.includes(key)) {
        data[key] = value;
      }
    }
    await data.save();

    res.json({
      code: 200,
      message: option.message,
      data,
    });
    const rooms = await getUsersForBroadcast(
      data.createdby,
      "r",
      req.tokenData.id
    );
    if (rooms.length) {
      io.to(rooms).emit(`${option.moduleName}:update`, data);
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({
      code: 500,
      message: err.message,
    });
  }
};

exports.deleteHandler = (option) => async (req, res) => {
  try {
    const io = socketio.getIO();
    const data = req.data;
    if (!req.role.superadmin) {
      const accessable = await isModuleAccessable(option.moduleName, "d", req);
      if (
        !accessable ||
        !getAccessibleUsers("d", req).includes(data.createdby)
      ) {
        return res.status(403).json({
          code: 403,
          message: "You are not authorized to perform this action",
        });
      }
    }

    data.status = 0;
    await data.save();

    res.json({
      code: 200,
      message: option.message,
      data,
    });
    const rooms = await getUsersForBroadcast(
      data.createdby,
      "r",
      req.tokenData.id
    );
    if (rooms.length) {
      io.to(rooms).emit(`${option.moduleName}:delete`, data);
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({
      code: 500,
      message: err.message,
    });
  }
};
