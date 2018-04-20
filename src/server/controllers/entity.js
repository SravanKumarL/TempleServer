const { Constants } = require('../constants/constants');
const Pooja = require('../models/poojaDetails');
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
        default:
            return null;
    }
}
const checkReqBody = function (model, reqBody) {
    const modelProps = getModelProps(model).filter(prop => prop !== 'id');
    return modelProps.filter(prop => reqBody.hasOwnProperty(prop)).length === modelProps.length;
}
const getModelProps = (model) => Object.getOwnPropertyNames(model.schema.obj);
exports.entity = function (collection) {
    let model = getModel(collection);
    return {
        add: function (req, res, next) {
            let newId;
            model.count({}, function (error, count) {
                if (error)
                    return res.json({ error });
                newId = count + 1;
            }).then((resolve, reject) => {
                if (reject)
                    return res.json({ error: reject });
                let entity = populateModel(model, req.body, newId);
                if (entity === null) {
                    let modelProps = getModelProps(model);
                    return res.status(422).send({ error: `You must provide ${modelProps.slice(0, modelProps.length - 1).join(', ')} and ${modelProps[modelProps.length - 1]}` });
                }
                //save it to the db
                entity.save(function (error) {
                    if (error) { return res.json({ error }); }
                    //Respond to request indicating the pooja was created
                    return res.json({ message: `${collection.slice(0, collection.length - 1)} was added successfully` });
                });
            });
        },
        get: function (req, res, next) {
            let modelProps = getModelProps(model);
            model.find().exec((error, data) => {
                if (error) {
                    return res.json({ error });
                }
                let modData = data.map(d => _.pick(d, modelProps));
                return res.send(modData);
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
            model.remove({ id: req.params.id }, function (error) {
                if (error)
                    return res.json({ error });
            });
            return res.json({ message: `${collection.slice(0, collection.length - 1)} was deleted successfully` });
        },
        update: function (req, res, next) {
            model.findOneAndUpdate({ id: req.params.id }, req.body, function (error) {
                if (error)
                    return res.json({ error });
            });
            return res.json({ message: `${collection.slice(0, collection.length - 1)} was updated successfully` });
        },
        schema: function (req, res, next) {
            return res.status(200).send(getModelProps(model).filter(prop => prop !== 'id'));
        }
    }
}
