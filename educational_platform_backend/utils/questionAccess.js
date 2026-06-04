/**
 * Teacher Central (Global Q&A) — intentionally cross-tenant.
 * Any authenticated user may read, ask, answer, like, and comment globally.
 */

function userCanAccessGlobalQuestion(_user, _question) {
  return true;
}

function userCanInteractWithGlobalQuestion(user) {
  return Boolean(user?.id);
}

module.exports = {
  userCanAccessGlobalQuestion,
  userCanInteractWithGlobalQuestion,
};
