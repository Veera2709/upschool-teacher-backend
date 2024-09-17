const {scannerServices} = require("../services");

exports.sendScannerLink = (req, res, next) => {
    console.log("sendScannerLink Controller!", req.body);
    let request = req.body;

    scannerServices.sendScannerLink(request, function (send_scanner_link_err, send_scanner_link_response) {
        if (send_scanner_link_err) {
            res.status(send_scanner_link_err).json(send_scanner_link_response);
        } else {
            console.log("Initiated Send Scanner Link Successfully");
            res.json(send_scanner_link_response);
        }
    });
};

exports.sendOTPForScanning = (req, res, next) => {
    console.log("sendOTPForScanning Controller!", req.body);
    let request = req.body;

    scannerServices.sendOTPForScanning(request, function (send_OTP_for_scanning_err, send_OTP_for_scanning_response) {
        if (send_OTP_for_scanning_err) {
            res.status(send_OTP_for_scanning_err).json(send_OTP_for_scanning_response);
        } else {
            console.log("Sent OTP Successfully");
            res.json(send_OTP_for_scanning_response);
        }
    });
};

exports.validateOTPForScanning = (req, res, next) => {
    console.log("validateOTPForScanning Controller!", req.body);
    let request = req.body;

    scannerServices.validateOTPForScanning(request, function (validate_OTP_for_scanning_err, validate_OTP_for_scanning_response) {
        if (validate_OTP_for_scanning_err) {
            res.status(validate_OTP_for_scanning_err).json(validate_OTP_for_scanning_response);
        } else {
            console.log("Validated OTP Successfully");
            res.json(validate_OTP_for_scanning_response);
        }
    });
};

exports.fetchSignedURLForAnswers = (req, res, next) => {
    console.log("fetchSignedURLForAnswers Controller!", req.body);
    let request = req.body;

    scannerServices.fetchSignedURLForAnswers(request, function (fetch_signed_URL_for_answers_err, fetch_signed_URL_for_answers_response) {
        if (fetch_signed_URL_for_answers_err) {
            res.status(fetch_signed_URL_for_answers_err).json(fetch_signed_URL_for_answers_response);
        } else {
            console.log("Generated Signed URL Successfully");
            res.json(fetch_signed_URL_for_answers_response);
        }
    });
};

exports.uploadAnswerSheets = (req, res, next) => {
    console.log("uploadAnswerSheets Controller!", req.body);
    let request = req.body;

    scannerServices.uploadAnswerSheets(request, function (upload_answer_sheets_err, upload_answer_sheets_response) {
        if (upload_answer_sheets_err) {
            res.status(400).json(upload_answer_sheets_err);
        } else {
            console.log("Answer Sheet Uploaded Successfully");
            res.json(upload_answer_sheets_response);
        }
    });
};

exports.fetchSignedURLForQuizAnswers = (req, res, next) => {
    console.log("fetchSignedURLForQuizAnswers Controller!", req.body);
    let request = req.body;

    scannerServices.fetchSignedURLForQuizAnswers(request, function (fetch_signed_URL_for_quiz_answers_err, fetch_signed_URL_for_quiz_answers_response) {
        if (fetch_signed_URL_for_quiz_answers_err) {
            res.status(fetch_signed_URL_for_quiz_answers_err).json(fetch_signed_URL_for_quiz_answers_response);
        } else {
            console.log("Generated Signed URL Successfully");
            res.json(fetch_signed_URL_for_quiz_answers_response);
        }
    });
};

exports.uploadQuizAnswerSheets = (req, res, next) => {
    console.log("uploadAnswerSheets Controller!", req.body);
    let request = req.body;

    scannerServices.uploadQuizAnswerSheets(request, function (upload_quiz_answer_sheets_err, upload_quiz_answer_sheets_response) {
        if (upload_quiz_answer_sheets_err) {
            res.status(400).json(upload_quiz_answer_sheets_err);
        } else {
            console.log("Answer Sheet Uploaded Successfully");
            res.json(upload_quiz_answer_sheets_response);
        }
    });
};