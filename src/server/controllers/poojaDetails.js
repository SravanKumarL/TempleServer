const { getCurrentDate } = require('../constants/constants');
const Pooja = require('../models/poojaDetails');

exports.addPooja = function (req, res, next) {
  // Extract the required data
  const poojaName = req.body.poojaName;
  const amount = req.body.amount;

  //Validate different cases
  if (!poojaName || !amount) {
    return res.status(422).send({ error: 'You must provide Pooja Name and Amount' });
  }
  // Create new model instance
  const pooja = new Pooja({
    poojaName: poojaName,
    amount: amount,
    createdDate: getCurrentDate()
  });

  //save it to the db
  pooja.save(function (err) {
    if (err) { return next(err); }
    //Respond to request indicating the pooja was created
    res.json({ message: 'Pooja was added successfully' });
  });
}
exports.getPoojas = function (req, res, next) {
  Pooja.find().exec((err, poojaDetails) => {
    if (err) {
      res.status(500).send(err);
    }
    res.json({ poojaDetails });
  });
}