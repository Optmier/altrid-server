const { verifyToken } = require('../../modules/encryption');

const useAuthCheck = (req, res, next) => {
    const token = req.signedCookies.sid;
    const tokenVerified = verifyToken(token);
    const origin = req.headers.origin;
    const originCheck = origin === 'true' ? true : global.CLIENT_HOST === origin;

    if (!token)
        return res.status(401).json({
            code: 'not-logged-in',
            message: 'unauthenticated :: not logged in.',
        });

    if (!tokenVerified.error && (!global.SECURE || originCheck)) {
        req.verified = tokenVerified;
        next();
    } else {
        return res.status(403).json({
            code: tokenVerified.error.code ? tokenVerified.error.code : 'unknown',
            message: 'unauthorized-access :: ' + tokenVerified.error.message,
        });
    }
};

module.exports = useAuthCheck;
