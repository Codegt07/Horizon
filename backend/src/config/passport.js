const passport = require("passport");
const { Strategy: GoogleStrategy } = require("passport-google-oauth20");

const User = require("../models/User");
const { env } = require("./env");

/**
 * Core account-matching logic, extracted so it can be tested independently
 * of Passport's HTTP machinery.
 *
 * Rules (in priority order):
 *  1. Matched by googleId          → existing OAuth user, sign in
 *  2. Verified email match         → link Google identity to existing account
 *  3. No match / unverified email  → create new user
 *
 * Email is only trusted for linking or account creation when Google explicitly
 * marks it as verified (email_verified === true in the userinfo response,
 * surfaced as profile.emails[0].verified by passport-google-oauth20).
 * An unverified or missing email is treated as absent for all matching
 * purposes — it is stored as null on new accounts.
 *
 * @param {string} googleId       - profile.id
 * @param {{ value: string, verified: boolean }|null} emailObj
 *   - profile.emails[0] or null if the email scope was not granted
 * @param {string|null} nameFromGoogle - display name from profile
 * @returns {Promise<import("../models/User").default>}
 */
async function findOrCreateUser(googleId, emailObj, nameFromGoogle) {
  // Only accept a verified email; treat everything else as absent
  const verifiedEmail =
    emailObj && emailObj.verified === true
      ? emailObj.value?.toLowerCase() ?? null
      : null;

  // ── Case 1: already linked by googleId ─────────────────────────────────
  const byGoogleId = await User.findOne({ googleId });
  if (byGoogleId) return byGoogleId;

  // ── Case 2: verified email matches an existing account ─────────────────
  if (verifiedEmail) {
    const byEmail = await User.findOne({ email: verifiedEmail });
    if (byEmail) {
      // Link the Google identity to the existing account.
      // Never overwrite an already-set role or name.
      byEmail.googleId = googleId;
      await byEmail.save();
      return byEmail;
    }
  }

  // ── Case 3: new user ────────────────────────────────────────────────────
  // Role is always unknown for new OAuth users — they must complete
  // the profile form before we can grant full access.
  return User.create({
    name: nameFromGoogle,
    email: verifiedEmail,        // null when email is absent or unverified
    passwordHash: null,          // OAuth-only account
    googleId,
    role: "investor",            // placeholder — overwritten in completeProfile
    isProfileComplete: false,    // gate: must choose real role before access
    walletBalance: 0,
  });
}

/**
 * Configure the Passport Google OAuth 2.0 strategy.
 *
 * Called once from app.js. We do not use sessions — authentication state is
 * carried entirely by the JWT httpOnly cookie issued after this callback.
 *
 * Skipped when Google credentials are absent (test/dev environments that
 * haven't configured OAuth).
 */
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
        // We deliberately do not store accessToken or refreshToken.
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
