const { formatResponse } = require("../helper/helper");
const reportServices = require("../services/reportServices");

exports.fetchAssessmentSummary = (req, res, next) => {
    let request = req.body;
    reportServices.getAssessmentDetails(request, function (assessment_detail_err, assessment_detail_res) {
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
    reportServices.getTargetedLearningExpectation(request, function (learning_expectation_details_err, learning_expectation_details_res) {
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
    reportServices.getTargetedLearningExpectationDetails(request, function (learning_expectation_details_err, learning_expectation_details_res) {
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
    reportServices.getAssesmentSummaryDetails(request, function (assesmentSummary_details_err, assesmentSummary_details_res) {
        if (assesmentSummary_details_err) {
            res.status(assesmentSummary_details_err).json(assesmentSummary_details_res);
        } else {
            console.log("Fetched Assesment Summary for the subject!");
            res.json(assesmentSummary_details_res);
        }
    });
};


exports.preLearningSummaryDetails =async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await reportServices.preLearningSummaryDetails(request);
        return formatResponse(res, reportData);
    } catch (error) {
        next(error)
    }
};

exports.postLearningSummaryDetails =async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await reportServices.postLearningSummaryDetails(request);
        return formatResponse(res, reportData);
    } catch (error) {
        next(error)
    }
};

exports.viewAnalysisIndividualReport =async (req, res, next) => {
    try {
    let request = req.body;
    const reportData =  await reportServices.viewAnalysisIndividualReport(request);
    return formatResponse(res, reportData);
    } catch (error) {
    next(error)
    }
};


exports.preLearningBlueprintDetails = async (req, res, next) => {
    try {
    let request = req.body;
    const reportData = await reportServices.preLearningBlueprintDetails(request);
    return formatResponse(res, reportData);
    } catch (error) {
       next(error)
    }
};

exports.getIndividualQuizReport = async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await reportServices.fetchIndividualQuizReport(request);
        return formatResponse(res, reportData);
    } catch (error) {
        next(error)
    }
};