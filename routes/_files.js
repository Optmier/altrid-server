var express = require('express');
const { route } = require('./admins');
const useAuthCheck = require('./middlewares/authCheck');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { urlencoded } = require('express');
const mime = {
    doc: 'application/msword',
    txt: 'text/plain',
    jpg: 'image/jpeg',
    pdf: 'application/pdf',
    png: 'image/png',
    rtf: 'application/rtf',
    zip: 'application/zip',
};
const dirContentsRequests = path.join(__dirname.replace('/routes', ''), 'UploadedFiles/ContentsRequests');
const uploadContentsRequests = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, 'UploadedFiles/ContentsRequests/');
        },
        filename: function (req, file, cb) {
            cb(null, Date.now() + '_' + file.originalname);
        },
    }),
});

/** 컨텐츠 요청 첨부파일 저장 */
router.post('/requests-contents', [useAuthCheck, uploadContentsRequests.any()], (req, res, next) => {
    if (req.verified.userType !== 'teachers' && req.verified.userType !== 'admins')
        return res.status(403).json({ code: 'not-allowed-user-type', message: 'unauthorized-access :: not allowed user type.' });

    if (!req.files) return res.status(400).json({ code: 'no-files', message: 'No files' });
    res.send('requests-contents/' + req.files[0].filename);
});

/** 컨텐츠 요청 첨부파일 보기 */
router.get('/requests-contents/*', useAuthCheck, (req, res, next) => {
    const file = decodeURI(path.join(dirContentsRequests, req.path.replace('/requests-contents', '')));
    if (file.indexOf(dirContentsRequests + path.sep) !== 0) {
        return res.status(403).end('Forbidden');
    }
    const type = mime[path.extname(file).slice(1)] || 'image/jpeg';
    const s = fs.createReadStream(file);
    s.on('open', () => {
        res.set('Content-Type', type);
        s.pipe(res);
    });
    s.on('error', () => {
        res.set('Content-Type', 'image/jpeg');
        res.status(404).end('Not found');
    });
});

module.exports = router;