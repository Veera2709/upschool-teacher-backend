const { formatResponse } = require("../helper/helper");
const {reportServices} = require('../services');

exports.fetchAssessmentSummary = async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await reportServices.getAssessmentDetails(request);
        return formatResponse(res, reportData);
    } catch (error) {
        next(error)
    }
};
exports.getTargetedLearningExpectation = async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await reportServices.getTargetedLearningExpectation(request);
        return formatResponse(res, reportData);
    } catch (error) {
        next(error)
    }
};

exports.getTargetedLearningExpectationDetails = async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await reportServices.getTargetedLearningExpectationDetails(request);
        return formatResponse(res, reportData);
    } catch (error) {
        next(error)
    }
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