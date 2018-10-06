const constants = {
    delete: 'delete',
    add: 'add',
    edit: 'edit',
    get: 'get',
    Poojas: 'poojas',
    Transactions: 'transactions',
    Reports: 'reports',
    Schema: 'schema',
    Accounts: 'Accounts',
    Pooja: 'Pooja',
    Management: 'Management',
    Users: 'users',
    backup: 'backup',
    restore: 'restore',
    poojaCollection: 'poojadetails'
}
const ManagementReport = ['pooja', 'amount', 'chequeNo', 'numberOfDays'];
const PoojaReport = ['names', 'gothram', 'nakshatram', 'pooja', 'formattedDates'];
const AccountReport = ['names', 'phoneNumber', 'pooja', 'amount', 'chequeNo', 'bankName', 'createdDate'];
module.exports.Constants = constants;
module.exports.reportMapping = {
    'Accounts': AccountReport,
    'Pooja': PoojaReport,
    'Management': ManagementReport
}
module.exports.ManagementReport = ManagementReport;
module.exports.PoojaReport = PoojaReport;
module.exports.AccountReport = AccountReport;
const getCurrentDate = (date = new Date()) => {
    let today = date;
    let dd = today.getDate();
    let mm = today.getMonth() + 1; //January is 0!
    let yyyy = today.getFullYear();
    if (dd < 10) {
        dd = '0' + dd
    }
    if (mm < 10) {
        mm = '0' + mm
    }
    today = `${dd}-${mm}-${yyyy}`;
    return today;
}
const getDate = (dateString) => {
    const parts = dateString.split('-');
    return new Date(Date.parse(`${parts[2]}-${parts[1]}-${parts[0]}`));
}
module.exports.getCurrentDate = getCurrentDate;
module.exports.parseDate = (date) => {
    try {
        if (typeof date === 'number' || typeof date === 'object')
            return getCurrentDate(new Date(date));
        else if (typeof date === 'string') {
            let newDate = getDate(date);
            if (isNaN(newDate.getDate())) {
                newDate = new Date(Date.parse(date));
            }
            if (newDate && typeof newDate === 'object')
                return getCurrentDate(newDate);
            else
                return null;
        }
        else
            return null;
    }
    catch (exception) {
        return null;
    }
}
module.exports.getModelProps = (model) => Object.getOwnPropertyNames(model.schema.obj);
module.exports.getPaginationOptions = (pageSize, count) => {
    let paginationOptions = {};
    pageSize = Number(pageSize);
    count = Number(count);
    if (isNaN(pageSize) && isNaN(count)) {
        return paginationOptions;
    }
    pageSize = isNaN(pageSize) ? 0 : pageSize;
    const bufferedPageSize = 2 * pageSize;
    paginationOptions = { skip: !isNaN(count) ? count : 0 };
    if (bufferedPageSize !== 0)
        paginationOptions = { ...paginationOptions, limit: Number(bufferedPageSize) };
    return paginationOptions;
}
module.exports.populateCount = (fetchCount = false, returnObj = {}, totalCount = 0) => {
    if (!fetchCount)
        return returnObj;
    return { ...returnObj, totalCount };
}
module.exports.castToBoolean = (value, defCast) => value === 'true' ? true : (value === 'false' ? false : defCast);
module.exports.convertToProperCase = stringValue =>
    stringValue.split(' ').map(val => val[0].toUpperCase() + val.toLowerCase().slice(1)).join(' ');