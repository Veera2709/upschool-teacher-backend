const { formatResponse } = require("../helper/helper");
const classTestServices = require("../services/classTestServices");

    exports.addClassTest = (req, res, next) => {
    console.log("addClassTest : ");
    let request = req.body;    

    classTestServices.addClassTest(request, function (class_test_err, class_test_response) {
        if (class_test_err) { 
            res.status(class_test_err).json(class_test_response);
        } else {
            console.log("Class Test Scheduled Successfully"); 
            res.json(class_test_response);
        }
    });
};

exports.fetchClassTestsBasedonStatus = (req, res, next) => {
    console.log("fetchClassTestsBasedonStatus : ");
    let request = req.body;    

    classTestServices.fetchClassTestsBasedonStatus(request, function (class_test_err, class_test_response) {
        if (class_test_err) { 
            res.status(class_test_err).json(class_test_response);
        } else {
            console.log("Class Tests Fetched Successfully"); 
            res.json(class_test_response);
        }
    });
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


exports.getStudentsBasedOnSection = async (req, res, next) => {
    try {
        const request = req.body;
        const studentData = await classTestServices.fetchGetStudentData(request);
        return formatResponse(res, studentData);
    } catch (error) {
        next(error)
    }
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
    classTestServices.updateClassTestStatus(request, function(testStatus_error,testStatus_response){
        if(testStatus_error){
            res.status(testStatus_error).json(testStatus_response);
        }
        else{
            console.log("Class Test Status Updated");
            res.json(testStatus_response);
        }
    })
}