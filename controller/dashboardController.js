const dashboardServices = require("../services/dashboardServices");

exports.fetchAssessmentSummary = (req, res, next) => {
    let request = req.body;
    dashboardServices.getAssessmentDetails(request, function (assessment_detail_err, assessment_detail_res) {
        if (assessment_detail_err) {
            res.status(assessment_detail_err).json(assessment_detail_res);
        } else {
            console.log("Fetched assessment details for the subject!");
            res.json(assessment_detail_res);
        }
    });
};

exports.getTargetedLearningExpectation = (req, res, next) => {
    let request = req.body;
    dashboardServices.getTargetedLearningExpectation(request, function (learning_expectation_details_err, learning_expectation_details_res) {
        if (learning_expectation_details_err) {
            res.status(learning_expectation_details_err).json(learning_expectation_details_res);
        } else {
            console.log("Fetched Learning Expectations for the subject!");
            res.json(learning_expectation_details_res);
        }
    });
};


exports.getTargetedLearningExpectationDetails = (req, res, next) => {
    let request = req.body;
    dashboardServices.getTargetedLearningExpectationDetails(request, function (learning_expectation_details_err, learning_expectation_details_res) {
        if (learning_expectation_details_err) {
            res.status(learning_expectation_details_err).json(learning_expectation_details_res);
        } else {
            console.log("Fetched Learning Expectations for the subject!");
            res.json(learning_expectation_details_res);
        }
    });
};
exports.getAssesmentSummaryDetails = (req, res, next) => {
    let request = req.body;
    dashboardServices.getAssesmentSummaryDetails(request, function (assesmentSummary_details_err, assesmentSummary_details_res) {
        if (assesmentSummary_details_err) {
            res.status(assesmentSummary_details_err).json(assesmentSummary_details_res);
        } else {
            console.log("Fetched Assesment Summary for the subject!");
            res.json(assesmentSummary_details_res);
        }
    });
};


exports.preLearningSummaryDetails = (req, res, next) => {
    let request = req.body;
    dashboardServices.preLearningSummaryDetails(request, function (preLearningSummary_details_err, preLearningSummary_details_res) {
        if (preLearningSummary_details_err) {
            res.status(preLearningSummary_details_err).json(preLearningSummary_details_res);
        } else {
            console.log("pre Learning Summary for the subject!");
            res.json(preLearningSummary_details_res);
        }
    });
};

exports.postLearningSummaryDetails = (req, res, next) => {
    let request = req.body;
    dashboardServices.postLearningSummaryDetails(request, function (postLearningSummary_details_err, postLearningSummary_details_res) {
        if (postLearningSummary_details_err) {
            res.status(postLearningSummary_details_err).json(postLearningSummary_details_res);
        } else {
            console.log("pre Learning Summary for the subject!");
            res.json(postLearningSummary_details_res);
        }
    });
};