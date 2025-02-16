// Commit Message Validator
const validateCommitMessage = (message) => {
    // Check for manual override
    if (message.startsWith('Manual:')) {
        return {
            isValid: true,
            violations: []
        };
    }

    const rules = {
        validFormat: {
            // Allow action verbs OR descriptive phrases with 2+ words
            test: (msg) => /^(Add|Fix|Update|Remove|Refactor|Optimize|Document|Manual:|\w+\s+\w+.*)/.test(msg),
            message: 'Must start with an action verb or be a descriptive phrase (2+ words)'
        },
        length: {
            test: (msg) => msg.length <= 72, // Increased length limit for more descriptive messages
            message: 'Must be 72 characters or less'
        },
        noPeriod: {
            test: (msg) => !msg.endsWith('.'),
            message: 'Must not end with a period'
        },
        presentTense: {
            test: (msg) => !/\b(ed|fixed|added|updated|removed|refactored|optimized|documented)\b/.test(msg),
            message: 'Must use present tense'
        }
    };

    const violations = [];
    Object.entries(rules).forEach(([rule, { test, message }]) => {
        if (!test(message)) {
            violations.push(message);
        }
    });

    return {
        isValid: violations.length === 0,
        violations
    };
};

module.exports = validateCommitMessage;