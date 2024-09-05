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

exports.fetchClassTestById = (req, res, next) => {
    console.log("Fetch class test by id");
    let request = req.body;
    classTestServices.getClassTestbyId(request, function (testDataErr, testDataRes) {
        if (testDataErr) {
            res.status(testDataErr).json(testDataRes);
        } else {
            console.log("Got class test data!");
            res.json(testDataRes);
        }
    });
};

exports.fetchQuestionsBasedonQuestionPaper = (req, res, next) => {
    console.log("fetchQuestionsBasedonQuestionPaper : ");
    let request = req.body;

    classTestServices.addClassTest(request, function (fetch_questions_err, fetch_questions_response) {
        if (fetch_questions_err) {
            res.status(fetch_questions_err).json(fetch_questions_response);
        } else {
            console.log("Questions Fetched Successfully");
            res.json(fetch_questions_response);
        }
    });
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


exports.getStudentsBasedOnSection = (req, res, next) => {
    console.log("Evaluation Start!");
    let request = req.body;
    classTestServices.fetchGetStudentData(request, function (fetch_student_err, fetch_student_res) {
        if (fetch_student_err) {
            res.status(fetch_student_err).json(fetch_student_res);
        } else {
            console.log("Evaluation Completed!");
            res.json(fetch_student_res);
        }
    });
};


exports.getStudentResultData = (req, res, next) => {
    let request = req.body;
    classTestServices.getResult(request, function (result_err, result_response) {
        if (result_err) {
            res.status(result_err).json(result_response);
        } else {
            console.log("result fetched");
            res.json(result_response);
        }
    });
}

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