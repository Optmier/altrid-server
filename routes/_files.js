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
// 컨텐츠 요청 파일 경로
const dirContentsRequests = path.join(__dirname.replace('/routes', ''), 'UploadedFiles/ContentsRequests');
// 프로필 이미지 저장 경로
const dirProfileImages = path.join(__dirname.replace('/routes', ''), 'UploadedFiles/ProfileImages');

// 컨텐츠 요청 파일 저장
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
// 프로필 이미지 파일 저장
const uploadProfileImages = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, 'UploadedFiles/ProfileImages/');
        },
        filename: function (req, file, cb) {
            cb(null, Date.now() + '_' + file.originalname);
        },
    }),
});

/** 컨텐츠 요청 첨부파일 저장 */
router.post('/requests-contents/:idx', [useAuthCheck, uploadContentsRequests.any()], (req, res, next) => {
    if (req.verified.userType !== 'teachers' && req.verified.userType !== 'admins')
        return res.status(403).json({ code: 'not-allowed-user-type', message: 'unauthorized-access :: not allowed user type.' });

    if (!req.files) return res.status(400).json({ code: 'no-files', message: 'No files' });

    let sql = `UPDATE assignment_draft SET file_url='requests-contents/${req.files[0].filename}' WHERE idx=${req.params.idx}`;
    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json({ ...results, file_name: 'requests-contents/' + req.files[0].filename });
        });
    });
});

/** 프로필 이미지 저장 및 경로 반환 */
router.post('/profile-images', [useAuthCheck, uploadProfileImages.any()], (req, res, next) => {
    if (!req.files) return res.status(400).json({ code: 'no-files', message: 'No files' });

    res.json({ file_name: 'profile-images/' + req.files[0].filename });
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

/** 프로필 이미지 보기 */
router.get('/profile-images/*', (req, res, next) => {
    const file = decodeURI(path.join(dirProfileImages, req.path.replace('/profile-images', '')));
    if (file.indexOf(dirProfileImages + path.sep) !== 0) {
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
