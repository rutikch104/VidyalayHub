const jwt = require('jsonwebtoken');

exports.generateAccessToken = (user, role) => {
    return jwt.sign(
        {
            id: user.Id,
            email: user.Email,
            Name: user.Name,
            resetPassword: user.ResetPassword,
            role: role,
            Business_Line: user.Business_Line,
            exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour expiration from now
        },
        process.env.ACCESS_TOKEN_DSECRET
    );
}

exports.generateUniqAccessToken = (user) => {
    return jwt.sign(
        {
            id: user.Id,
            exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour expiration from now
        },
        process.env.ACCESS_TOKEN_DSECRET + user.PasswordHash
    );
};
