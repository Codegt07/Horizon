const passport = require("passport");
const { Strategy: GoogleStrategy } = require("passport-google-oauth20");

const User = require("../models/User");
const { env } = require("./env");

async function findOrCreateUser(googleId, emailObj, nameFromGoogle) {
  // Only accept verified emails
  const verifiedEmail =
    emailObj && emailObj.verified === true
      ? emailObj.value?.toLowerCase() ?? null
      : null;

  const byGoogleId = await User.findOne({ googleId });
  if (byGoogleId) return byGoogleId;

  if (verifiedEmail) {
    const byEmail = await User.findOne({ email: verifiedEmail });
    if (byEmail) {
      byEmail.googleId = googleId;
      await byEmail.save();
      return byEmail;
    }
  }

  return User.create({
    name: nameFromGoogle,
    email: verifiedEmail,
    passwordHash: null,
    googleId,
    role: "investor",
    isProfileComplete: false,
    walletBalance: 0,
  });
}

function configurePassport() {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL,
        passReqToCallback: false,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const googleId = profile.id;
          const emailObj = profile.emails?.[0] ?? null;
          const nameFromGoogle =
            profile.displayName ||
            [profile.name?.givenName, profile.name?.familyName]
              .filter(Boolean)
              .join(" ") ||
            null;

          const user = await findOrCreateUser(googleId, emailObj, nameFromGoogle);
          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
}

module.exports = { configurePassport, findOrCreateUser };
