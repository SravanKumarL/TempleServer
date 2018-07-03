const Transaction = require('../models/transactions');
const Pooja = require('../models/poojaDetails');
const { User } = require('../models/user');
const { Constants } = require('./constants');

exports.generateRandomData = async (modelName, size = 10) => {
    let model = null;
    switch (modelName) {
        case Constants.Transactions:
            model = Transaction;
            break;
        case Constants.Poojas:
            model = Pooja;
            break;
        default:
            model = User;
            break;
    }
    let results = [];
    let resultsPromise = [];
    for (let index = 0; index < size; index++) {
        let propResultsPromise = [];
        let result = {};
        Object.keys(model.schema.obj).forEach(prop => {
            propResultsPromise.push(getRandomData(model.schema.obj[prop], prop).then(resolve => {
                result[prop] = resolve;
            }));
        });
        resultsPromise.push(Promise.all(propResultsPromise).then(resolve => {
            results.push(result);
        }));
    }
    Promise.all(resultsPromise).then(() =>
        model.insertMany(results, (err) => {
            if (err) reject(err);
            resolve('Insert Complete');
        }));
}

const getRandomBool = () => [true, false][Math.floor(Math.random() * Math.floor(2))];

const getRandomString = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

const getRandomNumber = () => Number.parseInt(Math.random().toString(10).substring(2, 5), 10);

const getRandomStringArray = (isDate = false, size) => {
    let array = [];
    const finalSize = size || Math.floor(Math.random() * 20) + 1;
    let getRandom = !isDate ? () => getRandomString() : () => getRandomDate();
    for (let index = 0; index < finalSize; index++) {
        array.push(getRandom());
    }
    return array;
}

const getRandomDate = () => {
    const getRandomInt = max => Math.floor(Math.random() * Math.floor(max));
    let randomMonth = getRandomInt(12) + 1;
    randomMonth = randomMonth < 10 ? `0${randomMonth}` : randomMonth;
    const year = getRandomInt(2) + 2018; //Only go for 2 yrs from now
    let randomDate = getRandomInt(randomMonth === 2 ? 28 : 31) + 1;
    randomDate = randomDate < 10 ? `0${randomDate}` : randomDate;
    return `${randomDate}-${randomMonth}-${year}`;
}

const getPoojaCountPromise = () =>
    new Promise((resolve, reject) => {
        Pooja.count().exec((err, count) => {
            if (err) reject(err);
            resolve(count);
        });
    });

const getExistingPoojas = ((poojaCountPromise) => {
    let isInsertResolved = false;
    let totalPoojas = [];
    const insertPromise = poojaCountPromise.then(count => {
        if (count < 10) {
            const poojasToAdd = 15 - count; //For now limiting poojas to 15
            const poojaKeys = Object.keys(Pooja.schema.obj).filter(prop => prop !== 'poojaName');
            const randomPoojaNames = getRandomStringArray(false, poojasToAdd);
            const randomPoojaPromises = randomPoojaNames.map(poojaName => {
                let randomPooja = { poojaName };
                return Promise.all(poojaKeys.map(prop => {
                    return getRandomData(Pooja.schema.obj[prop], prop).then(resolve => randomPooja[prop] = resolve);
                })).then(resolve => randomPooja);
            });
            return Promise.all(randomPoojaPromises).then(randomPoojas =>
                new Promise((resolve, reject) => {
                    Pooja.insertMany(randomPoojas, (err) => {
                        if (err) reject(err);
                        resolve('Insert Complete');
                    });
                })).catch(error => {
                    throw error;
                });
        }
    });
    return () =>
        !isInsertResolved ? insertPromise.then(insertMany =>
            new Promise((resolve, reject) => Pooja.find().lean().exec((err, res) => {
                if (err) reject(err);
                isInsertResolved = true;
                totalPoojas = res;
                resolve(res);
            }))) : Promise.resolve(totalPoojas);
})(getPoojaCountPromise())


const getRandomData = async (prop, propName) => {
    const isArray = prop.__proto__ !== undefined && Array.isArray(prop.__proto__);
    const type = isArray ? prop[0].name : prop.name;
    const isDate = propName.toUpperCase().indexOf('DATE') !== -1;
    const isPooja = propName.toUpperCase().indexOf('POOJA') !== -1;
    if (isDate) {
        return isArray ? getRandomStringArray(isDate) : getRandomDate();
    }
    else if (isPooja) {
        const existingPoojas = await getExistingPoojas();
        return existingPoojas.slice(0, Math.floor(Math.random() * existingPoojas.length) + 1).map(pooja => pooja.poojaName).join(',');
    }
    else {
        switch (type) {
            case 'Number':
                return getRandomNumber();
            case 'Boolean':
                return getRandomBool();
            case 'String':
            default:
                return isArray ? getRandomStringArray() : getRandomString();
        }
    }
}

exports.getPoojas = getExistingPoojas;