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
    Users:'users'
}
const ManagementReport = ['pooja', 'amount'];
const PoojaReport = ['names', 'gothram', 'nakshatram'];
const AccountReport = ['names', 'id', 'pooja', 'amount', 'chequeNo', 'bankName', 'createdDate'];
exports.Constants = constants;
exports.reportMapping = {
    'Accounts': AccountReport,
    'Pooja': PoojaReport,
    'Management': ManagementReport
}
exports.ManagementReport = ManagementReport;
exports.PoojaReport = PoojaReport;
exports.AccountReport = AccountReport;
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
    today = `${yyyy}-${mm}-${dd}`;
    return today;
}
exports.getCurrentDate = getCurrentDate;
exports.parseDate = (date) => {
    try {
        if (typeof date === 'number' || typeof date === 'object')
            return getCurrentDate(new Date(date));
        else if (typeof date === 'string') {
            date=Date.parse(date);
            if(date && typeof date === 'number')
                return getCurrentDate(new Date(date));
            else
                return getCurrentDate();
        }
        else
            return getCurrentDate();
    }
    catch(exception){
        return getCurrentDate();
    }
}
