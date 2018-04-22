const { Constants, parseDate } = require('../constants/constants');
const { reportMapping } = require('../constants/constants');
const Transaction = require('../models/transactions');
exports.addTransaction = function (req, res, next) {
  // Extract the required data
  const {
    id,
    bankName,
    chequeNo,
    // createdDate,
    phoneNumber,
    names,
    gothram,
    nakshatram,
    pooja,
    numberOfDays,
    amount,
    createdBy,
    others,
  } = req.body;
  const createdDate = new Date().toDateString();
  let { selectedDates } = req.body;
  if (selectedDates && typeof selectedDates === "string")
    selectedDates = JSON.parse(selectedDates);
  if (selectedDates.length)
    selectedDates.forEach(x => parseDate(x));
  else
    selectedDates = parseDate(selectedDates);
  //Validate different cases
  if (!names || !pooja || !phoneNumber) {
    return res.status(422).send({ error: 'You must provide phone number names and pooja' });
  }
  // Create new model instance
  const transaction = new Transaction({
    id,
    phoneNumber,
    names,
    gothram,
    nakshatram,
    selectedDates,
    numberOfDays,
    pooja,
    amount,
    bankName,
    chequeNo,
    createdBy,
    createdDate,
    others,
  });

  //save it to the db
  transaction.save(function (err) {
    if (err) { return next(err); }
    //Respond to request indicating the transaction was created
    res.json({ message: 'Transaction was saved successfully' });
  });
}

exports.getTransactions = function (req, res, next) {
  Transaction.find().exec((err, transactions) => {
    if (err) {
      res.status(500).send(err);
    }
    res.json({ transactions });
  });
}

exports.searchTransactions = function (req, res, next) {
  const searchValue = req.body.searchValue;
  if (searchValue.length === 0) {
    return res.json({ transactions: [] });
  }
  // if (isNaN(Number(searchValue))) {
  //   const regex = new RegExp(".*" + searchValue.toLowerCase() + ".*", 'i');
  //   searchObject = { names: { $regex: regex } };
  // }
  const numericalSearchVal = Number(searchValue);
  if (isNaN(numericalSearchVal)) {
    // const regex = new RegExp(".*" + searchValue.toLowerCase() + ".*", 'i');
    searchObject = { names: { $regex: `(?i)${searchValue}` } };
    Transaction.find(searchObject, (err, transactions) => {
      if (err) {
        return res.status(500).send(err);
      }
      return res.json({ transactions });
    });
  }
  else {
    Transaction.find().exec((error, transactions) => {
      if (error) return res.json({ error });
      transactions= transactions.filter(transaction=> transaction.phoneNumber.toString().indexOf(searchValue) !== -1)
      return res.json({ transactions });
    });
  }
}

exports.getReports = function (req, res, next) {
  const searchCriteria = req.body;
  const { ReportName, selectedDates, pooja } = searchCriteria;
  if (!ReportName || !selectedDates || (ReportName === Constants.Pooja && !pooja))
    return res.json({ error: 'Search criteria is invalid' });
  const report = reportMapping[ReportName];
  if (!report)
    return res.json({ error: 'Invalid report name' });
  // find({createdDate:{$gte:fromDate,$lte:toDate}})
  const slice = (array, obj) => {
    let slicedObj = {};
    array.forEach(x => slicedObj[x] = obj[x]);
    return slicedObj;
  }
  const searchObj = getSearchObj(selectedDates, pooja);
  Transaction.find(searchObj).select(report.join(' ')).exec(function (error, results) {
    if (error) return res.json({ error });
    if (ReportName === Constants.Management) {
      const reportCount = results.length;
      results = results.map(result => ({ 'pooja': result.pooja, 'total poojas': reportCount, 'total amount': result.amount * reportCount }));
    }
    else
      results = results.map(result => slice(report, result));
    return res.json(results);
  });
}
const getSearchObj = (selectedDates, pooja) => {
  let dates = selectedDates;
  let searchObj = {};
  if (selectedDates && typeof selectedDates === "string")
    dates = [selectedDates];
  const length = dates ? dates.length : undefined;
  if (!length) {
    searchObj = { selectedDates: parseDate(dates) };
  }
  else if (length === 1) {
    searchObj = { selectedDates: parseDate(dates[0]) };
  }
  else {
    dates = selectedDates.map(date => parseDate(date));
    searchObj = { selectedDates: { "$in": dates } };
  }
  if (pooja)
    return { ...searchObj, pooja };
  else
    return { createdDate: searchObj.selectedDates };
}