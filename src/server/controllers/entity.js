const Users = require('../models/user');
const User = Users.User;
const hashPassword = Users.hashPassword;
const { Constants, getModelProps, getPaginationOptions, populateCount } = require('../constants/constants');
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
//             return getModel(Constants.Poojas).count({}, handleCount);
//         case Constants.Users:
//             return getModel(Constants.Users).count({}, handleCount);
//         default:
//             return getModel(Constants.Transactions).count({}, handleCount);
//     }
// }
exports.entity = function (collection) {
    let model = getModel(collection);
    return {
        add: function (req, res, next) {
            if (collection === Constants.Users)
                model.findOne({ username: req.body.username }).exec((error, result) => {
                    if (error) return res.json({ error });
                    if (result && Object.keys(result).length > 0)
                        return res.json({ error: `A user with name ${req.body.username} already exists!` });
                });
            // model.count({}, function (error, count) {
            //     if (error)
            //         return res.json({ error });
            // }).then((resolve, reject) => {
            //     if (reject)
            //         return res.json({ error: reject });
            let entity = populateModel(model, req.body, uuidv1());
            if (entity === null) {
                let modelProps = getModelProps(model);
                return res.status(422).send({ error: `You must provide ${modelProps.slice(0, modelProps.length - 1).join(', ')} and ${modelProps[modelProps.length - 1]}` });
            }
            const entitySelf = entity;
            //save it to the db
            entity.save(function (error) {
                const change = _.pick(entitySelf, Object.keys(req.body));
                if (error) { return res.json({ error }); }
                //Respond to request indicating the pooja was created
                return res.json({ message: `${collection.slice(0, collection.length - 1)} was added successfully`, change });
            });
            // });
        },
        get: function (req, res, next) {
            let modelProps = getModelProps(model);
            const { skip, take, fetchCount } = req.query;
            const paginationOptions = getPaginationOptions(take, skip);
            let totalCount = 0;
            if (fetchCount) {
                model.find().count((error, count) => {
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
            return res.status(200).send(getModelProps(model).filter(prop => prop !== 'id'));
        }
    }
}