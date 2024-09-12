const { formatResponse } = require("../helper/helper");
const classTestServices = require("../services/classTestServices");
exports.addClassTest = async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await classTestServices.addClassTest(request);
        return formatResponse(res, reportData);
    } catch (error) {
        next(error)
    }
};
exports.fetchClassTestsBasedonStatus = async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await classTestServices.fetchClassTestsBasedonStatus(request);
        return formatResponse(res, reportData);
    } catch (error) {
        next(error)
    }
};

exports.fetchClassTestById = async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await classTestServices.getClassTestbyId(request);
        return formatResponse(res, reportData);
    } catch (error) {
        next(error)
    }
};


exports.fetchQuestionsBasedonQuestionPaper = async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await classTestServices.addClassTest(request);
        return formatResponse(res, reportData);
    } catch (error) {
        next(error)
    }
};

exports.startEvaluation = (req, res, next) => {
    console.log("Evaluation Start!");
    let request = req.body;
    classTestServices.startEvaluationProcess(request, function (evaluationErr, evaluationRes) {
        if (evaluationErr) {
            res.status(evaluationErr).json(evaluationRes);
        } else {
            console.log("Evaluation Completed!");
            res.json(evaluationRes);
        }
    });
};


exports.getStudentsBasedOnSection = async (req, res, next) => {
    try {
        const request = req.body;
        const studentData = await classTestServices.fetchGetStudentData(request);
        return formatResponse(res, studentData);
    } catch (error) {
        next(error)
    }
};

exports.getStudentResultData = async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await classTestServices.getResult(request);
        return formatResponse(res, reportData);
    } catch (error) {
        next(error)
    }
};
exports.updateStudentMarks = async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await classTestServices.changeStudentMarks(request);
        return formatResponse(res, reportData);
    } catch (error) {
        next(error)
    }
};
exports.resetEvaluationStatus = async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await classTestServices.resetResultEvaluateStatus(request);
        return formatResponse(res, reportData);
    } catch (error) {
        next(error)
    }
};

exports.toggleClassTestStatus = async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await classTestServices.updateClassTestStatus(request);
        return formatResponse(res, reportData);
    } catch (error) {
        next(error)
    }
};