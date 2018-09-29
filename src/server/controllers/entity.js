const Users = require('../models/user');
const User = Users.User;
const hashPassword = Users.hashPassword;
const { Constants,
    getModelProps,
    getPaginationOptions,
    populateCount,
    getCurrentDate } = require('../constants/constants');
const uuidv1 = require('uuid/v1');
const Pooja = require('../models/poojaDetails');
const Transaction = require('../models/transactions');
const _ = require('lodash');
const populateModel = function (model, reqBody, id) {
    if (!checkReqBody(model, reqBody))
        return null;
    return new model({ ...reqBody, id });
}
const getModel = (collection) => {
    switch (collection) {
        case Constants.Poojas:
            return Pooja;
        case Constants.Users:
            return User;
        case Constants.Transactions:
            return Transaction;
        default:
            return null;
    }
}
const checkReqBody = function (model, reqBody) {
    const modelProps = getModelProps(model).filter(prop => prop !== 'id');
    return modelProps.filter(prop => reqBody.hasOwnProperty(prop)).length === modelProps.length;
}
const getSearchObj = (collection, reqParams) => (collection === Constants.Users ? { username: reqParams.username } : { id: reqParams.id });
// exports.getCount = (req, res, next) => {
//     const handleCount = (error, count) => {
//         if (error)
//             return res.json({ error });
//         return res.send(count);
//     }
//     const segments = req.path.split('/');
//     switch (segments[1]) {
//         case Constants.Poojas:
//             return getModel(Constants.Poojas).countDocuments({}, handleCount);
//         case Constants.Users:
//             return getModel(Constants.Users).countDocuments({}, handleCount);
//         default:
//             return getModel(Constants.Transactions).countDocuments({}, handleCount);
//     }
// }
exports.entity = function (collection) {
    let model = getModel(collection);
    let modelProps = getModelProps(model);
    return {
        add: function (req, res, next) {
            const uniqueProp = {
                [Constants.Poojas]: 'poojaName',
                [Constants.Users]: 'username'
            }
            const saveEntity = () => {
                // model.countDocuments({}, function (error, count) {
                //     if (error)
                //         return res.json({ error });
                // }).then((resolve, reject) => {
                //     if (reject)
                //         return res.json({ error: reject });
                let entity = populateModel(model, req.body, uuidv1());
                entity.createdDate = getCurrentDate();
                if (entity === null) {
                    modelProps = modelProps.filter(modelProp => modelProp !== 'id');
                    return res.status(422).send({ error: `You must provide ${modelProps.slice(0, modelProps.length - 1).join(', ')} and ${modelProps[modelProps.length - 1]}` });
                }
                const entitySelf = entity;
                //save it to the db
                entity.save(function (error) {
                    const change = _.pick(entitySelf, modelProps);
                    if (error) { return res.json({ error }); }
                    //Respond to request indicating the pooja was created
                    return res.json({ message: `${collection.slice(0, collection.length - 1)} was added successfully`, change });
                });
                // });
            }
            if (collection === Constants.Users || collection === Constants.Poojas) {
                const uniquePropName = uniqueProp[collection];
                model.findOne({ [uniquePropName]: req.body[uniquePropName] }).exec((error, result) => {
                    if (error) return res.json({ error });
                    else if (result && Object.keys(result).length > 0)
                        return res.json({ error: `A ${uniquePropName} with name ${req.body.username} already exists!` });
                    else
                        saveEntity();
                });
            }
            else {
                saveEntity();
            }
        },
        get: function (req, res, next) {
            const { skip, take, fetchCount } = req.query;
            const paginationOptions = getPaginationOptions(take, skip);
            let totalCount = 0;
            if (fetchCount) {
                model.find().countDocuments((error, count) => {
                    if (error)
                        return res.json({ error });
                    totalCount = count;
                });
            }
            model.find({}, {}, paginationOptions).lean().exec((error, data) => {
                if (error) {
                    return res.json({ error });
                }
                let modData = data.map(d => _.pick(d, modelProps));
                return res.json(populateCount(fetchCount, { rows: modData }, totalCount));
            });
        },
        delete: function (req, res, next) {
            // model.findById(req.params.id,(err,record)=>{
            //     if(err){
            //         res.status(404).send(err);
            //     }
            //     record.remove();
            //     res.status(200).send(`${collection.slice(0, collection.length - 1)} was deleted successfully`);
            // });
            model.remove(getSearchObj(collection, req.params), function (error) {
                if (error)
                    return res.json({ error });
                return res.json({ message: `${collection.slice(0, collection.length - 1)} was deleted successfully` });
            });
        },
        update: function (req, res, next) {
            let updateBody = req.body;
            const findOneAndUpdate = () => {
                model.findOneAndUpdate(getSearchObj(collection, req.params), updateBody, function (error) {
                    if (error)
                        return res.json({ error });
                    return res.json({ message: `${collection.slice(0, collection.length - 1)} was updated successfully`, change: updateBody });
                });
            }
            if (collection === Constants.Users && updateBody.hasOwnProperty('password')) {
                let error = '';
                hashPassword(req.body.password).then(hash => {
                    updateBody.password = hash;
                    findOneAndUpdate();
                }).catch(err => error = res.json({ error }));
            }
            else
                findOneAndUpdate();
        },
        schema: function (req, res, next) {
            return res.status(200).send(modelProps.filter(prop => prop !== 'id'));
        }
    }
}