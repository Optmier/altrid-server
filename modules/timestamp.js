module.exports = () => {
    let _timestamp = new Date();
    _timestamp.setHours(_timestamp.getHours() + 9);
    _timestamp = _timestamp.toISOString().replace('T', ' ');
    _timestamp = _timestamp.replace(_timestamp.substr(_timestamp.indexOf('.'), _timestamp.indexOf('Z')), '');
    console.log(_timestamp);
    return _timestamp.toString();
};
// 주석 추가