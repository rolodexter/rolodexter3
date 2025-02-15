module.exports = {
    hooks: {
        "commit-msg": "node scripts/validate-commit-cli.js $HUSKY_GIT_PARAMS",
        "pre-commit": "lint-staged"
    }
}