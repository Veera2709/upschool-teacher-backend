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

exports.updateStudentMarks = (req, res, next) => {
    let request = req.body;
    classTestServices.changeStudentMarks(request, function (result_err, result_response) {
        if (result_err) {
            res.status(result_err).json(result_response);
        } else {
            console.log("Students Marks Updated!");
            res.json(result_response);
        }
    });
}

exports.resetEvaluationStatus = (req, res, next) => {
    let request = req.body;
    classTestServices.resetResultEvaluateStatus(request, function (resetEvaluationerr, resetEvaluationresponse) {
        if (resetEvaluationerr) {
            res.status(resetEvaluationerr).json(resetEvaluationresponse);
        } else {
            console.log("Evaluation Status Reset!");
            res.json(resetEvaluationresponse);
        }
    });
}


exports.toggleClassTestStatus = (req, res, next) => {
    let request = req.body;
    classTestServices.updateClassTestStatus(request, function (testStatus_error, testStatus_response) {
        if (testStatus_error) {
            res.status(testStatus_error).json(testStatus_response);
        }
        else {
            console.log("Class Test Status Updated");
            res.json(testStatus_response);
        }
    })
}