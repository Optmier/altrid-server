const whitelists = require('../../configs/whitelists');
const { verifyToken } = require('../../modules/encryption');

const useAuthCheck = (req, res, next) => {
    const token = req.signedCookies.sid;
    const tokenVerified = verifyToken(token);
    const origin = req.headers.origin;
    const originCheck = origin === 'true' ? true : whitelists.includes(origin);

    if (!token)
        return res.status(401).json({
            code: 'not-logged-in',
            message: 'unauthenticated :: not logged in.',
        });

    if (!tokenVerified.error && (process.env.RUN_MODE === 'dev' || originCheck)) {
        req.verified = tokenVerified;
        next();
    } else {
        return res.status(403).json({
            code: tokenVerified.error.code,
            message: 'unauthorized-access :: ' + tokenVerified.error.message,
        });
    }
};

module.exports = useAuthCheck;
