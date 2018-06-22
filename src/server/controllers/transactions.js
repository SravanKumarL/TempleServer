const { Constants, parseDate, getPaginationOptions, populateCount } = require('../constants/constants');
const { reportMapping, getModelProps } = require('../constants/constants');
const Transaction = require('../models/transactions');
const uuidv1 = require('uuid/v1');
const _ = require('lodash');
exports.addTransaction = function (req, res, next) {
  // Extract the required data
  const {
    bankName,
    chequeNo,
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
  const createdDate = parseDate(new Date());
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
  // Transaction.count({}, function (error, count) {
  //   if (error)
  //     return res.json({ message: error });
  // }).then((resolve, reject) => {
  //   if (reject)
  //     return res.json({ message: reject });
  // const id = resolve + 1;
  // Create new model instance
  const transaction = new Transaction({
    id: uuidv1(),
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
  // });
}

exports.getTransactions = function (req, res, next) {
  Transaction.find().lean().exec((err, transactions) => {
    if (err) {
      res.status(500).send(err);
    }
    const modelProps = getModelProps(Transaction);
    res.json({ transactions: transactions.map(transaction => _.pick(transaction, modelProps)) });
  });
}

exports.searchTransactions = function (req, res, next) {
  const { searchValue, pageSize, count } = req.body;
  const fetchCount = req.query.count !== undefined ? req.query.count : false;
  if (searchValue.length === 0) {
    return res.json({ transactions: [] });
  }
  // if (isNaN(Number(searchValue))) {
  //   const regex = new RegExp(".*" + searchValue.toLowerCase() + ".*", 'i');
  //   searchObject = { names: { $regex: regex } };
  // }
  const numericalSearchVal = Number(searchValue);
  const modelProps = getModelProps(Transaction);
  let totalCount = 0;
  if (isNaN(numericalSearchVal)) {
    // const regex = new RegExp(".*" + searchValue.toLowerCase() + ".*", 'i');
    const searchObject = { names: { $regex: `(?i)${searchValue}` } };
    if (fetchCount) {
      Transaction.find(searchObject).count((error, count) => {
        if (error)
          return res.json({ error });
        totalCount = count;
      })
    }
    Transaction.find(searchObject, {}, getPaginationOptions(pageSize, count)).lean().exec((err, transactions) => {
      if (err) {
        return res.status(500).send(err);
      }
      return res.json(populateCount(fetchCount, { transactions: transactions.map(transaction => _.pick(transaction, modelProps)) }, totalCount));
    });
  }
  else {
    //{ $where: `/${searchValue}/.test(this.phoneNumber)` } This also works but has a chance of SQL injection
    const whereClause = { $where: `function() { return this.phoneNumber.toString().match(/${searchValue}/) != null; }` };
    if (fetchCount) {
      Transaction.find(whereClause).count((error, count) => {
        if (error)
          return res.json({ error });
        totalCount = count;
      })
    }
    Transaction.find(whereClause, {}, getPaginationOptions(pageSize, count)).lean()
      .exec((err, transactions) => {
        if (err) {
          return res.status(500).send(err);
        }
        return res.json(populateCount(fetchCount, { transactions: transactions.map(transaction => _.pick(transaction, modelProps)) }, totalCount));
      });
  }
}

exports.getReports = function (req, res, next) {
  const searchCriteria = req.body;
  const fetchCount = req.query.count !== undefined ? Boolean(req.query.count) : false;
  let totalCount = 0;
  const { ReportName, selectedDates, pooja, count, pageSize } = searchCriteria;
  if (!ReportName || !selectedDates || (ReportName === Constants.Pooja && !pooja))
    return res.json({ error: 'Search criteria is invalid' });
  const report = reportMapping[ReportName];
  if (!report)
    return res.json({ error: 'Invalid report name' });
  const searchObj = getSearchObj(ReportName, selectedDates, pooja);
  if (fetchCount) {
    Transaction.find(searchObj).count((error, count) => {
      if (error)
        return res.json({ error });
      totalCount = count;
    })
  }
  Transaction.find(searchObj, {}, getPaginationOptions(pageSize, count)).lean().select(report.join(' ')).exec(function (error, results) {
    if (error) return res.json({ error });
    if (results.length && results.length > 0) {
      let pooja = '';
      results = results.map(result => slice(report, result));
      if (ReportName === Constants.Management) {
        results = results.reduce((accumulator, currValue) => {
          pooja = accumulator[currValue.pooja];
          accumulator[currValue.pooja] = { ...(pooja || currValue), 'total poojas': pooja && pooja['total poojas'] ? pooja['total poojas'] + 1 : 1 };
          return accumulator;
        }, {});
        results = Object.keys(results).map(key => {
          const { amount, ...rest } = results[key];
          return { ...rest, 'total amount': amount * rest['total poojas'] };
        });
      }
    }
    return res.json(populateCount(fetchCount, { rows: results }, totalCount));
  });
}

const slice = (array, obj) => {
  let slicedObj = {};
  array.forEach(x => slicedObj[x] = obj[x]);
  return slicedObj;
}
const getSearchObj = (reportName, selectedDates, pooja) => {
  let dates = selectedDates;
  let searchObj = {};
  if (selectedDates && typeof selectedDates === "string")
    dates = [selectedDates];
  const length = dates ? dates.length : undefined;
  const dateCriteria = reportName === Constants.Management ? 'createdDate' : ((reportName === Constants.Pooja) ? 'selectedDates' : 'createdDate'); // To look at accounts report
  if (!length) {
    searchObj = { "selectedDates": [parseDate(dates)] };
  }
  else {
    dates = selectedDates.map(date => parseDate(date));
    searchObj = { "selectedDates": { "$in": dates } };
  }
  searchObj = { [dateCriteria]: searchObj.selectedDates };
  if (pooja)
    return { ...searchObj, pooja: { "$in": pooja.split(',') } };
  else
    return searchObj;
}
