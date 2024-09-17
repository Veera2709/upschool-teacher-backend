const { formatResponse } = require("../helper/helper");
const {quizServices} = require("../services");

exports.checkDuplicateQuizName = async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await quizServices.checkDuplicateQuizName(request);
        res.send(formatResponse(res, reportData))
    } catch (error) {
        next(error)
    }
};

exports.toggleQuizStatus = (req, res, next) => {
    let request = req.body;
    quizServices.updateQuizStatus(request, function (status_error, status_response) {
        if (status_error) {
            res.status(status_error).json(status_response);
        }
        else {
            console.log("Quiz Status Updated");
            res.json(status_response);
        }
    })
}
exports.fetchQuizBasedonStatus = async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await quizServices.fetchQuizBasedonStatus(request);
        return formatResponse(res, reportData);
    } catch (error) {
        next(error)
    }
};
exports.getStudentQuizResultData = async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await quizServices.getQuizResult(request);
        res.send(formatResponse(res, reportData))
    } catch (error) {
        next(error)
    }
};
exports.updateStudentQuizMarks = async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await quizServices.editStudentQuizMarks(request);
        res.send(formatResponse(res, reportData))
    } catch (error) {
        next(error)
    }
};

exports.viewQuizQuestionPaper = (req, res, next) => {
    console.log("viewQuizQuestionPaper : ");
    let request = req.body;

    quizServices.viewQuizQuestionPaper(request, function (view_test_question_paper_err, view_test_question_paper_response) {
        if (view_test_question_paper_err) {
            res.status(view_test_question_paper_err).json(view_test_question_paper_response);
        } else {
            console.log("Fetched Questions Successfully");
            res.json(view_test_question_paper_response);
        }
    })
}

exports.fetchQuizTemplates = (req, res, next) => {
    console.log("Fetch Quiz Templates by ID");
    let request = req.body;
    quizServices.fetchQuizTemplates(request, function (quizDataErr, quizDataRes) {
        if (quizDataErr) {
            res.status(quizDataErr).json(quizDataRes);
        } else {
            console.log("Got Quiz Templates Data!");
            res.json(quizDataRes);
        }
    });
};


exports.resetQuizEvaluationStatus = (req, res, next) => {
    let request = req.body;
    quizServices.resetQuizEvaluationStatus(request, function (quizStatus_error, quizStatus_response) {
        if (quizStatus_error) {
            res.status(quizStatus_error).json(quizStatus_response);
        }
        else {
            console.log(" Quiz Evaluation Status Updated");
            res.json(quizStatus_response);
        }
    })
}
exports.startQuizEvaluation = (req, res, next) => {
    console.log("Quiz Evaluation Start!");
    let request = req.body;
    quizServices.startQuizEvaluationProcess(request, function (quizEvaluationErr, quizEvaluationRes) {
        if (quizEvaluationErr) {
            res.status(quizEvaluationErr).json(quizEvaluationRes);
        } else {
            console.log("Quiz Evaluation Completed!");
            res.json(quizEvaluationRes);
        }
    });
};
exports.fetchAllQuizDetails = (req, res, next) => {
    let request = req.body;
    request["token"] = req.header('Authorization');

    quizServices.fetchAllQuizDetails(request, function (fetch_all_quiz_err, fetch_all_quiz_response) {
        if (fetch_all_quiz_err) {
            res.status(fetch_all_quiz_err).json(fetch_all_quiz_response);
        } else {
            console.log("Fetch All Quiz Successfully");
            res.json(fetch_all_quiz_response);
        }
    });
};




