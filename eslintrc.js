module.exports = {
    "env": {
        "browser": true,
        "commonjs": true,
        "es2021": true
    },
    "extends": "eslint:recommended",
    "overrides": [
        {
            "env": {
                "node": true
            },
            "files": [
                ".eslintrc.{js,cjs}",
                "awsConfig.js",
            ],
            "parserOptions": {
                "sourceType": "script"
            }
        }
    ],
    "parserOptions": {
        "ecmaVersion": "latest"
    },
    "globals": {
        "key": true,
        "process": true,
        "awsConfig": true,
        "ele": true,
        "Buffer": true,
        "dynamoDbCon": true,
        "s3Config": true,
        "S3Client": true
    },
    "rules": {
        "no-prototype-builtins": "off"
    }
}