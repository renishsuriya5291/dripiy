const passport = require('passport');
const User = require('../models/User');

// Only keep this if you use passport-local or other strategies
passport.serializeUser((user, done) => {
    done(null, user.id || user._id);
});
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

module.exports = passport;
