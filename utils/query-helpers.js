const moment = require("moment");
const { getCreatedByCondition } = require("./permission-helpers");

exports.getMongooseFindOptions = (req, option = { fulltextsearch: true }) => {
  const { search, fromdate, todate, sort, page, perpage } = req.query;

  const query = { status: 1 };

  if ("fulltextsearch" in option && option.fulltextsearch && search) {
    query["$text"] = {
      $search: search,
    };
  }

  if (fromdate && !todate) {
    query["createdAt"] = {
      $gte: moment(fromdate).toDate(),
    };
  } else if (fromdate && todate) {
    query["createdAt"] = {
      $gte: moment(fromdate).toDate(),
      $lt: moment(todate).add(1, "days").toDate(),
    };
  } else if (todate && !fromdate) {
    query["createdAt"] = {
      $lt: moment(todate).add(1, "days").toDate(),
    };
  }

  if (!req.role.superadmin) {
    query["createdby"] = getCreatedByCondition(req);
  }

  const sortArg = {};
  if (sort) {
    for (const item of sort.split(",")) {
      const [key, value] = item.split(":");
      sortArg[key] = value;
    }
  }

  return {
    query,
    sortArg,
    offset: (parseInt(page) - 1) * parseInt(perpage),
    page: parseInt(page),
    perpage: parseInt(perpage),
  };
};
