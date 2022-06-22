const Sequence = require("../models/Sequence");

const prefixChar = (str, c, length) => {
  let newstr = str;
  while (newstr.length < length) {
    newstr = c + newc;
  }
  return newstr;
};

module.exports = async (key) => {
  let sequence = await Sequence.findOne({ key });
  sequence = await Sequence.findOneAndUpdate(
    { key },
    { $inc: { n: sequence.step } }
  );
  return sequence.format.replace(
    "{n}",
    prefixChar(sequence.n, sequence.prefixchar, sequence.minlength)
  );
};
